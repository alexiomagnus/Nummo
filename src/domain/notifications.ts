// In-app notifications (pure rules, no browser API): which reminders are due, for which period, and how acting on
// them changes the saved state. The same functions can feed a future push channel: only the presentation would change.
// Nothing here writes expense data; preferences and state live in this browser (see features/notifications).
import type { Category } from './category.ts';
import { isUtcTimestamp } from './contract.ts';
import { addDays, expandOccurrences, type ExpenseEntry } from './history.ts';
import { todayInRome } from './policy.ts';

export const notificationFrequencies = ['weekly', 'biweekly', 'monthly'] as const;
export type NotificationFrequency = (typeof notificationFrequencies)[number];
export const notificationFrequencyLabels: Record<NotificationFrequency, string> = {
  weekly: 'Ogni settimana', biweekly: 'Ogni 14 giorni', monthly: 'Ogni mese',
};
// «Ricordamelo dopo» on the backup reminder.
export const backupSnoozeDays = 3;

// Preferences, one set per browser (`nummo.notifications.v1`): one switch per reminder, no main switch.
// `*Since`: when that reminder last became active, or when the summary changed frequency. Nothing is due for the time
// before: enabling never fires at once for a past interval.
export type NotificationPreferences = Readonly<{
  backupEnabled: boolean; backupFrequency: NotificationFrequency; backupSince: string | null;
  summaryEnabled: boolean; summaryFrequency: NotificationFrequency; summarySince: string | null;
  // Subscription reminder: a notice the day before a renewal of an active subscription (nothing to configure but the switch).
  renewalEnabled: boolean;
  // Hour of the day (Europe/Rome) at which every reminder is delivered, 7–22.
  reminderHour: number;
}>;
export const reminderHourRange = { min: 7, max: 22 } as const;
// Quick choices of the Notifications page; any hour in the range is allowed («Altra»).
export const reminderPresets = { morning: 9, lunch: 13, evening: 19 } as const;
export const notificationPreferencesKey = 'nummo.notifications.v1';
export const defaultNotificationPreferences: NotificationPreferences = {
  backupEnabled: true, backupFrequency: 'weekly', backupSince: null, summaryEnabled: true, summaryFrequency: 'weekly', summarySince: null,
  renewalEnabled: true, reminderHour: reminderPresets.morning,
};

// State of one archive (`nummo.notifications.v1.<scope>`, scope = `local` or the Firebase UID), so the two modes never mix.
// `startedAt`: first time this archive was checked; `lastBackupAt`: last JSON backup confirmed by the user;
// `summaryShownThrough`: last day of the last summary shown and closed.
export type NotificationState = Readonly<{
  startedAt: string; lastBackupAt: string | null; backupSnoozedUntil: string | null; summaryShownThrough: string | null;
}>;
export const notificationStateKey = (scope: string): string => `${notificationPreferencesKey}.${scope}`;
export const newNotificationState = (now: Date): NotificationState => ({ startedAt: now.toISOString(), lastBackupAt: null, backupSnoozedUntil: null, summaryShownThrough: null });

const isCivilDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
};
const object = (raw: string | null): Record<string, unknown> => {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  return typeof data === 'object' && data !== null && !Array.isArray(data) ? data as Record<string, unknown> : {};
};
const frequency = (value: unknown, fallback: NotificationFrequency): NotificationFrequency =>
  (notificationFrequencies as readonly unknown[]).includes(value) ? value as NotificationFrequency : fallback;
const flag = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;
const timestamp = (value: unknown): string | null => isUtcTimestamp(value) ? value : null;

// Untrusted input (localStorage can be edited or corrupted): every field falls back on its own. A main switch saved
// off by earlier versions (`enabled: false`) turns both reminders off, so nothing starts again on its own.
export function parseNotificationPreferences(raw: string | null): NotificationPreferences {
  const o = object(raw);
  const d = defaultNotificationPreferences;
  const off = o.enabled === false;
  return {
    backupEnabled: !off && flag(o.backupEnabled, d.backupEnabled), backupFrequency: frequency(o.backupFrequency, d.backupFrequency), backupSince: timestamp(o.backupSince),
    summaryEnabled: !off && flag(o.summaryEnabled, d.summaryEnabled), summaryFrequency: frequency(o.summaryFrequency, d.summaryFrequency), summarySince: timestamp(o.summarySince),
    renewalEnabled: !off && flag(o.renewalEnabled, d.renewalEnabled),
    reminderHour: Number.isInteger(o.reminderHour) && (o.reminderHour as number) >= reminderHourRange.min && (o.reminderHour as number) <= reminderHourRange.max ? o.reminderHour as number : d.reminderHour,
  };
}
// A missing or damaged state starts afresh at `now`: nothing becomes due at once.
export function parseNotificationState(raw: string | null, now: Date): NotificationState {
  const o = object(raw);
  const startedAt = timestamp(o.startedAt);
  if (!startedAt) return newNotificationState(now);
  return { startedAt, lastBackupAt: timestamp(o.lastBackupAt), backupSnoozedUntil: timestamp(o.backupSnoozedUntil), summaryShownThrough: isCivilDate(o.summaryShownThrough) ? o.summaryShownThrough : null };
}

export const backupActive = (p: NotificationPreferences): boolean => p.backupEnabled;
export const summaryActive = (p: NotificationPreferences): boolean => p.summaryEnabled;
export const renewalActive = (p: NotificationPreferences): boolean => p.renewalEnabled;

