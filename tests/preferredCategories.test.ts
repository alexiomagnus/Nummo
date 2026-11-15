import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existingCategory, noPreferredCategories, parsePreferredCategories } from '../src/features/categories/preferredCategories.ts';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

test('categorie preferite: lettura validata campo per campo', () => {
  assert.deepEqual(parsePreferredCategories(JSON.stringify({ expense: a, list: b })), { expense: a, list: b });
  assert.deepEqual(parsePreferredCategories(JSON.stringify({ expense: a, list: 'Alimentari' })), { expense: a, list: '' });
  assert.deepEqual(parsePreferredCategories('{rotto'), noPreferredCategories);
  assert.deepEqual(parsePreferredCategories(null), noPreferredCategories);
  assert.deepEqual(parsePreferredCategories('[1,2]'), noPreferredCategories);
});

test('categorie preferite: una categoria eliminata viene ignorata', () => {
  assert.equal(existingCategory(a, [{ id: a }, { id: b }]), a);
  assert.equal(existingCategory(a, [{ id: b }]), '');
  assert.equal(existingCategory('', [{ id: b }]), '');
});
