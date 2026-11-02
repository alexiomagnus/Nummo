import type { Firestore } from 'firebase-admin/firestore';
import type { Cell, Ledger, Operation, Sheet } from './ports.ts';

// operations/{expense_id}: one per expense, with its fixed sheet row.
// ledger/sheet: next free row. Clients have no access (firestore.rules denies everything).
const firstDataRow = 2;

export function firestoreLedger(db: Firestore): Ledger {
  const operations = db.collection('operations');
  const counter = db.collection('ledger').doc('sheet');
  return {
    async reserve({ uid, expenseId, hash, createdAt }) {
      return db.runTransaction(async (tx) => {
        const opRef = operations.doc(expenseId);
        const [existing, meta] = await Promise.all([tx.get(opRef), tx.get(counter)]);
        if (existing.exists) {
          const op = existing.data()!;
          if (op.uid !== uid || op.hash !== hash) return { kind: 'conflict' } as const;
          const operation: Operation = { row: op.row, created_at: op.created_at, written: op.written };
          return { kind: 'operation', operation } as const;
        }
        const next = meta.exists ? meta.data()!.next_row as number : firstDataRow;
        tx.set(counter, { next_row: next + 1 });
        tx.create(opRef, { uid, hash, row: next, created_at: createdAt, written: false });
        return { kind: 'operation', operation: { row: next, created_at: createdAt, written: false } } as const;
      });
    },
    async markWritten(expenseId) {
      await operations.doc(expenseId).update({ written: true });
    },
  };
}

// Emulator only: stands in for Google Sheets so the full flow runs without credentials.
export function emulatorSheet(db: Firestore): Sheet {
  const rows = db.collection('emulator_sheet_rows');
  return {
    async readRow(row) {
      const doc = await rows.doc(String(row)).get();
      return doc.exists ? doc.data()!.cells as unknown[] : [];
    },
    async writeRow(row, cells: readonly Cell[]) {
      await rows.doc(String(row)).set({ row, cells: [...cells] });
    },
    async readDataRows() {
      const snapshot = await rows.orderBy('row').get();
      const result: unknown[][] = [];
      for (const doc of snapshot.docs) {
        const { row, cells } = doc.data() as { row: number; cells: unknown[] };
        while (result.length < row - firstDataRow) result.push([]);
        result.push(cells);
      }
      return result;
    },
  };
}
