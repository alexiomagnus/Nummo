import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseExpenseList, parseExpenseRequest, parseReceipt } from '../src/domain/contract.ts';
import { isDefinitiveRejection } from '../src/domain/submission.ts';

const now = new Date('2026-11-02T23:30:00.000Z'); // 00:30 on 3 November in Rome (UTC+1)
const id = '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13';
const request = {
  expense_id: id, amount_minor: 1250, currency: 'EUR', description: 'Pane', category_id: null,
  expense_date: '2026-11-03', recurrence: 'weekly', source: 'web_app', schema_version: 1,
};

test('richiesta valida: oggi è calcolato a Roma', () => {
  assert.deepEqual(parseExpenseRequest(request, now), request);
  assert.equal(parseExpenseRequest({ ...request, expense_date: '2026-11-04' }, now), null);
});

test('richiesta con campi in più, mancanti o maiuscole nell’UUID: rifiutata', () => {
  assert.equal(parseExpenseRequest({ ...request, uid: 'x' }, now), null);
  const { recurrence: _, ...missing } = request;
  assert.equal(parseExpenseRequest(missing, now), null);
  assert.equal(parseExpenseRequest({ ...request, expense_id: id.toUpperCase() }, now), null);
  assert.equal(parseExpenseRequest([request], now), null);
});

test('conferma: solo UUID e timestamp UTC canonico', () => {
  assert.deepEqual(parseReceipt({ expense_id: id, created_at: '2026-11-02T10:00:00.000Z' }),
    { expense_id: id, created_at: '2026-11-02T10:00:00.000Z' });
  assert.equal(parseReceipt({ expense_id: id, created_at: '2026-11-02T11:00:00+01:00' }), null);
  assert.equal(parseReceipt({ expense_id: 'x', created_at: '2026-11-02T10:00:00Z' }), null);
});

test('elenco dal backend: un solo elemento non valido invalida la risposta', () => {
  const record = { ...request, id, created_at: '2026-11-02T10:00:00.000Z' };
  const { expense_id: _, ...stored } = record;
  assert.equal(parseExpenseList({ expenses: [stored], invalid_rows: 0 })?.expenses.length, 1);
  assert.equal(parseExpenseList({ expenses: [stored, { ...stored, amount_minor: -1 }], invalid_rows: 0 }), null);
  assert.equal(parseExpenseList({ expenses: [], invalid_rows: -1 }), null);
});

test('solo i rifiuti che escludono la scrittura sbloccano il modulo', () => {
  for (const code of ['functions/invalid-argument', 'functions/already-exists', 'functions/permission-denied', 'functions/unauthenticated']) {
    assert.equal(isDefinitiveRejection(code), true, code);
  }
  for (const code of ['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal', 'unknown']) {
    assert.equal(isDefinitiveRejection(code), false, code);
  }
});
