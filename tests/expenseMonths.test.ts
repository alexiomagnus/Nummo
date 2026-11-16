import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchAndSort, type Occurrence } from '../src/domain/history.ts';
import { expenseMonths } from '../src/features/history/expenseMonths.ts';

const item = (key: string, date: string, amount_minor: number, description = 'Pane'): Occurrence => ({
  key, expenseId: key, index: 0, date, amount_minor, description, category_id: null, recurrence: null,
});

test('riepiloghi mensili: mesi civili distinti per anno, anche con righe non contigue', () => {
  const items = [item('a', '2026-11-01', 120), item('b', '2025-11-02', 999), item('c', '2026-11-08', 230)];
  const original = structuredClone(items);
  assert.deepEqual([...expenseMonths(items)], [
    ['2026-11', { count: 2, total: 350 }], ['2025-11', { count: 1, total: 999 }],
  ]);
  assert.deepEqual(items, original);
  assert.equal(expenseMonths([]).size, 0);
});

test('riepiloghi mensili: conteggi e totali includono solo i risultati filtrati', () => {
  const items = [item('a', '2026-11-01', 100), item('b', '2026-11-02', 200, 'Latte'), item('c', '2026-10-01', 300)];
  const results = searchAndSort(items, 'pane', 'amount-desc');
  assert.deepEqual([...expenseMonths(results)], [
    ['2026-10', { count: 1, total: 300 }], ['2026-11', { count: 1, total: 100 }],
  ]);
  assert.deepEqual(results.map((entry) => entry.key), ['c', 'a']);
});
