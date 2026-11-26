import { categoryNameError, isCategoryIcon, normalizeCategoryName, type Category } from './category.ts';
import { isUtcTimestamp, isUuid, parseExpenseRecord, sameFieldValue, type ExpenseRecord } from './contract.ts';
import { categoryNameKey, validateImportedExpense } from './firestore.ts';
import { expandOccurrences } from './history.ts';
import { fundNameError, parseBudgets, parseFund, parseMovement, sameBudgets, type BudgetChange, type Fund, type Movement } from './funds.ts';
import { todayInRome } from './policy.ts';
import { parseListRecord, sameListRecord, sortItems, type ShoppingListRecord } from './shoppingList.ts';
import { recurrenceLabels } from './recurrence.ts';
import { parseMerchant, type Merchant } from './merchant.ts';
import { parseTemplate, sameTemplate, type TemplateRecord } from './template.ts';
import { parseScannedReceipt, sameScannedReceipt, type ScannedReceipt } from './scannedReceipt.ts';

// Two distinct outputs:
// - CSV: a read-only table of the spending (one row per occurrence up to today) for spreadsheets. Never imported.
// - JSON: the only backup/restore format, versioned so that later schema changes can migrate older files.

// `budget`: the general monthly budget schedule (issue #7); absent or empty = none. `merchants`: absent or empty = none.
// `templates`: presets of «Nuova spesa» (v7, then again from v11); absent or empty = none. `receipts`: scanned receipts (v12),
// each with the ID of an expense of the same file; absent or empty = none.
export type ImportData = { expenses: ExpenseRecord[]; categories: Category[]; funds: Fund[]; movements: Movement[]; lists: ShoppingListRecord[]; budget?: BudgetChange[]; merchants?: Merchant[];
  templates?: TemplateRecord[]; receipts?: ScannedReceipt[] };

export const backupFormat = 'nummo-backup';
// Bump when the file shape changes and add a reader for the old number to `readers`.
// v2 adds `status_changes` (subscription pauses/cancellations); v1 files have none, so every series is active.
// v3 adds funds, movements (income and transfers) and the expenses' `fund_id`; older files have no funds.
// v4 adds shopping lists (with their items) and the expenses' `list_id` / `list_items`; older files have no lists.
// v5 adds first_payment_date and schema_version 2 for subscriptions with a free trial.
// v6 adds calendar_changes and schema_version 3 for subscriptions whose frequency was changed, and `general_budget`.
// v7 added `templates` (presets of «Nuova spesa»). v8 drops them: templates were removed from Nummo (16 November 2026), so v8
// files have none and the `templates` of a v7 file are ignored on import (nothing else in the file depends on them).
// v9 adds `skipped_payments` (payments of a subscription removed by hand); older files have none.
// v10 adds `merchants` and the expenses' `merchant_id`; older files have no merchants (every expense without one).
// v11 brings `templates` back (reintroduced on 21 November 2026), now with an optional `merchant` name. The `templates` of a
// v7 file are read again (without merchant); v8–v10 files have none.
// v12 adds `receipts` (scanned receipts, 26 November 2026: what the AI read, never the photo); older files have none.
export const backupVersion = 12;

// --- JSON backup -----------------------------------------------------------------------------

