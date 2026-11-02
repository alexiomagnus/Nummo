import { parseExpenseRecord, type ExpenseRecord } from '../domain/contract.ts';
import type { ExpenseData } from '../domain/expense.ts';

// Temporary browser archive, used when no backend is configured (see docs/architecture.md).
export const expenseStorageKey = 'nummo.expenses.v1';
export type { ExpenseRecord };
type ExpenseStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readExpenses(storage: ExpenseStorage): ExpenseRecord[] {
  const raw = storage.getItem(expenseStorageKey);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Archivio spese non valido.');
  const records: ExpenseRecord[] = [];
  for (const entry of parsed) {
    const record = parseExpenseRecord(entry);
    if (!record || records.some((existing) => existing.id === record.id)) throw new Error('Archivio spese non valido.');
    records.push(record);
  }
  return records;
}

// Read before writing; never overwrite unreadable existing data.
export function storeExpense(
  storage: ExpenseStorage, data: ExpenseData, createId: () => string, now = new Date(),
): ExpenseRecord[] {
  const records = readExpenses(storage);
  const id = createId();
  const record = parseExpenseRecord({ ...data, id, created_at: now.toISOString() });
  if (!record) throw new Error('Spesa non valida.');
  if (records.some((existing) => existing.id === id)) throw new Error('Identificativo spesa non valido.');
  const updated = [...records, record];
  storage.setItem(expenseStorageKey, JSON.stringify(updated));
  return updated;
}

export function removeExpense(storage: ExpenseStorage, id: string): ExpenseRecord[] {
  const records = readExpenses(storage);
  const updated = records.filter((record) => record.id !== id);
  if (updated.length === records.length) throw new Error('Spesa non trovata.');
  storage.setItem(expenseStorageKey, JSON.stringify(updated));
  return updated;
}
