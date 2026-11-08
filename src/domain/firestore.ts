import { categoryNameError, isCategoryIcon, normalizeCategoryName, type Category } from './category.ts';
import { isUtcTimestamp, isUuid, parseExpenseRecord, type ExpenseRecord } from './contract.ts';
import { parseExpenseRequest } from './contract.ts';
import { parseFund, parseMovement, type Fund, type Movement } from './funds.ts';
export type SyncedExpense = ExpenseRecord & { revision: number; updated_at: string };
export type SyncedCategory = Category & { revision: number; updated_at: string; name_key: string };
export function categoryNameKey(label: string): string {
  return 'n-' + normalizeCategoryName(label).toLowerCase().replaceAll('%', '%25').replaceAll('/', '%2F');
}
export function parseSyncedExpense(value: unknown): SyncedExpense | null {
  const v = value as Partial<SyncedExpense> | null;
  const record = parseExpenseRecord(value);
  if (!v || !record || !isUuid(record.id) || !isUtcTimestamp(record.created_at)
    || !isUtcTimestamp(v.updated_at) || !Number.isSafeInteger(v.revision) || v.revision! < 1
    || (record.category_id !== null && !isUuid(record.category_id)) || (record.fund_id !== null && !isUuid(record.fund_id))) return null;
  return { ...record, revision: v.revision!, updated_at: v.updated_at };
}
export function parseSyncedCategory(value: unknown): SyncedCategory | null {
  const v = value as Partial<SyncedCategory> | null;
  if (!v || !isUuid(v.id) || typeof v.label !== 'string' || categoryNameError(v.label, [])
    || normalizeCategoryName(v.label) !== v.label || (v.icon !== null && !isCategoryIcon(v.icon))
    || v.name_key !== categoryNameKey(v.label) || !isUtcTimestamp(v.updated_at)
    || !Number.isSafeInteger(v.revision) || v.revision! < 1) return null;
  return v as SyncedCategory;
}
export function validateImportedExpense(record: ExpenseRecord): void {
  const { id, created_at, ...data } = record;
  if (!isUtcTimestamp(created_at) || Date.parse(created_at) > Date.now()
    || !parseExpenseRequest({ ...data, expense_id: id }, new Date())) throw new Error('Spesa da importare non valida.');
}

// Funds: schedules arrive as compact strings (decoded by the store before this check). Movements are immutable.
export type SyncedFund = Fund & { revision: number; updated_at: string };
export type SyncedMovement = Movement;
export function parseSyncedFund(value: unknown): SyncedFund | null {
  const v = value as Partial<SyncedFund> | null;
  const fund = parseFund(value);
  if (!v || !fund || !isUtcTimestamp(fund.created_at) || !isUtcTimestamp(v.updated_at)
    || !Number.isSafeInteger(v.revision) || v.revision! < 1) return null;
  return { ...fund, revision: v.revision!, updated_at: v.updated_at };
}
export function parseSyncedMovement(value: unknown): SyncedMovement | null {
  const movement = parseMovement(value);
  return movement && isUtcTimestamp(movement.created_at) ? movement : null;
}
