import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryIcons, categoryNameError, defaultCategories } from '../src/domain/category.ts';
import { categoryGlyphs } from '../src/components/categoryGlyphs.ts';
import {
  categoryStorageKey, legacyCategoryStorageKey, loadCategories, readCategories, removeCategory, renameCategory, setCategoryIcon, storeCategory,
} from '../src/services/categoryStorage.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

test('senza inizializzazione nessuna categoria; le categorie create si rileggono con ID stabile', () => {
  const storage = memoryStorage();
  assert.deepEqual(readCategories(storage), []);
  const created = storeCategory(storage, '  Spesa   alimentare  ', () => 'my-category');
  assert.deepEqual(created, [{ id: 'my-category', label: 'Spesa alimentare', icon: null }]);
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

let counter = 0;
const uniqueId = () => `id-${++counter}`;

test('un nuovo browser riceve le categorie predefinite una sola volta', () => {
  const storage = memoryStorage();
  const seeded = loadCategories(storage, uniqueId);
  assert.deepEqual(seeded.map(({ label, icon }) => ({ label, icon })), [...defaultCategories]);
  assert.deepEqual(seeded.map((category) => category.label), ['Spesa', 'Ristorazione', 'Uscita', 'Shopping']);
  assert.deepEqual(loadCategories(storage, uniqueId), seeded);
});
test('le categorie predefinite non si aggiungono a quelle già salvate', () => {
  const storage = memoryStorage();
  storeCategory(storage, 'Libri', () => 'books');
  assert.deepEqual(loadCategories(storage, uniqueId), [{ id: 'books', label: 'Libri', icon: null }]);
});
test('eliminare tutte le categorie non ripristina le predefinite', () => {
  const storage = memoryStorage();
  for (const category of loadCategories(storage, uniqueId)) removeCategory(storage, category.id);
  assert.deepEqual(loadCategories(storage, uniqueId), []);
});
test('eliminazione di una categoria creata, rifiutata se inesistente', () => {
  const storage = memoryStorage();
  storeCategory(storage, 'Casa', () => 'home');
  storeCategory(storage, 'Libri', () => 'books');
  assert.deepEqual(removeCategory(storage, 'home'), [{ id: 'books', label: 'Libri', icon: null }]);
  assert.deepEqual(readCategories(storage), [{ id: 'books', label: 'Libri', icon: null }]);
  assert.throws(() => removeCategory(storage, 'home'), /non trovata/);
});
test('l’eliminazione non sovrascrive dati corrotti', () => {
  const storage = memoryStorage();
  storage.setItem(categoryStorageKey, '{broken');
  assert.throws(() => removeCategory(storage, 'home'));
  assert.equal(storage.getItem(categoryStorageKey), '{broken');
});
test('le categorie salvate con il nome precedente vengono conservate', () => {
  const storage = memoryStorage();
  storage.setItem(legacyCategoryStorageKey, JSON.stringify([{ id: 'home', label: 'Casa' }]));
  assert.deepEqual(loadCategories(storage, uniqueId), [{ id: 'home', label: 'Casa', icon: null }]);
  storeCategory(storage, 'Libri', () => 'books');
  assert.equal(JSON.parse(storage.getItem(categoryStorageKey)!).length, 2);
});
test('icona facoltativa in creazione, modificabile e rimovibile', () => {
  const storage = memoryStorage();
  assert.deepEqual(storeCategory(storage, 'Casa', () => 'home', 'house'), [{ id: 'home', label: 'Casa', icon: 'house' }]);
  assert.deepEqual(setCategoryIcon(storage, 'home', 'bulb'), [{ id: 'home', label: 'Casa', icon: 'bulb' }]);
  assert.deepEqual(setCategoryIcon(storage, 'home', null), [{ id: 'home', label: 'Casa', icon: null }]);
  assert.throws(() => setCategoryIcon(storage, 'missing', 'house'), /non trovata/);
  assert.throws(() => setCategoryIcon(storage, 'home', 'x' as never), /Icona/);
  assert.throws(() => storeCategory(storage, 'Libri', () => 'books', '<svg>' as never), /Icona/);
});
test('icone sconosciute o ritirate nell’archivio diventano assenti senza perdere la categoria', () => {
  const storage = memoryStorage();
  storage.setItem(categoryStorageKey, JSON.stringify([{ id: 'home', label: 'Casa', icon: '🏠' },
    { id: 'x', label: 'Altro', icon: 'javascript:' }, { id: 'p', label: 'Pizza', icon: 'pizza' }]));
  assert.deepEqual(readCategories(storage).map((category) => category.icon), [null, null, 'pizza']);
});
test('ogni icona ammessa ha un glifo vettoriale e viceversa', () => {
  assert.deepEqual(Object.keys(categoryGlyphs).sort(), [...categoryIcons].sort());
  for (const [name, shape] of Object.entries(categoryGlyphs)) assert.match(shape, /^<(path|circle|rect)/, name);
});
test('rinomina: stesso ID e icona, nome normalizzato, duplicati rifiutati', () => {
  const storage = memoryStorage();
  storeCategory(storage, 'Ristorzione', () => 'food', 'pasta');
  storeCategory(storage, 'Casa', () => 'home');
  assert.deepEqual(renameCategory(storage, 'food', '  Ristorazione ')[0], { id: 'food', label: 'Ristorazione', icon: 'pasta' });
  assert.deepEqual(renameCategory(storage, 'food', 'RISTORAZIONE')[0]!.label, 'RISTORAZIONE');
  assert.throws(() => renameCategory(storage, 'food', 'casa'), /già/);
  assert.throws(() => renameCategory(storage, 'food', '  '), /nome/);
  assert.throws(() => renameCategory(storage, 'missing', 'Altro'), /non trovata/);
  assert.equal(readCategories(storage)[0]!.label, 'RISTORAZIONE');
});
