import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportCsv, makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { parseExpenseRecord, parseExpenseRequest } from '../src/domain/contract.ts';
import { dataOf, newDraft, validateDraft } from '../src/domain/expense.ts';
import {
  displayMerchantName, isMerchantId, merchantKey, merchantNameError, normalizeMerchantName, parseMerchant, rankMerchants, resolveMerchant,
  suggestMerchants, type Merchant,
} from '../src/domain/merchant.ts';

const now = new Date('2026-11-16T10:00:00Z');
const today = '2026-11-16';
const category = { id: '11111111-1111-4111-8111-111111111111', label: 'Spesa', icon: null };
const draft = { ...newDraft(), amount: '12,50', description: 'Pane', categoryId: category.id };
const amazon: Merchant = { id: 'm-amazon', name: 'Amazon' };
const record = (id: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`, amount_minor: 1000, currency: 'EUR' as const, description: `Spesa ${id}`, category_id: null,
  expense_date: '2026-11-01', recurrence: null, price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app' as const,
  schema_version: 1 as const, created_at: '2026-11-01T10:00:00.000Z', ...extra,
});

test('esercenti: Amazon, amazon, AMAZON e spazi in più sono un unico esercente', () => {
  const spellings = ['amazon', 'AMAZON', 'Amazon', 'aMaZoN', '  AMAZON  ', 'Amazon '];
  assert.deepEqual(new Set(spellings.map(merchantKey)), new Set(['m-amazon']));
  assert.equal(normalizeMerchantName('  Bar   da\tMario \n'), 'Bar da Mario');
  assert.equal(merchantKey('Bar   da  Mario'), merchantKey('bar da mario'));
  // Different names stay different (accents included): no aggressive folding of the identity.
  assert.notEqual(merchantKey('Caffè'), merchantKey('Caffe'));
  // Characters that are not valid in a Firestore document ID are escaped.
  assert.equal(merchantKey('A/B 100%'), 'm-a%2Fb 100%25');
  assert.ok(isMerchantId(merchantKey('A/B 100%')));
  assert.equal(isMerchantId('amazon'), false);
  assert.equal(isMerchantId('m-'), false);
  assert.equal(isMerchantId('m-a/b'), false);
});

test('esercenti: nome mostrato con iniziale maiuscola senza rovinare le grafie particolari', () => {
  for (const typed of ['amazon', 'AMAZON', 'Amazon', '  AMAZON  ']) assert.equal(displayMerchantName(typed), 'Amazon');
  assert.equal(displayMerchantName('aMaZoN'), 'aMaZoN', 'mixed capitals are a deliberate spelling (as eBay)');
  assert.equal(displayMerchantName('eBay'), 'eBay');
  assert.equal(displayMerchantName("McDonald's"), "McDonald's");
  assert.equal(displayMerchantName('IKEA Bari'), 'IKEA Bari');
  assert.equal(displayMerchantName('burger king'), 'Burger King');
  assert.equal(displayMerchantName('BAR DA MARIO'), 'Bar da Mario');
  assert.equal(displayMerchantName("l'angolo del pane"), "L'Angolo del Pane");
  assert.equal(displayMerchantName('coop-italia'), 'Coop-Italia');
  assert.equal(displayMerchantName('a2a'), 'A2a');
});

test('esercenti: risoluzione al salvataggio — nessuno, esistente con qualsiasi grafia, nuovo', () => {
  assert.deepEqual(resolveMerchant('', [amazon]), { merchant_id: null, create: null });
  assert.deepEqual(resolveMerchant('   ', [amazon]), { merchant_id: null, create: null });
  for (const typed of ['amazon', 'AMAZON', ' Amazon ']) assert.deepEqual(resolveMerchant(typed, [amazon]), { merchant_id: 'm-amazon', create: null });
  // An existing custom spelling is kept: the merchant is reused, not renamed.
  assert.deepEqual(resolveMerchant('EBAY', [{ id: 'm-ebay', name: 'eBay' }]), { merchant_id: 'm-ebay', create: null });
  assert.deepEqual(resolveMerchant('  esselunga ', [amazon]), { merchant_id: 'm-esselunga', create: { id: 'm-esselunga', name: 'Esselunga' } });
});

test('esercenti: lettura dei record salvati rigorosa', () => {
  assert.deepEqual(parseMerchant({ id: 'm-amazon', name: 'Amazon' }), amazon);
  assert.equal(parseMerchant({ id: 'm-amazon', name: 'Ebay' }), null, 'ID must be the key of the name');
  assert.equal(parseMerchant({ id: 'm-amazon', name: ' Amazon' }), null);
  assert.equal(parseMerchant({ id: 'm-', name: '' }), null);
  assert.equal(parseMerchant({ id: merchantKey('a'.repeat(61)), name: 'a'.repeat(61) }), null);
  assert.ok(parseMerchant({ id: merchantKey('😀'.repeat(60)), name: '😀'.repeat(60) }));
  assert.equal(merchantNameError('a'.repeat(61)), 'Usa al massimo 60 caratteri.');
  assert.equal(merchantNameError(''), null);
});

test('modulo: l’esercente è facoltativo e non blocca mai il salvataggio', () => {
  const none = validateDraft(draft, [category], now);
  assert.ok(none.ok);
  if (none.ok) { assert.equal('merchant_id' in none.data, false); assert.equal(none.merchant, null); }
  const fresh = validateDraft({ ...draft, merchant: ' AMAZON ' }, [category], now, [], []);
  assert.ok(fresh.ok);
  if (fresh.ok) { assert.equal(fresh.data.merchant_id, 'm-amazon'); assert.deepEqual(fresh.merchant, amazon); }
  const existing = validateDraft({ ...draft, merchant: 'amazon' }, [category], now, [], [amazon]);
  assert.ok(existing.ok);
  if (existing.ok) { assert.equal(existing.data.merchant_id, 'm-amazon'); assert.equal(existing.merchant, null, 'an existing merchant is not created again'); }
  const long = validateDraft({ ...draft, merchant: 'x'.repeat(61) }, [category], now);
  assert.equal(long.ok, false);
  if (!long.ok) assert.ok(long.errors.merchant);
});

test('contratto: merchant_id facoltativo, solo con la forma di un ID esercente; dataOf lo conserva o lo toglie', () => {
  const request = { ...record(1), expense_id: record(1).id };
  const { id, created_at, ...plain } = request;
  void id; void created_at;
  assert.ok(parseExpenseRequest(plain, now));
  assert.ok(parseExpenseRequest({ ...plain, merchant_id: 'm-amazon' }, now));
  assert.ok(parseExpenseRequest({ ...plain, merchant_id: null }, now));
  assert.equal(parseExpenseRequest({ ...plain, merchant_id: 'amazon' }, now), null);
  assert.equal(parseExpenseRequest({ ...plain, merchant_id: '' }, now), null);
  // Records saved before merchants existed have no field and read as "no merchant".
  assert.equal(parseExpenseRecord(record(1))!.merchant_id, undefined);
  assert.equal(parseExpenseRecord(record(1, { merchant_id: 'm-amazon' }))!.merchant_id, 'm-amazon');
  assert.equal(dataOf(parseExpenseRecord(record(1, { merchant_id: 'm-amazon' }))!).merchant_id, 'm-amazon');
  assert.equal('merchant_id' in dataOf(parseExpenseRecord(record(1, { merchant_id: null }))!), false);
});

test('suggerimenti: frequenza e recenza insieme, l’abitudine recente batte quella vecchia', () => {
  const merchants: Merchant[] = [{ id: 'm-esselunga', name: 'Esselunga' }, { id: 'm-eurospin', name: 'Eurospin' }, { id: 'm-ebay', name: 'eBay' }, { id: 'm-edicola', name: 'Edicola' }];
  const uses = [
    // Esselunga: ten times, but more than two years ago.
    ...Array.from({ length: 10 }, (_, i) => ({ merchant_id: 'm-esselunga', expense_date: `2024-0${(i % 9) + 1}-10` })),
    // Eurospin: three times in the last weeks.
    { merchant_id: 'm-eurospin', expense_date: '2026-11-14' }, { merchant_id: 'm-eurospin', expense_date: '2026-11-07' }, { merchant_id: 'm-eurospin', expense_date: '2026-10-30' },
    // eBay: once, yesterday.
    { merchant_id: 'm-ebay', expense_date: '2026-11-15' },
    // Unknown merchant or none: ignored.
    { merchant_id: 'm-missing', expense_date: '2026-11-15' }, { merchant_id: null, expense_date: '2026-11-15' }, { expense_date: '2026-11-15' },
  ];
  const ranked = rankMerchants(merchants, uses, today);
  assert.deepEqual(ranked.map((m) => m.id), ['m-eurospin', 'm-ebay', 'm-esselunga', 'm-edicola']);
  assert.deepEqual(ranked.map((m) => m.uses), [3, 1, 10, 0]);
  assert.equal(ranked[0]!.lastUsed, '2026-11-14');
  assert.equal(ranked[3]!.lastUsed, null);
  // Frequency counts among recent uses: four uses this month beat one use today.
  const frequent = rankMerchants([{ id: 'm-a', name: 'A' }, { id: 'm-b', name: 'B' }],
    [{ merchant_id: 'm-b', expense_date: today }, ...['2026-11-02', '2026-11-05', '2026-11-09', '2026-11-12'].map((d) => ({ merchant_id: 'm-a', expense_date: d }))], today);
  assert.equal(frequent[0]!.id, 'm-a');
});

test('suggerimenti durante la digitazione: prefisso, parola, contenuto; esercente già scritto non riproposto', () => {
  const ranked = rankMerchants([{ id: 'm-esselunga', name: 'Esselunga' }, { id: 'm-eurospin', name: 'Eurospin' }, { id: merchantKey('Bar Centrale'), name: 'Bar Centrale' },
    { id: merchantKey('Caffè Roma'), name: 'Caffè Roma' }, amazon],
  [{ merchant_id: 'm-eurospin', expense_date: '2026-11-10' }, { merchant_id: 'm-esselunga', expense_date: '2026-01-10' }], today);
  assert.deepEqual(suggestMerchants(ranked, ''), []);
  assert.deepEqual(suggestMerchants(ranked, '   '), []);
  // Most used first among the matches.
  assert.deepEqual(suggestMerchants(ranked, 'e').map((m) => m.name), ['Eurospin', 'Esselunga']);
  assert.deepEqual(suggestMerchants(ranked, 'ES').map((m) => m.name), ['Esselunga']);
  // Start of any word, any capitals, accents optional.
  assert.deepEqual(suggestMerchants(ranked, 'centr').map((m) => m.name), ['Bar Centrale']);
  assert.deepEqual(suggestMerchants(ranked, 'caffe').map((m) => m.name), ['Caffè Roma']);
  // Inside a word only from three characters on.
  assert.deepEqual(suggestMerchants(ranked, 'az').map((m) => m.name), []);
  assert.deepEqual(suggestMerchants(ranked, 'maz').map((m) => m.name), ['Amazon']);
  // Already written exactly (any capitals): nothing more to propose; no match: free text.
  assert.deepEqual(suggestMerchants(ranked, 'AMAZON'), []);
  assert.deepEqual(suggestMerchants(ranked, 'Libreria'), []);
  assert.equal(suggestMerchants(ranked, 'e', 1).length, 1);
});

test('backup v10: esercenti e merchant_id in andata e ritorno; riferimenti mancanti e file precedenti rifiutati', () => {
  const expenses = [parseExpenseRecord(record(1, { merchant_id: 'm-amazon' }))!, parseExpenseRecord(record(2))!];
  const json = makeBackup({ expenses, categories: [], merchants: [amazon] }, now);
  const file = JSON.parse(json);
  assert.equal(file.version, 11);
  assert.deepEqual(file.merchants, [{ id: 'm-amazon', name: 'Amazon' }]);
  assert.equal(file.expenses.find((e: { id: string }) => e.id === expenses[0]!.id).merchant_id, 'm-amazon');
  assert.equal('merchant_id' in file.expenses.find((e: { id: string }) => e.id === expenses[1]!.id), false);
  const restored = parseBackup(file);
  assert.deepEqual(restored.merchants, [amazon]);
  assert.equal(makeBackup(restored, now), json);
  // No merchants: the key is absent, as in the files of version 9.
  assert.equal('merchants' in JSON.parse(makeBackup({ expenses: [expenses[1]!], categories: [] })), false);
  assert.throws(() => parseBackup({ ...file, merchants: [] }), /esercente mancante/);
  assert.throws(() => parseBackup({ ...file, merchants: [amazon, { id: 'm-amazon', name: 'AMAZON' }] }), /non validi o duplicati/);
  assert.throws(() => parseBackup({ ...file, merchants: [{ id: 'm-x', name: 'Amazon' }] }), /non validi o duplicati/);
  assert.throws(() => parseBackup({ ...file, version: 9 }), /versione 10/);
});

test('importazione: lo stesso esercente nel file e nell’archivio non è mai un conflitto', () => {
  const saved = [{ id: 'm-ebay', name: 'eBay' }, amazon];
  const fileMerchants = [{ id: 'm-ebay', name: 'Ebay' }, { id: 'm-coop', name: 'Coop' }];
  const merge = planImport({ expenses: [], categories: [], merchants: fileMerchants }, { expenses: [], categories: [], merchants: saved }, 'merge');
  assert.deepEqual(merge.addMerchants, [{ id: 'm-coop', name: 'Coop' }], 'merge keeps the saved spelling');
  assert.equal(merge.sameMerchants, 1);
  assert.deepEqual(merge.removeMerchantIds, []);
  assert.equal(merge.conflicts.length, 0);
  const replace = planImport({ expenses: [], categories: [], merchants: fileMerchants }, { expenses: [], categories: [], merchants: saved }, 'replace');
  assert.deepEqual(replace.addMerchants, fileMerchants, 'replace makes the archive equal to the file');
  assert.deepEqual(replace.removeMerchantIds, ['m-amazon']);
  // An expense whose only difference is the merchant is a different expense.
  const a = parseExpenseRecord(record(1, { merchant_id: 'm-amazon' }))!;
  const b = parseExpenseRecord(record(1))!;
  assert.equal(planImport({ expenses: [a], categories: [] }, { expenses: [b], categories: [] }, 'merge').conflicts.length, 1);
  assert.equal(planImport({ expenses: [b], categories: [] }, { expenses: [parseExpenseRecord(record(1, { merchant_id: null }))!], categories: [] }, 'merge').sameExpenses, 1);
});

test('CSV: colonna «Esercente» in fondo, vuota senza esercente', () => {
  const csv = exportCsv([parseExpenseRecord(record(1, { merchant_id: 'm-amazon' }))!, parseExpenseRecord(record(2, { expense_date: '2026-11-02' }))!], [], today, [], [amazon]);
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines[0], 'Data;Descrizione;Categoria;Importo;Valuta;Ricorrenza;Fondo;Esercente');
  assert.ok(lines[1]!.endsWith(';"Amazon"'));
  assert.ok(lines[2]!.endsWith(';""'));
});
