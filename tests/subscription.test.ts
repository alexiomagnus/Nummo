import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseExpenseRecord, parseExpenseRequest } from '../src/domain/contract.ts';
import { applyPriceEdit, type ExpenseData } from '../src/domain/expense.ts';
import { allFunds, breakdown, effectiveFundFilter, expandOccurrences, filterByFund, matchesFund, noFund, paymentsRemoved, forecastOccurrences, subscriptionSummaries, subscriptionSummary, upcomingRenewals, type ExpenseEntry } from '../src/domain/history.ts';
import { backupVersion, exportCsv, makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { makeChange } from '../src/domain/pricing.ts';
import { currentStatus, decodeStatusChanges, encodeStatusChanges, nextPaidRenewal, parseStatusChanges, setStatus, statusAt, type StatusChange } from '../src/domain/subscription.ts';

// Monthly on the 5th from January 2026.
const entry = (over: Partial<ExpenseEntry> = {}): ExpenseEntry => ({
  id: 's', amount_minor: 999, description: 'Streaming', category_id: null, expense_date: '2026-01-05',
  recurrence: 'monthly', created_at: '2026-01-05T10:00:00.000Z', ...over,
});
const dates = (items: { date: string }[]) => items.map((item) => item.date);
const paused = (date: string): StatusChange => ({ date, status: 'paused' });
const active = (date: string): StatusChange => ({ date, status: 'active' });
const cancelled = (date: string): StatusChange => ({ date, status: 'cancelled' });

test('stati: senza variazioni la serie è attiva; una variazione vale dal giorno dopo', () => {
  assert.equal(currentStatus([]), 'active');
  assert.equal(statusAt([paused('2026-03-05')], '2026-03-05'), 'active');
  assert.equal(statusAt([paused('2026-03-05')], '2026-03-06'), 'paused');
  assert.equal(statusAt([paused('2026-03-05'), active('2026-05-01')], '2026-05-05'), 'active');
});

test('pausa: i rinnovi durante la pausa non sono pagati, prima e dopo sì; il ciclo originale resta', () => {
  const series = entry({ status_changes: [paused('2026-02-10'), active('2026-04-20')] });
  // March and April 5 fall within the pause; May 5 follows the original calendar.
  assert.deepEqual(dates(expandOccurrences([series], '2026-06-05')), ['2026-01-05', '2026-02-05', '2026-05-05', '2026-06-05']);
});

test('pausa e annullamento non toccano i pagamenti già registrati, nemmeno quello di oggi', () => {
  const today = '2026-03-05';
  const before = expandOccurrences([entry()], today);
  for (const status of ['paused', 'cancelled'] as const) {
    const changes = setStatus([], status, today)!;
    assert.deepEqual(expandOccurrences([entry({ status_changes: changes })], today), before);
    assert.deepEqual(expandOccurrences([entry({ status_changes: changes })], '2026-12-31'), before);
  }
});

test('riattivazione: storico della pausa invariato, rinnovi futuri di nuovo pagati', () => {
  const pausedSeries = entry({ status_changes: [paused('2026-02-10')] });
  const during = expandOccurrences([pausedSeries], '2026-04-30');
  const resumed = setStatus(pausedSeries.status_changes!, 'active', '2026-04-30')!;
  assert.deepEqual(expandOccurrences([entry({ status_changes: resumed })], '2026-04-30'), during);
  assert.deepEqual(dates(expandOccurrences([entry({ status_changes: resumed })], '2026-05-05')).slice(-1), ['2026-05-05']);
});

test('annullato riattivabile; prossimo rinnovo e previsioni solo per le serie attive', () => {
  const today = '2026-03-20';
  const off = entry({ status_changes: [cancelled('2026-03-01')] });
  assert.equal(nextPaidRenewal(off.expense_date, off.recurrence, off.status_changes!, today), null);
  assert.deepEqual(upcomingRenewals([off], today), []);
  assert.deepEqual(forecastOccurrences([off], today, '2026-12-31'), []);
  const again = setStatus(off.status_changes!, 'active', today)!;
  assert.deepEqual(again, [cancelled('2026-03-01'), active(today)]);
  assert.equal(nextPaidRenewal(off.expense_date, off.recurrence, again, today)?.date, '2026-04-05');
  assert.equal(upcomingRenewals([entry({ status_changes: again })], today).length, 1);
});

test('setStatus: stesso stato invariato, doppio cambio nello stesso giorno sostituito, limite e date', () => {
  assert.deepEqual(setStatus([], 'active', '2026-03-01'), []);
  assert.deepEqual(setStatus([paused('2026-03-01')], 'paused', '2026-03-09'), [paused('2026-03-01')]);
  // Pause and resume on the same day: nothing changed, no entry kept.
  assert.deepEqual(setStatus([paused('2026-03-01')], 'active', '2026-03-01'), []);
  assert.deepEqual(setStatus([paused('2026-03-01')], 'cancelled', '2026-03-01'), [cancelled('2026-03-01')]);
  assert.equal(setStatus([paused('2026-03-02')], 'active', '2026-03-01'), null);
  const full = Array.from({ length: 8 }, (_, i) => (i % 2 ? active : paused)(`2026-0${i + 1}-10`));
  assert.equal(setStatus(full, 'cancelled', '2026-09-10'), null);
});

test('riepilogo: pagamenti, numero e totale coincidono con la dashboard, prezzi storici inclusi', () => {
  const today = '2026-06-30';
  const series = entry({ price_changes: [makeChange(3, 1299, false)], status_changes: [paused('2026-02-10'), active('2026-04-20')] });
  const summary = subscriptionSummary(series, today);
  assert.equal(summary.status, 'active');
  assert.deepEqual(dates(summary.payments), ['2026-06-05', '2026-05-05', '2026-02-05', '2026-01-05']);
  assert.deepEqual(summary.payments.map((p) => p.amount_minor), [1299, 1299, 999, 999]);
  assert.equal(summary.total, 1299 * 2 + 999 * 2);
  assert.equal(summary.next?.date, '2026-07-05');
  assert.equal(summary.amount_minor, 1299);
  const dashboard = breakdown(expandOccurrences([series], today), [], 'year', today);
  assert.equal(dashboard.total, summary.total);
  assert.equal(dashboard.count, summary.payments.length);
  const off = subscriptionSummary(entry({ status_changes: [cancelled('2026-02-10')] }), today);
  assert.equal(off.status, 'cancelled');
  assert.equal(off.next, null);
  assert.deepEqual([off.payments.length, off.total], [2, 1998]);
});

test('elenco abbonamenti: solo serie, attivi poi in pausa poi annullati; nessuna spesa singola', () => {
  const list = subscriptionSummaries([
    entry({ id: 'c', description: 'C', status_changes: [cancelled('2026-02-01')] }),
    entry({ id: 'o', description: 'Una tantum', recurrence: null }),
    entry({ id: 'p', description: 'P', status_changes: [paused('2026-02-01')] }),
    entry({ id: 'a', description: 'A', expense_date: '2026-01-20' }),
    entry({ id: 'b', description: 'B' }),
  ], '2026-03-10');
  assert.deepEqual(list.map((s) => s.entry.id), ['a', 'b', 'p', 'c']);
});

test('separazione: spese singole + pagamenti degli abbonamenti = tutte le occorrenze, senza doppi conteggi', () => {
  const today = '2026-03-31';
  const all = [entry(), entry({ id: 'o', recurrence: null, expense_date: '2026-03-02', amount_minor: 450 })];
  const occurrences = expandOccurrences(all, today);
  const oneOff = occurrences.filter((o) => o.recurrence === null);
  const subscriptions = subscriptionSummaries(all, today).reduce((sum, s) => sum + s.total, 0);
  assert.equal(oneOff.reduce((sum, o) => sum + o.amount_minor, 0) + subscriptions, occurrences.reduce((sum, o) => sum + o.amount_minor, 0));
});

test('contratto e Firestore: campo assente = attivo, forma compatta, valori invalidi rifiutati', () => {
  assert.deepEqual(parseStatusChanges(undefined), []);
  for (const invalid of [null, 'x', [paused('2026-02-30')], [{ date: '2026-03-01', status: 'stopped' }], [{ ...paused('2026-03-01'), extra: 1 }],
    [paused('2026-03-02'), active('2026-03-01')], [paused('2026-03-01'), active('2026-03-01')]]) assert.equal(parseStatusChanges(invalid), null);
  const changes = [paused('2026-02-10'), active('2026-04-20')];
  assert.equal(encodeStatusChanges(changes), '2026-02-10:paused;2026-04-20:active');
  assert.deepEqual(parseStatusChanges(decodeStatusChanges(encodeStatusChanges(changes))), changes);
  for (const stored of ['', '2026-02-10', '2026-02-10:paused:x', 3, ['2026-02-10:paused']]) assert.equal(parseStatusChanges(decodeStatusChanges(stored)), null);
  const record = { id: 'x', amount_minor: 999, currency: 'EUR', description: 'Streaming', category_id: null, expense_date: '2026-01-05',
    recurrence: 'monthly', price_changes: [], source: 'web_app', schema_version: 1, created_at: '2026-01-05T10:00:00.000Z' };
  assert.deepEqual(parseExpenseRecord(record)?.status_changes, []);
  assert.equal(parseExpenseRecord({ ...record, recurrence: null, status_changes: changes }), null);
  const { id: _, created_at: __, ...data } = record;
  const request = { ...data, expense_id: '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13', status_changes: changes, fund_id: null, list_id: null, list_items: [] };
  assert.ok(parseExpenseRequest(request, new Date('2026-05-01T12:00:00Z')));
  assert.equal(parseExpenseRequest(request, new Date('2026-04-19T12:00:00Z')), null);
});

test('modifica della serie: il modulo conserva gli stati; diventando singola li azzera', () => {
  const series = entry({ status_changes: [paused('2026-02-10')] });
  const data = { ...series, currency: 'EUR', source: 'web_app', schema_version: 1, price_changes: [], status_changes: [], fund_id: null } as unknown as ExpenseData;
  const kept = applyPriceEdit(series, { ...data, description: 'Nuovo nome' }, { shownAmount: 999, scope: 'future', changes: [] }, '2026-03-01');
  assert.deepEqual(kept.ok && kept.data.status_changes, [paused('2026-02-10')]);
  const oneOff = applyPriceEdit(series, { ...data, recurrence: null }, { shownAmount: 999, scope: 'future', changes: [] }, '2026-03-01');
  assert.deepEqual(oneOff.ok && oneOff.data.status_changes, []);
});

test('backup v2 e CSV: stati conservati, v1 letto come attivo, identici saltati, CSV solo pagamenti effettivi', () => {
  const record = { id: '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13', amount_minor: 999, currency: 'EUR' as const, description: 'Streaming', category_id: null,
    expense_date: '2026-01-05', recurrence: 'monthly' as const, price_changes: [], status_changes: [paused('2026-02-10')], fund_id: null, list_id: null, list_items: [],
    source: 'web_app' as const, schema_version: 1 as const, created_at: '2026-01-05T10:00:00.000Z' };
  const file = JSON.parse(makeBackup({ expenses: [record], categories: [] }));
  assert.equal(file.version, backupVersion);
  const restored = parseBackup(file);
  assert.deepEqual(restored.expenses[0]!.status_changes, record.status_changes);
  assert.equal(planImport(restored, { expenses: [record], categories: [] }, 'merge').sameExpenses, 1);
  assert.equal(planImport(restored, { expenses: [{ ...record, status_changes: [] }], categories: [] }, 'merge').conflicts.length, 1);
  const { status_changes: _, ...v1 } = record;
  assert.deepEqual(parseBackup({ ...file, version: 1, expenses: [v1] }).expenses[0]!.status_changes, []);
  const rows = exportCsv([record], [], '2026-04-30').trim().split('\r\n').slice(1);
  assert.deepEqual(rows.map((row) => row.split(';')[0]), ['2026-01-05', '2026-02-05']);
});

test('searchSubscriptions filters by normalised name and keeps all on empty query', async () => {
  const { searchSubscriptions, subscriptionSummaries } = await import('../src/domain/history.ts');
  const base = { amount_minor: 100, category_id: null, expense_date: '2026-01-01', recurrence: 'monthly' as const, created_at: '2026-01-01T10:00:00.000Z' };
  const list = subscriptionSummaries([{ ...base, id: 'a', description: 'Netflix' }, { ...base, id: 'b', description: 'Caffè Club' }], '2026-11-08');
  assert.equal(searchSubscriptions(list, '').length, 2);
  assert.deepEqual(searchSubscriptions(list, 'NETF').map((s) => s.entry.id), ['a']);
  assert.deepEqual(searchSubscriptions(list, 'caffe').map((s) => s.entry.id), ['b']);
  assert.equal(searchSubscriptions(list, 'zzz').length, 0);
});

test('pausa o annullamento datati nel passato: i pagamenti dopo la data non contano, quelli fino alla data restano', () => {
  const today = '2026-05-20'; // paid on the 5th of January…May
  const all = dates(expandOccurrences([entry()], today));
  assert.deepEqual(all, ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05', '2026-05-05']);
  const changes = setStatus([], 'cancelled', '2026-03-20')!;
  assert.deepEqual(changes, [cancelled('2026-03-20')]);
  assert.deepEqual(dates(expandOccurrences([entry({ status_changes: changes })], today)), ['2026-01-05', '2026-02-05', '2026-03-05']);
  assert.deepEqual(dates(paymentsRemoved(entry(), changes, today)), ['2026-04-05', '2026-05-05']);
  // The day of the payment itself keeps it (a change takes effect for the occurrences after its day)…
  assert.deepEqual(dates(paymentsRemoved(entry(), setStatus([], 'paused', '2026-04-05')!, today)), ['2026-05-05']);
  // …and today's change removes nothing.
  assert.deepEqual(paymentsRemoved(entry(), setStatus([], 'cancelled', today)!, today), []);
});

test('pausa datata: mai prima dell’ultima variazione, due variazioni nello stesso giorno si sostituiscono, limite rispettato', () => {
  assert.equal(setStatus([paused('2026-03-10')], 'cancelled', '2026-03-09'), null);
  assert.deepEqual(setStatus([paused('2026-03-10')], 'cancelled', '2026-03-10'), [cancelled('2026-03-10')]);
  assert.deepEqual(setStatus([paused('2026-03-10')], 'cancelled', '2026-04-01'), [paused('2026-03-10'), cancelled('2026-04-01')]);
  assert.deepEqual(setStatus([paused('2026-03-10')], 'paused', '2026-04-01'), [paused('2026-03-10')], 'già in vigore: nulla cambia');
  // From a pause to a cancellation the payments between the two dates were already skipped: nothing else is removed.
  const e = entry({ status_changes: [paused('2026-03-10')] });
  assert.deepEqual(paymentsRemoved(e, setStatus(e.status_changes!, 'cancelled', '2026-04-01')!, '2026-05-20'), []);
  const full = Array.from({ length: 8 }, (_, i) => (i % 2 ? active : paused)(`2026-01-${String(10 + i).padStart(2, '0')}`));
  assert.equal(setStatus(full, 'paused', '2026-02-01'), null);
});

test('filtro per fondo: tutti, senza fondo o un fondo; un fondo scomparso vale «tutti»', () => {
  const items = [{ id: 'a', fund_id: 'f1' }, { id: 'b', fund_id: null }, { id: 'c' }, { id: 'd', fund_id: 'f2' }];
  const ids = (filter: string) => filterByFund(items, filter).map((item) => item.id);
  assert.deepEqual(ids(allFunds), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(noFund), ['b', 'c']);
  assert.deepEqual(ids('f1'), ['a']);
  assert.equal(matchesFund({ fund_id: 'f2' }, 'f1'), false);
  assert.equal(effectiveFundFilter('f9', ['f1', 'f2']), allFunds);
  assert.equal(effectiveFundFilter('f2', ['f1', 'f2']), 'f2');
  assert.equal(effectiveFundFilter(noFund, []), noFund);
  // Occurrences carry the fund of their series, so the filter works on paid payments and on forecasts alike.
  const series = entry({ fund_id: 'f1' });
  assert.deepEqual(new Set(expandOccurrences([series], '2026-03-20').map((item) => item.fund_id)), new Set(['f1']));
  assert.deepEqual(new Set(forecastOccurrences([series], '2026-03-20', '2026-06-01').map((item) => item.fund_id)), new Set(['f1']));
  assert.deepEqual(expandOccurrences([entry()], '2026-01-10').map((item) => item.fund_id), [null]);
});
