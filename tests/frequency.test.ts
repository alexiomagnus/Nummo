import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { parseExpenseRecord, parseExpenseRequest, type ExpenseRecord } from '../src/domain/contract.ts';
import { applyFrequencyChange, applyPriceEdit, currentPrice, dataOf } from '../src/domain/expense.ts';
import { expandOccurrences, forecastOccurrences, subscriptionSummary, upcomingRenewals, type ExpenseEntry } from '../src/domain/history.ts';
import { nextRenewal } from '../src/domain/pricing.ts';
import {
  decodeCalendarChanges, encodeCalendarChanges, occurrenceDates, parseCalendarChanges, recurrenceAt, scheduleDateAt, scheduleDates, switchFrequency, type CalendarChange,
} from '../src/domain/recurrence.ts';

const today = '2026-11-10';
const entry = (over: Partial<ExpenseEntry> = {}): ExpenseEntry => ({ id: 'a', amount_minor: 1000, description: 'Serie', category_id: null, expense_date: '2026-08-15',
  recurrence: 'monthly', created_at: '2026-08-15T10:00:00.000Z', ...over });
const record = (over: Partial<ExpenseRecord> = {}): ExpenseRecord => ({ id: '11111111-1111-4111-8111-111111111111', amount_minor: 1000, currency: 'EUR', description: 'Serie',
  category_id: null, expense_date: '2026-08-15', recurrence: 'monthly', price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app',
  schema_version: 1, created_at: '2026-08-15T10:00:00.000Z', ...over });

test('calendario: senza cambi identico al calendario originale per ogni frequenza', () => {
  for (const recurrence of ['weekly', 'monthly', 'yearly'] as const) {
    assert.deepEqual(scheduleDates('2024-01-31', recurrence, [], '2030-01-01'), occurrenceDates('2024-01-31', recurrence, '2030-01-01'));
  }
  const plain = entry();
  assert.deepEqual(expandOccurrences([plain], today), expandOccurrences([{ ...plain, calendar_changes: [] }], today));
});

test('calendario: mensile → annuale conserva le date passate e riparte dalla nuova data', () => {
  // Paid 15 Aug, 15 Sep, 15 Oct; next (index 3) would be 15 Nov, switched to yearly from 2026-12-01.
  const changes: CalendarChange[] = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }];
  assert.deepEqual(scheduleDates('2026-08-15', 'monthly', changes, '2028-01-01'), ['2026-08-15', '2026-09-15', '2026-10-15', '2026-12-01', '2027-12-01']);
  assert.equal(recurrenceAt('monthly', changes, 2), 'monthly');
  assert.equal(recurrenceAt('monthly', changes, 3), 'yearly');
  const before = expandOccurrences([entry()], today).map((o) => [o.date, o.amount_minor]);
  const after = expandOccurrences([entry({ calendar_changes: changes })], today).map((o) => [o.date, o.amount_minor]);
  assert.deepEqual(after, before);
});

test('calendario: prezzi per numero di rinnovo e frequenza per occorrenza seguono il cambio', () => {
  const changes: CalendarChange[] = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }];
  const series = entry({ calendar_changes: changes, price_changes: [{ index: 4, amount_minor: 1500, once: false }] });
  const forecast = forecastOccurrences([series], today, '2027-12-31');
  assert.deepEqual(forecast.map((o) => [o.date, o.amount_minor, o.recurrence]), [['2026-12-01', 1000, 'yearly'], ['2027-12-01', 1500, 'yearly']]);
  const paid = expandOccurrences([series], today);
  assert.deepEqual(paid.map((o) => o.recurrence), ['monthly', 'monthly', 'monthly']);
  assert.deepEqual(nextRenewal('2026-08-15', 'monthly', today, changes), { index: 3, date: '2026-12-01' });
  assert.equal(upcomingRenewals([series], today)[0]?.occurrence.date, '2026-12-01');
  assert.equal(subscriptionSummary(series, today).next?.date, '2026-12-01');
});

test('calendario: pause e annullamenti per data restano validi dopo il cambio', () => {
  const changes: CalendarChange[] = [{ index: 3, start: '2026-12-01', recurrence: 'weekly' }];
  const series = entry({ calendar_changes: changes, status_changes: [{ date: '2026-12-09', status: 'paused' }, { date: '2026-12-20', status: 'active' }] });
  const dates = forecastOccurrences([series], today, '2026-12-31').map((o) => o.date);
  assert.deepEqual(dates, ['2026-12-01', '2026-12-08', '2026-12-22', '2026-12-29']);
});

