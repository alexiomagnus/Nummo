import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maxOccurrences, occurrenceDates } from '../src/domain/recurrence.ts';
import {
  breakdown, categoryColorSlot, categoryColorSlots, bucketsFor, expandOccurrences, forecastOccurrences, searchAndSort, subscriptionSummary, type ExpenseEntry,
} from '../src/domain/history.ts';
import { nextRenewal, priceAt } from '../src/domain/pricing.ts';
import { statusAt, type StatusChange } from '../src/domain/subscription.ts';

const entry = (over: Partial<ExpenseEntry>): ExpenseEntry => ({
  id: 'x', amount_minor: 100, description: 'Spesa', category_id: null, expense_date: '2026-11-02',
  recurrence: null, created_at: '2026-11-02T10:00:00.000Z', ...over,
});
const cats = Array.from({ length: 14 }, (_, i) => ({ id: `c${i}`, label: `Cat ${i}`, icon: null }));

test('settimanale: ogni 7 giorni fino a oggi incluso', () => {
  assert.deepEqual(occurrenceDates('2026-10-12', 'weekly', '2026-11-02'), ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
});
test('mensile dal 31: si adatta ai mesi più corti senza perdere il giorno', () => {
  assert.deepEqual(occurrenceDates('2026-01-31', 'monthly', '2026-05-01'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});
test('annuale dal 29 febbraio: 28 negli anni non bisestili', () => {
  assert.deepEqual(occurrenceDates('2024-02-29', 'yearly', '2028-03-01'), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
});
test('nessuna occorrenza futura; spesa singola contata una volta', () => {
  assert.deepEqual(occurrenceDates('2026-11-03', 'weekly', '2026-11-02'), []);
  const items = expandOccurrences([entry({ id: 'a' }), entry({ id: 'b', expense_date: '2026-09-02', recurrence: 'monthly' })], '2026-11-02');
  assert.deepEqual(items.map((item) => item.key), ['a:2026-11-02', 'b:2026-09-02', 'b:2026-10-02', 'b:2026-11-02']);
});
test('ricerca per nome senza distinzione di maiuscole e accenti', () => {
  const items = expandOccurrences([entry({ id: 'a', description: 'Caffè al bar' }), entry({ id: 'b', description: 'Pane' })], '2026-11-02');
  assert.deepEqual(searchAndSort(items, '  CAFFE ', 'date-desc').map((item) => item.expenseId), ['a']);
  assert.equal(searchAndSort(items, '', 'date-desc').length, 2);
  assert.equal(searchAndSort(items, 'pizza', 'date-desc').length, 0);
});
test('ricerca anche per periodo: mese e anno nella lingua dell’interfaccia, parole combinabili col nome', () => {
  const items = expandOccurrences([entry({ id: 'a', description: 'Pane', expense_date: '2026-10-05' }),
    entry({ id: 'b', description: 'Pane', expense_date: '2025-11-20' }), entry({ id: 'c', description: 'Caffè', expense_date: '2026-11-01' })], '2026-11-02');
  const months = new Intl.DateTimeFormat('it', { month: 'long', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat('it', { month: 'short', timeZone: 'UTC' });
  const dateText = (date: string) => { const d = new Date(`${date}T00:00:00Z`); return `${months.format(d)} ${short.format(d)}`; };
  const ids = (query: string) => searchAndSort(items, query, 'date-asc', dateText).map((item) => item.expenseId);
  assert.deepEqual(ids('novembre'), ['b', 'c']);
  assert.deepEqual(ids('2026'), ['a', 'c']);
  assert.deepEqual(ids('pane 2026'), ['a']);
  assert.deepEqual(ids('Ott 2026'), ['a']);
  assert.deepEqual(ids('pane novembre 2025'), ['b']);
  // Without `dateText` only the name counts (as before).
  assert.deepEqual(searchAndSort(items, 'novembre', 'date-asc').length, 0);
});
test('ordinamento per data e importo, stabile a parità', () => {
  const items = expandOccurrences([
    entry({ id: 'a', amount_minor: 500, expense_date: '2026-10-01' }),
    entry({ id: 'b', amount_minor: 100, expense_date: '2026-11-01' }),
    entry({ id: 'c', amount_minor: 900, expense_date: '2026-10-15' }),
  ], '2026-11-02');
  const ids = (sort: Parameters<typeof searchAndSort>[2]) => searchAndSort(items, '', sort).map((item) => item.expenseId);
  assert.deepEqual(ids('date-desc'), ['b', 'c', 'a']);
  assert.deepEqual(ids('date-asc'), ['a', 'c', 'b']);
  assert.deepEqual(ids('amount-desc'), ['c', 'a', 'b']);
  assert.deepEqual(ids('amount-asc'), ['b', 'a', 'c']);
});
test('periodi: giorni del mese corrente e ultimi 3/12 mesi a cavallo d’anno', () => {
  assert.equal(bucketsFor('month', '2026-02-10').length, 28);
  assert.deepEqual(bucketsFor('quarter', '2026-02-15').map((bucket) => bucket.key), ['2025-12', '2026-01', '2026-02']);
  const year = bucketsFor('year', '2026-11-02');
  assert.equal(year.length, 12);
  assert.equal(year[0]!.from, '2025-12-01');
  assert.equal(year[11]!.to, '2026-11-30');
});
test('aggregazione: totali in centesimi, fuori periodo esclusi, colore legato alla categoria', () => {
  const items = expandOccurrences([
    entry({ id: 'a', amount_minor: 1000, category_id: 'c1', expense_date: '2026-11-01' }),
    entry({ id: 'b', amount_minor: 250, category_id: null, expense_date: '2026-11-02' }),
    entry({ id: 'c', amount_minor: 300, category_id: 'c12', expense_date: '2026-11-02' }),
    entry({ id: 'd', amount_minor: 999, category_id: 'c0', expense_date: '2026-10-31' }),
  ], '2026-11-02');
  const result = breakdown(items, cats, 'month', '2026-11-02');
  assert.equal(result.total, 1550);
  assert.equal(result.count, 3);
  assert.deepEqual(result.series.map((s) => [s.label, s.slot, s.total]),
    [['Senza categoria', null, 250], ['Cat 1', categoryColorSlot('c1'), 1000], ['Cat 12', categoryColorSlot('c12'), 300]]);
  assert.equal(result.totals[0], 1000);
  assert.equal(result.totals[1], 550);
});

test('mese scorso: gennaio attraversa l’anno, febbraio rispetta gli anni bisestili', () => {
  const january = bucketsFor('previous-month', '2026-01-15');
  assert.equal(january.length, 31);
  assert.equal(january[0]!.from, '2025-12-01');
  assert.equal(january[30]!.to, '2025-12-31');
  assert.equal(bucketsFor('previous-month', '2024-03-01').length, 29);
  assert.equal(bucketsFor('previous-month', '2025-03-31').length, 28);
});
test('ultimi 3 mesi comprendono quello corrente; totali separati dal mese scorso', () => {
  assert.deepEqual(bucketsFor('quarter', '2026-01-15').map((b) => b.key), ['2025-11', '2025-12', '2026-01']);
  const items = expandOccurrences([
    entry({ expense_date: '2025-10-31', amount_minor: 999 }),
    entry({ expense_date: '2025-11-01', amount_minor: 100 }),
    entry({ expense_date: '2025-12-31', amount_minor: 200 }),
    entry({ expense_date: '2026-01-15', amount_minor: 300 }),
  ], '2026-01-15');
  assert.equal(breakdown(items, [], 'quarter', '2026-01-15').total, 600);
  assert.equal(breakdown(items, [], 'previous-month', '2026-01-15').total, 200);
});

test('colori: fino a 12 categorie usate hanno slot distinti, indipendenti da ordine e periodo', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `cat-${i}-${'abcdef'.charAt(i % 6)}`);
  const slots = categoryColorSlots(ids);
  assert.equal(new Set(slots.values()).size, 12);
  assert.deepEqual([...categoryColorSlots([...ids].reverse())].sort(), [...slots].sort());
  assert.deepEqual([...categoryColorSlots([...ids, ...ids])].sort(), [...slots].sort());
  // Hash collisions alone would repeat colours: with 12 IDs some pair collides on the preferred slot.
  assert.ok(new Set(ids.map(categoryColorSlot)).size < 12);
});

test('colori: oltre 12 categorie restano nell’intervallo e deterministici', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `id-${i}`);
  const slots = categoryColorSlots(ids);
  assert.ok([...slots.values()].every((slot) => Number.isInteger(slot) && slot >= 0 && slot < 12));
  assert.deepEqual([...categoryColorSlots(ids)], [...slots]);
  assert.equal(new Set(slots.values()).size, 12);
});

test('colori: i casi della segnalazione (Casa, Ristorazione, Alimentari, Trasporti) restano distinti e stabili tra i periodi', () => {
  const categories = ['Casa', 'Ristorazione', 'Alimentari', 'Trasporti'].map((label, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, label, icon: null }));
  const today = '2026-11-10';
  const items = categories.map((c, i) => ({ key: `${c.id}:x`, expenseId: `e${i}`, index: 0, date: i === 0 ? '2026-06-01' : '2026-11-05', amount_minor: 1000,
    description: c.label, category_id: c.id, recurrence: null }));
  const month = breakdown(items, categories, 'month', today);
  const year = breakdown(items, categories, 'year', today);
  const slotOf = (b: typeof month, key: string) => b.series.find((s) => s.key === key)?.slot;
  assert.equal(new Set(year.series.map((s) => s.slot)).size, 4);
  for (const s of month.series) assert.equal(s.slot, slotOf(year, s.key));
});

test('colori: oltre 12 categorie le 12 con più spesa nell’archivio restano distinte; fino a 12 il peso non conta', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `cat-${String(i).padStart(2, '0')}`);
  const weights = new Map(ids.map((id, i) => [id, (i + 1) * 100]));
  const slots = categoryColorSlots(ids, weights);
  const top = ids.slice(8);
  assert.equal(new Set(top.map((id) => slots.get(id))).size, 12);
  assert.deepEqual(categoryColorSlots(ids.slice(0, 12), weights), categoryColorSlots(ids.slice(0, 12)));
  assert.deepEqual([...categoryColorSlots([...ids].reverse(), weights)].sort(), [...slots].sort());
});

