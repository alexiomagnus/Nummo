import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryNameError } from '../src/domain/category.ts';
import { categoryStorageKey, readCategories, storeCategory } from '../src/services/categoryStorage.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

test('nessuna categoria predefinita; le categorie create si rileggono con ID stabile', () => {
  const storage = memoryStorage();
  assert.deepEqual(readCategories(storage), []);
  const created = storeCategory(storage, '  Spesa   alimentare  ', () => 'my-category');
  assert.deepEqual(created, [{ id: 'my-category', label: 'Spesa alimentare' }]);
  assert.deepEqual(readCategories(storage), created);
});
test('i duplicati ignorano maiuscole, spazi e normalizzazione Unicode', () => {
  const storage = memoryStorage();
  storeCategory(storage, 'Caffè', () => 'first');
  assert.throws(() => storeCategory(storage, '  CAFFE\u0300  ', () => 'second'), /già/);
  assert.equal(readCategories(storage).length, 1);
});
test('nomi vuoti o troppo lunghi sono rifiutati', () => {
  assert.ok(categoryNameError(' \n ', []));
  assert.ok(categoryNameError('a'.repeat(41), []));
  assert.equal(categoryNameError('a'.repeat(40), []), null);
});
test('la creazione rilegge le categorie già salvate da un’altra scheda', () => {
  const storage = memoryStorage();
  storeCategory(storage, 'Casa', () => 'home');
  storeCategory(storage, 'Libri', () => 'books');
  assert.equal(readCategories(storage).length, 2);
});
test('dati corrotti non vengono sovrascritti', () => {
  const storage = memoryStorage();
  storage.setItem(categoryStorageKey, '{broken');
  assert.throws(() => storeCategory(storage, 'Casa', () => 'home'));
  assert.equal(storage.getItem(categoryStorageKey), '{broken');
});
test('strutture, ID duplicati e nomi duplicati nel browser sono rifiutati', () => {
  for (const value of [{}, [{ label: 'Casa' }], [{ id: 'x', label: 'Casa' }, { id: 'x', label: 'Libri' }],
    [{ id: 'x', label: 'Casa' }, { id: 'y', label: 'CASA' }]]) {
    const storage = memoryStorage();
    storage.setItem(categoryStorageKey, JSON.stringify(value));
    assert.throws(() => readCategories(storage));
  }
});
test('un errore di storage si propaga senza restituire un falso successo', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => storeCategory(storage, 'Casa', () => 'home'), /quota/);
});
