import { categoryLimitMessage, categoryNameError, maxCategories, isCategoryIcon, normalizeCategoryName, type Category } from './category.ts';
import { isUuid, parseExpenseRecord, sameFieldValue, type ExpenseRecord } from './contract.ts';
import { validateImportedExpense } from './firestore.ts';
import { expandOccurrences } from './history.ts';
import { todayInRome } from './policy.ts';
export type ImportData = { expenses: ExpenseRecord[]; categories: Category[] };
export function parseImport(value: unknown): ImportData {
  const v = value as { format?: unknown; version?: unknown; expenses?: unknown; categories?: unknown } | null;
  if (!v || v.format !== 'nummo-backup' || v.version !== 1 || !Array.isArray(v.expenses) || !Array.isArray(v.categories)) throw new Error('Formato backup non riconosciuto.');
  if (v.categories.length > maxCategories) throw new Error(`Il file contiene ${v.categories.length} categorie. ${categoryLimitMessage}`);
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
function csvText(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
}
function csvCell(value: string, text = true): string {
  // Quoting alone does not prevent spreadsheet formula evaluation. Guard leading whitespace/control chars too.
  const safe = text ? csvText(value) : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function exportCsv(expenses: readonly ExpenseRecord[], categories: readonly Category[], today = todayInRome()): string {
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const records = new Map(expenses.map((e) => [e.id, e]));
  const header = [...csvColumns, 'expense_data', 'category_data'];
  const rows = expandOccurrences(expenses, today).sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key)).map((r) => {
    const amount = `${Math.floor(r.amount_minor / 100)}.${String(r.amount_minor % 100).padStart(2, '0')}`;
    const record = records.get(r.expenseId)!;
    const category = categories.find((c) => c.id === r.category_id) ?? null;
    return [r.key, r.expenseId, r.date, amount, String(r.amount_minor), 'EUR', r.description, r.category_id ?? '', labels.get(r.category_id ?? '') ?? '', r.recurrence ?? '', record.created_at,
      JSON.stringify(record), JSON.stringify(category)].map((s, i) => csvCell(s, i !== 3 && i !== 4)).join(',');
  });
  return '\uFEFF' + [header.join(','), ...rows].join('\r\n') + '\r\n';
}

const csvColumns = ['occurrence_id', 'expense_id', 'expense_date', 'amount', 'amount_minor', 'currency', 'description', 'category_id', 'category', 'recurrence', 'created_at'];

// Strict quoted CSV reader: commas, escaped quotes and embedded CR/LF; no dependencies.
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', state: 'plain' | 'quoted' | 'closed' = 'plain';
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (state === 'quoted') {
      if (char === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++; } else state = 'closed';
      } else cell += char;
    } else if (char === ',' || char === '\r' || char === '\n') {
      row.push(cell); cell = ''; state = 'plain';
      if (char !== ',') {
        rows.push(row); row = [];
        if (char === '\r' && source[i + 1] === '\n') i++;
      }
    } else if (char === '"' && state === 'plain' && cell === '') state = 'quoted';
    else {
      if (char === '"' || state === 'closed') throw new Error('CSV non valido: virgolette o separatori errati.');
      cell += char;
    }
  }
  if (state === 'quoted') throw new Error('CSV non valido: campo tra virgolette non chiuso.');
  if (cell !== '' || row.length > 0 || state === 'closed') { row.push(cell); rows.push(row); }
  return rows;
}

export function parseCsvImport(text: string): ImportData {
  const [header, ...rows] = csvRows(text);
  if (!header || new Set(header).size !== header.length || csvColumns.some((key) => !header.includes(key))) {
    throw new Error('Formato CSV non riconosciuto. Usa un CSV esportato da Nummo.');
  }
  const full = header.includes('expense_data') && header.includes('category_data');
  if (!full && (header.includes('expense_data') || header.includes('category_data'))) throw new Error('CSV incompleto: mancano i dati per il ripristino.');
  const expenses = new Map<string, ExpenseRecord>();
  const categories = new Map<string, Category>();
  const seen = new Set<string>();
  const occurrences = new Map<string, Map<string, ReturnType<typeof expandOccurrences>[number]>>();
  for (const [index, cells] of rows.entries()) {
    try {
      if (cells.length !== header.length) throw new Error('Numero di colonne errato.');
      const row = Object.fromEntries(header.map((key, i) => [key, cells[i]!]));
      if (seen.has(row.occurrence_id!)) throw new Error('Occorrenza duplicata.');
      seen.add(row.occurrence_id!);
      let record: ExpenseRecord;
      let category: Category | null;
      if (full) {
        const rawCategory: unknown = JSON.parse(row.category_data!);
        const parsed = parseImport({ format: 'nummo-backup', version: 1, expenses: [JSON.parse(row.expense_data!)], categories: rawCategory === null ? [] : [rawCategory] });
        record = parsed.expenses[0]!;
        category = parsed.categories[0] ?? null;
      } else {
        // Old occurrence exports cannot recover recurrence anchors, future prices or protected text.
        if (row.recurrence || [row.description!, row.category!].some((value) => /^'[\s\u0000-\u001f]*[=+\-@]/u.test(value))) {
          throw new Error('Questo vecchio CSV non conserva tutti i dati. Usa il backup JSON o esporta un nuovo CSV da Nummo.');
        }
        if (!/^[1-9]\d*$/.test(row.amount_minor!)) throw new Error('Importo in centesimi non valido.');
        const parsed = parseImport({ format: 'nummo-backup', version: 1, expenses: [{
          id: row.expense_id, expense_date: row.expense_date, amount_minor: Number(row.amount_minor), currency: row.currency,
          description: row.description, category_id: row.category_id || null, recurrence: null, price_changes: [],
          created_at: row.created_at, source: 'web_app', schema_version: 1,
        }], categories: row.category ? [{ id: row.category_id, label: row.category, icon: null }] : [] });
        record = parsed.expenses[0]!; category = parsed.categories[0] ?? null;
      }
      const previous = expenses.get(record.id);
      if (previous && !sameFieldValue(previous, record)) throw new Error('Dati discordanti per la stessa spesa.');
      if (category) {
        if (category.id !== record.category_id) throw new Error('Categoria incoerente.');
        const previousCategory = categories.get(category.id);
        if (previousCategory && !sameFieldValue(previousCategory, category)) throw new Error('Dati discordanti per la stessa categoria.');
        categories.set(category.id, category);
      }
      if (!occurrences.has(record.id)) occurrences.set(record.id, new Map(expandOccurrences([record], todayInRome()).map((r) => [r.key, r])));
      const occurrence = occurrences.get(record.id)!.get(row.occurrence_id!);
      if (!occurrence) throw new Error('Occorrenza non valida per la serie.');
      const amount = `${Math.floor(occurrence.amount_minor / 100)}.${String(occurrence.amount_minor % 100).padStart(2, '0')}`;
      const expected = [occurrence.key, record.id, occurrence.date, amount, String(occurrence.amount_minor), record.currency,
        csvText(record.description), record.category_id ?? '', csvText(category?.label ?? ''), record.recurrence ?? '', record.created_at];
      if (csvColumns.some((key, i) => row[key] !== expected[i])) throw new Error('Colonne CSV incoerenti con i dati della spesa.');
      expenses.set(record.id, record);
    } catch (error) {
      throw new Error(`Riga CSV ${index + 2}: ${error instanceof Error ? error.message : 'Dati non validi.'}`);
    }
  }
  return parseImport({ format: 'nummo-backup', version: 1, expenses: [...expenses.values()], categories: [...categories.values()] });
}
