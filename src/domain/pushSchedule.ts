// System (push) notifications: when each reminder must be delivered, computed on the device from the same rules as
// `notifications.ts`. Only the resulting times (and a summary's dates) leave the device: the push service never sees
// amounts, categories or descriptions, and sends a generic message that the app's service worker words.
import type { Category } from './category.ts';
import { addDays, forecastOccurrences, type ExpenseEntry } from './history.ts';
import {
  addInterval, backupActive, renewalActive, spendingSummary, summaryActive, summaryPeriod,
  type NotificationFrequency, type NotificationPreferences, type NotificationState, type Period,
} from './notifications.ts';
import { todayInRome } from './policy.ts';
import { autoTimeZone } from './timeZones.ts';

export type PushJob =
  | { kind: 'backup'; at: string; key: 'backup'; repeatDays: 7 | 14 | 30 }
  | { kind: 'summary'; at: string; key: string; from: string; to: string }
  // `from` = `to` = the renewal date: the only thing the push service learns about a subscription (no name, no amount).
  | { kind: 'renewal'; at: string; key: string; from: string; to: string };

// Reminders arrive at the hour the user chose (`preferences.reminderHour`, 7–22; 9:00 by default) on the clock of the device's time
// zone (`timeZone`, Europe/Rome when none is given): a person in London who picks 9:00 gets the reminder at 9:00 in London.
// Calendar dates (periods, renewal dates) stay civil Rome dates, as everywhere else in the app.
const repeatDays: Record<NotificationFrequency, 7 | 14 | 30> = { weekly: 7, biweekly: 14, monthly: 30 };
export const defaultTimeZone = 'Europe/Rome';

// The device's IANA time zone, or Rome when the browser does not say (or says something unusable).
export function deviceTimeZone(): string {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return zone || defaultTimeZone;
  } catch { return defaultTimeZone; }
}

// The zone to use for a stored choice: «auto» = the device's, otherwise the chosen IANA name.
export const resolveTimeZone = (choice: string): string => (choice === autoTimeZone ? deviceTimeZone() : choice);

// One formatter per zone: the schedule converts many instants in the same zone.
const zoneClocks = new Map<string, Intl.DateTimeFormat>();
const zoneParts = (zone: string, at: number) => {
  let clock = zoneClocks.get(zone);
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    zoneClocks.set(zone, clock);
  }
  return Object.fromEntries(clock.formatToParts(new Date(at)).map((p) => [p.type, p.value]));
};
// Minutes east of UTC in a zone at an instant (Rome: CET +60, CEST +120).
function zoneOffset(zone: string, at: number): number {
  const parts = zoneParts(zone, at);
  return (Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!) - Math.floor(at / 60_000) * 60_000) / 60_000;
}
// The civil date (YYYY-MM-DD) of an instant in a zone.
function zoneDay(zone: string, at: Date): string {
  const parts = zoneParts(zone, at.getTime());
  return `${parts.year}-${parts.month}-${parts.day}`;
}
// The instant of a civil date and hour in a zone.
export function zoneInstant(date: string, hour: number, zone: string = defaultTimeZone): Date {
  const local = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  const guess = local - zoneOffset(zone, local) * 60_000;
  return new Date(local - zoneOffset(zone, guess) * 60_000);
}
export const romeInstant = (date: string, hour: number): Date => zoneInstant(date, hour, defaultTimeZone);
// The first moment at or after `from` that falls on the whole `hour` in the zone (today's if still ahead, else tomorrow's).
export function nextAtHour(from: Date, hour: number, zone: string = defaultTimeZone): Date {
  const day = zoneDay(zone, from);
  const today = zoneInstant(day, hour, zone);
  return today.getTime() >= from.getTime() ? today : zoneInstant(addDays(day, 1), hour, zone);
}
const later = (...values: (string | null)[]): string | null => values.reduce<string | null>((max, value) => value !== null && (max === null || Date.parse(value) > Date.parse(max)) ? value : max, null);

