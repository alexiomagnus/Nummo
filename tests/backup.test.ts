import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportCsv, makeBackup, parseImport } from '../src/domain/backup.ts';
import { categoryNameKey, parseSyncedExpense } from '../src/domain/firestore.ts';
const id = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const record = { id, amount_minor: 1250, currency: 'EUR' as const, description: 'Caffè "buono", sì', category_id: categoryId,
  expense_date: '2025-01-31', recurrence: 'monthly' as const, source: 'web_app' as const, schema_version: 1 as const, created_at: '2025-01-31T12:00:00.000Z' };
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