// Only what a restore needs: no Firestore bookkeeping (revision, updated_at, name_key), no account or
// project identifiers. Output is deterministic (sorted) so that two exports of the same data are equal.
export function makeBackup(data: { expenses: readonly ExpenseRecord[]; categories: readonly Category[]; funds?: readonly Fund[]; movements?: readonly Movement[]; lists?: readonly ShoppingListRecord[]; budget?: readonly BudgetChange[]; merchants?: readonly Merchant[]; templates?: readonly TemplateRecord[]; receipts?: readonly ScannedReceipt[] }, now = new Date()): string {
  const expenses = data.expenses.map((e) => ({
    id: e.id, amount_minor: e.amount_minor, currency: e.currency, description: e.description, category_id: e.category_id,
    expense_date: e.expense_date, recurrence: e.recurrence, price_changes: e.price_changes.map((c) => ({ index: c.index, amount_minor: c.amount_minor, once: c.once })),
    status_changes: e.status_changes.map((c) => ({ date: c.date, status: c.status })), fund_id: e.fund_id ?? null,
    list_id: e.list_id ?? null, list_items: [...(e.list_items ?? [])], ...(e.merchant_id ? { merchant_id: e.merchant_id } : {}),
    ...(e.first_payment_date ? { first_payment_date: e.first_payment_date } : {}),
    ...(e.calendar_changes?.length ? { calendar_changes: e.calendar_changes.map((c) => ({ index: c.index, start: c.start, recurrence: c.recurrence })) } : {}),
    ...(e.skipped_payments?.length ? { skipped_payments: [...e.skipped_payments] } : {}),
    source: e.source, schema_version: e.schema_version, created_at: e.created_at,
  })).sort((a, b) => a.expense_date.localeCompare(b.expense_date) || a.id.localeCompare(b.id));
  const categories = data.categories.map((c) => ({ id: c.id, label: c.label, icon: c.icon })).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  const funds = (data.funds ?? []).map((f) => ({
    id: f.id, name: f.name, icon: f.icon, color: f.color, initial_minor: f.initial_minor, start_date: f.start_date,
    recharges: f.recharges.map((c) => ({ month: c.month, amount_minor: c.amount_minor, day: c.day, active: c.active })),
    budgets: f.budgets.map((c) => ({ month: c.month, amount_minor: c.amount_minor })),
    budget_exceptions: f.budget_exceptions.map((c) => ({ month: c.month, amount_minor: c.amount_minor })),
    archived: f.archived, created_at: f.created_at,
  })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const movements = (data.movements ?? []).map((m) => ({
    id: m.id, kind: m.kind, amount_minor: m.amount_minor, date: m.date, to_fund_id: m.to_fund_id, from_fund_id: m.from_fund_id, note: m.note, created_at: m.created_at,
  })).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lists = (data.lists ?? []).map((l) => ({
    id: l.id, name: l.name, category_id: l.category_id, total_minor: l.total_minor, expense_id: l.expense_id, created_at: l.created_at,
    items: sortItems(l.items).map((i) => ({ id: i.id, name: i.name, checked: i.checked, position: i.position })),
  })).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const general_budget = (data.budget ?? []).map((c) => ({ month: c.month, amount_minor: c.amount_minor }));
  const merchants = (data.merchants ?? []).map((m) => ({ id: m.id, name: m.name })).sort((a, b) => a.id.localeCompare(b.id));
  const templates = (data.templates ?? []).map((x) => ({
    id: x.id, description: x.description, amount_minor: x.amount_minor, date: x.date, category_id: x.category_id, fund_id: x.fund_id,
    ...(x.merchant ? { merchant: x.merchant } : {}), created_at: x.created_at,
  })).sort((a, b) => a.description.localeCompare(b.description) || a.id.localeCompare(b.id));
  // Only the receipts of exported expenses: one left without its expense (a deletion interrupted half-way) never blocks a backup.
  const exported = new Set(data.expenses.map((e) => e.id));
  const receipts = (data.receipts ?? []).filter((r) => exported.has(r.id)).map((r) => ({
    id: r.id, merchant: r.merchant, total_minor: r.total_minor, date: r.date, items: [...r.items], discount_minor: r.discount_minor, provider: r.provider, created_at: r.created_at,
  })).sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ format: backupFormat, version: backupVersion, exported_at: now.toISOString(), categories, funds, movements, lists,
    ...(merchants.length ? { merchants } : {}), ...(templates.length ? { templates } : {}), ...(receipts.length ? { receipts } : {}),
    ...(general_budget.length ? { general_budget } : {}), expenses }, null, 2);
}