test('calendario: fine mese e anni bisestili nel nuovo segmento', () => {
  assert.deepEqual(scheduleDates('2026-01-10', 'weekly', [{ index: 2, start: '2026-01-31', recurrence: 'monthly' }], '2026-05-31'),
    ['2026-01-10', '2026-01-17', '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  assert.equal(scheduleDateAt('2026-01-10', 'weekly', [{ index: 1, start: '2027-02-28', recurrence: 'yearly' }], 3), '2029-02-28');
});

test('applyFrequencyChange: cambio futuro, schema 3, nessun pagamento maturato modificato', () => {
  const base = { expense_date: '2026-08-15', recurrence: 'monthly' as const, schema_version: 1 as const };
  const result = applyFrequencyChange(base, { recurrence: 'yearly', firstDate: '2026-12-01' }, today);
  assert.deepEqual(result, { ok: true, recurrence: 'monthly', calendar_changes: [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }], schema_version: 3 });
  // Same frequency, no edit: unchanged and still the original schema.
  assert.deepEqual(applyFrequencyChange(base, { recurrence: 'monthly', firstDate: '2026-12-01' }, today), { ok: true, recurrence: 'monthly', calendar_changes: [], schema_version: 1 });
  assert.deepEqual(applyFrequencyChange(base, null, today), { ok: true, recurrence: 'monthly', calendar_changes: [], schema_version: 1 });
  for (const firstDate of [today, '2026-10-01', '', 'x', '2100-01-01']) assert.equal(applyFrequencyChange(base, { recurrence: 'yearly', firstDate }, today).ok, false);
  assert.equal(applyFrequencyChange({ ...base, recurrence: null }, { recurrence: 'yearly', firstDate: '2026-12-01' }, today).ok, true);
});

test('applyFrequencyChange: un cambio non ancora in vigore si sostituisce, il quinto è rifiutato', () => {
  const base = { expense_date: '2026-08-15', recurrence: 'monthly' as const, schema_version: 3 as const, calendar_changes: [{ index: 3, start: '2026-12-01', recurrence: 'yearly' as const }] };
  const replaced = applyFrequencyChange(base, { recurrence: 'weekly', firstDate: '2026-11-20' }, today);
  assert.deepEqual(replaced.ok && replaced.calendar_changes, [{ index: 3, start: '2026-11-20', recurrence: 'weekly' }]);
  const full = switchFrequency([1, 2, 3, 4].map((index) => ({ index, start: `2026-0${index}-01`, recurrence: 'weekly' as const })), 5, 'monthly', '2026-12-01');
  assert.equal(full, null);
  assert.equal(switchFrequency([{ index: 1, start: '2026-02-01', recurrence: 'weekly' }], 3, 'monthly', '2026-12-01')?.length, 2);
});

test('applyFrequencyChange: prova gratuita non ancora iniziata cambia la frequenza di base, senza storico', () => {
  const trial = { expense_date: '2026-11-01', first_payment_date: '2026-12-01', recurrence: 'monthly' as const, schema_version: 2 as const };
  const result = applyFrequencyChange(trial, { recurrence: 'yearly', firstDate: '2027-01-01' }, today);
  assert.deepEqual(result, { ok: true, recurrence: 'yearly', calendar_changes: [], schema_version: 2 });
});

test('applyPriceEdit e currentPrice usano il calendario con i cambi', () => {
  const calendar_changes = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' as const }];
  const prev = record({ calendar_changes, schema_version: 3, price_changes: [{ index: 3, amount_minor: 1200, once: false }] });
  assert.equal(currentPrice(prev, today), 1200);
  const data = { ...dataOf(prev), amount_minor: 1300 };
  const applied = applyPriceEdit(prev, data, { shownAmount: 1200, scope: 'future', changes: prev.price_changes }, today);
  assert.equal(applied.ok && applied.data.price_changes.find((c) => c.index === 3)?.amount_minor, 1300);
});

test('calendario: codec Firestore rigoroso e validazione in avanti', () => {
  const changes: CalendarChange[] = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }, { index: 5, start: '2027-12-02', recurrence: 'weekly' }];
  assert.equal(encodeCalendarChanges(changes), '3:2026-12-01:y;5:2027-12-02:w');
  assert.deepEqual(decodeCalendarChanges('3:2026-12-01:y;5:2027-12-02:w'), changes);
  for (const value of ['', null, [], '0:2026-12-01:y', '3:2026-12-01:x', '3:2026-12-01:y;', '3:2026-12-1:y', Array.from({ length: 5 }, (_, i) => `${i + 1}:2026-12-01:y`).join(';')]) assert.equal(decodeCalendarChanges(value), null);
  assert.deepEqual(parseCalendarChanges(changes, '2026-08-15', 'monthly'), changes);
  assert.deepEqual(parseCalendarChanges(undefined, '2026-08-15', 'monthly'), []);
  const bad = [
    [{ index: 3, start: '2026-10-15', recurrence: 'yearly' }], // not after occurrence 2 (2026-10-15)
    [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }, { index: 3, start: '2027-01-01', recurrence: 'weekly' }],
    [{ index: 0, start: '2026-12-01', recurrence: 'yearly' }],
    [{ index: 3, start: '2026-12-01', recurrence: 'daily' }], [{ index: 3, start: '2026-02-30', recurrence: 'yearly' }],
    [{ index: 3, start: '2026-12-01', recurrence: 'yearly', extra: 1 }], 'x',
  ];
  for (const value of bad) assert.equal(parseCalendarChanges(value, '2026-08-15', 'monthly'), null);
  assert.equal(parseCalendarChanges(changes, '2026-08-15', null), null);
});

