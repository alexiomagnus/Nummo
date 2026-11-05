import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUtcTimestamp, parseExpenseRequest } from '../src/domain/contract.ts';

const now = new Date('2026-11-02T23:30:00.000Z'); // 00:30 on 3 November in Rome (UTC+1)
const id = '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13';
const request = {
  expense_id: id, amount_minor: 1250, currency: 'EUR', description: 'Pane', category_id: null,
  expense_date: '2026-11-03', recurrence: 'weekly', price_changes: [], source: 'web_app', schema_version: 1,
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

test('timestamp: solo UTC canonico', () => {
  assert.equal(isUtcTimestamp('2026-11-02T10:00:00.000Z'), true);
  assert.equal(isUtcTimestamp('2026-11-02T11:00:00+01:00'), false);
  assert.equal(isUtcTimestamp('2026-02-30T10:00:00Z'), false);
});