// Strict validation of the body shared by the file reader and the store. Anything invalid rejects the whole file.
export function validateBackupData(rawExpenses: unknown, rawCategories: unknown, rawFunds: unknown = [], rawMovements: unknown = [], rawLists: unknown = [], rawBudget: unknown = undefined, rawMerchants: unknown = [], rawTemplates: unknown = [], rawReceipts: unknown = []): ImportData {
  if (!Array.isArray(rawExpenses) || !Array.isArray(rawCategories) || !Array.isArray(rawFunds) || !Array.isArray(rawMovements) || !Array.isArray(rawLists)
    || !Array.isArray(rawMerchants)) throw new Error('Formato backup non riconosciuto.');
  // One merchant per key (the ID is the key of the name): a second spelling of the same name would be a duplicate.
  const merchants: Merchant[] = [];
  for (const item of rawMerchants) {
    const merchant = parseMerchant(item);
    if (!merchant || merchants.some((m) => m.id === merchant.id)) throw new Error('Esercenti nel backup non validi o duplicati.');
    merchants.push(merchant);
  }
  if (!Array.isArray(rawTemplates)) throw new Error('Template nel backup non validi o duplicati.');
  const templates: TemplateRecord[] = [];
  for (const item of rawTemplates) {
    const template = parseTemplate(item);
    if (!template || templates.some((x) => x.id === template.id) || template.date > todayInRome() || Date.parse(template.created_at) > Date.now()) throw new Error('Template nel backup non validi o duplicati.');
    templates.push({ ...template, created_at: new Date(template.created_at).toISOString() });
  }
  const lists: ShoppingListRecord[] = [];
  const itemIds = new Set<string>();
  for (const item of rawLists) {
    const list = parseListRecord(item);
    if (!list || Date.parse(list.created_at) > Date.now() || lists.some((l) => l.id === list.id) || list.items.some((i) => itemIds.has(i.id))) throw new Error('Liste nel backup non valide o duplicate.');
    list.items.forEach((i) => itemIds.add(i.id));
    lists.push({ ...list, created_at: new Date(list.created_at).toISOString() });
  }
  const funds: Fund[] = [];
  for (const item of rawFunds) {
    const fund = parseFund(item);
    if (!fund || fundNameError(fund.name, funds) || !isUtcTimestamp(fund.created_at) || Date.parse(fund.created_at) > Date.now()) throw new Error('Fondi nel backup non validi o duplicati.');
    if (funds.some((f) => f.id === fund.id)) throw new Error('Fondi nel backup non validi o duplicati.');
    funds.push(fund);
  }
  const movements: Movement[] = [];
  const today = todayInRome();
  for (const item of rawMovements) {
    const movement = parseMovement(item);
    if (!movement || movements.some((m) => m.id === movement.id) || movement.date > today
      || !isUtcTimestamp(movement.created_at) || Date.parse(movement.created_at) > Date.now()) throw new Error('Movimenti nel backup non validi o duplicati.');
    movements.push(movement);
  }
  const expenses: ExpenseRecord[] = [];
  const categories: Category[] = [];
  const expenseIds = new Set<string>();
  for (const item of rawCategories) {
    if (!item || !isUuid(item.id) || typeof item.label !== 'string' || normalizeCategoryName(item.label) !== item.label
      || categoryNameError(item.label, categories) || (item.icon !== null && !isCategoryIcon(item.icon))
      || categories.some((c) => c.id === item.id)) throw new Error('Categorie nel backup non valide o duplicate.');
    categories.push({ id: item.id, label: item.label, icon: item.icon });
  }
  for (const item of rawExpenses) {
    const record = parseExpenseRecord(item);
    if (!record || expenseIds.has(record.id)) throw new Error('Spese nel backup non valide o duplicate.');
    expenseIds.add(record.id);
    validateImportedExpense(record);
    // An expense names a merchant of the same file: the backup is complete on its own.
    if (record.merchant_id && !merchants.some((m) => m.id === record.merchant_id)) throw new Error('Spese nel backup con un esercente mancante.');
    expenses.push({ ...record, created_at: new Date(record.created_at).toISOString() });
  }
  const budget = rawBudget === undefined ? [] : parseBudgets(rawBudget);
  if (!budget) throw new Error('Budget mensile nel backup non valido.');
  // A receipt belongs to an expense of the same file (its ID is the expense's): the backup is complete on its own.
  if (!Array.isArray(rawReceipts)) throw new Error('Scontrini nel backup non validi o duplicati.');
  const receipts: ScannedReceipt[] = [];
  for (const item of rawReceipts) {
    const receipt = parseScannedReceipt(item);
    if (!receipt || receipts.some((r) => r.id === receipt.id) || Date.parse(receipt.created_at) > Date.now()) throw new Error('Scontrini nel backup non validi o duplicati.');
    if (!expenseIds.has(receipt.id)) throw new Error('Scontrini nel backup senza la loro spesa.');
    receipts.push({ ...receipt, created_at: new Date(receipt.created_at).toISOString() });
  }
  return { expenses, categories, funds, movements, lists, ...(budget.length ? { budget } : {}), ...(merchants.length ? { merchants } : {}), ...(templates.length ? { templates } : {}),
    ...(receipts.length ? { receipts } : {}) };
}

