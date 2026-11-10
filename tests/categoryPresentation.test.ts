import assert from 'node:assert/strict';
import { test } from 'node:test';
import { breakdown, categoryColorSlots, otherCategoriesKey, uncategorizedKey, periods, type ExpenseEntry } from '../src/domain/history.ts';
import { expandOccurrences } from '../src/domain/history.ts';
import { categoryPresentation, blockHeight, blockLayout, blockRadius, blockTileBounds, categoryPercent } from '../src/features/dashboard/categoryPresentation.ts';
import { treemap } from '../src/features/dashboard/treemap.ts';

const today = '2026-11-08';
const fixture = (count: number, skewed = false) => {
  const categories = Array.from({ length: count }, (_, i) => ({ id: `category-${i}`, label: `Categoria con nome lungo ${i}`, icon: null }));
  const expenses: ExpenseEntry[] = categories.map((category, i) => ({
    id: `expense-${i}`, category_id: category.id, amount_minor: skewed ? (i === 0 ? 9999999 : 1) : 100,
    expense_date: today, created_at: `${today}T12:00:00.000Z`, recurrence: null, description: category.label,
  }));
  return { categories, items: expandOccurrences(expenses, today) };
};

for (const count of [3, 10, 15, 20, 30]) for (const skewed of [false, true]) {
  test(`categorie ${count}, importi ${skewed ? 'sbilanciati' : 'uniformi'}: nessuna perdita tra dominio, grafici e dettaglio`, () => {
    const { categories, items } = fixture(count, skewed);
    const source = breakdown(items, categories, 'month', today);
    const { data, others } = categoryPresentation(source);
    assert.equal(source.series.length, count);
    assert.equal(source.total, items.reduce((sum, item) => sum + item.amount_minor, 0));
    assert.equal(data.total, source.total);
    assert.deepEqual(data.totals, source.totals);
    assert.equal(data.count, source.count);
    assert.ok(data.series.length <= 8);
    assert.equal(data.series.reduce((sum, series) => sum + series.total, 0), source.total);
    const details = [...data.series.filter((series) => series.key !== otherCategoriesKey), ...others];
    assert.equal(details.length, count);
    assert.deepEqual(details.map((series) => series.key).sort(), source.series.map((series) => series.key).sort());
    assert.ok(Math.abs(details.reduce((sum, series) => sum + series.total / source.total * 100, 0) - 100) < 1e-9);
    for (let i = 0; i < source.buckets.length; i++) {
      assert.equal(data.series.reduce((sum, series) => sum + series.values[i]!, 0), source.totals[i]);
    }
    if (skewed) assert.equal(categoryPercent(1, source.total), '<1%');
    // Desktop and phone use exactly the same projection; only geometry changes; the selected chart never changes automatically.
    for (const width of [280, 320, 412, 520, 768, 1200]) {
      const layout = blockLayout(data.series, width);
      assert.equal(layout.tiles.length, data.series.length);
      for (const tile of layout.tiles) {
        assert.ok([tile.x, tile.y, tile.w, tile.h].every(Number.isFinite));
        assert.ok(tile.x >= -1e-7 && tile.y >= -1e-7 && tile.w >= 0 && tile.h >= 0);
        assert.ok(tile.x + tile.w <= width + 1e-7 && tile.y + tile.h <= layout.height + 1e-7);
        const inside = blockTileBounds(tile);
        assert.ok(inside.w > 0 && inside.h > 0);
        assert.ok(inside.x >= tile.x && inside.y >= tile.y);
        assert.ok(inside.x + inside.w <= tile.x + tile.w + 1e-7);
        assert.ok(inside.y + inside.h <= tile.y + tile.h + 1e-7);
      }
      const area = layout.tiles.reduce((sum, tile) => sum + tile.w * tile.h, 0);
      assert.ok(Math.abs(area - width * layout.height) < 1e-5);
      for (let a = 0; a < layout.tiles.length; a++) for (let b = a + 1; b < layout.tiles.length; b++) {
        const x = layout.tiles[a]!, y = layout.tiles[b]!;
        const overlap = Math.max(0, Math.min(x.x + x.w, y.x + y.w) - Math.max(x.x, y.x))
          * Math.max(0, Math.min(x.y + x.h, y.y + y.h) - Math.max(x.y, y.y));
        assert.ok(overlap < 1e-6);
      }
    }
  });
}

test('categorie inutilizzate e periodi vuoti non affollano i grafici; colori indipendenti dall’elenco', () => {
  const { categories, items } = fixture(30);
  const unused = Array.from({ length: 100 }, (_, i) => ({ id: `unused-${i}`, label: `Inutilizzata ${i}`, icon: null }));
  const original = breakdown(items, categories, 'month', today);
  const reordered = breakdown(items, [...unused, ...[...categories].reverse()].map((c) => ({ ...c, label: `Nuovo ${c.label}` })), 'month', today);
  assert.equal(reordered.series.length, 30);
  assert.deepEqual(reordered.series.map((s) => [s.key, s.slot, s.total]), original.series.map((s) => [s.key, s.slot, s.total]));
  const expected = categoryColorSlots(original.series.map((s) => s.key));
  assert.ok(original.series.every((s) => s.slot === expected.get(s.key)));
  const empty = categoryPresentation(breakdown(items, categories, 'previous-month', today));
  assert.equal(empty.data.total, 0);
  assert.deepEqual(empty.data.series, []);
  assert.deepEqual(empty.others, []);
  assert.deepEqual(treemap([], 400, 300), []);
  assert.equal(categoryPercent(0, 0), '0%');
});