test('occorrenze: fino a 5000 per serie (1000 fino al 22 novembre), calcolate solo fino al giorno chiesto', () => {
  assert.equal(maxOccurrences, 5000);
  const weekly = entry({ recurrence: 'weekly', expense_date: '2000-01-01' });
  // Today: only the occurrences up to today exist (about 1400), not the whole range.
  const now = expandOccurrences([weekly], '2026-11-22');
  assert.equal(now.length, occurrenceDates('2000-01-01', 'weekly', '2026-11-22').length);
  assert.ok(now.length > 1000 && now.length < 1500, String(now.length));
  assert.equal(now[now.length - 1]!.date, '2026-11-21');
  // At the end of the range of dates: exactly 5000 (numbers 0..4999), then the series stops (safety net).
  const all = expandOccurrences([weekly], '2099-12-31');
  assert.equal(all.length, maxOccurrences);
  assert.deepEqual([all[0]!.index, all[all.length - 1]!.index], [0, 4999]);
  assert.equal(nextRenewal('2000-01-01', 'weekly', '2099-12-31'), null);
  assert.deepEqual(nextRenewal('2000-01-01', 'weekly', '2026-11-22'), { index: now.length, date: '2026-11-28' });
  // Before 22 November a weekly series started in 2000 stopped in 2019: monthly and yearly series never reach the limit.
  assert.equal(expandOccurrences([{ ...weekly, recurrence: 'monthly' }], '2099-12-31').length, 1200);
});

