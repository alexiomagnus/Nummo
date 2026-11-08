// Shapes exchanged across trust boundaries (browser storage, Firestore, backups) and their
// runtime checks. TypeScript types alone do not validate untrusted data.
import { isValidDate, normalizeDescription, type ExpenseData, type ExpenseRequest } from './expense.ts';
import { expensePolicy, todayInRome } from './policy.ts';
import { parsePriceChanges } from './pricing.ts';
import { isRecurrence } from './recurrence.ts';
import { parseStatusChanges } from './subscription.ts';

export type ExpenseRecord = Readonly<ExpenseData & { id: string; created_at: string }>;
export type Receipt = Readonly<{ expense_id: string; created_at: string }>;

const requestKeys = [
  'expense_id', 'amount_minor', 'currency', 'description', 'category_id', 'expense_date',
  'recurrence', 'price_changes', 'status_changes', 'fund_id', 'source', 'schema_version',
] as const;

// Field comparison that also handles the price schedule (an array of objects).
export function sameFieldValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  return Array.isArray(a) === Array.isArray(b) && keys.length === Object.keys(y).length && keys.every((k) => sameFieldValue(x[k], y[k]));
}

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
    // Absent on records saved before funds existed (= no fund).
    && (v.fund_id === undefined || v.fund_id === null || (typeof v.fund_id === 'string' && v.fund_id !== ''))
    && v.source === 'web_app' && v.schema_version === 1;
  const price_changes = parsePriceChanges(v.price_changes);
  const status_changes = parseStatusChanges(v.status_changes);
  if (!valid || !price_changes || !status_changes || (v.recurrence === null && status_changes.length > 0)) return null;
  return {
    amount_minor: amount, currency: expensePolicy.currency, description, category_id: v.category_id as string | null,
    expense_date: v.expense_date as string, recurrence: v.recurrence as ExpenseData['recurrence'], price_changes, status_changes,
    fund_id: (v.fund_id as string | null | undefined) ?? null, source: 'web_app', schema_version: 1,
  };
}

// A saved expense, from this browser's old archive, Firestore or a backup.
export function parseExpenseRecord(value: unknown): ExpenseRecord | null {
  const v = asObject(value);
  if (!v || typeof v.id !== 'string' || v.id === '' || typeof v.created_at !== 'string'
    || !Number.isFinite(Date.parse(v.created_at))) return null;
  const data = readData(v);
  return data && { ...data, id: v.id, created_at: v.created_at };
}

// Final client check before a Firestore write (mirrored by the Rules): exact fields, no future dates.
export function parseExpenseRequest(value: unknown, now: Date): ExpenseRequest | null {
  const v = asObject(value);
  if (!v || Object.keys(v).length !== requestKeys.length || !requestKeys.every((key) => key in v)) return null;
  if (!isUuid(v.expense_id) || (v.category_id !== null && !isUuid(v.category_id)) || (v.fund_id !== null && !isUuid(v.fund_id))) return null;
  const data = readData(v);
  const today = todayInRome(now);
  if (!data || data.expense_date > today || data.status_changes.some((change) => change.date > today)) return null;
  return { ...data, expense_id: v.expense_id };
}
