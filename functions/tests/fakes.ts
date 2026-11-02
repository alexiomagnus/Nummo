import type { Cell, Ledger, Operation, Sheet } from '../src/ports.ts';

// Mirrors the Firestore transaction: check and reserve happen with no await in between.
export function memoryLedger(): Ledger & { operations: Map<string, Operation & { uid: string; hash: string }>; failMarkOnce: boolean } {
  const operations = new Map<string, Operation & { uid: string; hash: string }>();
  let nextRow = 2;
  const ledger = {
    operations,
    failMarkOnce: false,
    async reserve({ uid, expenseId, hash, createdAt }: { uid: string; expenseId: string; hash: string; createdAt: string }) {
      await Promise.resolve();
      const existing = operations.get(expenseId);
      if (existing) {
        if (existing.uid !== uid || existing.hash !== hash) return { kind: 'conflict' } as const;
        return { kind: 'operation', operation: { row: existing.row, created_at: existing.created_at, written: existing.written } } as const;
      }
      const op = { uid, hash, row: nextRow++, created_at: createdAt, written: false };
      operations.set(expenseId, op);
      return { kind: 'operation', operation: { row: op.row, created_at: op.created_at, written: false } } as const;
    },
    async markWritten(expenseId: string) {
      if (ledger.failMarkOnce) {
        ledger.failMarkOnce = false;
        throw new Error('crash simulato dopo la scrittura');
      }
      operations.get(expenseId)!.written = true;
    },
  };
  return ledger;
}

export function memorySheet(): Sheet & { rows: Map<number, unknown[]>; writes: number; failNextWrite: boolean } {
  const rows = new Map<number, unknown[]>();
  const sheet = {
    rows,
    writes: 0,
    failNextWrite: false,
    async readRow(row: number) {
      return rows.get(row) ?? [];
    },
    async writeRow(row: number, cells: readonly Cell[]) {
      await Promise.resolve();
      if (sheet.failNextWrite) {
        sheet.failNextWrite = false;
        throw new Error('timeout simulato');
      }
      sheet.writes += 1;
      rows.set(row, [...cells]);
    },
    async readDataRows() {
      const max = Math.max(1, ...rows.keys());
      return Array.from({ length: max - 1 }, (_, index) => rows.get(index + 2) ?? []);
    },
  };
  return sheet;
}
