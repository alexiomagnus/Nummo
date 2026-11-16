import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { parseExpenseRecord, type ExpenseRecord } from '../src/domain/contract.ts';
import { dataOf } from '../src/domain/expense.ts';
import { expandOccurrences, subscriptionSummaries, type ExpenseEntry } from '../src/domain/history.ts';
import { decodeSkippedPayments, encodeSkippedPayments, maxSkippedPayments, parseSkippedPayments, skipPayment } from '../src/domain/skippedPayments.ts';

const series = (over: Partial<ExpenseEntry> = {}): ExpenseEntry => ({
  id: 'net', amount_minor: 2690, description: 'Internet casa', category_id: null, expense_date: '2026-09-05',
  recurrence: 'monthly', created_at: '2026-09-05T10:00:00.000Z', ...over,
});
const record = (over: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: '00000000-0000-4000-8000-000000000001', amount_minor: 2690, currency: 'EUR', description: 'Internet casa', category_id: null,
  expense_date: '2026-09-05', recurrence: 'monthly', price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [],
  source: 'web_app', schema_version: 1, created_at: '2026-09-05T10:00:00.000Z', ...over,
});

test('pagamenti eliminati: validazione, inserimento ordinato senza doppioni, limite, codifica compatta', () => {
  assert.deepEqual(parseSkippedPayments(undefined), []);
  assert.deepEqual(parseSkippedPayments([0, 3, 7]), [0, 3, 7]);
  for (const invalid of [[3, 3], [7, 3], [-1], [1.5], ['2'], [1000], 'x', Array.from({ length: maxSkippedPayments + 1 }, (_, i) => i)]) {
    assert.equal(parseSkippedPayments(invalid), null, JSON.stringify(invalid).slice(0, 40));
  }
  assert.deepEqual(skipPayment([2, 9], 5), [2, 5, 9]);
  assert.deepEqual(skipPayment([2, 9], 9), [2, 9]);
  assert.equal(skipPayment(Array.from({ length: maxSkippedPayments }, (_, i) => i), 999), null);
  assert.equal(encodeSkippedPayments([1, 4, 12]), '1,4,12');
  assert.deepEqual(decodeSkippedPayments('1,4,12'), [1, 4, 12]);
  for (const stored of ['', '1,', ',1', '1;4', 'a', 4]) assert.equal(decodeSkippedPayments(stored), null);
});

test('storico: un pagamento eliminato non conta più, gli altri restano con data e prezzo; il numero dell’occorrenza è esposto', () => {
  const today = '2026-11-16';
  const all = expandOccurrences([series()], today);
  assert.deepEqual(all.map((o) => [o.index, o.date]), [[0, '2026-09-05'], [1, '2026-10-05'], [2, '2026-11-05']]);
  // The November renewal charged by mistake: only it disappears (also the first payment can be removed).
  const without = expandOccurrences([series({ skipped_payments: [2] })], today);
  assert.deepEqual(without.map((o) => o.date), ['2026-09-05', '2026-10-05']);
  assert.deepEqual(expandOccurrences([series({ skipped_payments: [0] })], today).map((o) => o.index), [1, 2]);
  const [summary] = subscriptionSummaries([series({ skipped_payments: [2] })], today);
  assert.deepEqual([summary!.payments.length, summary!.total], [2, 5380]);
});

test('record: campo facoltativo solo per le serie, conservato da dataOf; backup v9 con andata e ritorno, file precedenti rifiutati', () => {
  assert.deepEqual(parseExpenseRecord(record({ skipped_payments: [2] }))?.skipped_payments, [2]);
  assert.equal(parseExpenseRecord(record())?.skipped_payments, undefined);
  assert.equal(parseExpenseRecord(record({ recurrence: null, skipped_payments: [0] })), null);
  assert.equal(parseExpenseRecord(record({ skipped_payments: [4, 2] as never })), null);
  assert.deepEqual(dataOf(record({ skipped_payments: [2] })).skipped_payments, [2]);
  const saved = record({ skipped_payments: [1, 2] });
  const file = JSON.parse(makeBackup({ expenses: [saved], categories: [] }));
  assert.equal(file.version, 10);
  assert.deepEqual(file.expenses[0].skipped_payments, [1, 2]);
  assert.deepEqual(parseBackup(file).expenses[0]!.skipped_payments, [1, 2]);
  assert.throws(() => parseBackup({ ...file, version: 8 }), /versione 9/);
  // A different list of removed payments is a different record (merge conflict), the same list an identical one.
  assert.equal(planImport(parseBackup(file), { expenses: [saved], categories: [] }, 'merge').sameExpenses, 1);
  assert.equal(planImport(parseBackup(file), { expenses: [record({ skipped_payments: [1] })], categories: [] }, 'merge').conflicts.length, 1);
});
