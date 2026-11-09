import assert from 'node:assert/strict';
import test from 'node:test';
import { isHorizontalDrag, pillGeometry, slotAt } from '../src/components/navIndicator.ts';
import { spatialSpring } from '../src/theme/tokens.ts';

test('pillola: slot uguali con spaziatura e margine, nessuna geometria prima della misura', () => {
  assert.deepEqual(pillGeometry(4 * 2 + 4 * 3 + 4 * 80, 4, 4, 4), { slot: 80, step: 84 });
  assert.equal(pillGeometry(0, 4, 4, 4), null);
  assert.equal(pillGeometry(Number.NaN, 4, 4, 4), null);
  assert.equal(pillGeometry(10, 4, 4, 4), null);
  assert.equal(pillGeometry(300, 0, 4, 4), null);
});

test('pillola: il dito al centro di uno slot lo seleziona, ai bordi resta sul primo/ultimo', () => {
  const width = 4 * 2 + 4 * 3 + 4 * 80; // slots start at 4, 88, 172, 256
  assert.equal(slotAt(4 + 40, width, 4, 4, 4), 0);
  assert.equal(slotAt(88 + 40, width, 4, 4, 4), 1);
  assert.equal(slotAt(256 + 40, width, 4, 4, 4), 3);
  assert.equal(slotAt(-50, width, 4, 4, 4), 0);
  assert.equal(slotAt(width + 50, width, 4, 4, 4), 3);
  assert.equal(Math.round(slotAt(88 + 40 + 41, width, 4, 4, 4)), 1); // just before the midpoint between 1 and 2
  assert.equal(Math.round(slotAt(88 + 40 + 43, width, 4, 4, 4)), 2);
  assert.equal(slotAt(100, 0, 4, 4, 4), 0);
});

test('pillola: solo uno spostamento orizzontale netto diventa trascinamento', () => {
  assert.equal(isHorizontalDrag(4, 0), false);
  assert.equal(isHorizontalDrag(-12, 3), true);
  assert.equal(isHorizontalDrag(10, 14), false);
  assert.equal(isHorizontalDrag(10, 10), false);
});

test('molla spaziale M3 Expressive: rapporto di smorzamento 0,8', () => {
  const ratio = spatialSpring.damping / (2 * Math.sqrt(spatialSpring.stiffness * spatialSpring.mass));
  assert.ok(Math.abs(ratio - 0.8) < 1e-9);
});
