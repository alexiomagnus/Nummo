import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRecurring } from '../src/domain/recurring.ts';
import { readRecurring, recurringStorageKey, removeRecurring, storeRecurring } from '../src/services/recurringStorage.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}
const valid = { amount: '9,99', description: '  Abbonamento   musica ', recurrence: 'monthly' } as const;

test('spesa ricorrente valida normalizzata in centesimi', () => {
  assert.deepEqual(validateRecurring(valid), {
    ok: true, data: { amount_minor: 999, description: 'Abbonamento musica', recurrence: 'monthly' },
  });
});
for (const recurrence of ['weekly', 'monthly', 'yearly'] as const) {
  test(`ricorrenza ammessa: ${recurrence}`, () => assert.equal(validateRecurring({ ...valid, recurrence }).ok, true));
}
test('campi obbligatori e limiti', () => {
  const result = validateRecurring({ amount: '1,001', description: ' ', recurrence: '' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.deepEqual(Object.keys(result.errors).sort(), ['amount', 'description', 'recurrence']);
  assert.equal(validateRecurring({ ...valid, description: 'a'.repeat(101) }).ok, false);
  assert.equal(validateRecurring({ ...valid, description: 'a'.repeat(100) }).ok, true);
  assert.equal(validateRecurring({ ...valid, recurrence: 'daily' as never }).ok, false);
});
test('salvataggio, rilettura ed eliminazione', () => {
  const storage = memoryStorage();
  assert.deepEqual(readRecurring(storage), []);
  const result = validateRecurring(valid);
  assert.ok(result.ok);
  if (!result.ok) return;
  storeRecurring(storage, result.data, () => 'a');
  storeRecurring(storage, { ...result.data, recurrence: 'yearly' }, () => 'b');
  assert.equal(readRecurring(storage).length, 2);
  assert.deepEqual(removeRecurring(storage, 'a').map((item) => item.id), ['b']);
  assert.throws(() => removeRecurring(storage, 'a'), /non trovata/);
});
test('dati non validi non vengono salvati', () => {
  const storage = memoryStorage();
  assert.throws(() => storeRecurring(storage, { amount_minor: 1.5, description: 'x', recurrence: 'weekly' }, () => 'a'));
  assert.throws(() => storeRecurring(storage, { amount_minor: 100, description: 'x', recurrence: 'daily' as never }, () => 'a'));
  assert.equal(storage.getItem(recurringStorageKey), null);
});
test('archivio corrotto rifiutato e non sovrascritto', () => {
  for (const value of ['{broken', '{}', JSON.stringify([{ id: 'a', amount_minor: 100, description: 'x', recurrence: 'daily' }]),
    JSON.stringify([{ id: 'a', amount_minor: 100, description: 'x', recurrence: 'weekly' },
      { id: 'a', amount_minor: 200, description: 'y', recurrence: 'yearly' }])]) {
    const storage = memoryStorage();
    storage.setItem(recurringStorageKey, value);
    assert.throws(() => storeRecurring(storage, { amount_minor: 100, description: 'x', recurrence: 'weekly' }, () => 'b'));
    assert.equal(storage.getItem(recurringStorageKey), value);
  }
});
