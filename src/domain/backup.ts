import { categoryNameError, isCategoryIcon, normalizeCategoryName, type Category } from './category.ts';
import { isUtcTimestamp, isUuid, parseExpenseRecord, sameFieldValue, type ExpenseRecord } from './contract.ts';
import { categoryNameKey, validateImportedExpense } from './firestore.ts';
import { expandOccurrences } from './history.ts';
import { fundNameError, parseFund, parseMovement, type Fund, type Movement } from './funds.ts';
import { todayInRome } from './policy.ts';
import { recurrenceLabels } from './recurrence.ts';

// Two distinct outputs:
// - CSV: a read-only table of the spending (one row per occurrence up to today) for spreadsheets. Never imported.
// - JSON: the only backup/restore format, versioned so that later schema changes can migrate older files.

export type ImportData = { expenses: ExpenseRecord[]; categories: Category[]; funds: Fund[]; movements: Movement[] };

export const backupFormat = 'nummo-backup';
// Bump when the file shape changes and add a reader for the old number to `readers`.
// v2 adds `status_changes` (subscription pauses/cancellations); v1 files have none, so every series is active.
// v3 adds funds, movements (income and transfers) and the expenses' `fund_id`; older files have no funds.
export const backupVersion = 3;

// --- JSON backup -----------------------------------------------------------------------------

