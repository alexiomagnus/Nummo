import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, exportCsv, makeBackup, parseBackup, planImport, validateBackupData } from '../src/domain/backup.ts';
import { expandOccurrences } from '../src/domain/history.ts';
import { categoryNameKey, parseSyncedExpense } from '../src/domain/firestore.ts';
import type { ExpenseRecord } from '../src/domain/contract.ts';
import type { Category } from '../src/domain/category.ts';

const id = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const record: ExpenseRecord = { id, amount_minor: 1250, currency: 'EUR', description: 'Caffè "buono"; sì', category_id: categoryId,
  expense_date: '2025-01-31', recurrence: 'monthly', price_changes: [], status_changes: [], fund_id: null, source: 'web_app', schema_version: 1, created_at: '2025-01-31T12:00:00.000Z' };
const categories: Category[] = [{ id: categoryId, label: 'Caffè', icon: 'coffee' }];
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const expense = (n: number, extra: Partial<ExpenseRecord> = {}): ExpenseRecord => ({ ...record, id: uuid(n), recurrence: null, description: `Spesa ${n}`, ...extra });

// Minimal reader for the exported dialect (';' separator, quoted texts, "" escapes): what a spreadsheet does.
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ';') { row.push(cell); cell = ''; }
    else if (c === '\r' || c === '\n') { if (c === '\r') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  return rows;
}

// ---- CSV: consultation only ----

test('CSV: BOM, intestazioni italiane, separatore ;, CRLF, importo con virgola e testi quotati', () => {
  const csv = exportCsv([record], categories, '2025-02-28');
  assert.ok(csv.startsWith('﻿Data;Descrizione;Categoria;Importo;Valuta;Ricorrenza;Fondo\r\n'));
  const rows = readCsv(csv.slice(1));
  assert.deepEqual(rows[0], ['Data', 'Descrizione', 'Categoria', 'Importo', 'Valuta', 'Ricorrenza', 'Fondo']);
  assert.deepEqual(rows[1], ['2025-01-31', 'Caffè "buono"; sì', 'Caffè', '12,50', 'EUR', 'Mensile', '']);
  assert.ok(rows.every((r) => r.length === 7));
  assert.ok(csv.endsWith('\r\n'));
});

test('CSV: nessun dato tecnico (ID, timestamp, JSON incorporato, centesimi)', () => {
  const csv = exportCsv([{ ...record, price_changes: [{ index: 1, amount_minor: 900, once: false }] }], categories, '2025-03-31');
  for (const forbidden of [id, categoryId, '2025-01-31T', 'created_at', 'expense_data', 'category_data', '{', 'amount_minor', 'occurrence', '1250']) {
    assert.ok(!csv.includes(forbidden), `Presente: ${forbidden}`);
  }
});

test('CSV: serie ricorrente espansa per occorrenza, senza duplicati né rinnovi futuri, con il prezzo di ogni rinnovo', () => {
  const series = { ...record, price_changes: [{ index: 1, amount_minor: 900, once: true }, { index: 2, amount_minor: 2000, once: false }] };
  const rows = readCsv(exportCsv([series], categories, '2025-04-30')).slice(1);
  assert.deepEqual(rows.map((r) => [r[0], r[3]]), [['2025-01-31', '12,50'], ['2025-02-28', '9,00'], ['2025-03-31', '20,00'], ['2025-04-30', '20,00']]);
  assert.equal(new Set(rows.map((r) => r[0])).size, rows.length);
  assert.equal(rows.length, expandOccurrences([series], '2025-04-30').length);
  assert.equal(readCsv(exportCsv([series], categories, '2025-01-30')).length, 1);
  // A one-off expense is a single row without recurrence.
  assert.deepEqual(readCsv(exportCsv([expense(2, { amount_minor: 5 })], categories, '2025-02-28'))[1], ['2025-01-31', 'Spesa 2', 'Caffè', '0,05', 'EUR', '', '']);
});

