import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { newDraft, validateDraft, applyPriceEdit, currentPrice, dataOf, type ExpenseData } from '../src/domain/expense.ts';
import { parseExpenseRecord, parseExpenseRequest, type ExpenseRecord } from '../src/domain/contract.ts';
import { expandOccurrences, forecastOccurrences, subscriptionSummary, upcomingRenewals, breakdown } from '../src/domain/history.ts';
import { setStatus } from '../src/domain/subscription.ts';
import { makeBackup, parseBackup, planImport, exportCsv } from '../src/domain/backup.ts';
import { monthOverview } from '../src/domain/funds.ts';
import { trialTimingError } from '../src/domain/trial.ts';

const id = '10000000-0000-4000-8000-000000000001';
const today = '2026-11-09';
const first = '2026-12-09';
const trial = (patch: Partial<ExpenseRecord> = {}): ExpenseRecord => ({ id, amount_minor: 1099, currency: 'EUR', description: 'TEST Spotify',
  category_id: null, expense_date: today, recurrence: 'monthly', price_changes: [], status_changes: [], fund_id: null,
  list_id: null, list_items: [], source: 'web_app', schema_version: 2, first_payment_date: first, created_at: today + 'T10:00:00.000Z', ...patch });
const dates = (entry: ExpenseRecord, until: string) => expandOccurrences([entry], until).map(o => o.date);

test('prova: Spotify, nessuna spesa fino al primo pagamento, poi calendario mensile e totale esatti', () => {
  const e = trial();
  assert.deepEqual(dates(e, '2026-12-08'), []);
  assert.deepEqual(dates(e, first), [first]);
  assert.deepEqual(dates(e, '2027-02-09'), [first, '2027-01-09', '2027-02-09']);
  assert.equal(subscriptionSummary(e, '2026-12-08').total, 0);
  assert.equal(subscriptionSummary(e, first).total, 1099);
  assert.equal(subscriptionSummary(e, today).inTrial, true);
  assert.equal(subscriptionSummary(e, first).inTrial, false);
  assert.deepEqual(upcomingRenewals([e], today)[0]?.occurrence.date, first);
  assert.equal(forecastOccurrences([e], today, '2026-12-08').length, 0);
  assert.equal(forecastOccurrences([e], today, first)[0]?.amount_minor, 1099);
  assert.equal(breakdown(expandOccurrences([e], today), [], 'month', today).total, 0);
  assert.equal(exportCsv([e], [], today).split('\r\n').length, 2);
  assert.equal(monthOverview({ funds: [], movements: [], expenses: [e] }, '2026-11', today).unassigned.spent, 0);
});

test('prova: annullare o mettere in pausa prima del primo addebito salta anche l’indice zero', () => {
  for (const status of ['cancelled', 'paused'] as const) {
    const e = trial({ status_changes: [{ date: today, status }] });
    assert.deepEqual(dates(e, '2027-02-09'), []);
    assert.equal(subscriptionSummary(e, today).inTrial, false);
    assert.equal(subscriptionSummary(e, today).next, null);
  }
  const paused = trial({ status_changes: [{ date: today, status: 'paused' }, { date: '2026-12-20', status: 'active' }] });
  assert.deepEqual(dates(paused, '2027-01-09'), ['2027-01-09']);
  assert.deepEqual(dates(trial({ status_changes: [{ date: first, status: 'cancelled' }] }), '2027-01-09'), [first]);
  const cancelled = setStatus([], 'cancelled', '2026-12-08')!;
  assert.deepEqual(dates(trial({ status_changes: cancelled }), first), []);
});

test('prova: rinnovi ancorati al primo pagamento, fine mese, bisestile e numerazione dei prezzi', () => {
  const e = trial({ first_payment_date: '2027-01-31', price_changes: [{ index: 1, amount_minor: 1299, once: false }] });
  const paid = expandOccurrences([e], '2027-03-31');
  assert.deepEqual(paid.map(p => p.date), ['2027-01-31', '2027-02-28', '2027-03-31']);
  assert.deepEqual(paid.map(p => p.amount_minor), [1099, 1299, 1299]);
  assert.deepEqual(dates(trial({ recurrence: 'yearly', first_payment_date: '2028-02-29' }), '2029-02-28'), ['2028-02-29', '2029-02-28']);
  assert.deepEqual(dates(trial({ recurrence: 'weekly', first_payment_date: '2026-11-19' }), '2026-11-26'), ['2026-11-19', '2026-11-26']);
});

