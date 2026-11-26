import { categoryNameError, normalizeCategoryName, type Category } from './category.ts';
import type { ExpenseRecord } from './contract.ts';
import { validateImportedExpense } from './firestore.ts';
import { normalizeDescription, parseAmountMinor } from './expense.ts';
import type { Fund } from './funds.ts';
import { displayMerchantName, merchantKey, merchantNameError, normalizeMerchantName, type Merchant } from './merchant.ts';
import { expensePolicy, isValidDate, todayInRome } from './policy.ts';
import type { ImportData } from './backup.ts';

// Import of the CSV that Nummo itself exports, or a similar table (user's request, 27 November 2026; until then the CSV was
// consultation only). Only single expenses come out of it: every row is one payment, whatever its «Ricorrenza» (a series
// exported as one row per occurrence comes back as that many single expenses, at the price each had). Categories are matched
// by name to the saved ones (a new name makes a new category without an icon), funds by name to the saved ones (an unknown
// fund is left out: a fund needs more than a name), merchants by their key. IDs and creation times are derived from the row,
// so importing the same file twice finds everything identical and adds nothing. The result goes through the same merge as a
// JSON backup (preview, nothing overwritten); this module is pure.

export const maxCsvRows = 20_000;

export type CsvSkipped = { line: number; reason: string };
export type CsvImport = {
  data: ImportData;
  rows: number;
  skipped: CsvSkipped[];
  // Fund names of the file that no saved fund has: those rows are imported without fund.
  unknownFunds: string[];
  newCategories: number;
  newMerchants: number;
};