// The backup reminder (Standard only: `lastChange` is the device archive's clock). Same condition as
// `backupReminderDue`: data changed after the last confirmed backup; due one interval after that backup (or after the
// reminder became active), not before a postponement ends. Repeated by the service while the app does not cancel it:
// the data cannot change without the app being open, so the condition stays true until then.
export function backupJob(input: { preferences: NotificationPreferences; state: NotificationState; lastChange: string | null; now: Date; timeZone?: string }): PushJob | null {
  const { preferences, state, lastChange, now, timeZone } = input;
  if (!backupActive(preferences) || !lastChange) return null;
  if (state.lastBackupAt && Date.parse(lastChange) <= Date.parse(state.lastBackupAt)) return null;
  const base = later(state.startedAt, state.lastBackupAt, preferences.backupSince)!;
  let due = addInterval(base, preferences.backupFrequency);
  if (state.backupSnoozedUntil && Date.parse(state.backupSnoozedUntil) > due.getTime()) due = new Date(state.backupSnoozedUntil);
  if (due.getTime() < now.getTime()) due = now;
  return { kind: 'backup', at: nextAtHour(due, preferences.reminderHour, timeZone).toISOString(), key: 'backup', repeatDays: repeatDays[preferences.backupFrequency] };
}

// The period that follows `period` with the same frequency.
export function nextPeriod(frequency: NotificationFrequency, period: Period): Period {
  const from = addDays(period.to, 1);
  if (frequency !== 'monthly') return { from, to: addDays(from, frequency === 'weekly' ? 6 : 13) };
  const [year, month] = from.split('-').map(Number) as [number, number];
  return { from, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
}

// The next summary to deliver: at the chosen hour the day after a period ends, for the period that just ended (if that moment is
// still ahead) or the one in progress. Only when the period already contains at least one one-off expense: a summary
// is never announced for an empty period. An expense added later reschedules it (the app sends the times again).
export function summaryJob(input: { preferences: NotificationPreferences; state: NotificationState; expenses: readonly ExpenseEntry[];
  categories: readonly Category[]; now: Date; timeZone?: string }): PushJob | null {
  const { preferences, state, expenses, categories, now, timeZone } = input;
  if (!summaryActive(preferences)) return null;
  const since = todayInRome(new Date(later(state.startedAt, preferences.summarySince)!));
  const ended = summaryPeriod(preferences.summaryFrequency, todayInRome(now));
  for (const period of [ended, nextPeriod(preferences.summaryFrequency, ended)]) {
    const at = zoneInstant(addDays(period.to, 1), preferences.reminderHour, timeZone);
    if (at.getTime() <= now.getTime() || period.to < since) continue;
    if (state.summaryShownThrough && period.to <= state.summaryShownThrough) continue;
    if (spendingSummary(expenses, categories, period, period.to).count === 0) continue;
    return { kind: 'summary', at: at.toISOString(), key: `summary:${period.to}`, from: period.from, to: period.to };
  }
  return null;
}

// Subscription reminder: at the chosen hour the day before the next renewal of an active subscription (pauses, cancellations and
// trials are already part of `forecastOccurrences`). Only a renewal whose reminder is still ahead counts: one already
// announced, or too close to be announced, is skipped in favour of the next. The service holds one such reminder at a
// time, so the following one is scheduled when the app next sends its times (every start and every change).
export const renewalLeadDays = 1;
const renewalHorizonDays = 45;
export function renewalJob(input: { preferences: NotificationPreferences; expenses: readonly ExpenseEntry[]; now: Date; timeZone?: string }): PushJob | null {
  const { preferences, expenses, now, timeZone } = input;
  if (!renewalActive(preferences)) return null;
  const today = todayInRome(now);
  let best: { date: string; at: Date } | null = null;
  for (const item of forecastOccurrences(expenses, today, addDays(today, renewalHorizonDays))) {
    const at = zoneInstant(addDays(item.date, -renewalLeadDays), preferences.reminderHour, timeZone);
    if (at.getTime() <= now.getTime() || (best && item.date >= best.date)) continue;
    best = { date: item.date, at };
  }
  return best && { kind: 'renewal', at: best.at.toISOString(), key: `renewal:${best.date}`, from: best.date, to: best.date };
}

export function pushJobs(input: Parameters<typeof summaryJob>[0] & { lastChange: string | null }): PushJob[] {
  return [backupJob(input), summaryJob(input), renewalJob(input)].filter((job): job is PushJob => job !== null);
}