// One reader per supported version; each returns the current in-memory shape.
const readers: Record<number, (file: Record<string, unknown>) => ImportData> = {
  // v1 expenses have no `status_changes`: the record parser reads the missing field as "always active".
  1: (file) => validateBackupData(file.expenses, file.categories),
  2: (file) => validateBackupData(file.expenses, file.categories),
  // v3: funds and movements; v1/v2 expenses have no `fund_id` (read as «Senza fondo») and the files no funds.
  3: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements),
  // v4: shopping lists; older expenses have no `list_id` / `list_items` (not from a list) and the files no lists.
  4: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists),
  5: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists),
  // v6: frequency switches of subscriptions (`calendar_changes`, schema_version 3); older expenses have none.
  6: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget),
  // v7: templates of «Nuova spesa» (without merchant). Ignored by Nummo between 16 and 21 November 2026, read again since.
  7: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget, [], file.templates ?? []),
  // v8–v10 were written while templates did not exist: they have none (a `templates` field there is ignored).
  8: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget),
  // v9: payments removed by hand (`skipped_payments`); older expenses have none.
  9: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget),
  // v10: merchants and the expenses' `merchant_id`.
  10: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget, file.merchants ?? []),
  // v11: templates again, with an optional merchant name.
  11: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget, file.merchants ?? [], file.templates ?? []),
  // v12: scanned receipts.
  12: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements, file.lists, file.general_budget, file.merchants ?? [], file.templates ?? [], file.receipts ?? []),
};

export function parseBackup(value: unknown): ImportData {
  const file = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!file || file.format !== backupFormat || typeof file.version !== 'number') throw new Error('Formato backup non riconosciuto.');
  if (file.version > backupVersion) throw new Error('Backup creato da una versione più recente di Nummo: aggiorna l’app prima di importarlo.');
  if (file.version < 5 && Array.isArray(file.expenses) && file.expenses.some((e: unknown) => e && typeof e === 'object' &&
    ('first_payment_date' in e || ('schema_version' in e && e.schema_version === 2)))) throw new Error('La prova gratuita richiede un backup versione 5 o successiva.');
  if (file.version < 6 && Array.isArray(file.expenses) && file.expenses.some((e: unknown) => e && typeof e === 'object' &&
    ('calendar_changes' in e || ('schema_version' in e && e.schema_version === 3)))) throw new Error('Il cambio di frequenza richiede un backup versione 6 o successiva.');
  if (file.version < 9 && Array.isArray(file.expenses) && file.expenses.some((e: unknown) => e && typeof e === 'object' && 'skipped_payments' in e))
    throw new Error('I pagamenti eliminati richiedono un backup versione 9 o successiva.');
  if (file.version < 10 && ('merchants' in file || (Array.isArray(file.expenses) && file.expenses.some((e: unknown) => e && typeof e === 'object' && 'merchant_id' in e))))
    throw new Error('Gli esercenti richiedono un backup versione 10 o successiva.');
  if (file.version < 6 && 'general_budget' in file) throw new Error('Il budget mensile generale richiede un backup versione 6 o successiva.');
  if (file.version < 11 && Array.isArray(file.templates) && file.templates.some((x: unknown) => x && typeof x === 'object' && 'merchant' in x))
    throw new Error('L’esercente nei template richiede un backup versione 11 o successiva.');
  if (file.version < 12 && 'receipts' in file) throw new Error('Gli scontrini richiedono un backup versione 12 o successiva.');
  const reader = readers[file.version];
  if (!reader) throw new Error('Versione del backup non supportata.');
  return reader(file);
}