test('contratto: schema 3 con cambi valido anche con prova; schema 1/2 non ammettono cambi', () => {
  const calendar_changes = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' as const }];
  const v3 = record({ schema_version: 3, calendar_changes });
  assert.deepEqual(parseExpenseRecord(v3), v3);
  const v3trial = record({ schema_version: 3, calendar_changes, expense_date: '2026-08-15', first_payment_date: '2026-08-20' });
  assert.ok(parseExpenseRecord(v3trial));
  assert.equal(parseExpenseRecord(record({ schema_version: 1, calendar_changes })), null);
  assert.equal(parseExpenseRecord(record({ schema_version: 2, calendar_changes, first_payment_date: '2026-08-20' })), null);
  assert.equal(parseExpenseRecord(record({ schema_version: 3, recurrence: null, calendar_changes })), null);
  const { id, created_at, ...data } = v3;
  assert.ok(parseExpenseRequest({ ...data, expense_id: id }, new Date('2026-11-10T12:00:00Z')));
});

test('backup v6: round trip con cambi di frequenza, lettore v5, rifiuto dei file precedenti con schema 3', () => {
  const e = record({ schema_version: 3, calendar_changes: [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }] });
  const file = JSON.parse(makeBackup({ expenses: [e], categories: [] }));
  assert.equal(file.version, backupVersion);
  assert.equal(backupVersion, 7);
  const restored = parseBackup(file);
  assert.deepEqual(restored.expenses[0], e);
  assert.equal(planImport(restored, restored, 'merge').sameExpenses, 1);
  for (const version of [1, 2, 3, 4, 5]) assert.throws(() => parseBackup({ ...file, version }), /versione 6/);
  // A file with no switches stays byte-identical in shape (no calendar_changes key) and reads as v5.
  const plain = JSON.parse(makeBackup({ expenses: [record()], categories: [] }));
  assert.equal('calendar_changes' in plain.expenses[0], false);
  assert.deepEqual(parseBackup({ ...plain, version: 5 }).expenses[0], record());
  // Absent and empty switches are the same calendar.
  const same = planImport({ expenses: [record({ calendar_changes: [] })], categories: [] }, { expenses: [record()], categories: [] }, 'merge');
  assert.equal(same.sameExpenses, 1);
  assert.throws(() => parseBackup({ ...file, expenses: [{ ...file.expenses[0], calendar_changes: [{ index: 3, start: '2026-10-15', recurrence: 'yearly' }] }] }));
});

test('fixture: cambio di frequenza, valori attesi al 10 novembre 2026', async () => {
  const { readFileSync } = await import('node:fs');
  const file = parseBackup(JSON.parse(readFileSync(new URL('./fixtures/nummo-cambio-frequenza-2026-11-10.json', import.meta.url), 'utf8')));
  const byName = (name: string) => file.expenses.find((e) => e.description === name)!;
  const monthly = subscriptionSummary(byName('TEST Mensile poi annuale'), today);
  assert.deepEqual(monthly.payments.map((p) => p.date), ['2026-10-15', '2026-09-15', '2026-08-15']);
  assert.equal(monthly.total, 3000);
  assert.equal(monthly.next?.date, '2026-12-01');
  const weekly = subscriptionSummary(byName('TEST Settimanale poi mensile'), today);
  assert.equal(weekly.payments.length, 10);
  assert.equal(weekly.payments[0]?.date, '2026-11-09');
  assert.equal(weekly.next?.date, '2026-11-30');
  const control = subscriptionSummary(byName('TEST Mensile senza cambi'), today);
  assert.deepEqual(control.payments.map((p) => p.date), ['2026-10-20', '2026-09-20']);
  assert.equal(control.next?.date, '2026-11-20');
});

test('riepilogo abbonamenti: la frequenza mostrata è quella in vigore per il prossimo rinnovo', () => {
  const series = entry({ calendar_changes: [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }] });
  assert.equal(subscriptionSummary(series, today).frequency, 'yearly');
  assert.equal(subscriptionSummary(entry(), today).frequency, 'monthly');
  assert.equal(subscriptionSummary(entry({ recurrence: null }), today).frequency, null);
  // A switch that starts later than the next renewal does not apply yet to the one shown... it replaces it: index 3 is next.
  assert.equal(subscriptionSummary(entry({ calendar_changes: [{ index: 5, start: '2027-02-01', recurrence: 'weekly' }] }), today).frequency, 'monthly');
});
