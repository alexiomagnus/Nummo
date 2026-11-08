import { categoryNameError, isCategoryIcon, maxCategories, normalizeCategoryName, categoryLimitMessage, type Category } from './category.ts';
import { isUuid, parseExpenseRecord, sameFieldValue, type ExpenseRecord } from './contract.ts';
import { categoryNameKey, validateImportedExpense } from './firestore.ts';
import { expandOccurrences } from './history.ts';
import { todayInRome } from './policy.ts';
import { recurrenceLabels } from './recurrence.ts';

// Two distinct outputs:
// - CSV: a read-only table of the spending (one row per occurrence up to today) for spreadsheets. Never imported.
// - JSON: the only backup/restore format, versioned so that later schema changes can migrate older files.

export type ImportData = { expenses: ExpenseRecord[]; categories: Category[] };

export const backupFormat = 'nummo-backup';
// Bump when the file shape changes and add a reader for the old number to `readers`.
export const backupVersion = 1;

// --- JSON backup -----------------------------------------------------------------------------

// Only what a restore needs: no Firestore bookkeeping (revision, updated_at, name_key), no account or
// project identifiers. Output is deterministic (sorted) so that two exports of the same data are equal.
export function makeBackup(data: { expenses: readonly ExpenseRecord[]; categories: readonly Category[] }, now = new Date()): string {
  const expenses = data.expenses.map((e) => ({
    id: e.id, amount_minor: e.amount_minor, currency: e.currency, description: e.description, category_id: e.category_id,
    expense_date: e.expense_date, recurrence: e.recurrence, price_changes: e.price_changes.map((c) => ({ index: c.index, amount_minor: c.amount_minor, once: c.once })),
    source: e.source, schema_version: e.schema_version, created_at: e.created_at,
  })).sort((a, b) => a.expense_date.localeCompare(b.expense_date) || a.id.localeCompare(b.id));
  const categories = data.categories.map((c) => ({ id: c.id, label: c.label, icon: c.icon })).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return JSON.stringify({ format: backupFormat, version: backupVersion, exported_at: now.toISOString(), categories, expenses }, null, 2);
}

// Strict validation of the body shared by the file reader and the store. Anything invalid rejects the whole file.
export function validateBackupData(rawExpenses: unknown, rawCategories: unknown): ImportData {
  if (!Array.isArray(rawExpenses) || !Array.isArray(rawCategories)) throw new Error('Formato backup non riconosciuto.');
  if (rawCategories.length > maxCategories) throw new Error(`Il file contiene ${rawCategories.length} categorie. ${categoryLimitMessage}`);
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
  return { expenses, categories };
}

// One reader per supported version; each returns the current in-memory shape.
const readers: Record<number, (file: Record<string, unknown>) => ImportData> = {
  1: (file) => validateBackupData(file.expenses, file.categories),
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
export type ImportConflict = Readonly<{ kind: 'expense' | 'category'; id: string; label: string }>;
export type ImportPlan = Readonly<{
  mode: ImportMode;
  addExpenses: ExpenseRecord[];
  addCategories: Category[];
  // Already saved and identical: skipped, never rewritten.
  sameExpenses: number;
  sameCategories: number;
  // 'replace' only: saved items that are not identical to a file item.
  removeExpenseIds: string[];
  removeCategoryIds: string[];
  // 'merge' only: same ID (or same category name) with different content. Any conflict blocks the merge.
  conflicts: ImportConflict[];
  // Categories after the import ('merge' can exceed the application limit).
  categoryTotal: number;
  // Imported expenses pointing at a category that will not exist.
  missingCategoryReferences: number;
}>;

const expenseKeys = ['amount_minor', 'currency', 'description', 'category_id', 'expense_date', 'recurrence', 'price_changes', 'source', 'schema_version', 'created_at'] as const;
export function sameExpense(a: ExpenseRecord, b: ExpenseRecord): boolean {
  return expenseKeys.every((key) => sameFieldValue(a[key], b[key]));
}
export function sameCategory(a: Category, b: Category): boolean {
  return a.label === b.label && a.icon === b.icon;
}

export function planImport(data: ImportData, current: { expenses: readonly ExpenseRecord[]; categories: readonly Category[] }, mode: ImportMode): ImportPlan {
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
  return {
    mode, addExpenses, addCategories, sameExpenses, sameCategories, removeExpenseIds, removeCategoryIds, conflicts,
    categoryTotal: finalCategories.size,
    missingCategoryReferences: data.expenses.filter((e) => e.category_id !== null && !finalCategories.has(e.category_id)).length,
  };
}

// --- CSV export (consultation only) ------------------------------------------------------------

// Italian spreadsheets expect ';' as the list separator and ',' as the decimal mark; ISO dates open correctly everywhere.
const csvHeader = ['Data', 'Descrizione', 'Categoria', 'Importo', 'Valuta', 'Ricorrenza'];

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
export function exportCsv(expenses: readonly ExpenseRecord[], categories: readonly Category[], today = todayInRome()): string {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const rows = expandOccurrences(expenses, today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description) || a.key.localeCompare(b.key))
    .map((r) => [r.date, csvText(r.description), csvText(labels.get(r.category_id ?? '') ?? ''), csvAmount(r.amount_minor), 'EUR',
      csvText(r.recurrence ? recurrenceLabels[r.recurrence] : '')].join(';'));
  return '﻿' + [csvHeader.join(';'), ...rows].join('\r\n') + '\r\n';
}