// --- Import planning (pure; used for the preview and again by the store before writing) -----------

export type ImportMode = 'merge' | 'replace';
export type ImportConflict = Readonly<{ kind: 'expense' | 'category' | 'fund' | 'movement' | 'list' | 'budget' | 'template' | 'receipt'; id: string; label: string }>;
export type ImportPlan = Readonly<{
  mode: ImportMode;
  addExpenses: ExpenseRecord[];
  addCategories: Category[];
  addFunds: Fund[];
  addMovements: Movement[];
  addLists: ShoppingListRecord[];
  addTemplates: TemplateRecord[];
  addReceipts: ScannedReceipt[];
  // Merchants to write: new IDs (merge and replace), and in a replace those whose name differs from the file.
  addMerchants: Merchant[];
  sameMerchants: number;
  // 'replace' only: saved merchants that are not in the file.
  removeMerchantIds: string[];
  // General budget schedule to write (null = nothing to write): merge fills an empty one, replace makes it equal to the file.
  setBudget: BudgetChange[] | null;
  // Already saved and identical: skipped, never rewritten.
  sameExpenses: number;
  sameCategories: number;
  sameFunds: number;
  sameMovements: number;
  sameLists: number;
  sameTemplates: number;
  sameReceipts: number;
  // 'replace' only: saved items that are not identical to a file item.
  removeExpenseIds: string[];
  removeCategoryIds: string[];
  removeFundIds: string[];
  removeMovementIds: string[];
  removeListIds: string[];
  removeTemplateIds: string[];
  removeReceiptIds: string[];
  // 'merge' only: same ID (or same category name) with different content. Any conflict blocks the merge.
  conflicts: ImportConflict[];
  // Categories after the import ('merge' can exceed the application limit).
  categoryTotal: number;
  // Imported expenses pointing at a category that will not exist.
  missingCategoryReferences: number;
  // Imported expenses and movements pointing at a fund that will not exist (shown as «Senza fondo»).
  missingFundReferences: number;
}>;

const expenseKeys = ['first_payment_date', 'amount_minor', 'currency', 'description', 'category_id', 'expense_date', 'recurrence', 'price_changes', 'status_changes', 'fund_id', 'list_id', 'list_items', 'source', 'schema_version', 'created_at'] as const;
export function sameExpense(a: ExpenseRecord, b: ExpenseRecord): boolean {
  // Absent and empty frequency switches are the same original calendar.
  return expenseKeys.every((key) => sameFieldValue(a[key], b[key])) && sameFieldValue(a.calendar_changes ?? [], b.calendar_changes ?? [])
    && sameFieldValue(a.skipped_payments ?? [], b.skipped_payments ?? []) && (a.merchant_id ?? null) === (b.merchant_id ?? null);
}
export function sameCategory(a: Category, b: Category): boolean {
  return a.label === b.label && a.icon === b.icon;
}
const fundKeys = ['name', 'icon', 'color', 'initial_minor', 'start_date', 'recharges', 'budgets', 'budget_exceptions', 'archived', 'created_at'] as const;
export function sameFund(a: Fund, b: Fund): boolean {
  return fundKeys.every((key) => sameFieldValue(a[key], b[key]));
}
const movementKeys = ['kind', 'amount_minor', 'date', 'to_fund_id', 'from_fund_id', 'note', 'created_at'] as const;
export function sameMovement(a: Movement, b: Movement): boolean {
  return movementKeys.every((key) => a[key] === b[key]);
}

