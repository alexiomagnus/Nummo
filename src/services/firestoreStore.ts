import {
  collection, doc, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp, setDoc,
  Timestamp, writeBatch, type Firestore, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { parseImport } from '../domain/backup.ts';
import type { ExpenseData, ExpenseRequest } from '../domain/expense.ts';
import { parseExpenseRequest, sameFieldValue, type ExpenseRecord } from '../domain/contract.ts';
import { categoryLimitMessage, categoryNameError, maxCategories, normalizeCategoryName, type Category, type CategoryIcon } from '../domain/category.ts';
import { categoryNameKey, parseSyncedCategory, parseSyncedExpense, type SyncedCategory, type SyncedExpense } from '../domain/firestore.ts';

export type SnapshotState<T> = { records: T[]; fromCache: boolean; pending: boolean; pendingIds: string[] };
function decode(data: DocumentData, id: string) {
  return { ...data, id, created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at,
    updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : data.updated_at };
}
function parseSnapshot<T>(snapshot: QuerySnapshot, parse: (value: unknown) => T | null): SnapshotState<T> {
  const records = snapshot.docs.map((item) => parse(decode(item.data({ serverTimestamps: 'estimate' }), item.id)));
  if (records.some((item) => !item)) throw new Error('Archivio non valido: esportazione e modifiche bloccate.');
  return { records: records as T[], fromCache: snapshot.metadata.fromCache, pending: snapshot.metadata.hasPendingWrites, pendingIds: snapshot.docs.filter((d) => d.metadata.hasPendingWrites).map((d) => d.id) };
}
export function createFirestoreStore(db: Firestore, uid: string) {
  const expenses = collection(db, 'users', uid, 'expenses');
  const categories = collection(db, 'users', uid, 'categories');
  const names = collection(db, 'users', uid, 'categoryNames');
  const conflict = () => new Error('I dati sono cambiati in un’altra sessione. Riapri la modifica e riprova.');
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
      await setDoc(doc(expenses, expense_id), { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 });
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
        tx.update(ref, { ...data, revision: previous.revision + 1, updated_at: serverTimestamp() });
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
    // 'merge' only adds (identical duplicates skipped, conflicts block). 'replace' first deletes every saved expense and category.
    async importRecords(records: readonly ExpenseRecord[], categoryRecords: readonly Category[], mode: 'merge' | 'replace' = 'merge') {
      const checked = parseImport({ format: 'nummo-backup', version: 1, expenses: records, categories: categoryRecords });
      records = checked.expenses; categoryRecords = checked.categories;
      // Preflight the whole destination before writing. Each chunk rechecks its IDs in a transaction.
      const [e, c] = await Promise.all([getDocsFromServer(expenses), getDocsFromServer(categories)]);
      const savedExpenses = parseSnapshot(e, parseSyncedExpense);
      const savedCategories = parseSnapshot(c, parseSyncedCategory);
      if (savedExpenses.pending || savedCategories.pending) throw new Error('Attendi le scritture pendenti prima di importare.');
      if (mode === 'replace') {
        const savedNames = await getDocsFromServer(names);
        try {
          for (let i = 0; i < savedExpenses.records.length; i += 200) {
            const batch = writeBatch(db);
            for (const r of savedExpenses.records.slice(i, i + 200)) batch.delete(doc(expenses, r.id));
            await batch.commit();
          }
          // Same group size as the import (Rules: one existsAfter per category delete); each lock goes with its category.
          for (let i = 0; i < savedCategories.records.length; i += 8) {
            const batch = writeBatch(db);
            for (const r of savedCategories.records.slice(i, i + 8)) { batch.delete(doc(categories, r.id)); batch.delete(doc(names, r.name_key)); }
            await batch.commit();
          }
          // Orphan name locks (no category any more) would block names of the new categories.
          const remaining = savedNames.docs.filter((d) => !savedCategories.records.some((r) => r.name_key === d.id));
          for (let i = 0; i < remaining.length; i += 200) {
            const batch = writeBatch(db);
            for (const d of remaining.slice(i, i + 200)) batch.delete(d.ref);
            await batch.commit();
          }
        } catch (reason) {
          throw new Error('Sostituzione interrotta durante l’eliminazione: alcuni dati precedenti potrebbero essere già stati eliminati. Ripeti la sostituzione con lo stesso file. ' + (reason instanceof Error ? reason.message : ''));
        }
      }
      if (mode === 'merge') {
        const total = new Set([...savedCategories.records.map((r) => r.id), ...categoryRecords.map((r) => r.id)]).size;
        if (total > maxCategories) throw new Error(`Con questo file le categorie sarebbero ${total}. ${categoryLimitMessage}`);
      }
      if (mode === 'merge') for (const r of records) {
        const previous = savedExpenses.records.find((p) => p.id === r.id);
        if (previous && Object.entries(r).some(([key, value]) => !sameFieldValue(previous[key as keyof ExpenseRecord], value))) throw conflict();
      }
      if (mode === 'merge') for (const r of categoryRecords) {
        const previous = savedCategories.records.find((p) => p.id === r.id || p.name_key === categoryNameKey(r.label));
        if (previous && (previous.id !== r.id || previous.label !== r.label || previous.icon !== r.icon)) throw conflict();
      }
      const chunks: { records: readonly ExpenseRecord[]; categoryRecords: readonly Category[] }[] = [];
      // At most 16 getAfter calls + cached owner lookup per category chunk (Rules limit: 20).
      for (let i = 0; i < categoryRecords.length; i += 8) chunks.push({ records: [], categoryRecords: categoryRecords.slice(i, i + 8) });
      for (let i = 0; i < records.length; i += 200) chunks.push({ records: records.slice(i, i + 200), categoryRecords: [] });
      try {
        for (const { records, categoryRecords } of chunks) {
          await runTransaction(db, async (tx) => {
            const expenseDocs = await Promise.all(records.map((r) => tx.get(doc(expenses, r.id))));
            const categoryDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(categories, r.id))));
            const lockDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(names, categoryNameKey(r.label)))));
            records.forEach((r, i) => {
              const existing = expenseDocs[i]!;
              if (existing.exists()) {
                const parsed = parseSyncedExpense(decode(existing.data(), existing.id));
                if (!parsed || Object.entries(r).some(([key, value]) => !sameFieldValue(parsed[key as keyof ExpenseRecord], value))) throw conflict();
              } else {
                const { id, created_at, ...data } = r;
                tx.set(doc(expenses, id), { ...data, created_at: Timestamp.fromDate(new Date(created_at)), updated_at: serverTimestamp(), revision: 1 });
              }
            });
            categoryRecords.forEach((r, i) => {
              const existing = categoryDocs[i]!;
              const key = categoryNameKey(r.label);
              if (existing.exists()) {
                const parsed = parseSyncedCategory(decode(existing.data(), existing.id));
                if (!parsed || parsed.label !== r.label || parsed.icon !== r.icon) throw conflict();
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