test('Senza categoria e riferimenti orfani restano leggibili separatamente da Altre', () => {
  const { categories, items } = fixture(30);
  const unassigned = { ...items[0]!, key: 'orphan', category_id: 'missing', amount_minor: 1 };
  const source = breakdown([...items, unassigned, { ...unassigned, key: 'none', category_id: null }], categories, 'month', today);
  const { data, others } = categoryPresentation(source);
  assert.equal(data.series.find((s) => s.key === uncategorizedKey)?.total, 2);
  assert.ok(!others.some((s) => s.key === uncategorizedKey));
  assert.equal(data.series.length, 8);
  assert.equal(source.series.some((s) => s.key === otherCategoriesKey), false);
});

test('tutti i periodi mantengono contatori e totali nel passaggio alla proiezione dei grafici', () => {
  const { categories, items } = fixture(20);
  for (const period of periods) {
    const source = breakdown(items, categories, period, today);
    const a = categoryPresentation(source), b = categoryPresentation(source);
    assert.deepEqual(a, b); // same projection for donut and blocks, no mutation of source
    assert.equal(a.data.total, source.total);
    assert.equal(a.data.count, source.count);
    assert.deepEqual(a.data.buckets, source.buckets);
  }
});

test('raggruppamento solo sopra otto serie, principali per importo e non per posizione nell’elenco', () => {
  const eight = fixture(8);
  const ungrouped = categoryPresentation(breakdown(eight.items, eight.categories, 'month', today));
  assert.equal(ungrouped.others.length, 0);
  assert.equal(ungrouped.data.series.length, 8);
  const nine = fixture(9);
  const items = nine.items.map((item, i) => ({ ...item, amount_minor: i === 8 ? 100000 : 100 }));
  const grouped = categoryPresentation(breakdown(items, nine.categories, 'month', today));
  assert.equal(grouped.data.series[0]!.key, nine.categories[8]!.id);
  assert.equal(grouped.others.length, 2);
  assert.equal(grouped.data.series.length, 8);
  assert.equal(grouped.data.series.at(-1)!.key, otherCategoriesKey);
});

test('blocchi: treemap proporzionale anche su mobile, gutter ridotti per i rettangoli minuscoli', () => {
  const { categories, items } = fixture(3, true);
  const { data } = categoryPresentation(breakdown(items, categories, 'month', today));
  for (const width of [280, 320, 1200]) {
    const { tiles, height } = blockLayout(data.series, width);
    assert.equal(tiles.length, 3);
    for (const tile of tiles) {
      assert.ok(Math.abs(tile.w * tile.h / (width * height) - tile.item.total / data.total) < 1e-9);
      const inside = blockTileBounds(tile);
      assert.ok(inside.w > 0 && inside.h > 0);
    }
  }
});

test('blocchi: squarified con molte categorie e importi molto diversi, aree esatte e altezza adattiva', () => {
  // 12 categories from 1 cent to thousands of euros: the projection keeps 8 series (7 + «Altre»).
  const categories = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, label: `Categoria ${i}`, icon: null }));
  const amounts = [500000, 120000, 40000, 9000, 2500, 800, 300, 120, 40, 10, 3, 1];
  const entries = categories.map((category, i) => ({ id: category.id, amount_minor: amounts[i]!, description: category.label,
    category_id: category.id, expense_date: today, recurrence: null, created_at: `${today}T10:00:00Z` }));
  const { data } = categoryPresentation(breakdown(expandOccurrences(entries, today), categories, 'month', today));
  assert.equal(data.series.length, 8);
  for (const width of [288, 360, 600, 1100]) {
    const layout = blockLayout(data.series, width);
    assert.equal(layout.height, blockHeight(width));
    assert.ok(layout.height >= 240 && layout.height <= 440);
    for (const tile of layout.tiles) {
      assert.ok(Math.abs(tile.w * tile.h / (width * layout.height) - tile.item.total / data.total) < 1e-6);
      assert.ok(tile.x + tile.w <= width + 1e-9 && tile.y + tile.h <= layout.height + 1e-9);
      const inside = blockTileBounds(tile);
      assert.ok(inside.w > 0 && inside.h > 0);
      assert.ok(blockRadius(inside, 12) <= Math.min(inside.w, inside.h) / 4);
    }
  }
  // Squarified: equal values on a square canvas stay close to squares.
  const even = treemap(Array.from({ length: 9 }, (_, i) => ({ item: i, value: 1 })), 300, 300);
  for (const tile of even) assert.ok(Math.max(tile.w / tile.h, tile.h / tile.w) <= 2);
  // Phones get a taller canvas than the same width ratio on desktop.
  assert.ok(blockHeight(360) / 360 > blockHeight(1100) / 1100);
});