// Same add / skip / conflict / replace logic for every record kind keyed by ID.
function planById<T extends { id: string }>(file: readonly T[], saved: readonly T[], same: (a: T, b: T) => boolean, mode: ImportMode, label: (item: T) => string, kind: ImportConflict['kind']) {
  const savedMap = new Map(saved.map((item) => [item.id, item]));
  const fileMap = new Map(file.map((item) => [item.id, item]));
  const add: T[] = [];
  const conflicts: ImportConflict[] = [];
  let identical = 0;
  for (const item of file) {
    const current = savedMap.get(item.id);
    if (!current) add.push(item);
    else if (same(current, item)) identical++;
    else if (mode === 'merge') conflicts.push({ kind, id: item.id, label: label(item) });
    else add.push(item);
  }
  const remove = mode === 'replace' ? saved.filter((item) => { const f = fileMap.get(item.id); return !f || !same(item, f); }).map((item) => item.id) : [];
  return { add, identical, conflicts, remove };
}

export function planImport(data: Pick<ImportData, 'expenses' | 'categories'> & Partial<Pick<ImportData, 'funds' | 'movements' | 'lists' | 'budget' | 'merchants' | 'templates' | 'receipts'>>,
  current: { expenses: readonly ExpenseRecord[]; categories: readonly Category[]; funds?: readonly Fund[]; movements?: readonly Movement[]; lists?: readonly ShoppingListRecord[]; budget?: readonly BudgetChange[]; merchants?: readonly Merchant[]; templates?: readonly TemplateRecord[]; receipts?: readonly ScannedReceipt[] }, mode: ImportMode): ImportPlan {
  // Merchants are identified by their name key: the same merchant in the file and in the archive is never a conflict. A
  // merge keeps the saved spelling of the name; a replace makes it equal to the file.
  const savedMerchants = new Map((current.merchants ?? []).map((m) => [m.id, m]));
  const fileMerchants = data.merchants ?? [];
  const addMerchants = fileMerchants.filter((m) => { const saved = savedMerchants.get(m.id); return !saved || (mode === 'replace' && saved.name !== m.name); });
  const fileMerchantIds = new Set(fileMerchants.map((m) => m.id));
  const removeMerchantIds = mode === 'replace' ? (current.merchants ?? []).filter((m) => !fileMerchantIds.has(m.id)).map((m) => m.id) : [];
  const fileFunds = data.funds ?? [];
  const funds = planById(fileFunds, current.funds ?? [], sameFund, mode, (f) => f.name, 'fund');
  // A new fund whose name is already used by another saved fund would make two funds look alike: a merge conflict.
  if (mode === 'merge') for (const f of funds.add) {
    if ((current.funds ?? []).some((o) => o.id !== f.id && o.name.toLocaleLowerCase('it') === f.name.toLocaleLowerCase('it'))) funds.conflicts.push({ kind: 'fund', id: f.id, label: f.name });
  }
  const movements = planById(data.movements ?? [], current.movements ?? [], sameMovement, mode, (m) => m.note, 'movement');
  const lists = planById(data.lists ?? [], current.lists ?? [], sameListRecord, mode, (l) => l.name, 'list');
  const templates = planById(data.templates ?? [], current.templates ?? [], sameTemplate, mode, (x) => x.description, 'template');
  const receipts = planById(data.receipts ?? [], current.receipts ?? [], sameScannedReceipt, mode, (r) => r.merchant ?? r.date ?? r.id, 'receipt');
  // The general budget never overwrites a different saved one in a merge; a replace makes it equal to the file.
  const fileBudget = data.budget ?? [];
  const savedBudget = current.budget ?? [];
  let setBudget: BudgetChange[] | null = null;
  const budgetConflicts: ImportConflict[] = [];
  if (!sameBudgets(fileBudget, savedBudget)) {
    if (mode === 'replace' || (savedBudget.length === 0 && fileBudget.length > 0)) setBudget = [...fileBudget];
    else if (fileBudget.length > 0) budgetConflicts.push({ kind: 'budget', id: 'budget', label: 'Budget mensile' });
  }
  const savedExpenses = new Map(current.expenses.map((e) => [e.id, e]));
  const savedCategories = new Map(current.categories.map((c) => [c.id, c]));
  const fileExpenses = new Map(data.expenses.map((e) => [e.id, e]));
  const fileCategories = new Map(data.categories.map((c) => [c.id, c]));
  const addExpenses: ExpenseRecord[] = [];
  const addCategories: Category[] = [];
  const conflicts: ImportConflict[] = [];
  let sameExpenses = 0, sameCategories = 0;
  for (const e of data.expenses) {
    const saved = savedExpenses.get(e.id);
    if (!saved) addExpenses.push(e);
    else if (sameExpense(saved, e)) sameExpenses++;
    else if (mode === 'merge') conflicts.push({ kind: 'expense', id: e.id, label: e.description });
    else addExpenses.push(e);
  }
  for (const c of data.categories) {
    const saved = savedCategories.get(c.id);
    if (saved) {
      if (sameCategory(saved, c)) sameCategories++;
      else if (mode === 'merge') conflicts.push({ kind: 'category', id: c.id, label: c.label });
      else addCategories.push(c);
    } else if (mode === 'merge' && current.categories.some((o) => categoryNameKey(o.label) === categoryNameKey(c.label))) {
      conflicts.push({ kind: 'category', id: c.id, label: c.label });
    } else addCategories.push(c);
  }
  const keptExpense = (e: ExpenseRecord) => { const f = fileExpenses.get(e.id); return !!f && sameExpense(e, f); };
  const keptCategory = (c: Category) => { const f = fileCategories.get(c.id); return !!f && sameCategory(c, f); };
  const removeExpenseIds = mode === 'replace' ? current.expenses.filter((e) => !keptExpense(e)).map((e) => e.id) : [];
  const removeCategoryIds = mode === 'replace' ? current.categories.filter((c) => !keptCategory(c)).map((c) => c.id) : [];
  const finalCategories = new Set(mode === 'replace' ? fileCategories.keys() : [...savedCategories.keys(), ...fileCategories.keys()]);
  const finalFunds = new Set(mode === 'replace' ? fileFunds.map((f) => f.id) : [...(current.funds ?? []).map((f) => f.id), ...fileFunds.map((f) => f.id)]);
  return {
    mode, addExpenses, addCategories, addFunds: funds.add, addMovements: movements.add, addLists: lists.add, addTemplates: templates.add, addReceipts: receipts.add, setBudget,
    addMerchants, sameMerchants: fileMerchants.length - addMerchants.length, removeMerchantIds,
    sameExpenses, sameCategories, sameFunds: funds.identical, sameMovements: movements.identical, sameLists: lists.identical, sameTemplates: templates.identical, sameReceipts: receipts.identical,
    removeExpenseIds, removeCategoryIds, removeFundIds: funds.remove, removeMovementIds: movements.remove, removeListIds: lists.remove, removeTemplateIds: templates.remove, removeReceiptIds: receipts.remove,
    conflicts: [...conflicts, ...funds.conflicts, ...movements.conflicts, ...lists.conflicts, ...templates.conflicts, ...receipts.conflicts, ...budgetConflicts],
    categoryTotal: finalCategories.size,
    missingCategoryReferences: data.expenses.filter((e) => e.category_id !== null && !finalCategories.has(e.category_id)).length,
    missingFundReferences: data.expenses.filter((e) => e.fund_id && !finalFunds.has(e.fund_id)).length
      + (data.movements ?? []).filter((m) => !finalFunds.has(m.to_fund_id) || (m.from_fund_id !== null && !finalFunds.has(m.from_fund_id))).length,
  };
}