test('occorrenze: stati e pagamenti eliminati con cronologie lunghe danno lo stesso risultato del calcolo semplice', () => {
  const day = (n: number) => new Date(Date.UTC(2000, 0, 1 + n)).toISOString().slice(0, 10);
  const status_changes: StatusChange[] = Array.from({ length: 1000 }, (_, i) => ({ date: day(3 + i * 9), status: i % 3 === 0 ? 'paused' : i % 3 === 1 ? 'active' : 'cancelled' }));
  const skipped_payments = Array.from({ length: 1000 }, (_, i) => i * 3 + 1);
  const series = entry({ recurrence: 'weekly', expense_date: '2000-01-01', status_changes, skipped_payments,
    price_changes: Array.from({ length: 8 }, (_, i) => ({ index: 600 * (i + 1), amount_minor: 200 + i, once: i % 2 === 1 })) });
  // Reference: the definition, one occurrence at a time (status in force strictly before the date, removed numbers).
  const expected = occurrenceDates('2000-01-01', 'weekly', '2099-12-31').flatMap((date, index) =>
    !skipped_payments.includes(index) && (index === 0 || statusAt(status_changes, date) === 'active')
      ? [{ date, index, amount_minor: priceAt(100, series.price_changes!, index) }] : []);
  const pick = (list: { date: string; index: number; amount_minor: number }[]) => list.map(({ date, index, amount_minor }) => ({ date, index, amount_minor }));
  assert.deepEqual(pick(expandOccurrences([series], '2099-12-31')), expected);
  const cut = '2040-06-30';
  assert.deepEqual(pick([...expandOccurrences([series], cut), ...forecastOccurrences([series], cut, '2099-12-31')]), expected);
  // Linear in the length of the history: the worst series stays well below a frame budget of work per call.
  const started = performance.now();
  subscriptionSummary(series, '2026-11-22');
  assert.ok(performance.now() - started < 250);
});
