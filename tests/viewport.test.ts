import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observeViewportHeight, visibleViewportHeight } from '../src/theme/viewport.ts';

test('viewport: tastiera e barre browser riducono lo spazio disponibile; fallback senza API e zoom indipendente', () => {
  assert.equal(visibleViewportHeight(900, { height: 750.4, scale: 1 }), 750);
  assert.equal(visibleViewportHeight(900, { height: 380, scale: 1 }), 380);
  assert.equal(visibleViewportHeight(900, null), 900);
  assert.equal(visibleViewportHeight(900, { height: 380, scale: 2 }), null);
  assert.equal(visibleViewportHeight(0, null), null);
  assert.equal(visibleViewportHeight(NaN, null), null);
});

test('viewport: apertura/chiusura tastiera, rotazione, zoom e rimozione dei listener', () => {
  const visual = Object.assign(new EventTarget(), { height: 750, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 900, visualViewport: visual });
  const heights: number[] = [];
  const stop = observeViewportHeight(target as unknown as Window, (height) => heights.push(height));
  visual.height = 380;
  visual.dispatchEvent(new Event('resize'));
  target.dispatchEvent(new Event('resize')); // Same height is not emitted twice.
  visual.height = 750;
  visual.dispatchEvent(new Event('resize'));
  visual.scale = 2; visual.height = 375;
  visual.dispatchEvent(new Event('resize')); // Pinch zoom must not reflow the app.
  visual.scale = 1; visual.height = 400;
  target.dispatchEvent(new Event('resize')); // Landscape.
  assert.deepEqual(heights, [750, 380, 750, 400]);
  stop();
  visual.height = 800;
  visual.dispatchEvent(new Event('resize'));
  target.dispatchEvent(new Event('resize'));
  assert.deepEqual(heights, [750, 380, 750, 400]);
});

test('viewport: ridimensionamento finestra senza VisualViewport', () => {
  const target = Object.assign(new EventTarget(), { innerHeight: 900 });
  const heights: number[] = [];
  const stop = observeViewportHeight(target as unknown as Window, (height) => heights.push(height));
  target.innerHeight = 600;
  target.dispatchEvent(new Event('resize'));
  assert.deepEqual(heights, [900, 600]);
  stop();
});
