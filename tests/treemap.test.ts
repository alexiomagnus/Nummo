import assert from 'node:assert/strict';
import test from 'node:test';
import { treemap } from '../src/features/dashboard/treemap.ts';

test('treemap: i blocchi coprono l’area, restano nei limiti e sono proporzionali', () => {
  const tiles = treemap([{ item: 'a', value: 50 }, { item: 'b', value: 30 }, { item: 'c', value: 15 }, { item: 'd', value: 5 }, { item: 'z', value: 0 }], 400, 300);
  assert.equal(tiles.length, 4);
  const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
  assert.ok(Math.abs(area - 120000) < 1e-6);
  for (const t of tiles) {
    assert.ok(t.x >= -1e-9 && t.y >= -1e-9 && t.x + t.w <= 400 + 1e-9 && t.y + t.h <= 300 + 1e-9);
    const share = (t.w * t.h) / 120000;
    assert.ok(Math.abs(share - { a: 0.5, b: 0.3, c: 0.15, d: 0.05 }[t.item as 'a']!) < 1e-9);
  }
  assert.equal(tiles[0]!.item, 'a');
});

test('treemap: un solo elemento riempie lo spazio; vuoto o senza spazio non produce blocchi', () => {
  assert.deepEqual(treemap([{ item: 'x', value: 7 }], 100, 50), [{ item: 'x', x: 0, y: 0, w: 100, h: 50 }]);
  assert.deepEqual(treemap([], 100, 50), []);
  assert.deepEqual(treemap([{ item: 'x', value: 1 }], 0, 50), []);
});
