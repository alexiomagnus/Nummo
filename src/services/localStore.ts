// «Standard» mode: the archive lives in IndexedDB on this device (localDatabase.ts). Same contract, validation and
// messages as the Firestore store, without an account or a network: every mutation is one atomic local transaction on
// the revision seen by the editor, and listeners are told after it committed (also in the other tabs of this browser).
// Records are kept in the domain shape (arrays, not the compact strings the Firestore Rules need) and are validated
// again at every read: a corrupted archive blocks edits and exports instead of hiding rows.
import { planImport, validateBackupData, type ImportData, type ImportMode } from '../domain/backup.ts';
import { categoryNameError, normalizeCategoryName, type Category, type CategoryIcon } from '../domain/category.ts';
import { parseExpenseRequest, sameFieldValue, type ExpenseRecord } from '../domain/contract.ts';
import type { ExpenseData, ExpenseRequest } from '../domain/expense.ts';
import {
  categoryNameKey, parseSyncedBudget, parseSyncedCategory, parseSyncedExpense, parseSyncedFund, parseSyncedList, parseSyncedListItem,
  parseSyncedMovement, parseSyncedTemplate, type SyncedBudget, type SyncedCategory, type SyncedExpense, type SyncedFund, type SyncedList, type SyncedListItem, type SyncedMovement,
} from '../domain/firestore.ts';
import { parseFundData, parseMovementData, type BudgetChange, type Fund, type FundData, type Movement, type MovementData } from '../domain/funds.ts';
import { todayInRome } from '../domain/policy.ts';
import { itemNameError, listNameError, normalizeListText, parseListData, type ShoppingListData, type ShoppingListRecord } from '../domain/shoppingList.ts';
import { trialTimingError } from '../domain/trial.ts';
import { parseMerchant, type Merchant } from '../domain/merchant.ts';
import { parseTemplateData, templateFields, type TemplateRecord } from '../domain/template.ts';
import { checkNewMerchant, invalidArchive, listRecords, type DataStore } from './dataStore.ts';
import type { LocalDatabase, LocalRow, LocalStoreName, LocalTx } from './localDatabase.ts';

const budgetId = 'budget';
const stateId = 'state';
const channelName = 'nummo-local';

// What other tabs need to hear; structurally a BroadcastChannel (injectable for tests).
export type ChangeChannel = { postMessage(message: unknown): void; onmessage: ((event: { data: unknown }) => void) | null; close(): void };
export type LocalStore = DataStore & {
  // ISO time of the last committed change on this device (null = never written). Not part of a backup.
  lastChange(): Promise<string | null>;
  // Told after every committed change, here or in another tab.
  onChange(listener: () => void): () => void;
  close(): void;
};

type Watcher = { store: LocalStoreName; seen: number; deliver: (rows: LocalRow[]) => void; fail: (reason: Error) => void };

function parseAll<T>(rows: readonly LocalRow[], parse: (value: unknown) => T | null): T[] {
  const records = rows.map((row) => parse(row));
  if (records.some((record) => !record)) throw new Error(invalidArchive);
  return records as T[];
}
const fundFields = (data: FundData) => ({ name: data.name, icon: data.icon, color: data.color, initial_minor: data.initial_minor, start_date: data.start_date,
  recharges: [...data.recharges], budgets: [...data.budgets], budget_exceptions: [...data.budget_exceptions], archived: data.archived });
const movementFields = (m: MovementData) => ({ kind: m.kind, amount_minor: m.amount_minor, date: m.date, to_fund_id: m.to_fund_id, from_fund_id: m.from_fund_id, note: m.note });
const sameMovementData = (a: MovementData, b: MovementData) => a.kind === b.kind && a.amount_minor === b.amount_minor && a.date === b.date
  && a.to_fund_id === b.to_fund_id && a.from_fund_id === b.from_fund_id && a.note === b.note;
const listFields = (data: ShoppingListData) => ({ name: data.name, category_id: data.category_id, total_minor: data.total_minor, expense_id: data.expense_id });
const sameRequest = (saved: SyncedExpense, data: ExpenseData) => Object.entries(data).every(([key, value]) => sameFieldValue(saved[key as keyof ExpenseData], value));

function openChannel(): ChangeChannel | null {
  try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName) as unknown as ChangeChannel; } catch { return null; }
}