test('CSV: ordinato per data, categoria eliminata lasciata vuota, importi grandi e centesimi a una cifra', () => {
  const rows = readCsv(exportCsv([expense(1, { expense_date: '2025-03-01', amount_minor: 9999999, category_id: uuid(99) }), expense(2, { expense_date: '2025-02-01', amount_minor: 101 })], categories, '2025-04-01')).slice(1);
  assert.deepEqual(rows.map((r) => r[0]), ['2025-02-01', '2025-03-01']);
  assert.deepEqual([rows[0]![3], rows[1]![3]], ['1,01', '99999,99']);
  assert.equal(rows[1]![2], '');
});

test('CSV neutralizza formule, anche precedute da whitespace o controlli, in descrizione e categoria', () => {
  for (const text of ['=1+1', '+cmd', '-formula', '@SUM(A1)', ' \t=HYPERLINK("x")', '\r@foo']) {
    const csv = exportCsv([expense(1, { description: text })], [{ id: categoryId, label: text, icon: null }], '2025-02-28');
    assert.equal(csv.split(`"'${text.replaceAll('"', '""')}"`).length - 1, 2, text);
  }
  // Ordinary texts are untouched, including ones that merely contain the characters.
  const rows = readCsv(exportCsv([expense(1, { description: 'a=b - c' })], categories, '2025-02-28'));
  assert.equal(rows[1]![1], 'a=b - c');
});

// ---- JSON: the backup ----

test('JSON: schema versionato, solo dati di ripristino, nessun identificativo di account/progetto', () => {
  const synced = [{ ...record, revision: 3, updated_at: record.created_at }];
  const syncedCategories = [{ ...categories[0]!, revision: 2, updated_at: record.created_at, name_key: categoryNameKey('Caffè') }];
  const file = JSON.parse(makeBackup({ expenses: synced, categories: syncedCategories }, new Date('2025-03-01T10:00:00Z')));
  assert.deepEqual(Object.keys(file), ['format', 'version', 'exported_at', 'categories', 'funds', 'movements', 'expenses']);
  assert.equal(file.format, 'nummo-backup');
  assert.equal(file.version, backupVersion);
  assert.equal(file.exported_at, '2025-03-01T10:00:00.000Z');
  assert.deepEqual(Object.keys(file.expenses[0]).sort(), ['amount_minor', 'category_id', 'created_at', 'currency', 'description', 'expense_date', 'fund_id', 'id', 'price_changes', 'recurrence', 'schema_version', 'source', 'status_changes']);
  assert.deepEqual(Object.keys(file.categories[0]).sort(), ['icon', 'id', 'label']);
  const text = JSON.stringify(file);
  for (const forbidden of ['revision', 'updated_at', 'name_key', 'uid', 'project', 'token', 'origin']) assert.ok(!text.includes(forbidden), forbidden);
});

test('JSON: esportazione e reimportazione ricostruiscono fedelmente ID, relazioni, ricorrenze, prezzi e icone', () => {
  const expenses: ExpenseRecord[] = [
    { ...record, price_changes: [{ index: 1, amount_minor: 900, once: true }, { index: 5, amount_minor: 2000, once: false }] },
    expense(2, { description: "'=originale", category_id: null, expense_date: '2024-02-29', recurrence: 'yearly', created_at: '2024-02-29T08:30:15.123Z' }),
    expense(3, { description: 'Orfana', category_id: uuid(77) }),
    expense(4, { description: 'Emoji 🍕 e à', expense_date: '2025-06-30', recurrence: 'weekly' }),
  ];
  const cats: Category[] = [...categories, { id: uuid(50), label: 'Senza spese', icon: null }];
  const first = makeBackup({ expenses, categories: cats });
  const restored = parseBackup(JSON.parse(first));
  const byId = <T extends { id: string }>(items: readonly T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(restored.expenses), byId(expenses));
  assert.deepEqual(byId(restored.categories), byId(cats));
  // Exporting the restored data again gives the same file (apart from the timestamp).
  const again = (text: string) => ({ ...JSON.parse(text), exported_at: '' });
  assert.deepEqual(again(makeBackup(restored)), again(first));
  // Same data in a different order produces the same file.
  assert.deepEqual(again(makeBackup({ expenses: [...expenses].reverse(), categories: [...cats].reverse() })), again(first));
});