test('prova: validazione positiva degli importi, date e contratto versionato', () => {
  const draft = { ...newDraft(), amount: '10,99', description: 'TEST Spotify', date: today, repeat: true, recurrence: 'monthly' as const, trial: true, firstPaymentDate: first };
  const valid = validateDraft(draft, [], new Date(today + 'T12:00:00Z'));
  assert.ok(valid.ok);
  if (!valid.ok) return;
  assert.equal(valid.data.schema_version, 2);
  assert.equal(valid.data.first_payment_date, first);
  for (const date of ['', today, '2026-11-08', '2027-02-30', '2100-01-01']) {
    assert.equal(validateDraft({ ...draft, firstPaymentDate: date }, [], new Date(today + 'T12:00:00Z')).ok, false);
  }
  for (const repeat of [false, true]) assert.equal(validateDraft({ ...draft, repeat, amount: '0' }, [], new Date(today + 'T12:00:00Z')).ok, false);
  const ordinary = validateDraft({ ...draft, repeat: false }, [], new Date(today + 'T12:00:00Z'));
  assert.ok(ordinary.ok && ordinary.data.schema_version === 1 && !ordinary.data.first_payment_date);
  assert.ok(parseExpenseRequest({ ...dataOf(trial()), expense_id: id }, new Date(today + 'T12:00:00Z')));
  assert.equal(parseExpenseRecord({ ...trial(), schema_version: 1 }), null);
  assert.equal(parseExpenseRecord({ ...trial(), first_payment_date: undefined }), null);
  assert.equal(parseExpenseRecord({ ...trial(), recurrence: null }), null);
  const legacy = trial({ schema_version: 1, first_payment_date: undefined });
  assert.ok(parseExpenseRecord(legacy));
  assert.deepEqual(dates(legacy, today), [today]);
});

test('prova: modifica prima dell’addebito cambia il prezzo base, dopo conserva pagamenti e calendario', () => {
  const e = trial();
  const edit = { shownAmount: 1099, scope: 'future' as const, changes: [] };
  const before = applyPriceEdit(e, { ...dataOf(e), amount_minor: 1299, first_payment_date: '2026-12-19' }, edit, today);
  assert.ok(before.ok && before.data.amount_minor === 1299 && before.data.first_payment_date === '2026-12-19');
  assert.equal(currentPrice(e, today), 1099);
  const after = applyPriceEdit(e, { ...dataOf(e), amount_minor: 1299 }, edit, first);
  assert.ok(after.ok);
  if (after.ok) {
    assert.equal(after.data.amount_minor, 1099);
    assert.deepEqual(after.data.price_changes, [{ index: 1, amount_minor: 1299, once: false }]);
    assert.deepEqual(expandOccurrences([{ ...e, ...after.data }], first), expandOccurrences([e], first));
  }
  for (const patch of [{ first_payment_date: '2026-12-20' }, { first_payment_date: undefined }, { expense_date: '2026-11-08' }, { recurrence: 'yearly' as const }]) {
    assert.equal(applyPriceEdit(e, { ...dataOf(e), ...patch }, edit, first).ok, false);
  }
  assert.ok(trialTimingError(e, { ...dataOf(e), first_payment_date: today }, today));
  assert.ok(trialTimingError({ ...e, first_payment_date: undefined }, dataOf(e), today));
});

test('prova: backup (v5+), round trip, conflitti e lettori storici senza migrazioni implicite', () => {
  const e = trial();
  const file = JSON.parse(makeBackup({ expenses: [e], categories: [] }));
  assert.equal(file.version, 7);
  assert.deepEqual(parseBackup({ ...file, version: 5 }).expenses[0], e);
  const restored = parseBackup(file);
  assert.deepEqual(restored.expenses[0], e);
  assert.equal(planImport(restored, restored, 'merge').sameExpenses, 1);
  assert.equal(planImport(restored, { ...restored, expenses: [trial({ first_payment_date: '2026-12-10' })] }, 'merge').conflicts.length, 1);
  assert.throws(() => parseBackup({ ...file, version: 4 }));
  for (const version of [1, 2, 3, 4]) {
    const legacy = { ...file, version, expenses: [{ ...e, schema_version: 1 }] };
    delete legacy.expenses[0].first_payment_date;
    assert.equal(parseBackup(legacy).expenses[0]?.first_payment_date, undefined);
  }
});

test('prova: codec prezzi Firestore schema 2 rigoroso, backup ancora leggibile come array', async () => {
  const { encodeTrialPrices, decodeTrialPrices } = await import('../src/domain/pricing.ts');
  const prices = [{ index: 1, amount_minor: 1099, once: false }, { index: 8, amount_minor: 9999999, once: true }];
  assert.deepEqual(decodeTrialPrices(encodeTrialPrices(prices)), prices);
  assert.deepEqual(decodeTrialPrices(''), []);
  for (const value of [null, [], '0:100:0', '1:0:0', '1:10000000:0', '1:100:true', '1:100:0;', '1:100:0;1:200:0', Array.from({ length: 9 }, (_, i) => `${i + 1}:100:0`).join(';')]) {
    assert.equal(decodeTrialPrices(value), null);
  }
});

test('prova: fixture v5 documentata, una sola spesa reale al 9 novembre', () => {
  const file = parseBackup(JSON.parse(readFileSync(new URL('./fixtures/nummo-prove-gratuite-2026-11-09.json', import.meta.url), 'utf8')));
  assert.equal(file.expenses.length, 3);
  const paid = expandOccurrences(file.expenses, today);
  assert.equal(paid.length, 1);
  assert.equal(paid[0]?.amount_minor, 1599);
  assert.equal(file.expenses.filter(e => subscriptionSummary(e, today).inTrial).length, 1);
  for (const path of ['./fixtures/nummo-spese-standard-2026-11-08.json', '../docs/testing/nummo-test-casi-limite-2026-11-08.json']) {
    const sample = JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    assert.equal(sample.version, 5);
    assert.ok(parseBackup(sample).expenses.length > 0);
  }
});