export function createLocalStore(db: LocalDatabase, channel: ChangeChannel | null = openChannel()): LocalStore {
  const now = () => new Date().toISOString();
  const conflict = () => new Error('I dati sono cambiati in un’altra scheda. Riapri la modifica e riprova.');
  const watchers = new Set<Watcher>();
  const changeListeners = new Set<() => void>();
  let sequence = 0;

  // Reads the named stores once and hands each watcher its rows. A slower, older read never replaces a newer one.
  async function refresh(names: readonly LocalStoreName[], only?: Watcher) {
    const targets = (only ? [only] : [...watchers]).filter((watcher) => names.includes(watcher.store));
    if (targets.length === 0) return;
    const order = ++sequence;
    const stores = [...new Set(targets.map((watcher) => watcher.store))];
    let rows: Map<LocalStoreName, LocalRow[]>;
    try {
      rows = await db.read(async (tx) => new Map(await Promise.all(stores.map(async (name) => [name, await tx.getAll(name)] as const))));
    } catch (reason) {
      for (const watcher of targets) if (watchers.has(watcher)) watcher.fail(reason instanceof Error ? reason : new Error(String(reason)));
      return;
    }
    for (const watcher of targets) {
      if (!watchers.has(watcher) || watcher.seen > order) continue;
      watcher.seen = order;
      watcher.deliver(rows.get(watcher.store)!);
    }
  }
  function subscribe(store: LocalStoreName, deliver: (rows: LocalRow[]) => void, fail: (reason: Error) => void) {
    const watcher: Watcher = { store, seen: 0, fail, deliver: (rows) => { try { deliver(rows); } catch (reason) { fail(reason as Error); } } };
    watchers.add(watcher);
    void refresh([store], watcher);
    return () => { watchers.delete(watcher); };
  }
  const watch = <T>(store: LocalStoreName, parse: (value: unknown) => T | null) => (next: (value: { records: T[]; fromCache: boolean; pending: boolean; pendingIds: string[] }) => void, error: (reason: Error) => void) =>
    subscribe(store, (rows) => next({ records: parseAll(rows, parse), fromCache: false, pending: false, pendingIds: [] }), error);
  if (channel) channel.onmessage = (event) => {
    const names = Array.isArray(event.data) ? event.data as LocalStoreName[] : [];
    void refresh(names);
    for (const listener of changeListeners) listener();
  };

  // One atomic write, stamped with the time of the change; listeners hear of it before the caller is answered,
  // so a page that awaits a save already shows the saved data.
  async function commit<T>(stores: readonly LocalStoreName[], work: (tx: LocalTx) => Promise<T>): Promise<T> {
    const result = await db.write(async (tx) => {
      const value = await work(tx);
      tx.put('meta', { id: stateId, changed_at: now() });
      return value;
    });
    await refresh(stores);
    try { channel?.postMessage(stores); } catch { /* other tabs refresh when they next write or reload */ }
    // The write is already final: a failing listener must not turn it into a reported failure.
    for (const listener of changeListeners) { try { listener(); } catch { /* listener's own problem */ } }
    return result;
  }
  // Checklist edits answer at once and are saved in order in the background, like the SDK's queued writes.
  const writeErrorHandlers = new Set<(reason: unknown) => void>();
  let queue: Promise<unknown> = Promise.resolve();
  const queued = (stores: readonly LocalStoreName[], work: (tx: LocalTx) => Promise<void>) => {
    queue = queue.then(() => commit(stores, work)).catch((reason: unknown) => { for (const handler of writeErrorHandlers) handler(reason); });
  };

  const readBudget = (row: LocalRow | undefined): SyncedBudget | null => {
    if (!row) return null;
    const budget = parseSyncedBudget(row);
    if (!budget) throw new Error(invalidArchive);
    return budget;
  };
  async function readArchive(tx: LocalTx) {
    const [e, c, f, m, l, i, b, s, x] = [await tx.getAll('expenses'), await tx.getAll('categories'), await tx.getAll('funds'), await tx.getAll('movements'),
      await tx.getAll('lists'), await tx.getAll('listItems'), await tx.get('settings', budgetId), await tx.getAll('merchants'), await tx.getAll('templates')];
    const lists = parseAll(l, parseSyncedList);
    const items = parseAll(i, parseSyncedListItem);
    return { expenses: parseAll(e, parseSyncedExpense), categories: parseAll(c, parseSyncedCategory), funds: parseAll(f, parseSyncedFund),
      movements: parseAll(m, parseSyncedMovement), lists: listRecords(lists, items), items, budgetRecord: readBudget(b), budget: readBudget(b)?.budgets ?? [],
      merchants: parseAll(s, parseMerchant), templates: parseAll(x, parseSyncedTemplate) };
  }
  // The merchant of an expense being written: a new one is created (an existing one keeps its name), a named one must exist.
  async function putMerchant(tx: LocalTx, merchantId: string | null, created: Merchant | null) {
    if (!merchantId) return;
    const saved = await tx.get('merchants', merchantId);
    if (saved) return;
    if (!created) throw new Error('L’esercente scelto non esiste più.');
    tx.put('merchants', { id: created.id, name: created.name });
  }
  // The saved expense at the revision the editor saw, or a conflict.
  async function currentExpense(tx: LocalTx, previous: SyncedExpense) {
    const row = await tx.get('expenses', previous.id);
    if (!row || row.revision !== previous.revision) throw conflict();
    return row;
  }

  return {
    kind: 'local',
    watchExpenses: watch('expenses', parseSyncedExpense),
    watchCategories: watch('categories', parseSyncedCategory),
    watchFunds: watch('funds', parseSyncedFund),
    watchMovements: watch('movements', parseSyncedMovement),
    watchLists: watch('lists', parseSyncedList),
    watchListItems: watch('listItems', parseSyncedListItem),
    watchMerchants: watch('merchants', parseMerchant),
    watchTemplates: watch('templates', parseSyncedTemplate),
    watchBudget: (next, error) => subscribe('settings', (rows) => next({ budget: readBudget(rows.find((row) => row.id === budgetId)), fromCache: false, pending: false }), error),

    async confirmExpense(request) {
      const row = await db.read((tx) => tx.get('expenses', request.expense_id));
      const record = row ? parseSyncedExpense(row) : null;
      const { expense_id, ...data } = request;
      if (!record || !sameRequest(record, data)) throw new Error('La spesa non risulta salvata su questo dispositivo.');
      return { expense_id, created_at: record.created_at };
    },
    async createExpense(request: ExpenseRequest, merchant?: Merchant | null) {
      if (!parseExpenseRequest(request, new Date())) throw new Error('Spesa non valida.');
      const { expense_id, ...data } = request;
      const created = checkNewMerchant(data, merchant);
      return commit(['expenses', 'merchants'], async (tx) => {
        // The same request again (double press) finds its expense and writes nothing; a different one is a conflict.
        const existing = await tx.get('expenses', expense_id);
        if (existing) {
          const saved = parseSyncedExpense(existing);
          if (!saved || !sameRequest(saved, data)) throw conflict();
          return { expense_id, created_at: saved.created_at };
        }
        await putMerchant(tx, data.merchant_id ?? null, created);
        const created_at = now();
        tx.put('expenses', { ...data, id: expense_id, created_at, updated_at: created_at, revision: 1 });
        return { expense_id, created_at };
      });
    },
    async updateExpense(previous, data, merchant) {
      if (!parseExpenseRequest({ ...data, expense_id: previous.id }, new Date())) throw new Error('Spesa non valida.');
      const timingError = trialTimingError(previous, data, todayInRome());
      if (timingError) throw new Error(timingError);
      const created = checkNewMerchant(data, merchant);
      await commit(['expenses', 'merchants'], async (tx) => {
        const current = await currentExpense(tx, previous);
        // The merchant the expense already had stays valid even if unchanged; a different one must exist or be new.
        if (data.merchant_id !== (current.merchant_id ?? null)) await putMerchant(tx, data.merchant_id ?? null, created);
        // Optional fields the editor does not send (first payment, calendar) stay as saved, as with a Firestore update; removed
        // payments are always sent while they exist (dataOf, editor), so their absence clears them (as `deleteField` does).
        const row: LocalRow = { ...current, ...data, id: previous.id, revision: previous.revision + 1, updated_at: now() };
        if (!data.skipped_payments?.length) delete row.skipped_payments;
        if (!data.merchant_id) delete row.merchant_id;
        tx.put('expenses', row);
      });
    },
    // Deleting the expense that registered a shopping list brings that list back among the active ones, in the same write.
    async removeExpense(previous) {
      await commit(['expenses', 'lists'], async (tx) => {
        await currentExpense(tx, previous);
        const list = previous.list_id ? await tx.get('lists', previous.list_id) : undefined;
        tx.delete('expenses', previous.id);
        if (list && list.expense_id === previous.id) tx.put('lists', { ...list, expense_id: null, updated_at: now() });
      });
    },
    async saveCategory(id: string, name: string, icon: CategoryIcon | null, previous?: SyncedCategory) {
      const label = normalizeCategoryName(name);
      const validation = categoryNameError(label, []);
      if (validation) throw new Error(validation);
      const name_key = categoryNameKey(label);
      await commit(['categories'], async (tx) => {
        const current = await tx.get('categories', id);
        if (previous ? !current || current.revision !== previous.revision : current) throw conflict();
        const saved = await tx.getAll('categories');
        if (saved.some((row) => row.id !== id && row.name_key === name_key)) throw new Error('Esiste già una categoria con questo nome.');
        tx.put('categories', { id, label, icon, name_key, revision: (previous?.revision ?? 0) + 1, updated_at: now() });
      });
    },
    async removeCategory(previous) {
      await commit(['categories'], async (tx) => {
        const current = await tx.get('categories', previous.id);
        if (!current || current.revision !== previous.revision) throw conflict();
        tx.delete('categories', previous.id);
      });
    },
    async saveBudget(budgets, previous) {
      if (!parseSyncedBudget({ budgets, revision: 1, updated_at: '2000-01-01T00:00:00.000Z' })) throw new Error('Budget non valido.');
      await commit(['settings'], async (tx) => {
        const current = await tx.get('settings', budgetId);
        if (previous ? !current || current.revision !== previous.revision : current) throw conflict();
        tx.put('settings', { id: budgetId, budgets: [...budgets], revision: (previous?.revision ?? 0) + 1, updated_at: now() });
      });
    },
    async saveFund(id: string, data: FundData, previous?: SyncedFund) {
      if (!parseFundData({ ...data })) throw new Error('Fondo non valido.');
      if (previous && previous.start_date !== data.start_date) throw new Error('La data di inizio di un fondo non si può cambiare.');
      await commit(['funds'], async (tx) => {
        const current = await tx.get('funds', id);
        if (previous ? !current || current.revision !== previous.revision : current) throw conflict();
        const time = now();
        tx.put('funds', current ? { ...current, ...fundFields(data), revision: previous!.revision + 1, updated_at: time }
          : { id, ...fundFields(data), created_at: time, updated_at: time, revision: 1 });
      });
    },
    // Only for funds nothing refers to (the caller checks movements and expenses; otherwise it archives).
    async removeFund(previous) {
      await commit(['funds'], async (tx) => {
        const current = await tx.get('funds', previous.id);
        if (!current || current.revision !== previous.revision) throw conflict();
        tx.delete('funds', previous.id);
      });
    },
    // The ID comes from the dialog: repeating the same request finds the movement and never writes a second one.
    async createMovement(id: string, data: MovementData) {
      if (!parseMovementData({ ...data })) throw new Error('Movimento non valido.');
      await commit(['movements'], async (tx) => {
        const current = await tx.get('movements', id);
        if (current) {
          const saved = parseSyncedMovement(current);
          if (!saved || !sameMovementData(saved, data)) throw conflict();
          return;
        }
        tx.put('movements', { id, ...movementFields(data), created_at: now() });
      });
    },
    async removeMovement(previous) {
      await commit(['movements'], async (tx) => {
        if (!await tx.get('movements', previous.id)) throw conflict();
        tx.delete('movements', previous.id);
      });
    },
    // Explicit assignment of a fund to expenses saved without one: all of them or none.
    async assignFund(records, fundId) {
      return commit(['expenses'], async (tx) => {
        const time = now();
        for (const record of records) {
          const current = await currentExpense(tx, record);
          tx.put('expenses', { ...current, fund_id: fundId, revision: record.revision + 1, updated_at: time });
        }
        return records.length;
      });
    },

    onQueuedWriteError(handler) { writeErrorHandlers.add(handler); return () => { writeErrorHandlers.delete(handler); }; },
    createList(id, data, items = []) {
      const list = { name: normalizeListText(data.name), category_id: data.category_id, total_minor: null, expense_id: null };
      if (listNameError(list.name) || !parseListData(list) || items.some((i) => itemNameError(i.name))) throw new Error('Lista non valida.');
      const rows = items.map((item) => ({ id: crypto.randomUUID(), list_id: id, name: normalizeListText(item.name), checked: false, position: item.position }));
      queued(['lists', 'listItems'], async (tx) => {
        const time = now();
        tx.put('lists', { id, ...list, created_at: time, updated_at: time });
        for (const row of rows) tx.put('listItems', row);
      });
    },
    updateList(list, change) {
      const next = { ...listFields(list), ...change, ...(change.name !== undefined ? { name: normalizeListText(change.name) } : {}) };
      if (list.expense_id !== null || !parseListData(next)) throw new Error('Lista non valida.');
      queued(['lists'], async (tx) => {
        const current = await tx.get('lists', list.id);
        if (current) tx.put('lists', { ...current, ...listFields(next), updated_at: now() });
      });
    },
    // A list whose expense no longer exists becomes active again.
    reopenList(list) {
      queued(['lists'], async (tx) => {
        const current = await tx.get('lists', list.id);
        if (current) tx.put('lists', { ...current, expense_id: null, updated_at: now() });
      });
    },
    removeList(list, items) {
      queued(['lists', 'listItems'], async (tx) => {
        tx.delete('lists', list.id);
        for (const item of items) if (item.list_id === list.id) tx.delete('listItems', item.id);
      });
    },
    addListItem(listId, name, position) {
      const item = { id: crypto.randomUUID(), list_id: listId, name: normalizeListText(name), checked: false, position };
      if (!parseSyncedListItem(item)) throw new Error('Prodotto non valido.');
      queued(['listItems'], async (tx) => { tx.put('listItems', item); });
    },
    updateListItem(item, change) {
      const next = { ...item, ...change, ...(change.name !== undefined ? { name: normalizeListText(change.name) } : {}) };
      if (!parseSyncedListItem(next)) throw new Error('Prodotto non valido.');
      queued(['listItems'], async (tx) => {
        const current = await tx.get('listItems', item.id);
        if (current) tx.put('listItems', { ...current, name: next.name, checked: next.checked });
      });
    },
    removeListItem(item) {
      queued(['listItems'], async (tx) => { tx.delete('listItems', item.id); });
    },
    // Templates: plain writes like the checklist; an edit keeps the creation time (also of a template saved before the
    // 16 November removal, still in its store).
    saveTemplate(id, data, previous) {
      const fields = templateFields(data);
      if (!parseTemplateData({ ...fields })) throw new Error('Template non valido.');
      queued(['templates'], async (tx) => {
        const current = await tx.get('templates', id);
        const time = now();
        tx.put('templates', { id, ...fields, created_at: typeof current?.created_at === 'string' ? current.created_at : previous?.created_at ?? time, updated_at: time });
      });
    },
    removeTemplate(template) {
      queued(['templates'], async (tx) => { tx.delete('templates', template.id); });
    },
    // ONE write creates the expense and archives the list. Repeating it finds the same expense and does nothing; a list
    // already registered is refused, so a purchase is never counted twice.
    async registerList(list, expenseId, data, remember = false) {
      if (data.list_id !== list.id || data.recurrence !== null || !parseExpenseRequest({ ...data, expense_id: expenseId }, new Date())) throw new Error('Spesa non valida.');
      // Checklist edits still in the background queue come first.
      await queue;
      await commit(['expenses', 'lists'], async (tx) => {
        const currentList = await tx.get('lists', list.id);
        const existing = await tx.get('expenses', expenseId);
        if (existing) {
          const saved = parseSyncedExpense(existing);
          if (saved && currentList && currentList.expense_id === expenseId && sameRequest(saved, data)) return;
          throw conflict();
        }
        if (!currentList) throw new Error('La lista non esiste più.');
        if (currentList.expense_id !== null) throw new Error('Questa lista è già stata registrata come spesa.');
        const time = now();
        tx.put('expenses', { ...data, id: expenseId, created_at: time, updated_at: time, revision: 1 });
        tx.put('lists', { ...currentList, expense_id: expenseId, total_minor: data.amount_minor, ...(remember ? { category_id: data.category_id } : {}), updated_at: time });
      });
    },

    async exportSnapshot() {
      await queue;
      const { expenses, categories, funds, movements, lists, budget, merchants, templates } = await db.read(readArchive);
      return { expenses, categories, funds, movements, lists, budget, merchants, templates };
    },
    // Preview for the import dialog: what each mode would do on the data saved now. No writes.
    async previewImport(data: ImportData) {
      await queue;
      const current = await db.read(readArchive);
      return { merge: planImport(data, current, 'merge'), replace: planImport(data, current, 'replace') };
    },
    // 'merge' only adds (identical items skipped; any conflict blocks the whole import). 'replace' makes the archive equal
    // to the file. Either way it is ONE local transaction: the plan is computed inside it on the data it will change, and
    // a failure at any point leaves the archive exactly as it was — never a half-restored database.
    async importRecords(records: readonly ExpenseRecord[], categoryRecords: readonly Category[], mode: ImportMode = 'merge', fundRecords: readonly Fund[] = [],
      movementRecords: readonly Movement[] = [], shoppingLists: readonly ShoppingListRecord[] = [], generalBudget: readonly BudgetChange[] = [], merchantRecords: readonly Merchant[] = [],
      templateRecords: readonly TemplateRecord[] = []) {
      const checked = validateBackupData(records, categoryRecords, fundRecords, movementRecords, shoppingLists, generalBudget, merchantRecords, templateRecords);
      await queue;
      await commit(['expenses', 'categories', 'funds', 'movements', 'lists', 'listItems', 'settings', 'merchants', 'templates'], async (tx) => {
        const current = await readArchive(tx);
        const plan = planImport(checked, current, mode);
        if (plan.conflicts.length > 0) throw new Error(`Importazione bloccata: ${plan.conflicts.length} elementi diversi dai dati salvati. Nessuna modifica.`);
        const time = now();
        // A replaced list goes with all its items; items of no kept list are removed too.
        const keptLists = new Set(current.lists.filter((l) => !plan.removeListIds.includes(l.id)).map((l) => l.id));
        const removedItems = current.items.filter((i) => !keptLists.has(i.list_id));
        for (const id of plan.removeExpenseIds) tx.delete('expenses', id);
        for (const id of plan.removeMovementIds) tx.delete('movements', id);
        for (const id of plan.removeFundIds) tx.delete('funds', id);
        for (const item of removedItems) tx.delete('listItems', item.id);
        for (const id of plan.removeListIds) tx.delete('lists', id);
        for (const id of plan.removeCategoryIds) tx.delete('categories', id);
        for (const id of plan.removeMerchantIds) tx.delete('merchants', id);
        for (const m of plan.addMerchants) tx.put('merchants', { id: m.id, name: m.name });
        for (const id of plan.removeTemplateIds) tx.delete('templates', id);
        for (const t of plan.addTemplates) tx.put('templates', { id: t.id, ...templateFields(t), created_at: t.created_at, updated_at: time });
        const takenNames = new Map(current.categories.filter((c) => !plan.removeCategoryIds.includes(c.id)).map((c) => [c.name_key, c.id]));
        for (const c of plan.addCategories) {
          const name_key = categoryNameKey(c.label);
          if (takenNames.has(name_key) && takenNames.get(name_key) !== c.id) throw conflict();
          takenNames.set(name_key, c.id);
          tx.put('categories', { id: c.id, label: c.label, icon: c.icon, name_key, revision: 1, updated_at: time });
        }
        for (const f of plan.addFunds) tx.put('funds', { id: f.id, ...fundFields(f), created_at: f.created_at, updated_at: time, revision: 1 });
        for (const m of plan.addMovements) tx.put('movements', { id: m.id, ...movementFields(m), created_at: m.created_at });
        for (const e of plan.addExpenses) tx.put('expenses', { ...e, updated_at: time, revision: 1 });
        const takenItems = new Set(current.items.filter((i) => keptLists.has(i.list_id)).map((i) => i.id));
        for (const list of plan.addLists) {
          if (list.items.some((i) => takenItems.has(i.id))) throw conflict();
          tx.put('lists', { id: list.id, ...listFields(list), created_at: list.created_at, updated_at: time });
          for (const i of list.items) { takenItems.add(i.id); tx.put('listItems', { id: i.id, list_id: list.id, name: i.name, checked: i.checked, position: i.position }); }
        }
        if (plan.setBudget) tx.put('settings', { id: budgetId, budgets: plan.setBudget, revision: (current.budgetRecord?.revision ?? 0) + 1, updated_at: time });
      });
    },

    async lastChange() {
      const row = await db.read((tx) => tx.get('meta', stateId));
      return typeof row?.changed_at === 'string' ? row.changed_at : null;
    },
    onChange(listener) { changeListeners.add(listener); return () => { changeListeners.delete(listener); }; },
    close() { watchers.clear(); changeListeners.clear(); try { channel?.close(); } catch { /* already closed */ } db.close(); },
  };
}
