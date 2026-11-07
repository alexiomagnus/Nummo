import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportCsv, makeBackup, parseCsvImport, parseImport } from '../src/domain/backup.ts';
import { categoryNameKey, parseSyncedExpense } from '../src/domain/firestore.ts';
const id = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const record = { id, amount_minor: 1250, currency: 'EUR' as const, description: 'Caffè "buono", sì', category_id: categoryId,
  expense_date: '2025-01-31', recurrence: 'monthly' as const, price_changes: [], source: 'web_app' as const, schema_version: 1 as const, created_at: '2025-01-31T12:00:00.000Z' };
const categories = [{ id: categoryId, label: 'Caffè', icon: null }];
test('JSON completo conserva ID, centesimi, date, ricorrenze, categorie e metadati; round trip importabile', () => {
  const expenses = [{ ...record, revision: 3, updated_at: record.created_at }];
  const backup = makeBackup({ expenses, categories }, { project_id: 'personal', uid: 'owner' });
  assert.equal(JSON.parse(backup).expenses[0].revision, 3);
  assert.deepEqual(parseImport(JSON.parse(backup)), { expenses: [record], categories });
});
test('CSV UTF-8 BOM, CRLF, quote, centesimi e occorrenze calcolate', () => {
  const csv = exportCsv([record], categories, '2025-02-28');
  assert.ok(csv.startsWith('\uFEFFoccurrence_id'));
  assert.ok(csv.includes('"Caffè ""buono"", sì"'));
  assert.ok(csv.includes('"12.50","1250","EUR"'));
  assert.equal(csv.split('\r\n').length, 4);
  assert.ok(csv.includes('2025-02-28'));
  assert.ok(!csv.includes('2025-03-31'));
});
test('CSV neutralizza formule, anche precedute da whitespace o controlli', () => {
  for (const text of ['=1+1', '+cmd', '-formula', '@SUM(A1)', ' \t=HYPERLINK("x")', '\r@foo']) {
    const csv = exportCsv([{ ...record, description: text, recurrence: null }], [{ ...categories[0]!, label: text }], '2025-02-28');
    assert.ok(csv.includes(`"'${text.replaceAll('"', '""')}"`));
  }
});
test('importazione rifiuta duplicati, dati corrotti, date future e UUID non migrabili senza modificare gli originali', () => {
  const value = { format: 'nummo-backup', version: 1, expenses: [record], categories };
  for (const invalid of [null, { ...value, version: 2 }, { ...value, expenses: [record, record] },
    { ...value, categories: [categories[0], categories[0]] }, { ...value, expenses: [{ ...record, amount_minor: 1.2 }] },
    { ...value, expenses: [{ ...record, id: 'old-unmapped-id' }] }, { ...value, expenses: [{ ...record, expense_date: '2099-01-01' }] },
    { ...value, expenses: [{ ...record, created_at: 'tomorrow' }] }]) assert.throws(() => parseImport(invalid));
  assert.equal(value.expenses[0], record);
});
test('chiave nome categoria distingue slash e percentuali, normalizza caso e spazi', () => {
  assert.equal(categoryNameKey('  CAFFÈ / tè % '), 'n-caffè %2F tè %25');
  assert.notEqual(categoryNameKey('/'), categoryNameKey('%2F'));
});
test('record Firestore con timestamp o revisione invalidi viene rifiutato', () => {
  assert.ok(parseSyncedExpense({ ...record, revision: 1, updated_at: record.created_at }));
  assert.equal(parseSyncedExpense(record), null);
  assert.equal(parseSyncedExpense({ ...record, revision: 0, updated_at: record.created_at }), null);
});

test('CSV ripristina serie, prezzi futuri, categorie e testi protetti senza moltiplicare le occorrenze', () => {
  const expenses = [{ ...record, description: '=caffè, "speciale"', price_changes: [
    { index: 1, amount_minor: 900, once: true }, { index: 5, amount_minor: 2000, once: false },
  ] }];
  const cats = [{ ...categories[0]!, label: "'=Nome", icon: 'coffee' as const }];
  const csv = exportCsv(expenses, cats, '2025-03-31');
  const restored = parseCsvImport(csv);
  assert.deepEqual(restored, { expenses, categories: cats });
  assert.equal(restored.expenses.length, 1);
  assert.deepEqual(parseCsvImport(csv.replaceAll('\r\n', '\n')), restored);
});
test('CSV conserva apostrofi e riferimenti a categorie eliminate; nessuna categoria inventata', () => {
  const expenses = [{ ...record, description: "'=originale", recurrence: null }];
  assert.deepEqual(parseCsvImport(exportCsv(expenses, [], '2025-02-28')), { expenses, categories: [] });
});
test('CSV rifiuta righe duplicate, campi alterati, JSON corrotto e sintassi malformata', () => {
  const csv = exportCsv([{ ...record, recurrence: null }], categories, '2025-02-28');
  const lines = csv.split('\r\n');
  for (const invalid of [csv + lines[1] + '\r\n', csv.replace('"12.50"', '"99.99"'),
    csv.replace('"1250"', '"1.2"'), csv.replace('"EUR"', '"USD"'),
    csv.replace('expense_data', 'other'), csv.replace('""amount_minor"":1250', '""amount_minor"":0'),
    csv.slice(0, -5), 'expense_id,amount\na,1', csv.replace('occurrence_id', 'expense_id'),
    csv.replace('"Caffè ""buono"", sì"', '"Caffè"extra'), csv.replace('"12.50",', '')]) {
    assert.throws(() => parseCsvImport(invalid), `Doveva rifiutare: ${invalid.slice(0, 180)}`);
  }
});
test('vecchio CSV: spese singole importabili, serie o testi protetti richiedono nuovo export o JSON', () => {
  const legacy = (csv: string) => csv.split('\r\n').map((line, index) => index === 0 ? line.split(',').slice(0, 11).join(',') : line.split(',"{')[0]).join('\r\n');
  const single = { ...record, description: 'Pane', recurrence: null };
  assert.deepEqual(parseCsvImport(legacy(exportCsv([single], categories, '2025-02-28'))), { expenses: [single], categories });
  assert.throws(() => parseCsvImport(legacy(exportCsv([record], categories, '2025-02-28'))), /vecchio CSV/);
  assert.throws(() => parseCsvImport(legacy(exportCsv([{ ...single, description: '=test' }], categories))), /vecchio CSV/);
});
