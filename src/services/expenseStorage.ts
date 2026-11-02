import { isValidDate, normalizeDescription, type ExpenseData } from '../domain/expense.ts';
import { expensePolicy } from '../domain/policy.ts';
import { isRecurrence } from '../domain/recurrence.ts';

// Temporary browser archive until Google Sheets is connected (see docs/architecture.md).
export const expenseStorageKey = 'nummo.expenses.v1';
export type ExpenseRecord = Readonly<ExpenseData & { id: string; created_at: string }>;
type ExpenseStorage = Pick<Storage, 'getItem' | 'setItem'>;

function toRecord(item: unknown): ExpenseRecord | null {
  if (!item || typeof item !== 'object') return null;
  const v = item as Record<string, unknown>;
  const valid = typeof v.id === 'string' && v.id !== ''
    && typeof v.created_at === 'string' && Number.isFinite(Date.parse(v.created_at))
    && Number.isSafeInteger(v.amount_minor) && (v.amount_minor as number) > 0
    && (v.amount_minor as number) <= expensePolicy.maxAmountMinor
    && v.currency === expensePolicy.currency
    && typeof v.description === 'string' && v.description !== ''
    && normalizeDescription(v.description) === v.description
    && Array.from(v.description).length <= expensePolicy.maxDescriptionLength
    && (v.category_id === null || (typeof v.category_id === 'string' && v.category_id !== ''))
    && typeof v.expense_date === 'string' && isValidDate(v.expense_date) && v.expense_date >= expensePolicy.minDate
    && (v.recurrence === null || isRecurrence(v.recurrence))
    && v.source === 'web_app' && v.schema_version === 1;
  if (!valid) return null;
  return {
    id: v.id as string, created_at: v.created_at as string, amount_minor: v.amount_minor as number,
    currency: expensePolicy.currency, description: v.description as string, category_id: v.category_id as string | null,
    expense_date: v.expense_date as string, recurrence: v.recurrence as ExpenseRecord['recurrence'],
    source: 'web_app', schema_version: 1,
  };
}

export function readExpenses(storage: ExpenseStorage): ExpenseRecord[] {
  const raw = storage.getItem(expenseStorageKey);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Archivio spese non valido.');
  const records: ExpenseRecord[] = [];
  for (const entry of parsed) {
    const record = toRecord(entry);
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
  const record = toRecord({ ...data, id, created_at: now.toISOString() });
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
