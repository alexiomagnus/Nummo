import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ExpenseRequest } from '../src/domain/expense.ts';
import { submissionReducer as reduce, type Submission } from '../src/domain/submission.ts';

const request: ExpenseRequest = {
  expense_id: 'b0c59cdd-a69d-467c-a17f-d07c2444f716', amount_minor: 1200,
  currency: 'EUR', category_id: 'groceries', expense_date: '2026-11-02',
  description: 'Spesa', recurrence: null, price_changes: [], status_changes: [], source: 'web_app', schema_version: 1,
};
const sending = (): Submission => reduce({ status: 'draft' }, { type: 'send', request });

test('il doppio invio è ignorato e i dati inviati sono una copia immutabile', () => {
  const state = sending();
  assert.equal(reduce(state, { type: 'send', request: { ...request, amount_minor: 999 } }), state);
  if (state.status === 'sending') {
    assert.notEqual(state.request, request);
    assert.equal(Object.isFrozen(state.request), true);
  }
});
test('timeout blocca nuove spese e retry riusa esattamente identificativo e dati', () => {
  const uncertain = reduce(sending(), { type: 'uncertain' });
  assert.equal(uncertain.status, 'uncertain');
  assert.equal(reduce(uncertain, { type: 'new-draft' }), uncertain);
  assert.equal(reduce(uncertain, { type: 'send', request: { ...request, expense_id: 'new' } }), uncertain);
  const retry = reduce(uncertain, { type: 'retry' });
  assert.equal(retry.status, 'sending');
  if (retry.status === 'sending' && uncertain.status === 'uncertain') assert.equal(retry.request, uncertain.request);
});
test('una risposta per una spesa diversa non conferma il salvataggio', () => {
  assert.equal(reduce(sending(), { type: 'confirmed', receipt: { expense_id: 'other', created_at: '2026-11-02T12:00:00Z' } }).status, 'uncertain');
});
test('una conferma valida permette una nuova bozza', () => {
  const state = reduce(sending(), { type: 'confirmed', receipt: { expense_id: request.expense_id, created_at: '2026-11-02T12:00:00.000Z' } });
  assert.equal(state.status, 'confirmed');
  assert.deepEqual(reduce(state, { type: 'new-draft' }), { status: 'draft' });
});
test('un esito incerto può essere riconciliato con una conferma valida', () => {
  const state = reduce(reduce(sending(), { type: 'uncertain' }), {
    type: 'confirmed', receipt: { expense_id: request.expense_id, created_at: '2026-11-02T12:00:00Z' },
  });
  assert.equal(state.status, 'confirmed');
});
for (const created_at of ['', 'yesterday', '2026-02-30T00:00:00Z', '2026-11-02', '2026-11-02T12:00:00+01:00']) {
  test(`conferma incompleta o timestamp invalido: ${created_at}`, () => {
    assert.equal(reduce(sending(), { type: 'confirmed', receipt: { expense_id: request.expense_id, created_at } }).status, 'uncertain');
  });
}
test('dopo rifiuto definitivo la correzione richiede un nuovo ID', () => {
  const rejected = reduce(sending(), { type: 'rejected', message: 'Categoria non ammessa' });
  assert.equal(rejected.status, 'rejected');
  assert.equal(reduce(rejected, { type: 'send', request }), rejected);
  assert.equal(reduce(rejected, { type: 'send', request: { ...request, expense_id: 'new-id' } }).status, 'sending');
});
test('un evento tardivo non altera una bozza', () => {
  assert.deepEqual(reduce({ status: 'draft' }, { type: 'rejected', message: 'late' }), { status: 'draft' });
});