// Table of text cells. The separator is the one the header line uses most (';' as exported, also ',' or tab); quoted cells
// may hold the separator, line breaks and "" for a quote.
export function readCsvTable(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.split(/\r\n|\n|\r/, 1)[0] ?? '';
  const separator = [';', ',', '\t'].map((s) => ({ s, n: firstLine.split(s).length })).sort((a, b) => b.n - a.n)[0]!.s;
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (quoted) {
      if (c === '"') { if (source[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === separator) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

// The export puts an apostrophe before texts that start like a formula; it is not part of the text.
const unprotect = (value: string) => value.replace(/^'(?=[\s\u0000-\u001f]*[=+\-@])/u, '');

// ISO date as exported, or day/month/year as a spreadsheet may have saved it.
export function csvDate(value: string): string | null {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const date = iso ? text : dmy ? `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}` : null;
  return date && isValidDate(date) ? date : null;
}

// «1.234,56», «1234,56», «1234.56», with or without € and spaces; never a negative or zero amount.
export function csvAmountMinor(value: string): number | null {
  let text = value.replace(/[\s€]|EUR/giu, '');
  if (text.includes(',')) text = text.replaceAll('.', '');
  else if ((text.match(/\./g) ?? []).length > 1) text = text.replaceAll('.', '');
  return parseAmountMinor(text);
}

// 128 bits from a text (cyrb128), written as a version 4 UUID: the same row always gets the same ID.
function derivedUuid(text: string): string {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${'89ab'[parseInt(hex[16]!, 16) % 4]}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const lower = (value: string) => normalizeCategoryName(value).toLocaleLowerCase('it');
const headerOf = (name: string) => name.normalize('NFC').trim().toLocaleLowerCase('it');

export function csvToImport(text: string, current: { categories: readonly Category[]; funds: readonly Pick<Fund, 'id' | 'name'>[]; merchants: readonly Merchant[] },
  today = todayInRome()): CsvImport {
  const table = readCsvTable(text);
  const header = (table[0] ?? []).map(headerOf);
  const column = (name: string) => header.indexOf(name);
  const [dateAt, descriptionAt, amountAt] = [column('data'), column('descrizione'), column('importo')];
  if (dateAt < 0 || descriptionAt < 0 || amountAt < 0) throw new Error('Il file non ha le colonne Data, Descrizione e Importo.');
  const [categoryAt, currencyAt, fundAt, merchantAt] = [column('categoria'), column('valuta'), column('fondo'), column('esercente')];
  if (table.length - 1 > maxCsvRows) throw new Error('Troppe righe (massimo 20.000).');
  const cell = (row: readonly string[], at: number) => at < 0 ? '' : unprotect(row[at] ?? '').trim();

  const categories = [...current.categories];
  const categoryByName = new Map(categories.map((c) => [lower(c.label), c]));
  const newCategories: Category[] = [];
  const fundByName = new Map(current.funds.map((f) => [lower(f.name), f.id]));
  const merchantsById = new Map(current.merchants.map((m) => [m.id, m]));
  const usedMerchants = new Map<string, Merchant>();
  const unknownFunds = new Set<string>();
  const skipped: CsvSkipped[] = [];
  const seen = new Map<string, number>();
  const expenses: ExpenseRecord[] = [];
  const ids = new Set<string>();

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const line = i + 1;
    const skip = (reason: string) => { skipped.push({ line, reason }); };
    const date = csvDate(cell(row, dateAt));
    if (!date || date < expensePolicy.minDate) { skip('Data non valida.'); continue; }
    if (date > today) { skip('Data nel futuro.'); continue; }
    const description = normalizeDescription(cell(row, descriptionAt));
    if (!description) { skip('Descrizione mancante.'); continue; }
    if (Array.from(description).length > expensePolicy.maxDescriptionLength) { skip('Descrizione troppo lunga.'); continue; }
    const amount = csvAmountMinor(cell(row, amountAt));
    if (amount === null) { skip('Importo non valido.'); continue; }
    const currency = cell(row, currencyAt);
    if (currency !== '' && currency.toUpperCase() !== expensePolicy.currency) { skip('Valuta diversa da EUR.'); continue; }

    const categoryName = normalizeCategoryName(cell(row, categoryAt));
    let category: Category | null = null;
    if (categoryName) {
      category = categoryByName.get(lower(categoryName)) ?? null;
      if (!category) {
        if (categoryNameError(categoryName, categories)) { skip('Categoria non valida.'); continue; }
        category = { id: derivedUuid(`category|${lower(categoryName)}`), label: categoryName, icon: null };
        categories.push(category); categoryByName.set(lower(categoryName), category); newCategories.push(category);
      }
    }
    const fundName = cell(row, fundAt);
    const fundId = fundName ? fundByName.get(lower(fundName)) ?? null : null;
    if (fundName && !fundId) unknownFunds.add(normalizeCategoryName(fundName));
    const merchantName = normalizeMerchantName(cell(row, merchantAt));
    let merchantId: string | null = null;
    if (merchantName) {
      if (merchantNameError(merchantName)) { skip('Esercente troppo lungo.'); continue; }
      merchantId = merchantKey(merchantName);
      // Every merchant an expense names goes in the file (a backup is complete on its own); a saved one is identical there.
      if (!usedMerchants.has(merchantId)) usedMerchants.set(merchantId, merchantsById.get(merchantId) ?? { id: merchantId, name: displayMerchantName(merchantName) });
    }
    // The same row twice in a file (two identical coffees) are two expenses: the count keeps their IDs apart.
    const base = [date, description, amount, category?.id ?? '', fundId ?? '', merchantId ?? ''].join('|');
    const n = (seen.get(base) ?? 0) + 1;
    const id = derivedUuid(`expense|${base}|${n}`);
    const record: ExpenseRecord = { id, amount_minor: amount, currency: 'EUR', description, category_id: category?.id ?? null, expense_date: date, recurrence: null,
      price_changes: [], status_changes: [], fund_id: fundId, list_id: null, list_items: [], ...(merchantId ? { merchant_id: merchantId } : {}),
      source: 'web_app', schema_version: 1, created_at: new Date(Date.parse(`${date}T00:00:00.000Z`) - 86_400_000).toISOString() };
    try { validateImportedExpense(record); } catch { skip('Riga non valida.'); continue; }
    if (ids.has(id)) { skip('Riga duplicata.'); continue; }
    seen.set(base, n); ids.add(id);
    expenses.push(record);
  }
  // A category made for a row that was then skipped is not worth creating.
  const usedCategories = new Set(expenses.map((e) => e.category_id));
  const madeCategories = newCategories.filter((c) => usedCategories.has(c.id));
  const keptMerchants = new Set(expenses.map((e) => e.merchant_id));
  const madeMerchants = [...usedMerchants.values()].filter((m) => keptMerchants.has(m.id));
  return { data: { expenses, categories: madeCategories, funds: [], movements: [], lists: [], ...(madeMerchants.length ? { merchants: madeMerchants } : {}) },
    rows: table.length - 1, skipped, unknownFunds: [...unknownFunds], newCategories: madeCategories.length, newMerchants: madeMerchants.filter((m) => !merchantsById.has(m.id)).length };
}