// The other archive as a backup would carry it (the move between modes): the same file format read back by the same
// reader, so the move follows exactly the rules of a restore (validation, merge without overwriting, identical items skipped).
export function archiveAsImport(snapshot: Parameters<typeof makeBackup>[0]): ImportData {
  return parseBackup(JSON.parse(makeBackup(snapshot)));
}

// Moving data between the two modes (21 November): both archives usually hold the same default categories under different
// IDs, which a plain merge reports as conflicts. Here a category of the other archive whose name (same key as the unique
// name index) is already used by a saved category becomes that saved one: its record is dropped and the expenses, lists
// and templates moved over point to the saved ID. A category with the same ID is left to the plan (identical or a
// conflict). Only for the move between modes: a backup file keeps the plain merge rules.
export function alignCategoriesByName(data: ImportData, saved: readonly Category[]): { data: ImportData; aligned: number } {
  const savedIds = new Set(saved.map((c) => c.id));
  const byName = new Map(saved.map((c) => [categoryNameKey(c.label), c.id]));
  const moved = new Map<string, string>();
  for (const c of data.categories) {
    const target = byName.get(categoryNameKey(c.label));
    if (!savedIds.has(c.id) && target !== undefined) moved.set(c.id, target);
  }
  if (moved.size === 0) return { data, aligned: 0 };
  const point = <T extends { category_id: string | null }>(record: T): T =>
    record.category_id !== null && moved.has(record.category_id) ? { ...record, category_id: moved.get(record.category_id)! } : record;
  return {
    aligned: moved.size,
    data: {
      ...data,
      categories: data.categories.filter((c) => !moved.has(c.id)),
      expenses: data.expenses.map(point),
      lists: data.lists.map(point),
      ...(data.templates ? { templates: data.templates.map(point) } : {}),
    },
  };
}

