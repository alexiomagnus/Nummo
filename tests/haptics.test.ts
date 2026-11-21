import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canVibrate, createHaptics, hapticGap, hapticPatterns, hasHaptics } from '../src/theme/haptics.ts';
import { slotWithHysteresis } from '../src/components/navIndicator.ts';

function recorder(accept: boolean | (() => boolean) = true) {
  const calls: (number | number[])[] = [];
  const nav = { vibrate: (pattern: number | number[]) => { calls.push(pattern); return typeof accept === 'function' ? accept() : accept; } };
  return { calls, nav };
}

// Primary pointer of a phone (finger) or of a desktop (mouse, touchpad).
const touch = (query: string) => ({ matches: query === '(pointer: coarse)' });
const desktop = (query: string) => ({ matches: query === '(pointer: fine)' });

test('vibrazione: un solo impulso breve per tipo, solo se attiva e disponibile', () => {
  const { calls, nav } = recorder();
  let clock = 0;
  const haptics = createHaptics(nav, () => clock, touch);
  assert.equal(haptics('tap', true), true);
  clock += hapticGap;
  assert.equal(haptics('tick', true), true);
  // Always a single number (one pulse), never a pattern of several pulses; tick lighter than tap, both click-short.
  assert.deepEqual(calls, [hapticPatterns.tap, hapticPatterns.tick]);
  assert.ok(hapticPatterns.tick < hapticPatterns.tap && hapticPatterns.tap <= 20);
  clock += hapticGap;
  assert.equal(haptics('tap', false), false);
  assert.equal(calls.length, 2);
});

test('vibrazione: richieste ravvicinate scartate, mai un ronzio da impulsi in fila', () => {
  const { calls, nav } = recorder();
  let clock = 1000;
  const haptics = createHaptics(nav, () => clock, touch);
  assert.equal(haptics('tick', true), true);
  clock += 16; // next frame of a fast drag
  assert.equal(haptics('tick', true), false);
  clock += hapticGap - 17; // still inside the gap from the accepted one
  assert.equal(haptics('tap', true), false);
  clock += 1;
  assert.equal(haptics('tap', true), true);
  assert.deepEqual(calls, [hapticPatterns.tick, hapticPatterns.tap]);
});

test('vibrazione: una richiesta rifiutata dal browser non blocca la successiva', () => {
  let accept = false;
  const { calls, nav } = recorder(() => accept);
  let clock = 0;
  const haptics = createHaptics(nav, () => clock, touch);
  assert.equal(haptics('tap', true), false); // before the first user interaction
  accept = true;
  clock += 1;
  assert.equal(haptics('tap', true), true);
  assert.equal(calls.length, 2);
});

test('vibrazione: browser senza Vibration API o che rifiuta, mai un errore', () => {
  assert.equal(canVibrate(undefined), false);
  assert.equal(canVibrate({}), false);
  assert.equal(createHaptics(undefined, undefined, touch)('tap', true), false);
  assert.equal(createHaptics({}, undefined, touch)('tap', true), false);
  assert.equal(createHaptics({ vibrate: () => false }, undefined, touch)('tap', true), false);
  assert.equal(createHaptics({ vibrate: () => { throw new Error('blocked'); } }, undefined, touch)('tap', true), false);
});

test('vibrazione: mai su desktop, anche se il browser offre la Vibration API', () => {
  const { calls, nav } = recorder();
  assert.equal(hasHaptics(nav, touch), true);
  assert.equal(hasHaptics(nav, desktop), false);
  assert.equal(hasHaptics(nav, undefined), false); // no media queries: unknown device, no haptics
  assert.equal(hasHaptics({}, touch), false);
  assert.equal(createHaptics(nav, () => 0, desktop)('tap', true), false);
  assert.equal(calls.length, 0);
});

test('barra mobile: zona morta sul confine tra due destinazioni, un solo cambio per attraversamento', () => {
  // A finger resting on the border between 1 and 2 wobbles around 1.5: the slot stays put.
  let slot: number | null = 1;
  let changes = 0;
  for (const value of [1.3, 1.49, 1.51, 1.48, 1.55, 1.6, 1.52, 1.47]) {
    const next = slotWithHysteresis(value, slot);
    if (next !== slot) { changes++; slot = next; }
  }
  assert.equal(slot, 1);
  assert.equal(changes, 0);
  // Clearly past the border: one change, and coming back near the border does not flip back.
  for (const value of [1.66, 1.7, 1.5, 1.4, 1.36]) {
    const next = slotWithHysteresis(value, slot);
    if (next !== slot) { changes++; slot = next; }
  }
  assert.equal(slot, 2);
  assert.equal(changes, 1);
  // Fast drag over several destinations: straight to the nearest; no previous slot: the nearest.
  assert.equal(slotWithHysteresis(3.2, 0), 3);
  assert.equal(slotWithHysteresis(2.4, null), 2);
  assert.equal(slotWithHysteresis(0, -1), 0); // drag started on a page outside the destinations
});
