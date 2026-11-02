import { createHash } from 'node:crypto';
import { parseExpenseRequest, type ExpenseList, type ExpenseRecord, type Receipt } from '../../src/domain/contract.ts';
import type { ExpenseRequest } from '../../src/domain/expense.ts';
import type { Ledger, Sheet } from './ports.ts';
import { fromRow, isBlankRow, sameCells, toRow } from './sheetRow.ts';

export type SubmitResult =
  | { ok: true; receipt: Receipt }
  // Definitive: nothing was written for this request.
  | { ok: false; code: 'invalid-argument' | 'already-exists'; message: string };

// Thrown when the reserved row holds another expense (rows inserted or sorted by hand):
// nothing is overwritten and the outcome stays retryable once the sheet is fixed.
export class RowCollisionError extends Error {}

export function requestHash(request: ExpenseRequest): string {
  const canonical = JSON.stringify(Object.keys(request).sort().map((key) => [key, request[key as keyof ExpenseRequest]]));
  return createHash('sha256').update(canonical).digest('hex');
}

// Idempotent: retries with the same expense_id and data rewrite the same row, never append.
export async function submitExpense(
  deps: { ledger: Ledger; sheet: Sheet; now: () => Date }, uid: string, payload: unknown,
): Promise<SubmitResult> {
  const now = deps.now();
  const request = parseExpenseRequest(payload, now);
  if (!request) return { ok: false, code: 'invalid-argument', message: 'Spesa non valida.' };
  const reservation = await deps.ledger.reserve({
    uid, expenseId: request.expense_id, hash: requestHash(request), createdAt: now.toISOString(),
  });
  if (reservation.kind === 'conflict') {
    return { ok: false, code: 'already-exists', message: 'Questo identificativo è già usato da una spesa diversa.' };
  }
  const { row, created_at, written } = reservation.operation;
  const receipt = { expense_id: request.expense_id, created_at };
  if (written) return { ok: true, receipt };

  const { expense_id, ...data } = request;
  const cells = toRow({ ...data, id: expense_id, created_at });
  const current = await deps.sheet.readRow(row);
  if (!isBlankRow(current) && current[0] !== expense_id) throw new RowCollisionError(`Riga ${row} occupata.`);
  if (!sameCells(current, cells)) await deps.sheet.writeRow(row, cells);
  await deps.ledger.markWritten(expense_id);
  return { ok: true, receipt };
}

// Rows reserved but never written stay blank and are skipped; malformed rows are counted, not hidden.
export async function listExpenses(deps: { sheet: Sheet }): Promise<ExpenseList> {
  const expenses: ExpenseRecord[] = [];
  let invalid = 0;
  for (const cells of await deps.sheet.readDataRows()) {
    if (isBlankRow(cells)) continue;
    const record = fromRow(cells);
    if (record && !expenses.some((existing) => existing.id === record.id)) expenses.push(record);
    else invalid += 1;
  }
  return { expenses, invalid_rows: invalid };
}