// Only what a restore needs: no Firestore bookkeeping (revision, updated_at, name_key), no account or
// project identifiers. Output is deterministic (sorted) so that two exports of the same data are equal.
export function makeBackup(data: { expenses: readonly ExpenseRecord[]; categories: readonly Category[]; funds?: readonly Fund[]; movements?: readonly Movement[] }, now = new Date()): string {
  const expenses = data.expenses.map((e) => ({
    id: e.id, amount_minor: e.amount_minor, currency: e.currency, description: e.description, category_id: e.category_id,
    expense_date: e.expense_date, recurrence: e.recurrence, price_changes: e.price_changes.map((c) => ({ index: c.index, amount_minor: c.amount_minor, once: c.once })),
    status_changes: e.status_changes.map((c) => ({ date: c.date, status: c.status })), fund_id: e.fund_id ?? null,
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
  return JSON.stringify({ format: backupFormat, version: backupVersion, exported_at: now.toISOString(), categories, funds, movements, expenses }, null, 2);
}

// Strict validation of the body shared by the file reader and the store. Anything invalid rejects the whole file.
export function validateBackupData(rawExpenses: unknown, rawCategories: unknown, rawFunds: unknown = [], rawMovements: unknown = []): ImportData {
  if (!Array.isArray(rawExpenses) || !Array.isArray(rawCategories) || !Array.isArray(rawFunds) || !Array.isArray(rawMovements)) throw new Error('Formato backup non riconosciuto.');
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
    expenses.push({ ...record, created_at: new Date(record.created_at).toISOString() });
  }
  return { expenses, categories, funds, movements };
}

// One reader per supported version; each returns the current in-memory shape.
const readers: Record<number, (file: Record<string, unknown>) => ImportData> = {
  // v1 expenses have no `status_changes`: the record parser reads the missing field as "always active".
  1: (file) => validateBackupData(file.expenses, file.categories),
  2: (file) => validateBackupData(file.expenses, file.categories),
  // v3: funds and movements; v1/v2 expenses have no `fund_id` (read as «Senza fondo») and the files no funds.
  3: (file) => validateBackupData(file.expenses, file.categories, file.funds, file.movements),
};

export function parseBackup(value: unknown): ImportData {
  const file = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!file || file.format !== backupFormat || typeof file.version !== 'number') throw new Error('Formato backup non riconosciuto.');
  if (file.version > backupVersion) throw new Error('Backup creato da una versione più recente di Nummo: aggiorna l’app prima di importarlo.');
  const reader = readers[file.version];
  if (!reader) throw new Error('Versione del backup non supportata.');
  return reader(file);
}

// --- Import planning (pure; used for the preview and again by the store before writing) -----------

export type ImportMode = 'merge' | 'replace';
export type ImportConflict = Readonly<{ kind: 'expense' | 'category' | 'fund' | 'movement'; id: string; label: string }>;
export type ImportPlan = Readonly<{
  mode: ImportMode;
  addExpenses: ExpenseRecord[];
  addCategories: Category[];
  addFunds: Fund[];
  addMovements: Movement[];
  // Already saved and identical: skipped, never rewritten.
  sameExpenses: number;
  sameCategories: number;
  sameFunds: number;
  sameMovements: number;
  // 'replace' only: saved items that are not identical to a file item.
  removeExpenseIds: string[];
  removeCategoryIds: string[];
  removeFundIds: string[];
  removeMovementIds: string[];
  // 'merge' only: same ID (or same category name) with different content. Any conflict blocks the merge.
  conflicts: ImportConflict[];
  // Categories after the import ('merge' can exceed the application limit).
  categoryTotal: number;
  // Imported expenses pointing at a category that will not exist.
  missingCategoryReferences: number;
  // Imported expenses and movements pointing at a fund that will not exist (shown as «Senza fondo»).
  missingFundReferences: number;
}>;

const expenseKeys = ['amount_minor', 'currency', 'description', 'category_id', 'expense_date', 'recurrence', 'price_changes', 'status_changes', 'fund_id', 'source', 'schema_version', 'created_at'] as const;
export function sameExpense(a: ExpenseRecord, b: ExpenseRecord): boolean {
  return expenseKeys.every((key) => sameFieldValue(a[key], b[key]));
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

export function planImport(data: Pick<ImportData, 'expenses' | 'categories'> & Partial<Pick<ImportData, 'funds' | 'movements'>>,
  current: { expenses: readonly ExpenseRecord[]; categories: readonly Category[]; funds?: readonly Fund[]; movements?: readonly Movement[] }, mode: ImportMode): ImportPlan {
  const fileFunds = data.funds ?? [];
  const funds = planById(fileFunds, current.funds ?? [], sameFund, mode, (f) => f.name, 'fund');
  // A new fund whose name is already used by another saved fund would make two funds look alike: a merge conflict.
  if (mode === 'merge') for (const f of funds.add) {
    if ((current.funds ?? []).some((o) => o.id !== f.id && o.name.toLocaleLowerCase('it') === f.name.toLocaleLowerCase('it'))) funds.conflicts.push({ kind: 'fund', id: f.id, label: f.name });
  }
  const movements = planById(data.movements ?? [], current.movements ?? [], sameMovement, mode, (m) => m.note, 'movement');
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
    mode, addExpenses, addCategories, addFunds: funds.add, addMovements: movements.add,
    sameExpenses, sameCategories, sameFunds: funds.identical, sameMovements: movements.identical,
    removeExpenseIds, removeCategoryIds, removeFundIds: funds.remove, removeMovementIds: movements.remove,
    conflicts: [...conflicts, ...funds.conflicts, ...movements.conflicts],
    categoryTotal: finalCategories.size,
    missingCategoryReferences: data.expenses.filter((e) => e.category_id !== null && !finalCategories.has(e.category_id)).length,
    missingFundReferences: data.expenses.filter((e) => e.fund_id && !finalFunds.has(e.fund_id)).length
      + (data.movements ?? []).filter((m) => !finalFunds.has(m.to_fund_id) || (m.from_fund_id !== null && !finalFunds.has(m.from_fund_id))).length,
  };
}

// --- CSV export (consultation only) ------------------------------------------------------------

// Italian spreadsheets expect ';' as the list separator and ',' as the decimal mark; ISO dates open correctly everywhere.
// «Fondo» (last, so older column positions are unchanged) is empty for expenses without a fund.
const csvHeader = ['Data', 'Descrizione', 'Categoria', 'Importo', 'Valuta', 'Ricorrenza', 'Fondo'];

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
export function exportCsv(expenses: readonly ExpenseRecord[], categories: readonly Category[], today = todayInRome(), funds: readonly Pick<Fund, 'id' | 'name'>[] = []): string {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const fundNames = new Map(funds.map((f) => [f.id, f.name]));
  const fundOf = new Map(expenses.map((e) => [e.id, e.fund_id ?? '']));
  const rows = expandOccurrences(expenses, today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description) || a.key.localeCompare(b.key))
    .map((r) => [r.date, csvText(r.description), csvText(labels.get(r.category_id ?? '') ?? ''), csvAmount(r.amount_minor), 'EUR',
      csvText(r.recurrence ? recurrenceLabels[r.recurrence] : ''), csvText(fundNames.get(fundOf.get(r.expenseId) ?? '') ?? '')].join(';'));
  return '﻿' + [csvHeader.join(';'), ...rows].join('\r\n') + '\r\n';
}
