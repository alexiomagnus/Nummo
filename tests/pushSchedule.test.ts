import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExpenseEntry } from '../src/domain/history.ts';
import { defaultNotificationPreferences, newNotificationState, snoozeBackup, confirmBackup } from '../src/domain/notifications.ts';
import { backupJob, daytime, nextPeriod, pushJobs, romeInstant, summaryJob } from '../src/domain/pushSchedule.ts';

const p = defaultNotificationPreferences;
const start = new Date('2026-11-01T10:00:00.000Z');
const state = newNotificationState(start);
const expense = (id: string, date: string, recurrence: ExpenseEntry['recurrence'] = null, amount = 1000) =>
  ({ id, description: id, amount_minor: amount, expense_date: date, category_id: null, recurrence } as unknown as ExpenseEntry);

test('push: orari di Roma con ora legale e fascia diurna 9–21', () => {
  assert.equal(romeInstant('2026-11-16', 9).toISOString(), '2026-11-16T08:00:00.000Z');
  assert.equal(romeInstant('2026-07-06', 9).toISOString(), '2026-07-06T07:00:00.000Z');
  assert.equal(romeInstant('2026-03-29', 9).toISOString(), '2026-03-29T07:00:00.000Z'); // DST starts that night
  assert.equal(daytime(new Date('2026-11-16T23:30:00Z')).toISOString(), '2026-11-17T08:00:00.000Z');
  assert.equal(daytime(new Date('2026-11-16T05:00:00Z')).toISOString(), '2026-11-16T08:00:00.000Z');
  assert.equal(daytime(new Date('2026-11-16T12:34:00Z')).toISOString(), '2026-11-16T12:34:00.000Z');
});

test('push: promemoria backup solo con dati cambiati dopo l’ultimo backup confermato, rinvio di 3 giorni rispettato', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.equal(backupJob({ preferences: p, state, lastChange: null, now }), null);
  const job = backupJob({ preferences: p, state, lastChange: '2026-11-02T10:00:00Z', now });
  assert.deepEqual(job, { kind: 'backup', at: '2026-11-08T10:00:00.000Z', key: 'backup', repeatDays: 7 });
  const backedUp = confirmBackup(state, '2026-11-02T11:00:00.000Z');
  assert.equal(backupJob({ preferences: p, state: backedUp, lastChange: '2026-11-02T10:00:00Z', now }), null);
  // Overdue at the moment of computing: delivered now (or at 9:00 if it is night), then repeated by the service.
  const overdue = backupJob({ preferences: p, state, lastChange: '2026-11-02T10:00:00Z', now: new Date('2026-11-20T21:30:00Z') });
  assert.equal(overdue?.at, '2026-11-21T08:00:00.000Z');
  const snoozed = snoozeBackup(state, new Date('2026-11-20T10:00:00Z'));
  assert.equal(backupJob({ preferences: p, state: snoozed, lastChange: '2026-11-02T10:00:00Z', now: new Date('2026-11-20T10:00:00Z') })?.at, '2026-11-23T10:00:00.000Z');
  assert.equal(backupJob({ preferences: { ...p, backupEnabled: false }, state, lastChange: '2026-11-02T10:00:00Z', now }), null);
  assert.equal((backupJob({ preferences: { ...p, backupFrequency: 'monthly' }, state, lastChange: '2026-11-02T10:00:00Z', now }) as { repeatDays?: number } | null)?.repeatDays, 30);
});

test('push: riepilogo alle 9 del giorno dopo la fine del periodo, solo con spese singole nel periodo', () => {
  const now = new Date('2026-11-18T10:00:00Z'); // Wednesday
  assert.equal(summaryJob({ preferences: p, state, expenses: [], categories: [], now }), null);
  // Only a subscription: excluded, nothing announced.
  assert.equal(summaryJob({ preferences: p, state, expenses: [expense('s', '2026-11-17', 'monthly')], categories: [], now }), null);
  const job = summaryJob({ preferences: p, state, expenses: [expense('a', '2026-11-17')], categories: [], now });
  assert.deepEqual(job, { kind: 'summary', at: '2026-11-23T08:00:00.000Z', key: 'summary:2026-11-22', from: '2026-11-16', to: '2026-11-22' });
  // An expense dated later in the same period counts too (it will be in the past at delivery).
  assert.equal(summaryJob({ preferences: p, state, expenses: [expense('b', '2026-11-21')], categories: [], now })?.key, 'summary:2026-11-22');
  assert.equal(summaryJob({ preferences: p, state, expenses: [expense('c', '2026-11-25')], categories: [], now }), null);
  // Monday 8:00 in Rome: last week's summary is still ahead (9:00).
  const monday = summaryJob({ preferences: p, state, expenses: [expense('d', '2026-11-12')], categories: [], now: new Date('2026-11-16T07:00:00Z') });
  assert.equal(monday?.key, 'summary:2026-11-15');
  // Already shown in the app: not announced again.
  assert.equal(summaryJob({ preferences: p, state: { ...state, summaryShownThrough: '2026-11-15' }, expenses: [expense('d', '2026-11-12')], categories: [], now: new Date('2026-11-16T07:00:00Z') }), null);
  // Monthly and every 14 days follow the calendar periods.
  const monthly = summaryJob({ preferences: { ...p, summaryFrequency: 'monthly' }, state, expenses: [expense('e', '2026-11-05')], categories: [], now });
  assert.equal(monthly?.at, '2026-12-01T08:00:00.000Z');
  assert.deepEqual(nextPeriod('biweekly', { from: '2026-11-02', to: '2026-11-15' }), { from: '2026-11-16', to: '2026-11-29' });
  assert.deepEqual(nextPeriod('monthly', { from: '2026-01-01', to: '2026-01-31' }), { from: '2026-02-01', to: '2026-02-28' });
  // Periods ending before the summary was turned on are never announced.
  const late = summaryJob({ preferences: { ...p, summarySince: '2026-11-20T10:00:00.000Z' }, state, expenses: [expense('f', '2026-11-17')], categories: [], now: new Date('2026-11-20T11:00:00Z') });
  assert.equal(late?.key, 'summary:2026-11-22');
  assert.equal(summaryJob({ preferences: { ...p, summaryEnabled: false }, state, expenses: [expense('a', '2026-11-17')], categories: [], now }), null);
});

test('push: entrambi gli avvisi spenti = nessun promemoria', () => {
  const input = { preferences: { ...p, backupEnabled: false, summaryEnabled: false }, state, expenses: [expense('a', '2026-11-17')], categories: [], now: new Date('2026-11-18T10:00:00Z'), lastChange: '2026-11-17T10:00:00Z' };
  assert.deepEqual(pushJobs(input), []);
  assert.equal(pushJobs({ ...input, preferences: p }).length, 2);
});
