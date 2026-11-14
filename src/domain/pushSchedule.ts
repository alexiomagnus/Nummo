// System (push) notifications: when each reminder must be delivered, computed on the device from the same rules as
// `notifications.ts`. Only the resulting times (and a summary's dates) leave the device: the push service never sees
// amounts, categories or descriptions, and sends a generic message that the app's service worker words.
import type { Category } from './category.ts';
import { addDays, type ExpenseEntry } from './history.ts';
import {
  addInterval, backupActive, spendingSummary, summaryActive, summaryPeriod,
  type NotificationFrequency, type NotificationPreferences, type NotificationState, type Period,
} from './notifications.ts';
import { todayInRome } from './policy.ts';

export type PushJob =
  | { kind: 'backup'; at: string; key: 'backup'; repeatDays: 7 | 14 | 30 }
  | { kind: 'summary'; at: string; key: string; from: string; to: string };

// Reminders arrive in the daytime, Europe/Rome: from 9:00 to 21:00.
export const quietHours = { start: 9, end: 21 } as const;
const repeatDays: Record<NotificationFrequency, 7 | 14 | 30> = { weekly: 7, biweekly: 14, monthly: 30 };

// Minutes east of UTC in Rome at an instant (CET +60, CEST +120).
function romeOffset(at: number): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return (Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!) - Math.floor(at / 60_000) * 60_000) / 60_000;
}
// The instant of a civil date and hour in Rome.
export function romeInstant(date: string, hour: number): Date {
  const local = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  const guess = local - romeOffset(local) * 60_000;
  return new Date(local - romeOffset(guess) * 60_000);
}
const romeHour = (at: Date): number => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(at));
// Moves an instant inside the daytime window (a night reminder waits for the morning).
export function daytime(at: Date): Date {
  const hour = romeHour(at);
  if (hour >= quietHours.start && hour < quietHours.end) return at;
  const date = todayInRome(at);
  return romeInstant(hour < quietHours.start ? date : addDays(date, 1), quietHours.start);
}
const later = (...values: (string | null)[]): string | null => values.reduce<string | null>((max, value) => value !== null && (max === null || Date.parse(value) > Date.parse(max)) ? value : max, null);

// The backup reminder (Standard only: `lastChange` is the device archive's clock). Same condition as
// `backupReminderDue`: data changed after the last confirmed backup; due one interval after that backup (or after the
// reminder became active), not before a postponement ends. Repeated by the service while the app does not cancel it:
// the data cannot change without the app being open, so the condition stays true until then.
export function backupJob(input: { preferences: NotificationPreferences; state: NotificationState; lastChange: string | null; now: Date }): PushJob | null {
  const { preferences, state, lastChange, now } = input;
  if (!backupActive(preferences) || !lastChange) return null;
  if (state.lastBackupAt && Date.parse(lastChange) <= Date.parse(state.lastBackupAt)) return null;
  const base = later(state.startedAt, state.lastBackupAt, preferences.backupSince)!;
  let due = addInterval(base, preferences.backupFrequency);
  if (state.backupSnoozedUntil && Date.parse(state.backupSnoozedUntil) > due.getTime()) due = new Date(state.backupSnoozedUntil);
  if (due.getTime() < now.getTime()) due = now;
  return { kind: 'backup', at: daytime(due).toISOString(), key: 'backup', repeatDays: repeatDays[preferences.backupFrequency] };
}

// The period that follows `period` with the same frequency.
export function nextPeriod(frequency: NotificationFrequency, period: Period): Period {
  const from = addDays(period.to, 1);
  if (frequency !== 'monthly') return { from, to: addDays(from, frequency === 'weekly' ? 6 : 13) };
  const [year, month] = from.split('-').map(Number) as [number, number];
  return { from, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
}

// The next summary to deliver: at 9:00 the day after a period ends, for the period that just ended (if that moment is
// still ahead) or the one in progress. Only when the period already contains at least one one-off expense: a summary
// is never announced for an empty period. An expense added later reschedules it (the app sends the times again).
export function summaryJob(input: { preferences: NotificationPreferences; state: NotificationState; expenses: readonly ExpenseEntry[];
  categories: readonly Category[]; now: Date }): PushJob | null {
  const { preferences, state, expenses, categories, now } = input;
  if (!summaryActive(preferences)) return null;
  const since = todayInRome(new Date(later(state.startedAt, preferences.summarySince)!));
  const ended = summaryPeriod(preferences.summaryFrequency, todayInRome(now));
  for (const period of [ended, nextPeriod(preferences.summaryFrequency, ended)]) {
    const at = romeInstant(addDays(period.to, 1), quietHours.start);
    if (at.getTime() <= now.getTime() || period.to < since) continue;
    if (state.summaryShownThrough && period.to <= state.summaryShownThrough) continue;
    if (spendingSummary(expenses, categories, period, period.to).count === 0) continue;
    return { kind: 'summary', at: at.toISOString(), key: `summary:${period.to}`, from: period.from, to: period.to };
  }
  return null;
}

export function pushJobs(input: Parameters<typeof summaryJob>[0] & { lastChange: string | null }): PushJob[] {
  return [backupJob(input), summaryJob(input)].filter((job): job is PushJob => job !== null);
}