test('JSON: versioni — le più recenti e i formati estranei sono rifiutati con un messaggio specifico', () => {
  const body = { format: 'nummo-backup', expenses: [record], categories };
  assert.throws(() => parseBackup({ ...body, version: backupVersion + 1 }), /versione più recente/);
  assert.throws(() => parseBackup({ ...body, version: 0 }), /non supportata/);
  for (const invalid of [null, [], 'x', {}, { ...body, version: '1' }, { ...body, format: 'other', version: 1 }, { format: 'nummo-backup', version: 1 }, { ...body, version: 1, expenses: {} }]) {
    assert.throws(() => parseBackup(invalid), /Formato backup non riconosciuto/);
  }
  // Files written by earlier builds carry extra fields: they are ignored, not trusted.
  const legacy = { ...body, version: 1, origin: { project_id: 'p', uid: 'u' }, expenses: [{ ...record, revision: 4, updated_at: 'x' }], categories: [{ ...categories[0], name_key: 'n-caffè', revision: 1 }] };
  assert.deepEqual(parseBackup(legacy), { expenses: [record], categories, funds: [], movements: [] });
});

test('JSON: validazione rigorosa — duplicati, importi, date, UUID, formato dati, senza limite categorie', () => {
  const value = { format: 'nummo-backup', version: 1, expenses: [record], categories };
  for (const invalid of [{ ...value, expenses: [record, record] }, { ...value, categories: [categories[0], categories[0]] },
    { ...value, categories: [categories[0], { ...categories[0], id: uuid(5) }] },
    { ...value, categories: [{ ...categories[0], icon: 'pill' }] }, { ...value, categories: [{ ...categories[0], id: 'x' }] },
    { ...value, categories: [{ ...categories[0], label: ' Caffè ' }] },
    { ...value, expenses: [{ ...record, amount_minor: 1.2 }] }, { ...value, expenses: [{ ...record, amount_minor: 0 }] },
    { ...value, expenses: [{ ...record, currency: 'USD' }] }, { ...value, expenses: [{ ...record, price_changes: [{ index: 1, amount_minor: 1, once: false, x: 1 }] }] },
    { ...value, expenses: [{ ...record, id: 'old-unmapped-id' }] }, { ...value, expenses: [{ ...record, expense_date: '2099-01-01' }] },
    { ...value, expenses: [{ ...record, expense_date: '2025-02-30' }] }, { ...value, expenses: [{ ...record, created_at: 'tomorrow' }] },
    { ...value, expenses: [null] }, { ...value, categories: [null] }]) assert.throws(() => parseBackup(invalid));
  assert.equal(value.expenses[0], record);
  const many = (count: number) => Array.from({ length: count }, (_, i) => ({ id: uuid(100 + i), label: `Cat ${i}`, icon: null }));
  assert.equal(parseBackup({ ...value, expenses: [], categories: many(10) }).categories.length, 10);
  for (const count of [3, 10, 15, 20, 30, 101]) {
    assert.equal(parseBackup({ ...value, expenses: [], categories: many(count) }).categories.length, count);
  }
  // The store validates with the same function: one source of truth.
  assert.throws(() => validateBackupData([{ ...record, amount_minor: -1 }], []));
});

test('JSON: un file che non è un backup (ad esempio un vecchio CSV) non produce dati', () => {
  assert.throws(() => parseBackup('data;descrizione\n2025-01-01;x'), /Formato backup non riconosciuto/);
});

// ---- Import planning: preview, conflicts, replacement ----

