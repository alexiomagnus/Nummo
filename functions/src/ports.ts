// Boundaries of the application service; adapters live in firestoreLedger.ts and googleSheet.ts.

export type Cell = string | number;

// One spreadsheet tab addressed by absolute row number (row 1 is the header).
export interface Sheet {
  readRow(row: number): Promise<readonly unknown[]>;
  // Must resolve only when the row verifiably holds exactly `cells`.
  writeRow(row: number, cells: readonly Cell[]): Promise<void>;
  // Every row from 2 onwards, in sheet order; blank rows as [].
  readDataRows(): Promise<readonly (readonly unknown[])[]>;
}

export type Operation = Readonly<{ row: number; created_at: string; written: boolean }>;
export type Reservation =
  | { kind: 'operation'; operation: Operation }
  // Same expense_id already used with different data, or by another account.
  | { kind: 'conflict' };

// Technical ledger (Firestore): assigns each expense_id one fixed sheet row, atomically.
export interface Ledger {
  reserve(input: { uid: string; expenseId: string; hash: string; createdAt: string }): Promise<Reservation>;
  markWritten(expenseId: string): Promise<void>;
}
