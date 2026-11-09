import assert from 'node:assert/strict';
import test from 'node:test';
import { menuHorizontalBounds, menuVerticalPlacement, sheetDragOutcome } from '../src/components/menuGeometry.ts';

test('menu: il filtro Categoria resta sotto il campo destro anche vicino al bordo', () => {
  assert.deepEqual(menuHorizontalBounds(206, 190, 412, 0, 0, 16), { left: 206, width: 190 });
  assert.deepEqual(menuHorizontalBounds(168, 140, 320, 0, 0, 16), { left: 164, width: 140 });
  // Fractional CSS measurements must not trigger a whole-field jump to the left.
  const bounds = menuHorizontalBounds(206.25, 190.25, 412, 0, 0, 16);
  assert.equal(bounds.left, 205.75);
  assert.equal(bounds.left + bounds.width, 396);
});

test('menu: larghezza del campo, safe area e viewport stretto', () => {
  assert.deepEqual(menuHorizontalBounds(16, 140, 320, 0, 0, 16), { left: 16, width: 140 });
  assert.deepEqual(menuHorizontalBounds(350, 200, 600, 44, 44, 16), { left: 340, width: 200 });
  assert.deepEqual(menuHorizontalBounds(0, 700, 320, 0, 0, 16), { left: 16, width: 288 });
});

test('menu: più largo del campo quando le voci lo richiedono, sempre entro i margini', () => {
  // Sort field on the left half of a 412 dp phone, widest row 230 dp: the menu keeps its left edge and shows whole labels.
  assert.deepEqual(menuHorizontalBounds(16, Math.max(182, 230), 412, 0, 0, 16), { left: 16, width: 230 });
  // Category filter on the right half: the wider menu slides left to stay inside the right margin.
  assert.deepEqual(menuHorizontalBounds(214, Math.max(182, 230), 412, 0, 0, 16), { left: 166, width: 230 });
  // Rows wider than the screen are limited to the viewport (the label then ellipsizes).
  assert.deepEqual(menuHorizontalBounds(16, Math.max(140, 600), 320, 0, 0, 16), { left: 16, width: 288 });
});

test('menu: sotto il campo se c’è spazio, altrimenti sopra, mai oltre il bordo inferiore', () => {
  // Category field in the middle of a 915 dp phone: below, capped at 360.
  assert.deepEqual(menuVerticalPlacement(400, 450, 915, 0, 0, 16, 4, 360, 192), { side: 'below', top: 454, maxHeight: 360 });
  // Little room below (keyboard or low field): above the field, bottom edge 4 dp over it.
  assert.deepEqual(menuVerticalPlacement(600, 650, 740, 0, 0, 16, 4, 360, 192), { side: 'above', bottom: 596, maxHeight: 360 });
  // Room below enough for the minimum: stays below with its height capped to the room (bottom safe area respected).
  assert.deepEqual(menuVerticalPlacement(400, 450, 740, 24, 34, 16, 4, 360, 192), { side: 'below', top: 454, maxHeight: 236 });
  // Neither side fits the minimum: the roomier one, never a negative height.
  const tight = menuVerticalPlacement(100, 150, 300, 0, 0, 16, 4, 360, 192);
  assert.equal(tight.side, 'below');
  assert.equal(tight.maxHeight, 130);
  assert.deepEqual(menuVerticalPlacement(-80, -20, 300, 0, 0, 16, 4, 360, 192).maxHeight >= 0, true);
});

test('foglio dal basso: chiusura col trascinamento oltre un terzo o con un gesto rapido', () => {
  assert.equal(sheetDragOutcome(0, 100, 420), 'settle');
  assert.equal(sheetDragOutcome(60, 400, 420), 'settle');
  assert.equal(sheetDragOutcome(140, 600, 420), 'dismiss');
  assert.equal(sheetDragOutcome(170, 900, 900), 'dismiss'); // tall sheet: at most 160 dp
  assert.equal(sheetDragOutcome(40, 50, 420), 'dismiss'); // flick
  assert.equal(sheetDragOutcome(20, 10, 420), 'settle'); // too short to be a flick
});
