import {
  collection, deleteField, doc, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp, setDoc,
  Timestamp, writeBatch, type Firestore, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { planImport, sameCategory, sameExpense, validateBackupData, type ImportData, type ImportMode } from '../domain/backup.ts';
import type { ExpenseData, ExpenseRequest } from '../domain/expense.ts';
import { parseExpenseRequest, sameFieldValue, type ExpenseRecord } from '../domain/contract.ts';
import { categoryNameError, normalizeCategoryName, type Category, type CategoryIcon } from '../domain/category.ts';
import { decodeStatusChanges, encodeStatusChanges } from '../domain/subscription.ts';
import { categoryNameKey, parseSyncedCategory, parseSyncedExpense, type SyncedCategory, type SyncedExpense } from '../domain/firestore.ts';

export type SnapshotState<T> = { records: T[]; fromCache: boolean; pending: boolean; pendingIds: string[] };
function decode(data: DocumentData, id: string) {
  return { ...data, ...('status_changes' in data ? { status_changes: decodeStatusChanges(data.status_changes) } : {}), id, created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at,
    updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : data.updated_at };
}
function parseSnapshot<T>(snapshot: QuerySnapshot, parse: (value: unknown) => T | null): SnapshotState<T> {
  const records = snapshot.docs.map((item) => parse(decode(item.data({ serverTimestamps: 'estimate' }), item.id)));
  if (records.some((item) => !item)) throw new Error('Archivio non valido: esportazione e modifiche bloccate.');
  return { records: records as T[], fromCache: snapshot.metadata.fromCache, pending: snapshot.metadata.hasPendingWrites, pendingIds: snapshot.docs.filter((d) => d.metadata.hasPendingWrites).map((d) => d.id) };
}
// `status_changes` is stored (encoded as one string) only when a series has one: records without it (every
// one-off expense and series never paused) keep the exact shape that Rules published before statuses accept.
function stored<T extends Pick<ExpenseData, 'status_changes'>>(data: T) {
  const { status_changes, ...rest } = data;
  return status_changes.length ? { ...rest, status_changes: encodeStatusChanges(status_changes) } : rest;
}

export function createFirestoreStore(db: Firestore, uid: string) {
  const expenses = collection(db, 'users', uid, 'expenses');
  const categories = collection(db, 'users', uid, 'categories');
  const names = collection(db, 'users', uid, 'categoryNames');
  const conflict = () => new Error('I dati sono cambiati in un’altra sessione. Riapri la modifica e riprova.');
  // Reads the saved archive from the server for a restore plan. Refuses while writes are pending.
  async function readArchive() {
    const [e, c] = await Promise.all([getDocsFromServer(expenses), getDocsFromServer(categories)]);
    const savedExpenses = parseSnapshot(e, parseSyncedExpense);
    const savedCategories = parseSnapshot(c, parseSyncedCategory);
    if (savedExpenses.pending || savedCategories.pending) throw new Error('Attendi le scritture pendenti prima di importare.');
    return { expenses: savedExpenses.records, categories: savedCategories.records };
  }
  return {
    watchExpenses(next: (value: SnapshotState<SyncedExpense>) => void, error: (reason: Error) => void) {
      return onSnapshot(expenses, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedExpense)); } catch (e) { error(e as Error); }
      }, error);
    },
    watchCategories(next: (value: SnapshotState<SyncedCategory>) => void, error: (reason: Error) => void) {
      return onSnapshot(categories, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedCategory)); } catch (e) { error(e as Error); }
      }, error);
    },
    async confirmExpense(request: ExpenseRequest) {
      const saved = await getDocFromServer(doc(expenses, request.expense_id));
      const record = saved.exists() ? parseSyncedExpense(decode(saved.data(), saved.id)) : null;
      const { expense_id, ...data } = request;
      if (!record || Object.entries(data).some(([key, value]) => !sameFieldValue(record[key as keyof ExpenseData], value))) throw new Error('Spesa non ancora confermata dal server. Attendi la riconnessione.');
      return { expense_id, created_at: record.created_at };
    },
    async createExpense(request: ExpenseRequest) {
      if (!parseExpenseRequest(request, new Date())) throw new Error('Spesa non valida.');
      const { expense_id, ...data } = request;
      // One stable document ID; SDK owns the queue/retries. No application retry queue.
      await setDoc(doc(expenses, expense_id), { ...stored(data), created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 });
      const saved = await getDocFromServer(doc(expenses, expense_id));
      const record = saved.exists() ? parseSyncedExpense(decode(saved.data(), saved.id)) : null;
      if (!record || Object.entries(data).some(([key, value]) => !sameFieldValue(record[key as keyof ExpenseData], value))) throw new Error('Conferma non valida.');
      return { expense_id, created_at: record.created_at };
    },
    async updateExpense(previous: SyncedExpense, data: ExpenseData) {
      if (!parseExpenseRequest({ ...data, expense_id: previous.id }, new Date())) throw new Error('Spesa non valida.');
      await runTransaction(db, async (tx) => {
        const ref = doc(expenses, previous.id);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.update(ref, { ...stored(data), ...(data.status_changes.length ? {} : { status_changes: deleteField() }), revision: previous.revision + 1, updated_at: serverTimestamp() });
      });
    },
    async removeExpense(previous: SyncedExpense) {
      await runTransaction(db, async (tx) => {
        const ref = doc(expenses, previous.id);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.delete(ref);
      });
    },
    async saveCategory(id: string, name: string, icon: CategoryIcon | null, previous?: SyncedCategory) {
      const label = normalizeCategoryName(name);
      const validation = categoryNameError(label, []);
      if (validation) throw new Error(validation);
      const name_key = categoryNameKey(label);
      await runTransaction(db, async (tx) => {
        const ref = doc(categories, id);
        const current = await tx.get(ref);
        const lock = await tx.get(doc(names, name_key));
        if (previous ? !current.exists() || current.data().revision !== previous.revision : current.exists()) throw conflict();
        if (lock.exists() && lock.data().category_id !== id) throw new Error('Esiste già una categoria con questo nome.');
        if (previous && previous.name_key !== name_key) tx.delete(doc(names, previous.name_key));
        tx.set(doc(names, name_key), { category_id: id });
        tx.set(ref, { label, icon, name_key, revision: (previous?.revision ?? 0) + 1, updated_at: serverTimestamp() });
      });
    },
    async removeCategory(previous: SyncedCategory) {
      await runTransaction(db, async (tx) => {
        const ref = doc(categories, previous.id);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.delete(ref);
        tx.delete(doc(names, previous.name_key));
      });
    },
    async exportSnapshot() {
      // Server-only: never label an incomplete offline cache as a complete backup.
      const [e, c] = await Promise.all([getDocsFromServer(expenses), getDocsFromServer(categories)]);
      const expenseState = parseSnapshot(e, parseSyncedExpense);
      const categoryState = parseSnapshot(c, parseSyncedCategory);
      if (expenseState.pending || categoryState.pending) throw new Error('Attendi la sincronizzazione prima di esportare.');
      return { expenses: expenseState.records, categories: categoryState.records };
    },
    // Preview for the import dialog: what each mode would do, computed on the current server data. No writes.
    async previewImport(data: ImportData) {
      const current = await readArchive();
      return { merge: planImport(data, current, 'merge'), replace: planImport(data, current, 'replace') };
    },
    // 'merge' only adds (identical items skipped; any conflict blocks the whole import before the first write).
    // 'replace' makes the archive equal to the file: it removes saved items that differ from the file, then adds the rest.
    // Nothing is written until the file and the plan have been validated against the server data.
    async importRecords(records: readonly ExpenseRecord[], categoryRecords: readonly Category[], mode: ImportMode = 'merge') {
      const checked = validateBackupData(records, categoryRecords);
      const current = await readArchive();
      const plan = planImport(checked, current, mode);
      if (plan.conflicts.length > 0) throw new Error(`Importazione bloccata: ${plan.conflicts.length} elementi del backup sono diversi da quelli già salvati con lo stesso ID o nome. Nessun dato è stato modificato.`);
      if (mode === 'replace') {
        const savedNames = await getDocsFromServer(names);
        const removedCategories = current.categories.filter((c) => plan.removeCategoryIds.includes(c.id));
        try {
          for (let i = 0; i < plan.removeExpenseIds.length; i += 200) {
            const batch = writeBatch(db);
            for (const id of plan.removeExpenseIds.slice(i, i + 200)) batch.delete(doc(expenses, id));
            await batch.commit();
          }
          // Same group size as the import (Rules: one existsAfter per category delete); each lock goes with its category.
          for (let i = 0; i < removedCategories.length; i += 8) {
            const batch = writeBatch(db);
            for (const r of removedCategories.slice(i, i + 8)) { batch.delete(doc(categories, r.id)); batch.delete(doc(names, r.name_key)); }
            await batch.commit();
          }
          // Orphan name locks (no category any more) would block names of the new categories.
          const keptKeys = new Set(current.categories.filter((c) => !plan.removeCategoryIds.includes(c.id)).map((c) => c.name_key));
          const remaining = savedNames.docs.filter((d) => !keptKeys.has(d.id) && !removedCategories.some((r) => r.name_key === d.id));
          for (let i = 0; i < remaining.length; i += 200) {
            const batch = writeBatch(db);
            for (const d of remaining.slice(i, i + 200)) batch.delete(d.ref);
            await batch.commit();
          }
        } catch (reason) {
          throw new Error('Sostituzione interrotta durante l’eliminazione: alcuni dati precedenti potrebbero essere già stati eliminati. Ripeti la sostituzione con lo stesso file. ' + (reason instanceof Error ? reason.message : ''));
        }
      }
      const chunks: { records: readonly ExpenseRecord[]; categoryRecords: readonly Category[] }[] = [];
      // At most 16 getAfter calls + cached owner lookup per category chunk (Rules limit: 20).
      for (let i = 0; i < plan.addCategories.length; i += 8) chunks.push({ records: [], categoryRecords: plan.addCategories.slice(i, i + 8) });
      for (let i = 0; i < plan.addExpenses.length; i += 200) chunks.push({ records: plan.addExpenses.slice(i, i + 200), categoryRecords: [] });
      try {
        for (const { records, categoryRecords } of chunks) {
          // Each group rechecks its IDs inside the transaction: an item saved meanwhile must be identical or the import stops.
          await runTransaction(db, async (tx) => {
            const expenseDocs = await Promise.all(records.map((r) => tx.get(doc(expenses, r.id))));
            const categoryDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(categories, r.id))));
            const lockDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(names, categoryNameKey(r.label)))));
            records.forEach((r, i) => {
              const existing = expenseDocs[i]!;
              if (existing.exists()) {
                const parsed = parseSyncedExpense(decode(existing.data(), existing.id));
                if (!parsed || !sameExpense(parsed, r)) throw conflict();
              } else {
                const { id, created_at, ...data } = r;
                tx.set(doc(expenses, id), { ...stored(data), created_at: Timestamp.fromDate(new Date(created_at)), updated_at: serverTimestamp(), revision: 1 });
              }
            });
            categoryRecords.forEach((r, i) => {
              const existing = categoryDocs[i]!;
              const key = categoryNameKey(r.label);
              if (existing.exists()) {
                const parsed = parseSyncedCategory(decode(existing.data(), existing.id));
                if (!parsed || !sameCategory(parsed, r)) throw conflict();
              } else {
                if (lockDocs[i]!.exists() && lockDocs[i]!.data()!.category_id !== r.id) throw conflict();
                tx.set(doc(categories, r.id), { label: r.label, icon: r.icon, name_key: key, revision: 1, updated_at: serverTimestamp() });
                tx.set(doc(names, key), { category_id: r.id });
              }
            });
          });
        }
      } catch (reason) {
        throw new Error('Importazione interrotta: alcuni gruppi potrebbero essere già confermati. Originali intatti; ripeti lo stesso backup dopo aver risolto il problema. ' + (reason instanceof Error ? reason.message : ''));
      }
    },
  };
}
export type FirestoreStore = ReturnType<typeof createFirestoreStore>;
