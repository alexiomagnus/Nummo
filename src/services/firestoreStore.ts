import { encodeTrialPrices, decodeTrialPrices } from '../domain/pricing.ts';
import { decodeCalendarChanges, encodeCalendarChanges } from '../domain/recurrence.ts';
import { trialTimingError } from '../domain/trial.ts';
import { todayInRome } from '../domain/policy.ts';
import {
  collection, deleteDoc, deleteField, doc, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp, setDoc,
  Timestamp, updateDoc, writeBatch, type Firestore, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { planImport, sameCategory, sameExpense, sameFund, sameMovement, validateBackupData, type ImportData, type ImportMode } from '../domain/backup.ts';
import type { ExpenseData, ExpenseRequest } from '../domain/expense.ts';
import { parseExpenseRequest, sameFieldValue, type ExpenseRecord } from '../domain/contract.ts';
import { categoryNameError, normalizeCategoryName, type Category, type CategoryIcon } from '../domain/category.ts';
import { decodeStatusChanges, encodeStatusChanges } from '../domain/subscription.ts';
import { categoryNameKey, parseSyncedCategory, parseSyncedExpense, parseSyncedFund, parseSyncedList, parseSyncedListItem, parseSyncedMovement, type SyncedCategory, type SyncedExpense, type SyncedFund, type SyncedList, type SyncedListItem, type SyncedMovement } from '../domain/firestore.ts';
import { decodeListItems, encodeListItems, listNameError, itemNameError, normalizeListText, parseListData, sameListRecord, sortItems, type ShoppingListData, type ShoppingListRecord } from '../domain/shoppingList.ts';
import { decodeBudgets, decodeRecharges, encodeBudgets, encodeRecharges, parseFundData, parseMovementData, type Fund, type FundData, type Movement, type MovementData } from '../domain/funds.ts';

export type SnapshotState<T> = { records: T[]; fromCache: boolean; pending: boolean; pendingIds: string[] };
function decode(data: DocumentData, id: string) {
  return { ...data, ...(data.schema_version === 2 || data.schema_version === 3 ? { price_changes: decodeTrialPrices(data.price_changes) } : {}), ...('calendar_changes' in data ? { calendar_changes: decodeCalendarChanges(data.calendar_changes) } : {}), ...('status_changes' in data ? { status_changes: decodeStatusChanges(data.status_changes) } : {}),
    ...('list_items' in data ? { list_items: decodeListItems(data.list_items) } : {}), id, created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at,
    updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : data.updated_at };
}
// Fund schedules are stored as compact strings (see firestore.rules); undecodable strings fail the record check.
function decodeFund(data: DocumentData, id: string) {
  const base = decode(data, id);
  return { ...base, recharges: decodeRecharges(data.recharges), budgets: decodeBudgets(data.budgets), budget_exceptions: decodeBudgets(data.budget_exceptions) };
}
function storedFund(data: FundData) {
  return { name: data.name, icon: data.icon, color: data.color, initial_minor: data.initial_minor, start_date: data.start_date,
    recharges: encodeRecharges(data.recharges), budgets: encodeBudgets(data.budgets), budget_exceptions: encodeBudgets(data.budget_exceptions), archived: data.archived };
}
const movementFields = (m: MovementData) => ({ kind: m.kind, amount_minor: m.amount_minor, date: m.date, to_fund_id: m.to_fund_id, from_fund_id: m.from_fund_id, note: m.note });
const sameMovementData = (a: MovementData, b: MovementData) => a.kind === b.kind && a.amount_minor === b.amount_minor && a.date === b.date
  && a.to_fund_id === b.to_fund_id && a.from_fund_id === b.from_fund_id && a.note === b.note;
function parseSnapshot<T>(snapshot: QuerySnapshot, parse: (value: unknown) => T | null, read = decode): SnapshotState<T> {
  const records = snapshot.docs.map((item) => parse(read(item.data({ serverTimestamps: 'estimate' }), item.id)));
  if (records.some((item) => !item)) throw new Error('Archivio non valido: esportazione e modifiche bloccate.');
  return { records: records as T[], fromCache: snapshot.metadata.fromCache, pending: snapshot.metadata.hasPendingWrites, pendingIds: snapshot.docs.filter((d) => d.metadata.hasPendingWrites).map((d) => d.id) };
}
// `status_changes` is stored (encoded as one string) only when a series has one: records without it (every
// one-off expense and series never paused) keep the exact shape that Rules published before statuses accept.
// Likewise `fund_id` is stored only when the expense has a fund (expenses saved before funds existed have none), and
// `list_id` + `list_items` (names joined by '\n') only for the expense that registered a shopping list.
function stored<T extends Pick<ExpenseData, 'status_changes' | 'fund_id' | 'list_id' | 'list_items' | 'schema_version' | 'price_changes' | 'calendar_changes'>>(data: T) {
  const { status_changes, fund_id, list_id, list_items, calendar_changes, ...rest } = data;
  return { ...rest, price_changes: data.schema_version >= 2 ? encodeTrialPrices(data.price_changes) : data.price_changes, ...(calendar_changes?.length ? { calendar_changes: encodeCalendarChanges(calendar_changes) } : {}), ...(status_changes.length ? { status_changes: encodeStatusChanges(status_changes) } : {}), ...(fund_id ? { fund_id } : {}),
    ...(list_id ? { list_id, list_items: encodeListItems(list_items) } : {}) };
}
const storedList = (data: ShoppingListData) => ({ name: data.name, category_id: data.category_id, total_minor: data.total_minor, expense_id: data.expense_id });
// Lists of the archive with their items (backups and import plans). Items whose list no longer exists are left out.
function listRecords(lists: readonly SyncedList[], items: readonly SyncedListItem[]): ShoppingListRecord[] {
  return lists.map((l) => ({ id: l.id, name: l.name, category_id: l.category_id, total_minor: l.total_minor, expense_id: l.expense_id, created_at: l.created_at,
    items: sortItems(items.filter((i) => i.list_id === l.id)).map((i) => ({ id: i.id, name: i.name, checked: i.checked, position: i.position })) }));
}

export function createFirestoreStore(db: Firestore, uid: string) {
  const expenses = collection(db, 'users', uid, 'expenses');
  const categories = collection(db, 'users', uid, 'categories');
  const names = collection(db, 'users', uid, 'categoryNames');
  const funds = collection(db, 'users', uid, 'funds');
  const movements = collection(db, 'users', uid, 'movements');
  const lists = collection(db, 'users', uid, 'lists');
  const listItems = collection(db, 'users', uid, 'listItems');
  const conflict = () => new Error('I dati sono cambiati in un’altra sessione. Riapri la modifica e riprova.');
  // Reads the saved archive from the server for a restore plan. Refuses while writes are pending.
  async function readAll() {
    const [e, c, f, m, l, i] = await Promise.all([getDocsFromServer(expenses), getDocsFromServer(categories), getDocsFromServer(funds), getDocsFromServer(movements),
      getDocsFromServer(lists), getDocsFromServer(listItems)]);
    return [parseSnapshot(e, parseSyncedExpense), parseSnapshot(c, parseSyncedCategory), parseSnapshot(f, parseSyncedFund, decodeFund), parseSnapshot(m, parseSyncedMovement),
      parseSnapshot(l, parseSyncedList), parseSnapshot(i, parseSyncedListItem)] as const;
  }
  async function readArchive() {
    const states = await readAll();
    const [savedExpenses, savedCategories, savedFunds, savedMovements, savedLists, savedItems] = states;
    if (states.some((state) => state.pending)) throw new Error('Attendi le scritture pendenti prima di importare.');
    return { expenses: savedExpenses.records, categories: savedCategories.records, funds: savedFunds.records, movements: savedMovements.records,
      lists: listRecords(savedLists.records, savedItems.records), items: savedItems.records };
  }
  // Checklist edits are plain writes queued by the SDK (they work with a weak signal in a shop): the listener shows them
  // at once and the sync chip until the server has them. A rejected write is reported, never retried by the app.
  let onWriteError: (reason: unknown) => void = () => {};
  const queued = (write: Promise<void>) => { void write.catch((reason) => onWriteError(reason)); };
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
      const timingError = trialTimingError(previous, data, todayInRome());
      if (timingError) throw new Error(timingError);
      await runTransaction(db, async (tx) => {
        const ref = doc(expenses, previous.id);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.update(ref, { ...stored(data), ...(data.status_changes.length ? {} : { status_changes: deleteField() }), ...(data.fund_id ? {} : { fund_id: deleteField() }),
          ...(data.list_id ? {} : { list_id: deleteField(), list_items: deleteField() }), revision: previous.revision + 1, updated_at: serverTimestamp() });
      });
    },
    // Deleting the expense that registered a shopping list brings that list back among the active ones in the same
    // transaction (the purchase can be registered again): no archived list ever points at a deleted expense.
    async removeExpense(previous: SyncedExpense) {
      await runTransaction(db, async (tx) => {
        const ref = doc(expenses, previous.id);
        const current = await tx.get(ref);
        const list = previous.list_id ? await tx.get(doc(lists, previous.list_id)) : null;
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.delete(ref);
        if (list?.exists() && list.data().expense_id === previous.id) tx.update(list.ref, { expense_id: null, updated_at: serverTimestamp() });
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
    watchFunds(next: (value: SnapshotState<SyncedFund>) => void, error: (reason: Error) => void) {
      return onSnapshot(funds, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedFund, decodeFund)); } catch (e) { error(e as Error); }
      }, error);
    },
    watchMovements(next: (value: SnapshotState<SyncedMovement>) => void, error: (reason: Error) => void) {
      return onSnapshot(movements, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedMovement)); } catch (e) { error(e as Error); }
      }, error);
    },
    // Create (no `previous`) or update a fund in a transaction on the revision seen when the editor opened.
    async saveFund(id: string, data: FundData, previous?: SyncedFund) {
      if (!parseFundData({ ...data })) throw new Error('Fondo non valido.');
      if (previous && previous.start_date !== data.start_date) throw new Error('La data di inizio di un fondo non si può cambiare.');
      await runTransaction(db, async (tx) => {
        const ref = doc(funds, id);
        const current = await tx.get(ref);
        if (previous ? !current.exists() || current.data().revision !== previous.revision : current.exists()) throw conflict();
        if (previous) tx.update(ref, { ...storedFund(data), revision: previous.revision + 1, updated_at: serverTimestamp() });
        else tx.set(ref, { ...storedFund(data), created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 });
      });
    },
    // Only for funds nothing refers to (the caller checks movements and expenses; otherwise it archives).
    async removeFund(previous: SyncedFund) {
      await runTransaction(db, async (tx) => {
        const ref = doc(funds, previous.id);
        const current = await tx.get(ref);
        if (!current.exists() || current.data().revision !== previous.revision) throw conflict();
        tx.delete(ref);
      });
    },
    // One document per income or transfer, created in a server transaction with the ID chosen when the dialog opened:
    // repeating the same request after an uncertain outcome finds it and never writes a second movement.
    async createMovement(id: string, data: MovementData) {
      if (!parseMovementData({ ...data })) throw new Error('Movimento non valido.');
      await runTransaction(db, async (tx) => {
        const ref = doc(movements, id);
        const current = await tx.get(ref);
        if (current.exists()) {
          const saved = parseSyncedMovement(decode(current.data(), current.id));
          if (!saved || !sameMovementData(saved, data)) throw conflict();
          return;
        }
        tx.set(ref, { ...movementFields(data), created_at: serverTimestamp() });
      });
    },
    async removeMovement(previous: SyncedMovement) {
      await runTransaction(db, async (tx) => {
        const ref = doc(movements, previous.id);
        const current = await tx.get(ref);
        if (!current.exists()) throw conflict();
        tx.delete(ref);
      });
    },
    // Explicit migration: assign a fund to expenses saved without one. Groups of 100 transactions, each on the
    // revisions seen; an expense changed meanwhile stops the group (earlier groups stay assigned, repeat to finish).
    async assignFund(records: readonly SyncedExpense[], fundId: string) {
      let done = 0;
      for (let i = 0; i < records.length; i += 100) {
        const group = records.slice(i, i + 100);
        await runTransaction(db, async (tx) => {
          const current = await Promise.all(group.map((r) => tx.get(doc(expenses, r.id))));
          group.forEach((r, index) => { if (!current[index]!.exists() || current[index]!.data()!.revision !== r.revision) throw conflict(); });
          group.forEach((r) => tx.update(doc(expenses, r.id), { fund_id: fundId, revision: r.revision + 1, updated_at: serverTimestamp() }));
        });
        done += group.length;
      }
      return done;
    },
    watchLists(next: (value: SnapshotState<SyncedList>) => void, error: (reason: Error) => void) {
      return onSnapshot(lists, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedList)); } catch (e) { error(e as Error); }
      }, error);
    },
    watchListItems(next: (value: SnapshotState<SyncedListItem>) => void, error: (reason: Error) => void) {
      return onSnapshot(listItems, { includeMetadataChanges: true }, (s) => {
        try { next(parseSnapshot(s, parseSyncedListItem)); } catch (e) { error(e as Error); }
      }, error);
    },
    // Receives the outcome of queued checklist writes rejected by the server (Rules, permissions).
    onQueuedWriteError(handler: (reason: unknown) => void) { onWriteError = handler; return () => { onWriteError = () => {}; }; },
    // New list (optionally with items: duplicate, products not bought) in one batch, so it never appears half-made.
    createList(id: string, data: Pick<ShoppingListData, 'name' | 'category_id'>, items: readonly { name: string; position: number }[] = []) {
      const list = { name: normalizeListText(data.name), category_id: data.category_id, total_minor: null, expense_id: null };
      if (listNameError(list.name) || !parseListData(list) || items.some((i) => itemNameError(i.name))) throw new Error('Lista non valida.');
      const batch = writeBatch(db);
      batch.set(doc(lists, id), { ...list, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      for (const item of items) batch.set(doc(listItems, crypto.randomUUID()), { list_id: id, name: normalizeListText(item.name), checked: false, position: item.position });
      queued(batch.commit());
    },
    updateList(list: SyncedList, change: Partial<Pick<ShoppingListData, 'name' | 'category_id' | 'total_minor'>>) {
      const next = { ...storedList(list), ...change, ...(change.name !== undefined ? { name: normalizeListText(change.name) } : {}) };
      if (list.expense_id !== null || !parseListData(next)) throw new Error('Lista non valida.');
      queued(updateDoc(doc(lists, list.id), { ...storedList(next), updated_at: serverTimestamp() }));
    },
    // A list whose expense no longer exists (removed outside the app's delete) becomes active again.
    reopenList(list: SyncedList) {
      queued(updateDoc(doc(lists, list.id), { expense_id: null, updated_at: serverTimestamp() }));
    },
    removeList(list: SyncedList, items: readonly SyncedListItem[]) {
      const batch = writeBatch(db);
      batch.delete(doc(lists, list.id));
      for (const item of items) if (item.list_id === list.id) batch.delete(doc(listItems, item.id));
      queued(batch.commit());
    },
    addListItem(listId: string, name: string, position: number) {
      const item = { list_id: listId, name: normalizeListText(name), checked: false, position };
      if (!parseSyncedListItem({ ...item, id: crypto.randomUUID() })) throw new Error('Prodotto non valido.');
      queued(setDoc(doc(listItems, crypto.randomUUID()), item));
    },
    updateListItem(item: SyncedListItem, change: Partial<Pick<SyncedListItem, 'name' | 'checked'>>) {
      const next = { ...item, ...change, ...(change.name !== undefined ? { name: normalizeListText(change.name) } : {}) };
      if (!parseSyncedListItem(next)) throw new Error('Prodotto non valido.');
      queued(updateDoc(doc(listItems, item.id), { name: next.name, checked: next.checked }));
    },
    removeListItem(item: SyncedListItem) {
      queued(deleteDoc(doc(listItems, item.id)));
    },
    // Registers a list: ONE server transaction creates the expense (ID chosen when the confirmation opened) and archives
    // the list. Repeating it after an uncertain outcome finds the same expense and does nothing; a list already registered
    // (other device, double press) is refused, so a purchase is never counted twice.
    // `remember`: the category used becomes the list's default (kept by its duplicates).
    async registerList(list: SyncedList, expenseId: string, data: ExpenseData, remember = false) {
      if (data.list_id !== list.id || data.recurrence !== null || !parseExpenseRequest({ ...data, expense_id: expenseId }, new Date())) throw new Error('Spesa non valida.');
      await runTransaction(db, async (tx) => {
        const listRef = doc(lists, list.id);
        const expenseRef = doc(expenses, expenseId);
        const [currentList, currentExpense] = [await tx.get(listRef), await tx.get(expenseRef)];
        if (currentExpense.exists()) {
          const saved = parseSyncedExpense(decode(currentExpense.data(), currentExpense.id));
          if (saved && currentList.exists() && currentList.data().expense_id === expenseId
            && Object.entries(data).every(([key, value]) => sameFieldValue(saved[key as keyof ExpenseData], value))) return;
          throw conflict();
        }
        if (!currentList.exists()) throw new Error('La lista non esiste più.');
        if (currentList.data().expense_id !== null) throw new Error('Questa lista è già stata registrata come spesa.');
        tx.set(expenseRef, { ...stored(data), created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 });
        tx.update(listRef, { expense_id: expenseId, total_minor: data.amount_minor, ...(remember ? { category_id: data.category_id } : {}), updated_at: serverTimestamp() });
      });
    },
    async exportSnapshot() {
      // Server-only: never label an incomplete offline cache as a complete backup.
      const states = await readAll();
      const [expenseState, categoryState, fundState, movementState, listState, itemState] = states;
      if (states.some((state) => state.pending)) throw new Error('Attendi la sincronizzazione prima di esportare.');
      return { expenses: expenseState.records, categories: categoryState.records, funds: fundState.records, movements: movementState.records,
        lists: listRecords(listState.records, itemState.records) };
    },
    // Preview for the import dialog: what each mode would do, computed on the current server data. No writes.
    async previewImport(data: ImportData) {
      const current = await readArchive();
      return { merge: planImport(data, current, 'merge'), replace: planImport(data, current, 'replace') };
    },
    // 'merge' only adds (identical items skipped; any conflict blocks the whole import before the first write).
    // 'replace' makes the archive equal to the file: it removes saved items that differ from the file, then adds the rest.
    // Nothing is written until the file and the plan have been validated against the server data.
    async importRecords(records: readonly ExpenseRecord[], categoryRecords: readonly Category[], mode: ImportMode = 'merge', fundRecords: readonly Fund[] = [], movementRecords: readonly Movement[] = [], shoppingLists: readonly ShoppingListRecord[] = []) {
      const checked = validateBackupData(records, categoryRecords, fundRecords, movementRecords, shoppingLists);
      const current = await readArchive();
      const plan = planImport(checked, current, mode);
      if (plan.conflicts.length > 0) throw new Error(`Importazione bloccata: ${plan.conflicts.length} elementi diversi dai dati salvati. Nessuna modifica.`);
      if (mode === 'replace') {
        const savedNames = await getDocsFromServer(names);
        const removedCategories = current.categories.filter((c) => plan.removeCategoryIds.includes(c.id));
        try {
          // A replaced list goes with all its items; items of no kept list (left by concurrent edits) are removed too.
          const keptLists = new Set(current.lists.filter((l) => !plan.removeListIds.includes(l.id)).map((l) => l.id));
          const removeItemIds = current.items.filter((i) => !keptLists.has(i.list_id)).map((i) => i.id);
          for (const [target, ids] of [[expenses, plan.removeExpenseIds], [movements, plan.removeMovementIds], [funds, plan.removeFundIds],
            [listItems, removeItemIds], [lists, plan.removeListIds]] as const) {
            for (let i = 0; i < ids.length; i += 200) {
              const batch = writeBatch(db);
              for (const id of ids.slice(i, i + 200)) batch.delete(doc(target, id));
              await batch.commit();
            }
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
        } catch {
          throw new Error('Sostituzione interrotta: alcuni dati potrebbero essere già eliminati. Riprova con lo stesso file.');
        }
      }
      type Chunk = { records: readonly ExpenseRecord[]; categoryRecords: readonly Category[]; fundRecords?: readonly Fund[]; movementRecords?: readonly Movement[] };
      const chunks: Chunk[] = [];
      // At most 16 getAfter calls + cached owner lookup per category chunk (Rules limit: 20).
      for (let i = 0; i < plan.addCategories.length; i += 8) chunks.push({ records: [], categoryRecords: plan.addCategories.slice(i, i + 8) });
      // Funds before what refers to them (the Rules do not require it; the app simply shows complete data sooner).
      for (let i = 0; i < plan.addFunds.length; i += 100) chunks.push({ records: [], categoryRecords: [], fundRecords: plan.addFunds.slice(i, i + 100) });
      for (let i = 0; i < plan.addMovements.length; i += 200) chunks.push({ records: [], categoryRecords: [], movementRecords: plan.addMovements.slice(i, i + 200) });
      for (let i = 0; i < plan.addExpenses.length; i += 200) chunks.push({ records: plan.addExpenses.slice(i, i + 200), categoryRecords: [] });
      try {
        for (const { records, categoryRecords, fundRecords = [], movementRecords = [] } of chunks) {
          // Each group rechecks its IDs inside the transaction: an item saved meanwhile must be identical or the import stops.
          await runTransaction(db, async (tx) => {
            const fundDocs = await Promise.all(fundRecords.map((r) => tx.get(doc(funds, r.id))));
            const movementDocs = await Promise.all(movementRecords.map((r) => tx.get(doc(movements, r.id))));
            const expenseDocs = await Promise.all(records.map((r) => tx.get(doc(expenses, r.id))));
            const categoryDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(categories, r.id))));
            const lockDocs = await Promise.all(categoryRecords.map((r) => tx.get(doc(names, categoryNameKey(r.label)))));
            // Every read above, every write below (Firestore transactions).
            fundRecords.forEach((r, i) => {
              const existing = fundDocs[i]!;
              if (existing.exists()) {
                const parsed = parseSyncedFund(decodeFund(existing.data(), existing.id));
                if (!parsed || !sameFund(parsed, r)) throw conflict();
              } else tx.set(doc(funds, r.id), { ...storedFund(r), created_at: Timestamp.fromDate(new Date(r.created_at)), updated_at: serverTimestamp(), revision: 1 });
            });
            movementRecords.forEach((r, i) => {
              const existing = movementDocs[i]!;
              if (existing.exists()) {
                const parsed = parseSyncedMovement(decode(existing.data(), existing.id));
                if (!parsed || !sameMovement(parsed, r)) throw conflict();
              } else tx.set(doc(movements, r.id), { ...movementFields(r), created_at: Timestamp.fromDate(new Date(r.created_at)) });
            });
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
        // One transaction per list with its items (at most 101 documents); an identical saved list is skipped.
        for (const list of plan.addLists) {
          await runTransaction(db, async (tx) => {
            const ref = doc(lists, list.id);
            const existing = await tx.get(ref);
            const itemDocs = await Promise.all(list.items.map((i) => tx.get(doc(listItems, i.id))));
            if (existing.exists()) {
              const parsed = parseSyncedList(decode(existing.data(), existing.id));
              const savedItems = itemDocs.flatMap((d) => (d.exists() ? [parseSyncedListItem({ ...d.data(), id: d.id })] : []));
              if (!parsed || savedItems.some((i) => !i || i.list_id !== list.id) || !sameListRecord(listRecords([parsed], savedItems as SyncedListItem[])[0]!, list)) throw conflict();
              return;
            }
            if (itemDocs.some((d) => d.exists())) throw conflict();
            tx.set(ref, { ...storedList(list), created_at: Timestamp.fromDate(new Date(list.created_at)), updated_at: serverTimestamp() });
            list.items.forEach((i) => tx.set(doc(listItems, i.id), { list_id: list.id, name: i.name, checked: i.checked, position: i.position }));
          });
        }
      } catch {
        throw new Error('Importazione interrotta: riprova con lo stesso file, nulla verrà duplicato.');
      }
    },
  };
}
export type FirestoreStore = ReturnType<typeof createFirestoreStore>;
