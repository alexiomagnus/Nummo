import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultCategories, isCategoryIcon } from '../src/domain/category.ts';
import { shouldSeedDefaultCategories } from '../src/features/workspace/seedDefaults.ts';

const part = { ready: true, count: 0, fromCache: false, pending: false };
const base = { online: true, error: null, categories: part, expenses: part };

test('categorie predefinite: cinque nomi con le icone scelte, tutte valide', () => {
  assert.deepEqual(defaultCategories.map((c) => [c.label, c.icon]), [
    ['Alimentari', 'cart'], ['Intrattenimento', 'popcorn'], ['Shopping', 'shirt'], ['Tecnologia', 'laptop'], ['Trasporti', 'bus']]);
  assert.ok(defaultCategories.every((c) => isCategoryIcon(c.icon)));
});

test('creazione automatica: solo con archivio vuoto confermato dal server, online e senza errori', () => {
  assert.equal(shouldSeedDefaultCategories(base), true);
  assert.equal(shouldSeedDefaultCategories({ ...base, online: false }), false);
  assert.equal(shouldSeedDefaultCategories({ ...base, error: 'x' }), false);
  for (const key of ['categories', 'expenses'] as const) {
    assert.equal(shouldSeedDefaultCategories({ ...base, [key]: { ...part, ready: false } }), false);
    assert.equal(shouldSeedDefaultCategories({ ...base, [key]: { ...part, fromCache: true } }), false);
    assert.equal(shouldSeedDefaultCategories({ ...base, [key]: { ...part, pending: true } }), false);
    assert.equal(shouldSeedDefaultCategories({ ...base, [key]: { ...part, count: 1 } }), false);
  }
});
