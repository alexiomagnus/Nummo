import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listExpenses, RowCollisionError, submitExpense } from '../src/expenses.ts';
import { authorize } from '../src/authorize.ts';
import { fromRow, toRow } from '../src/sheetRow.ts';
import { memoryLedger, memorySheet } from './fakes.ts';

const now = new Date('2026-11-02T10:00:00.000Z');
const uid = 'owner-uid';
const request = {
  expense_id: '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13', amount_minor: 1250, currency: 'EUR', description: 'Pane e latte',
  category_id: null, expense_date: '2026-11-02', recurrence: null, source: 'web_app', schema_version: 1,
};
function setup() {
  const ledger = memoryLedger();
  const sheet = memorySheet();
  return { ledger, sheet, deps: { ledger, sheet, now: () => now } };
}

test('una richiesta valida produce una sola riga con i valori corretti', async () => {
  const { sheet, deps } = setup();
  const result = await submitExpense(deps, uid, request);
  assert.deepEqual(result, { ok: true, receipt: { expense_id: request.expense_id, created_at: now.toISOString() } });
  assert.deepEqual(sheet.rows.get(2), [
    request.expense_id, '2026-11-02', 1250, 'EUR', 'Pane e latte', '', '', now.toISOString(), 'web_app', 1,
  ]);
  assert.equal(sheet.rows.size, 1);
});

test('nuovo tentativo e invii concorrenti con lo stesso ID non duplicano la riga', async () => {
  const { sheet, deps } = setup();
  const results = await Promise.all(Array.from({ length: 5 }, () => submitExpense(deps, uid, request)));
  const again = await submitExpense(deps, uid, { ...request });
  for (const result of [...results, again]) assert.equal(result.ok && result.receipt.expense_id, request.expense_id);
  assert.equal(sheet.rows.size, 1);
});

test('stesso ID con dati diversi: conflitto, riga originale intatta', async () => {
  const { sheet, deps } = setup();
  await submitExpense(deps, uid, request);
  const result = await submitExpense(deps, uid, { ...request, amount_minor: 999 });
  assert.equal(!result.ok && result.code, 'already-exists');
  assert.equal(sheet.rows.get(2)?.[2], 1250);
  // Another account reusing the ID is a conflict too.
  const other = await submitExpense(deps, 'someone-else', request);
  assert.equal(!other.ok && other.code, 'already-exists');
});

test('crash dopo la scrittura: il recupero conferma senza aggiungere righe', async () => {
  const { ledger, sheet, deps } = setup();
  ledger.failMarkOnce = true;
  await assert.rejects(submitExpense(deps, uid, request), /crash simulato/);
  const retry = await submitExpense(deps, uid, request);
  assert.equal(retry.ok, true);
  assert.equal(sheet.rows.size, 1);
  assert.equal(sheet.writes, 1, 'la riga già corretta non viene riscritta');
});

test('scrittura fallita: il nuovo tentativo usa la stessa riga', async () => {
  const { sheet, deps } = setup();
  sheet.failNextWrite = true;
  await assert.rejects(submitExpense(deps, uid, request), /timeout/);
  assert.equal((await submitExpense(deps, uid, request)).ok, true);
  assert.deepEqual([...sheet.rows.keys()], [2]);
  const second = await submitExpense(deps, uid, { ...request, expense_id: 'aa1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13' });
  assert.equal(second.ok, true);
  assert.deepEqual([...sheet.rows.keys()], [2, 3]);
});

test('riga riservata occupata da un altro ID: nessuna sovrascrittura', async () => {
  const { sheet, deps } = setup();
  sheet.rows.set(2, ['inserita-a-mano', '2026-01-01']);
  await assert.rejects(submitExpense(deps, uid, request), RowCollisionError);
  assert.deepEqual(sheet.rows.get(2), ['inserita-a-mano', '2026-01-01']);
});

const invalid: [string, unknown][] = [
  ['non oggetto', 'x'],
  ['campo in più', { ...request, owner: 'x' }],
  ['campo mancante', { ...request, recurrence: undefined }],
  ['importo decimale', { ...request, amount_minor: 12.5 }],
  ['importo come testo', { ...request, amount_minor: '1250' }],
  ['importo oltre il massimo', { ...request, amount_minor: 10_000_000 }],
  ['data futura', { ...request, expense_date: '2026-11-03' }],
  ['data inesistente', { ...request, expense_date: '2026-02-30' }],
  ['ID non UUID', { ...request, expense_id: '1' }],
  ['categoria non UUID', { ...request, category_id: '=A1' }],
  ['nome non normalizzato', { ...request, description: '  Pane ' }],
  ['valuta diversa', { ...request, currency: 'USD' }],
];
for (const [name, payload] of invalid) {
  test(`richiesta rifiutata senza scrittura: ${name}`, async () => {
    const { ledger, sheet, deps } = setup();
    const result = await submitExpense(deps, uid, payload);
    assert.equal(!result.ok && result.code, 'invalid-argument');
    assert.equal(ledger.operations.size + sheet.rows.size, 0);
  });
}

test('un nome che sembra una formula resta testo', async () => {
  const { sheet, deps } = setup();
  await submitExpense(deps, uid, { ...request, description: '=IMPORTXML("http://x")' });
  assert.equal(sheet.rows.get(2)?.[4], '=IMPORTXML("http://x")');
});

test('elenco: righe vuote saltate, righe non valide contate, andata e ritorno esatti', async () => {
  const { sheet, deps } = setup();
  const second = { ...request, expense_id: 'bb1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13', recurrence: 'monthly', category_id: 'cc1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13' };
  await submitExpense(deps, uid, request);
  await submitExpense(deps, uid, second);
  sheet.rows.set(5, ['rotta', 'non-data']); // row 4 stays blank, like a reserved row never written
  const list = await listExpenses({ sheet });
  assert.equal(list.invalid_rows, 1);
  assert.deepEqual(list.expenses.map((e) => [e.id, e.recurrence, e.category_id]), [
    [request.expense_id, null, null],
    [second.expense_id, 'monthly', second.category_id],
  ]);
  const record = list.expenses[0]!;
  assert.deepEqual(fromRow(toRow(record)), record);
});

test('autorizzazione: solo l’UID configurato con accesso Google', () => {
  const google = { firebase: { sign_in_provider: 'google.com' } };
  assert.equal(authorize(undefined, uid), 'unauthenticated');
  assert.equal(authorize({ uid, token: google }, uid), 'ok');
  assert.equal(authorize({ uid: 'altro', token: google }, uid), 'permission-denied');
  assert.equal(authorize({ uid, token: { firebase: { sign_in_provider: 'anonymous' } } }, uid), 'permission-denied');
  assert.equal(authorize({ uid: '', token: google }, ''), 'permission-denied');
});
