import { categoryNameError, isCategoryIcon, normalizeCategoryName, type Category } from './category.ts';
import { isUuid, parseExpenseRecord, type ExpenseRecord } from './contract.ts';
import { validateImportedExpense } from './firestore.ts';
import { expandOccurrences } from './history.ts';
import { todayInRome } from './policy.ts';
export type ImportData = { expenses: ExpenseRecord[]; categories: Category[] };
export function parseImport(value: unknown): ImportData {
  const v = value as { format?: unknown; version?: unknown; expenses?: unknown; categories?: unknown } | null;
  if (!v || v.format !== 'nummo-backup' || v.version !== 1 || !Array.isArray(v.expenses) || !Array.isArray(v.categories)) throw new Error('Formato backup non riconosciuto.');
  const expenses: ExpenseRecord[] = [];
  const categories: Category[] = [];
  for (const item of v.categories) {
    if (!item || !isUuid(item.id) || typeof item.label !== 'string' || normalizeCategoryName(item.label) !== item.label
      || categoryNameError(item.label, categories) || (item.icon !== null && !isCategoryIcon(item.icon))
      || categories.some((c) => c.id === item.id)) throw new Error('Categorie nel backup non valide o duplicate.');
    categories.push({ id: item.id, label: item.label, icon: item.icon });
  }
  for (const item of v.expenses) {
    const record = parseExpenseRecord(item);
    if (!record || expenses.some((e) => e.id === record.id)) throw new Error('Spese nel backup non valide o duplicate.');
    validateImportedExpense(record);
    expenses.push({ ...record, created_at: new Date(record.created_at).toISOString() });
  }
  return { expenses, categories };
}
export function makeBackup(data: { expenses: readonly ExpenseRecord[]; categories: readonly Category[] }, origin: { project_id: string; uid: string }, now = new Date()) {
  // Keep revision and updated_at when supplied by Firestore; imports start a new revision history.
  return JSON.stringify({ format: 'nummo-backup', version: 1, exported_at: now.toISOString(), origin, ...data }, null, 2);
}
function csvCell(value: string, text = true): string {
  // Quoting alone does not prevent spreadsheet formula evaluation. Guard leading whitespace/control chars too.
  const safe = text && /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function exportCsv(expenses: readonly ExpenseRecord[], categories: readonly Category[], today = todayInRome()): string {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const records = new Map(expenses.map((e) => [e.id, e]));
  const header = ['occurrence_id', 'expense_id', 'expense_date', 'amount', 'amount_minor', 'currency', 'description', 'category_id', 'category', 'recurrence', 'created_at'];
  const rows = expandOccurrences(expenses, today).sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key)).map((r) => {
    const amount = `${Math.floor(r.amount_minor / 100)}.${String(r.amount_minor % 100).padStart(2, '0')}`;
    return [r.key, r.expenseId, r.date, amount, String(r.amount_minor), 'EUR', r.description, r.category_id ?? '', labels.get(r.category_id ?? '') ?? '', r.recurrence ?? '', records.get(r.expenseId)!.created_at].map((s, i) => csvCell(s, i !== 3 && i !== 4)).join(',');
  });
  return '\uFEFF' + [header.join(','), ...rows].join('\r\n') + '\r\n';
}
