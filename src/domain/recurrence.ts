export const recurrences = ['weekly', 'monthly', 'yearly'] as const;
export type Recurrence = (typeof recurrences)[number];
export const recurrenceLabels: Record<Recurrence, string> = {
  weekly: 'Settimanale', monthly: 'Mensile', yearly: 'Annuale',
};

export function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === 'string' && (recurrences as readonly string[]).includes(value);
}

// Safety net against corrupted dates: ~19 years of weekly occurrences.
export const maxOccurrences = 1000;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Date of occurrence number `n` (0 = the start date). Monthly and yearly series keep the start
// day, clamped to shorter months (31 → 30/28, 29 Feb → 28 Feb).
export function occurrenceDateAt(start: string, recurrence: Recurrence, n: number): string {
  const [year, month, day] = start.split('-').map(Number) as [number, number, number];
  if (recurrence === 'weekly') return iso(new Date(Date.UTC(year, month - 1, day + 7 * n)));
  const totalMonths = (month - 1) + (recurrence === 'monthly' ? n : 12 * n);
  const y = year + Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return iso(new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m)))));
}

// Calendar dates (YYYY-MM-DD) from `start` to `until` inclusive; the array index is the occurrence number.
export function occurrenceDates(start: string, recurrence: Recurrence, until: string): string[] {
  const dates: string[] = [];
  for (let n = 0; n < maxOccurrences; n++) {
    const value = occurrenceDateAt(start, recurrence, n);
    if (value > until) break;
    dates.push(value);
  }
  return dates;
}

// ---- Calendar changes (issue #9) ----
// A series can switch frequency. The occurrence NUMBERS never change (prices refer to them), only the dates from the
// switch on: from occurrence `index` the calendar restarts on `start` with the new `recurrence`. Occurrences before
// `index` keep the dates they had, so a payment already due is never moved. No changes = the original calendar.
export type CalendarChange = Readonly<{ index: number; start: string; recurrence: Recurrence }>;
// Mirrored by firestore.rules (one regex, up to four entries: the whole expense must stay in its expression budget).
export const maxCalendarChanges = 4;

// Date of occurrence `n` of a series that started on `start` with `recurrence` and then followed `changes`
// (sorted by index; the last one with index ≤ n applies).
export function scheduleDateAt(start: string, recurrence: Recurrence, changes: readonly CalendarChange[], n: number): string {
  let from = 0;
  let anchor = start;
  let every = recurrence;
  for (const change of changes) if (change.index <= n && change.index >= from) { from = change.index; anchor = change.start; every = change.recurrence; }
  return occurrenceDateAt(anchor, every, n - from);
}
// Frequency in force at occurrence `n`.
export function recurrenceAt(recurrence: Recurrence, changes: readonly CalendarChange[], n: number): Recurrence {
  let every = recurrence;
  for (const change of changes) if (change.index <= n) every = change.recurrence;
  return every;
}
// Like occurrenceDates, following the calendar changes: the array index is the occurrence number.
export function scheduleDates(start: string, recurrence: Recurrence, changes: readonly CalendarChange[], until: string): string[] {
  if (changes.length === 0) return occurrenceDates(start, recurrence, until);
  const dates: string[] = [];
  for (let n = 0; n < maxOccurrences; n++) {
    const value = scheduleDateAt(start, recurrence, changes, n);
    if (value > until) break;
    dates.push(value);
  }
  return dates;
}

const recurrenceCodes: Record<Recurrence, string> = { weekly: 'w', monthly: 'm', yearly: 'y' };
const recurrenceByCode: Record<string, Recurrence> = { w: 'weekly', m: 'monthly', y: 'yearly' };
// Firestore form: one string "index:YYYY-MM-DD:w|m|y;…" (one regex in the Rules). Never stored when empty.
export function encodeCalendarChanges(changes: readonly CalendarChange[]): string {
  return changes.map((c) => `${c.index}:${c.start}:${recurrenceCodes[c.recurrence]}`).join(';');
}
// Inverse for a stored value; anything but a well-formed non-empty string → null (record invalid).
export function decodeCalendarChanges(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,2}:[0-9]{4}-[0-9]{2}-[0-9]{2}:[wmy](;[1-9][0-9]{0,2}:[0-9]{4}-[0-9]{2}-[0-9]{2}:[wmy]){0,3}$/.test(value)) return null;
  return value.split(';').map((part) => { const [index, start, code] = part.split(':'); return { index: Number(index), start, recurrence: recurrenceByCode[code!] }; });
}

const validCivil = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '2000-01-01' && value <= '2099-12-31';
};

// Missing field = the original calendar. The base calendar is needed to check that every switch moves FORWARD:
// the restart date must follow the date of the occurrence just before it. Anything invalid → null.
export function parseCalendarChanges(value: unknown, start: string, recurrence: Recurrence | null): CalendarChange[] | null {
  if (value === undefined) return [];
  if (recurrence === null || !Array.isArray(value) || value.length > maxCalendarChanges) return null;
  const changes: CalendarChange[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length !== 3) return null;
    const v = item as Record<string, unknown>;
    if (typeof v.index !== 'number' || !Number.isSafeInteger(v.index) || v.index < 1 || v.index >= maxOccurrences
      || !validCivil(v.start) || !isRecurrence(v.recurrence)) return null;
    const previous = changes[changes.length - 1];
    if (previous && previous.index >= v.index) return null;
    if (!(v.start > scheduleDateAt(start, recurrence, changes, v.index - 1))) return null;
    changes.push({ index: v.index, start: v.start, recurrence: v.recurrence });
  }
  return changes;
}

// New calendar when the user switches the series to `to` from the next renewal (number `nextIndex`, now on `nextDate`)
// restarting on `firstDate`. Only the future moves: `firstDate` must be after `today`. A switch that has not taken effect yet
// is replaced rather than stacked. Returns null when the limit of switches is reached.
export function switchFrequency(changes: readonly CalendarChange[], nextIndex: number, to: Recurrence, firstDate: string): CalendarChange[] | null {
  const kept = changes.filter((c) => c.index < nextIndex);
  const next = [...kept, { index: nextIndex, start: firstDate, recurrence: to }];
  return next.length > maxCalendarChanges ? null : next;
}
