import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryIcons, categoryNameError, maxCategoryNameLength } from '../src/domain/category.ts';
import { categoryGlyphs } from '../src/components/categoryGlyphs.ts';

test('nomi vuoti o troppo lunghi sono rifiutati', () => {
  assert.ok(categoryNameError(' \n ', []));
  assert.ok(categoryNameError('a'.repeat(41), []));
  assert.equal(categoryNameError('a'.repeat(40), []), null);
});
test('i duplicati ignorano maiuscole, spazi e normalizzazione Unicode', () => {
  const existing = [{ id: 'first', label: 'Caffè', icon: null }];
  assert.match(categoryNameError('  CAFFÈ  ', existing) ?? '', /già/);
  assert.equal(categoryNameError('Casa', existing), null);
});
test('ogni icona ammessa ha un glifo vettoriale e viceversa', () => {
  assert.deepEqual(Object.keys(categoryGlyphs).sort(), [...categoryIcons].sort());
  for (const [name, shape] of Object.entries(categoryGlyphs)) assert.match(shape, /^<(path|circle|rect)/, name);
});


test('nessun limite al numero: nuovi nomi validi anche con cento categorie, duplicati ancora rifiutati', () => {
  const categories = Array.from({ length: 100 }, (_, i) => ({ id: `cat-${i}`, label: `Categoria ${i}`, icon: null }));
  assert.equal(categoryNameError('Nuova categoria', categories), null);
  assert.match(categoryNameError('Categoria 99', categories) ?? '', /già/);
});
test('archivio Firestore: una categoria con un’icona eliminata prima del 14 novembre si legge (prima bloccava tutto l’archivio)', async () => {
  const { parseSyncedCategory, categoryNameKey } = await import('../src/domain/firestore.ts');
  const base = { id: '7f3c2a10-1b2c-4d5e-8f90-123456789abc', label: 'Trasporti', name_key: categoryNameKey('Trasporti'), updated_at: '2026-11-08T10:00:00.000Z', revision: 1 };
  for (const icon of ['bus', 'car', 'tree', 'star', 'pill']) assert.equal(parseSyncedCategory({ ...base, icon })?.icon, icon);
  assert.equal(parseSyncedCategory({ ...base, icon: 'rocket' }), null);
});

test('categorie: il limite del nome è lo stesso per la validazione e per il campo', () => {
  assert.equal(maxCategoryNameLength, 40);
  assert.equal(categoryNameError('a'.repeat(maxCategoryNameLength), []), null);
  assert.ok(categoryNameError('a'.repeat(maxCategoryNameLength + 1), []));
});