// Applies a change from the settings page. A reminder that becomes active (again) starts counting from now; a new
// summary frequency starts with the period in progress, so neither fires at once for time already passed.
export function changeNotificationPreferences(previous: NotificationPreferences, change: Partial<NotificationPreferences>, now: Date): NotificationPreferences {
  const next = { ...previous, ...change };
  const at = now.toISOString();
  return {
    ...next,
    backupSince: backupActive(next) && !backupActive(previous) ? at : next.backupSince,
    summarySince: (summaryActive(next) && !summaryActive(previous)) || next.summaryFrequency !== previous.summaryFrequency ? at : next.summarySince,
  };
}

// Compared as instants: a stored timestamp may omit the milliseconds.
const later = (...values: (string | null)[]): string | null => values.reduce<string | null>((max, value) => value !== null && (max === null || Date.parse(value) > Date.parse(max)) ? value : max, null);

// Timestamp + one interval. A month is a calendar month, clamped to its last day (31 Jan → 28/29 Feb).
export function addInterval(iso: string, frequency: NotificationFrequency): Date {
  const date = new Date(iso);
  if (frequency !== 'monthly') return new Date(date.getTime() + (frequency === 'weekly' ? 7 : 14) * 86_400_000);
  const day = date.getUTCDate();
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next;
}

// The backup reminder (Standard mode only: the caller passes `lastChange` only for the device archive). Due when the
// interval has passed since the last confirmed backup (or since it became active, whichever is later), the data has
// changed since that backup, and it is not postponed.
export function backupReminderDue(input: { preferences: NotificationPreferences; state: NotificationState; lastChange: string | null; now: Date }): boolean {
  const { preferences, state, lastChange, now } = input;
  if (!backupActive(preferences) || !lastChange) return false;
  if (state.lastBackupAt && Date.parse(lastChange) <= Date.parse(state.lastBackupAt)) return false;
  if (state.backupSnoozedUntil && now.getTime() < Date.parse(state.backupSnoozedUntil)) return false;
  const base = later(state.startedAt, state.lastBackupAt, preferences.backupSince)!;
  return now.getTime() >= addInterval(base, preferences.backupFrequency).getTime();
}

// Postpones the reminder by `backupSnoozeDays`.
export const snoozeBackup = (state: NotificationState, now: Date): NotificationState =>
  ({ ...state, backupSnoozedUntil: new Date(now.getTime() + backupSnoozeDays * 86_400_000).toISOString() });
// A full backup was downloaded at `exportedAt`. Never moves the date backwards.
export const recordBackup = (state: NotificationState, exportedAt: string): NotificationState =>
  ({ ...state, lastBackupAt: later(state.lastBackupAt, exportedAt), backupSnoozedUntil: null });

// Summary periods are calendar-aligned civil dates (Europe/Rome): Monday–Sunday weeks, two-week blocks counted from
// Monday 1 January 2024, calendar months. `summaryPeriod` is the latest one that has fully ended before `today`.
export type Period = Readonly<{ from: string; to: string }>;
const biweeklyEpoch = '2024-01-01';
const dayNumber = (date: string): number => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
export function summaryPeriod(frequency: NotificationFrequency, today: string): Period {
  if (frequency === 'monthly') {
    const first = `${today.slice(0, 7)}-01`;
    const to = addDays(first, -1);
    return { from: `${to.slice(0, 7)}-01`, to };
  }
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday);
  if (frequency === 'weekly') return { from: addDays(monday, -7), to: addDays(monday, -1) };
  const offset = ((dayNumber(today) - dayNumber(biweeklyEpoch)) % 14 + 14) % 14;
  const current = addDays(today, -offset);
  return { from: addDays(current, -14), to: addDays(current, -1) };
}

export type SpendingSummary = Readonly<{ period: Period; total: number; count: number; top: { id: string; label: string; amount: number } | null }>;
// One-off expenses only: every recurring series (subscriptions and their whole payment history) is left out, and so is
// anything dated after `today`. Same occurrence rules as the rest of the app (`expandOccurrences`).
export function spendingSummary(expenses: readonly ExpenseEntry[], categories: readonly Category[], period: Period, today: string): SpendingSummary {
  const oneOff = expandOccurrences(expenses.filter((entry) => entry.recurrence === null), today)
    .filter((item) => item.date >= period.from && item.date <= period.to && item.date <= today);
  const labels = new Map(categories.map((category) => [category.id, category.label]));
  const byCategory = new Map<string, number>();
  for (const item of oneOff) if (item.category_id && labels.has(item.category_id)) byCategory.set(item.category_id, (byCategory.get(item.category_id) ?? 0) + item.amount_minor);
  let top: SpendingSummary['top'] = null;
  for (const [id, amount] of byCategory) {
    const label = labels.get(id)!;
    if (amount > 0 && (!top || amount > top.amount || (amount === top.amount && label.localeCompare(top.label) < 0))) top = { id, label, amount };
  }
  return { period, total: oneOff.reduce((sum, item) => sum + item.amount_minor, 0), count: oneOff.length, top };
}

// A summary period seen (its notification opened): remembered so that it is not offered again.
export const closeSummary = (state: NotificationState, period: Period): NotificationState =>
  ({ ...state, summaryShownThrough: state.summaryShownThrough && state.summaryShownThrough > period.to ? state.summaryShownThrough : period.to });
