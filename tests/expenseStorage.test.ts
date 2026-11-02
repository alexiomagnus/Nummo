import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expenseStorageKey, readExpenses, removeExpense, storeExpense } from '../src/services/expenseStorage.ts';
import type { ExpenseData } from '../src/domain/expense.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}
const data: ExpenseData = {
  amount_minor: 1230, currency: 'EUR', description: 'Pane', category_id: null, expense_date: '2026-11-02',
  recurrence: null, source: 'web_app', schema_version: 1,
};
const now = new Date('2026-11-02T10:00:00.000Z');

test('salvataggio, rilettura ed eliminazione', () => {
  const storage = memoryStorage();
  assert.deepEqual(readExpenses(storage), []);
  storeExpense(storage, data, () => 'a', now);
  storeExpense(storage, { ...data, recurrence: 'weekly', category_id: 'cat' }, () => 'b', now);
  const records = readExpenses(storage);
  assert.deepEqual(records.map((record) => [record.id, record.recurrence, record.created_at]),
    [['a', null, now.toISOString()], ['b', 'weekly', now.toISOString()]]);
  assert.deepEqual(removeExpense(storage, 'a').map((record) => record.id), ['b']);
  assert.throws(() => removeExpense(storage, 'a'), /non trovata/);
});
test('dati non validi non vengono salvati', () => {
  const storage = memoryStorage();
  for (const bad of [{ amount_minor: 0 }, { amount_minor: 1.5 }, { description: ' x' }, { expense_date: '2026-02-30' },
    { recurrence: 'daily' }, { currency: 'USD' }]) {
    assert.throws(() => storeExpense(storage, { ...data, ...bad } as ExpenseData, () => 'a', now));
  }
  assert.equal(storage.getItem(expenseStorageKey), null);
});
test('archivio corrotto rifiutato e non sovrascritto', () => {
  for (const value of ['{broken', '{}', JSON.stringify([{ id: 'a' }])]) {
    const storage = memoryStorage();
    storage.setItem(expenseStorageKey, value);
    assert.throws(() => storeExpense(storage, data, () => 'b', now));
    assert.equal(storage.getItem(expenseStorageKey), value);
  }
});
test('un ID duplicato non sovrascrive la spesa esistente', () => {
  const storage = memoryStorage();
  storeExpense(storage, data, () => 'a', now);
  assert.throws(() => storeExpense(storage, { ...data, amount_minor: 1 }, () => 'a', now));
  assert.equal(readExpenses(storage)[0]!.amount_minor, 1230);
});