test('anteprima: backup su archivio vuoto aggiunge tutto; sullo stesso archivio non cambia nulla (ripetibile)', () => {
  const data = { expenses: [record, expense(2)], categories };
  const onEmpty = planImport(data, { expenses: [], categories: [] }, 'merge');
  assert.deepEqual([onEmpty.addExpenses.length, onEmpty.addCategories.length, onEmpty.sameExpenses, onEmpty.conflicts.length], [2, 1, 0, 0]);
  const same = { expenses: data.expenses.map((e) => ({ ...e, revision: 7, updated_at: 'x' })), categories: categories.map((c) => ({ ...c, name_key: categoryNameKey(c.label) })) };
  for (const mode of ['merge', 'replace'] as const) {
    const plan = planImport(data, same, mode);
    assert.deepEqual([plan.addExpenses.length, plan.addCategories.length, plan.removeExpenseIds.length, plan.removeCategoryIds.length, plan.conflicts.length], [0, 0, 0, 0, 0]);
    assert.deepEqual([plan.sameExpenses, plan.sameCategories], [2, 1]);
  }
});

test('anteprima unisci: conflitti per stesso ID, stesso nome con ID diverso bloccano senza scritture previste', () => {
  const data = { expenses: [record, expense(2)], categories };
  const current = { expenses: [{ ...record, amount_minor: 1 }], categories: [{ id: uuid(60), label: 'caffè', icon: null }] };
  const plan = planImport(data, current, 'merge');
  assert.deepEqual(plan.conflicts.map((c) => c.kind).sort(), ['category', 'expense']);
  assert.deepEqual(plan.addExpenses.map((e) => e.id), [uuid(2)]);
  const sameIdOtherLabel = planImport(data, { expenses: [], categories: [{ ...categories[0]!, label: 'Altro' }] }, 'merge');
  assert.equal(sameIdOtherLabel.conflicts.length, 1);
  const full = Array.from({ length: 10 }, (_, i) => ({ id: uuid(200 + i), label: `Esistente ${i}`, icon: null }));
  assert.equal(planImport(data, { expenses: [], categories: full }, 'merge').categoryTotal, 11);
  assert.equal(planImport({ expenses: [], categories: [] }, { expenses: [], categories: full }, 'merge').categoryTotal, 10);
});

test('anteprima sostituisci: elimina solo ciò che differisce dal file, aggiunge il resto, nessun conflitto', () => {
  const data = { expenses: [record, expense(2, { amount_minor: 700 })], categories };
  const current = {
    expenses: [record, expense(2), expense(3)],
    categories: [...categories, { id: uuid(60), label: 'Vecchia', icon: null }],
  };
  const plan = planImport(data, current, 'replace');
  assert.deepEqual(plan.removeExpenseIds.sort(), [uuid(2), uuid(3)]);
  assert.deepEqual(plan.addExpenses.map((e) => e.id), [uuid(2)]);
  assert.deepEqual(plan.removeCategoryIds, [uuid(60)]);
  assert.deepEqual([plan.sameExpenses, plan.sameCategories, plan.conflicts.length, plan.categoryTotal], [1, 1, 0, 1]);
  // A same-ID category with a different label is replaced, not merged.
  const renamed = planImport(data, { expenses: [], categories: [{ ...categories[0]!, label: 'Altro' }] }, 'replace');
  assert.deepEqual([renamed.removeCategoryIds, renamed.addCategories.length], [[categoryId], 1]);
});

test('anteprima: spese che puntano a categorie assenti sono segnalate', () => {
  const data = { expenses: [record, expense(2, { category_id: uuid(88) })], categories };
  assert.equal(planImport(data, { expenses: [], categories: [] }, 'merge').missingCategoryReferences, 1);
  assert.equal(planImport({ ...data, categories: [] }, { expenses: [], categories }, 'merge').missingCategoryReferences, 1);
  assert.equal(planImport({ ...data, categories: [] }, { expenses: [], categories }, 'replace').missingCategoryReferences, 2);
});

test('dati Firestore: chiave nome categoria, timestamp e revisioni invalidi rifiutati', () => {
  assert.equal(categoryNameKey('  CAFFÈ / tè % '), 'n-caffè %2F tè %25');
  assert.notEqual(categoryNameKey('/'), categoryNameKey('%2F'));
  assert.ok(parseSyncedExpense({ ...record, revision: 1, updated_at: record.created_at }));
  assert.equal(parseSyncedExpense(record), null);
  assert.equal(parseSyncedExpense({ ...record, revision: 0, updated_at: record.created_at }), null);
});