// The items named when a merge is blocked: the first `max` conflicts as in the plan (expenses first), and how many more.
// Labels are the file's own names (descriptions, category/fund/list names, movement notes: never translated); the general
// budget's label and an empty movement note are left to the presentation layer (`kind` tells which).
export function conflictPreview(conflicts: readonly ImportConflict[], max = 3): { shown: ImportConflict[]; more: number } {
  const shown = conflicts.slice(0, Math.max(0, max));
  return { shown, more: conflicts.length - shown.length };
}

// --- CSV export (consultation only) ------------------------------------------------------------

// Italian spreadsheets expect ';' as the list separator and ',' as the decimal mark; ISO dates open correctly everywhere.
// «Fondo» and then «Esercente» (last, so older column positions are unchanged) are empty for expenses without one.
const csvHeader = ['Data', 'Descrizione', 'Categoria', 'Importo', 'Valuta', 'Ricorrenza', 'Fondo', 'Esercente'];

// Quoting alone does not stop spreadsheets from evaluating formulas: texts starting with = + - @
// (also after whitespace or control characters) get a leading apostrophe.
function csvText(value: string): string {
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvAmount(amountMinor: number): string {
  return `${Math.floor(amountMinor / 100)},${String(amountMinor % 100).padStart(2, '0')}`;
}

// One row per occurrence up to today, at the price it had then: a recurring series is expanded, never
// repeated as a whole, and future renewals are not spending yet. Technical data (IDs, timestamps,
// price schedules) stays in the JSON backup.
export function exportCsv(expenses: readonly ExpenseRecord[], categories: readonly Category[], today = todayInRome(), funds: readonly Pick<Fund, 'id' | 'name'>[] = [], merchants: readonly Merchant[] = []): string {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const fundNames = new Map(funds.map((f) => [f.id, f.name]));
  const fundOf = new Map(expenses.map((e) => [e.id, e.fund_id ?? '']));
  const merchantNames = new Map(merchants.map((m) => [m.id, m.name]));
  const merchantOf = new Map(expenses.map((e) => [e.id, e.merchant_id ?? '']));
  const rows = expandOccurrences(expenses, today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description) || a.key.localeCompare(b.key))
    .map((r) => [r.date, csvText(r.description), csvText(labels.get(r.category_id ?? '') ?? ''), csvAmount(r.amount_minor), 'EUR',
      csvText(r.recurrence ? recurrenceLabels[r.recurrence] : ''), csvText(fundNames.get(fundOf.get(r.expenseId) ?? '') ?? ''),
      csvText(merchantNames.get(merchantOf.get(r.expenseId) ?? '') ?? '')].join(';'));
  return '﻿' + [csvHeader.join(';'), ...rows].join('\r\n') + '\r\n';
}
