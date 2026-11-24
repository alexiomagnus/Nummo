import assert from 'node:assert/strict';
import test from 'node:test';
import { menuHorizontalBounds, menuVerticalPlacement, recentVelocity, sheetDragOutcome, sheetGestureOwner } from '../src/components/menuGeometry.ts';

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
  assert.equal(sheetDragOutcome(0, 1, 420), 'settle');
  assert.equal(sheetDragOutcome(60, 0.15, 420), 'settle');
  assert.equal(sheetDragOutcome(140, 0, 420), 'dismiss');
  assert.equal(sheetDragOutcome(170, 0, 900), 'dismiss'); // tall sheet: at most 160 dp
  assert.equal(sheetDragOutcome(40, 0.8, 420), 'dismiss'); // flick
  assert.equal(sheetDragOutcome(20, 2, 420), 'settle'); // too short to be a flick
  assert.equal(sheetDragOutcome(60, -0.8, 420), 'settle'); // flicked back up
});

test('foglio dal basso: velocità degli ultimi 100 ms, non media del gesto', () => {
  assert.equal(recentVelocity([]), 0);
  assert.equal(recentVelocity([{ t: 0, y: 0 }]), 0);
  // Slow for 600 ms, then 60 px in the last 50 ms: a flick.
  assert.equal(recentVelocity([{ t: 0, y: 0 }, { t: 300, y: 15 }, { t: 600, y: 30 }, { t: 650, y: 90 }]), 1.2);
  // Moved, then held still for 200 ms before lifting (the release is the last sample): no flick.
  assert.equal(recentVelocity([{ t: 0, y: 0 }, { t: 50, y: 80 }, { t: 250, y: 80 }]), 0);
  assert.equal(recentVelocity([{ t: 0, y: 100 }, { t: 40, y: 60 }]), -1);
});

test('foglio dal basso: il trascinamento dalla lista non ruba lo scorrimento', () => {
  assert.equal(sheetGestureOwner(0, 4, 0), 'pending'); // within the slop
  assert.equal(sheetGestureOwner(2, 12, 0), 'sheet'); // down, list at its top
  assert.equal(sheetGestureOwner(0, 40, 1), 'list'); // list already scrolled: native scroll
  assert.equal(sheetGestureOwner(0, -12, 0), 'list'); // up: scrolls the list
  assert.equal(sheetGestureOwner(14, 10, 0), 'list'); // mostly horizontal
  assert.equal(sheetGestureOwner(-9, 9, 0), 'list'); // diagonal tie stays a scroll
});

test('dettagli su smartphone: posizioni intero, ridotto e chiuso', async () => {
  const { detentOutcome, detailGestureOwner, peekOffset } = await import('../src/components/menuGeometry.ts');
  const h = 800;
  assert.equal(peekOffset(h), 400);
  // Rilascio lento: la posizione più vicina.
  assert.equal(detentOutcome(100, 0, h, 'full'), 'full');
  assert.equal(detentOutcome(300, 0, h, 'full'), 'peek');
  assert.equal(detentOutcome(650, 0, h, 'full'), 'dismiss');
  assert.equal(detentOutcome(450, 0, h, 'peek'), 'peek');
  assert.equal(detentOutcome(150, 0, h, 'peek'), 'full');
  // Colpo veloce: un passo nella sua direzione, verso l'alto sempre intero.
  assert.equal(detentOutcome(60, 1, h, 'full'), 'peek');
  assert.equal(detentOutcome(440, 1, h, 'peek'), 'dismiss');
  assert.equal(detentOutcome(360, -1, h, 'peek'), 'full');
  // Sotto la soglia di 24 non è un colpo.
  assert.equal(detentOutcome(10, 2, h, 'full'), 'full');
  // Proprietario del gesto sul contenuto.
  assert.equal(detailGestureOwner(0, 20, 0, 'full'), 'sheet');
  assert.equal(detailGestureOwner(0, 20, 50, 'full'), 'list');
  assert.equal(detailGestureOwner(0, -20, 0, 'full'), 'list');
  assert.equal(detailGestureOwner(0, -20, 50, 'peek'), 'sheet');
  assert.equal(detailGestureOwner(20, 5, 0, 'peek'), 'list');
  assert.equal(detailGestureOwner(2, 3, 0, 'peek'), 'pending');
});
