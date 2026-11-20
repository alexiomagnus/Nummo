import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clippedRows } from '../src/theme/wholeRows.ts';

const view = { top: 100, bottom: 500 };

test('pannello desktop: si nasconde solo la riga tagliata dal bordo inferiore', () => {
  const rows = [
    { top: 120, bottom: 200 }, // whole
    { top: 420, bottom: 499.8 }, // whole within the tolerance
    { top: 480, bottom: 560 }, // cut by the bottom edge
    { top: 600, bottom: 680 }, // below the view: already invisible
  ];
  assert.deepEqual(clippedRows(rows, view), [2]);
});

test('pannello desktop: mai nascoste righe più alte della vista, iniziate sopra o non visualizzate', () => {
  assert.deepEqual(clippedRows([{ top: 300, bottom: 750 }], view), [], 'taller than the view: never whole');
  assert.deepEqual(clippedRows([{ top: 90, bottom: 520 }], view), [], 'starts above the view');
  assert.deepEqual(clippedRows([{ top: 0, bottom: 0 }], view), [], 'hidden page (display: none)');
  assert.deepEqual(clippedRows([{ top: 101, bottom: 501 }], view), [0], 'as tall as the view: hidden until scrolled whole');
});
