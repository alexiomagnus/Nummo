import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import type { ExpenseRecord } from '../src/domain/contract.ts';
import { parseScannedReceipt, receiptFromScan, sortScannedReceipts, type ScannedReceipt } from '../src/domain/scannedReceipt.ts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const receipt = (over: Partial<ScannedReceipt> = {}): ScannedReceipt => ({ id: id(1), merchant: 'Conad', total_minor: 2475, date: '2026-11-20',
  items: ['Latte', 'Pane'], discount_minor: null, provider: 'claude', created_at: '2026-11-20T10:00:00.000Z', ...over });
const expense = (n: number): ExpenseRecord => ({ id: id(n), amount_minor: 2475, currency: 'EUR', description: 'Spesa', category_id: null, expense_date: '2026-11-20',
  recurrence: null, price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app', schema_version: 1,
  created_at: '2026-11-20T10:00:00.000Z' });

test('scontrino: dati validati come alla scansione, valori non letti ammessi', () => {
  assert.deepEqual(parseScannedReceipt(receipt()), receipt());
  assert.ok(parseScannedReceipt(receipt({ merchant: null, total_minor: null, date: null, items: [] })));
  for (const bad of [{ merchant: '' }, { merchant: 'A  B' }, { merchant: 'x'.repeat(61) }, { total_minor: 0 }, { total_minor: 1.5 }, { date: '2026-02-30' },
    { items: [''] }, { items: ['a\nb'] }, { items: [' Latte'] }, { items: Array(501).fill('a') }, { discount_minor: -1 }, { provider: 'compatible' }]) {
    assert.equal(parseScannedReceipt({ ...receipt(), ...bad }), null, JSON.stringify(bad));
  }
  assert.equal(parseScannedReceipt({ ...receipt(), id: 'x' }), null);
});

test('scontrino dalla revisione: esercente, totale e data come rivisti, prodotti e sconto come letti; non utilizzabili = null', () => {
  const read = { items: [' Latte  intero ', '', 'x'.repeat(70)], discountMinor: 120 };
  const kept = receiptFromScan({ merchant: '  Spazio   Conad ', amount: '24,75', date: '2026-11-20' }, read, 'gemini');
  assert.deepEqual(kept, { merchant: 'Spazio Conad', total_minor: 2475, date: '2026-11-20', items: ['Latte intero', 'x'.repeat(60)], discount_minor: 120, provider: 'gemini' });
  const empty = receiptFromScan({ merchant: '', amount: 'abc', date: '2026-13-01' }, { items: [], discountMinor: null }, 'openai');
  assert.deepEqual([empty.merchant, empty.total_minor, empty.date, empty.items], [null, null, null, []]);
});

test('scontrini: più recenti prima, per data dello scontrino o del salvataggio', () => {
  const a = receipt({ id: id(1), date: '2026-11-01' });
  const b = receipt({ id: id(2), date: null, created_at: '2026-11-10T08:00:00.000Z' });
  const c = receipt({ id: id(3), date: '2026-11-15' });
  assert.deepEqual(sortScannedReceipts([a, b, c]).map((r) => r.id), [id(3), id(2), id(1)]);
});

test('backup v12: scontrini con la loro spesa, rifiutati senza o nei file precedenti; piano di importazione', () => {
  const file = JSON.parse(makeBackup({ expenses: [expense(1), expense(2)], categories: [], receipts: [receipt()] }));
  assert.equal(file.version, 12);
  assert.deepEqual(parseBackup(file).receipts, [receipt()]);
  // A receipt left without its expense is not exported (it would make the file invalid).
  assert.deepEqual(JSON.parse(makeBackup({ expenses: [expense(2)], categories: [], receipts: [receipt()] })).receipts, undefined);
  // Without receipts the field is absent.
  assert.ok(!('receipts' in JSON.parse(makeBackup({ expenses: [expense(1)], categories: [] }))));
  assert.throws(() => parseBackup({ ...file, expenses: [file.expenses[1]] }), /senza la loro spesa/);
  assert.throws(() => parseBackup({ ...file, receipts: [file.receipts[0], file.receipts[0]] }), /non validi o duplicati/);
  assert.throws(() => parseBackup({ ...file, version: 11 }), /versione 12/);
  const data = parseBackup(file);
  const current = { expenses: [expense(1), expense(2)], categories: [], receipts: [receipt({ merchant: 'Coop' })] };
  assert.deepEqual(planImport(data, current, 'merge').conflicts.map((c) => [c.kind, c.label]), [['receipt', 'Conad']]);
  const replace = planImport(data, current, 'replace');
  assert.deepEqual([replace.removeReceiptIds, replace.addReceipts.length], [[id(1)], 1]);
  const same = planImport(data, { ...current, receipts: [receipt()] }, 'merge');
  assert.deepEqual([same.sameReceipts, same.addReceipts.length, same.conflicts.length], [1, 0, 0]);
});
