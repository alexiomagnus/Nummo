import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExpenseEntry } from '../src/domain/history.ts';
import { defaultNotificationPreferences, newNotificationState, snoozeBackup, recordBackup } from '../src/domain/notifications.ts';
import { backupJob, nextAtHour, nextPeriod, pushJobs, renewalJob, romeInstant, summaryJob } from '../src/domain/pushSchedule.ts';

const p = defaultNotificationPreferences;
const start = new Date('2026-11-01T10:00:00.000Z');
const state = newNotificationState(start);
const expense = (id: string, date: string, recurrence: ExpenseEntry['recurrence'] = null, amount = 1000) =>
  ({ id, description: id, amount_minor: amount, expense_date: date, category_id: null, recurrence } as unknown as ExpenseEntry);

test('push: orari di Roma con ora legale e fascia diurna 9–21', () => {
  assert.equal(romeInstant('2026-11-16', 9).toISOString(), '2026-11-16T08:00:00.000Z');
  assert.equal(romeInstant('2026-07-06', 9).toISOString(), '2026-07-06T07:00:00.000Z');
  assert.equal(romeInstant('2026-03-29', 9).toISOString(), '2026-03-29T07:00:00.000Z'); // DST starts that night
  // The chosen hour: today's if still ahead, otherwise tomorrow's.
  assert.equal(nextAtHour(new Date('2026-11-16T23:30:00Z'), 9).toISOString(), '2026-11-17T08:00:00.000Z');
  assert.equal(nextAtHour(new Date('2026-11-16T05:00:00Z'), 9).toISOString(), '2026-11-16T08:00:00.000Z');
  assert.equal(nextAtHour(new Date('2026-11-16T12:34:00Z'), 9).toISOString(), '2026-11-17T08:00:00.000Z');
  assert.equal(nextAtHour(new Date('2026-11-16T12:34:00Z'), 19).toISOString(), '2026-11-16T18:00:00.000Z');
  assert.equal(nextAtHour(new Date('2026-07-06T05:00:00Z'), 13).toISOString(), '2026-07-06T11:00:00.000Z'); // summer time
});

test('push: promemoria backup solo con dati cambiati dopo l’ultimo backup, rinvio di 3 giorni rispettato', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.equal(backupJob({ preferences: p, state, lastChange: null, now }), null);
  const job = backupJob({ preferences: p, state, lastChange: '2026-11-02T10:00:00Z', now });
  assert.deepEqual(job, { kind: 'backup', at: '2026-11-09T08:00:00.000Z', key: 'backup', repeatDays: 7 }); // due on the 8th at 11:00 → next 9:00
  const backedUp = recordBackup(state, '2026-11-02T11:00:00.000Z');
  assert.equal(backupJob({ preferences: p, state: backedUp, lastChange: '2026-11-02T10:00:00Z', now }), null);
  // Overdue at the moment of computing: delivered at the next chosen hour, then repeated by the service.
  const overdue = backupJob({ preferences: p, state, lastChange: '2026-11-02T10:00:00Z', now: new Date('2026-11-20T21:30:00Z') });
  assert.equal(overdue?.at, '2026-11-21T08:00:00.000Z');
  const snoozed = snoozeBackup(state, new Date('2026-11-20T10:00:00Z'));
  assert.equal(backupJob({ preferences: p, state: snoozed, lastChange: '2026-11-02T10:00:00Z', now: new Date('2026-11-20T10:00:00Z') })?.at, '2026-11-24T08:00:00.000Z');
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

test('push: promemoria dei rinnovi alle 9 del giorno prima, solo per abbonamenti attivi, mai un orario già passato', () => {
  const monthly = (id: string, date: string, over: object = {}) => ({ ...expense(id, date, 'monthly'), ...over }) as ExpenseEntry;
  const now = new Date('2026-11-14T10:00:00Z'); // Saturday
  const renewals = [monthly('a', '2026-01-20'), monthly('b', '2026-01-18')];
  // Next renewals: 18 Nov (b) and 20 Nov (a) → reminder on the 17th at 9:00 Rome (8:00 UTC), for the earliest.
  assert.deepEqual(renewalJob({ preferences: p, expenses: renewals, now }),
    { kind: 'renewal', at: '2026-11-17T08:00:00.000Z', key: 'renewal:2026-11-18', from: '2026-11-18', to: '2026-11-18' });
  // The 17th at 9:00 has passed: the next renewal's reminder is used (a, on the 19th).
  assert.equal(renewalJob({ preferences: p, expenses: renewals, now: new Date('2026-11-17T09:30:00Z') })!.key, 'renewal:2026-11-20');
  // Off, or nothing active: no job. A pause or cancellation removes the renewals that would not be paid.
  assert.equal(renewalJob({ preferences: { ...p, renewalEnabled: false }, expenses: renewals, now }), null);
  assert.equal(renewalJob({ preferences: p, expenses: [expense('x', '2026-11-01')], now }), null, 'spese singole: nessun rinnovo');
  const cancelled = renewals.map((item) => ({ ...item, status_changes: [{ date: '2026-11-10', status: 'cancelled' }] }) as ExpenseEntry);
  assert.equal(renewalJob({ preferences: p, expenses: cancelled, now }), null);
  // Only a date leaves the device: no name and no amount in the job.
  assert.deepEqual(Object.keys(renewalJob({ preferences: p, expenses: [monthly('Netflix', '2026-01-20', { amount_minor: 1299 })], now })!), ['kind', 'at', 'key', 'from', 'to']);
  assert.deepEqual(pushJobs({ preferences: p, state, expenses: renewals, categories: [], now, lastChange: null }).map((job) => job.kind), ['renewal']);
});

test('push: l’orario scelto vale per promemoria backup, riepilogo e rinnovo', () => {
  const evening = { ...p, reminderHour: 19 };
  const now = new Date('2026-11-18T10:00:00Z');
  assert.equal(summaryJob({ preferences: evening, state, expenses: [expense('a', '2026-11-17')], categories: [], now })?.at, '2026-11-23T18:00:00.000Z');
  const monthly = (id: string, date: string) => ({ ...expense(id, date, 'monthly') }) as ExpenseEntry;
  assert.equal(renewalJob({ preferences: { ...p, reminderHour: 13 }, expenses: [monthly('a', '2026-01-20')], now })?.at, '2026-11-19T12:00:00.000Z');
  assert.equal(backupJob({ preferences: evening, state, lastChange: '2026-11-02T10:00:00Z', now: new Date('2026-11-03T10:00:00Z') })?.at, '2026-11-08T18:00:00.000Z');
});
