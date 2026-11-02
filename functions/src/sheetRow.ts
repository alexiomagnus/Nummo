import { parseExpenseRecord, type ExpenseRecord } from '../../src/domain/contract.ts';
import type { Cell } from './ports.ts';

// Column order of the «Spese» tab. Changing it requires migrating the sheet.
export const sheetColumns = [
  'expense_id', 'expense_date', 'amount_minor', 'currency', 'description', 'category_id',
  'recurrence', 'created_at', 'source', 'schema_version',
] as const;
export const lastColumn = 'J';

// Written with valueInputOption RAW: text such as "=1+1" stays text, never a formula.
export function toRow(record: ExpenseRecord): Cell[] {
  return [
    record.id, record.expense_date, record.amount_minor, record.currency, record.description,
    record.category_id ?? '', record.recurrence ?? '', record.created_at, record.source, record.schema_version,
  ];
}

export function isBlankRow(cells: readonly unknown[]): boolean {
  return cells.every((cell) => cell === '' || cell === null || cell === undefined);
}

export function fromRow(cells: readonly unknown[]): ExpenseRecord | null {
  const value = (index: number) => cells[index] ?? '';
  const optional = (index: number) => (value(index) === '' ? null : value(index));
  return parseExpenseRecord({
    id: value(0), expense_date: value(1), amount_minor: value(2), currency: value(3), description: value(4),
    category_id: optional(5), recurrence: optional(6), created_at: value(7), source: value(8), schema_version: value(9),
  });
}

export function sameCells(actual: readonly unknown[], expected: readonly Cell[]): boolean {
  // Sheets drops trailing empty cells.
  const trimmed = [...expected];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
  return actual.length === trimmed.length && trimmed.every((cell, index) => actual[index] === cell);
}
