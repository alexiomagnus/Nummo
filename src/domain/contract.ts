// Shapes exchanged across trust boundaries (browser storage, network, Sheets) and their
// runtime checks. TypeScript types alone do not validate untrusted data.
import { isValidDate, normalizeDescription, type ExpenseData, type ExpenseRequest } from './expense.ts';
import { expensePolicy, todayInRome } from './policy.ts';
import { isRecurrence } from './recurrence.ts';

export type ExpenseRecord = Readonly<ExpenseData & { id: string; created_at: string }>;
export type Receipt = Readonly<{ expense_id: string; created_at: string }>;
export type ExpenseList = Readonly<{ expenses: readonly ExpenseRecord[]; invalid_rows: number }>;

const requestKeys = [
  'expense_id', 'amount_minor', 'currency', 'description', 'category_id', 'expense_date',
  'recurrence', 'source', 'schema_version',
] as const;

// Canonical lowercase UUID as produced by crypto.randomUUID().
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

export function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return Number.isFinite(time) && new Date(time).toISOString() === canonical;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readData(v: Record<string, unknown>): ExpenseData | null {
  const amount = v.amount_minor;
  const description = v.description;
  const valid = typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0
    && amount <= expensePolicy.maxAmountMinor
    && v.currency === expensePolicy.currency
    && typeof description === 'string' && description !== ''
    && normalizeDescription(description) === description
    && Array.from(description).length <= expensePolicy.maxDescriptionLength
    && (v.category_id === null || (typeof v.category_id === 'string' && v.category_id !== ''))
    && typeof v.expense_date === 'string' && isValidDate(v.expense_date) && v.expense_date >= expensePolicy.minDate
    && (v.recurrence === null || isRecurrence(v.recurrence))
    && v.source === 'web_app' && v.schema_version === 1;
  if (!valid) return null;
  return {
    amount_minor: amount, currency: expensePolicy.currency, description, category_id: v.category_id as string | null,
    expense_date: v.expense_date as string, recurrence: v.recurrence as ExpenseData['recurrence'],
    source: 'web_app', schema_version: 1,
  };
}

// A saved expense, from this browser's archive or from the backend.
export function parseExpenseRecord(value: unknown): ExpenseRecord | null {
  const v = asObject(value);
  if (!v || typeof v.id !== 'string' || v.id === '' || typeof v.created_at !== 'string'
    || !Number.isFinite(Date.parse(v.created_at))) return null;
  const data = readData(v);
  return data && { ...data, id: v.id, created_at: v.created_at };
}

// The backend's final check on an untrusted request: exact fields, no extras, no future dates.
export function parseExpenseRequest(value: unknown, now: Date): ExpenseRequest | null {
  const v = asObject(value);
  if (!v || Object.keys(v).length !== requestKeys.length || !requestKeys.every((key) => key in v)) return null;
  if (!isUuid(v.expense_id) || (v.category_id !== null && !isUuid(v.category_id))) return null;
  const data = readData(v);
  if (!data || data.expense_date > todayInRome(now)) return null;
  return { ...data, expense_id: v.expense_id };
}

export function parseReceipt(value: unknown): Receipt | null {
  const v = asObject(value);
  return v && isUuid(v.expense_id) && isUtcTimestamp(v.created_at)
    ? { expense_id: v.expense_id, created_at: v.created_at } : null;
}

export function parseExpenseList(value: unknown): ExpenseList | null {
  const v = asObject(value);
  if (!v || !Array.isArray(v.expenses) || !Number.isSafeInteger(v.invalid_rows) || (v.invalid_rows as number) < 0) return null;
  const expenses: ExpenseRecord[] = [];
  for (const item of v.expenses) {
    const record = parseExpenseRecord(item);
    if (!record) return null;
    expenses.push(record);
  }
  return { expenses, invalid_rows: v.invalid_rows as number };
}
