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
