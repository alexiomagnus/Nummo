import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHaptics, hapticEffect, hapticGap, hasHaptics } from '../src/theme/haptics.ts';
import { slotWithHysteresis } from '../src/components/navIndicator.ts';

// A fake bridge of the Android app that records the effects it is asked for.
function recorder(fail = false) {
  const calls: string[] = [];
  const bridge = { haptic: (kind: string) => { if (fail) throw new Error('gone'); calls.push(kind); } };
  return { calls, bridge };
}

test('vibrazione: solo nell’app Android, mai nel browser', () => {
  assert.equal(hasHaptics(undefined), false);
  assert.equal(createHaptics(undefined, () => 0)(true), false);
  assert.equal(hasHaptics(recorder().bridge), true);
});

test('vibrazione: lo stesso effetto ovunque, solo se attiva', () => {
  const { calls, bridge } = recorder();
  let clock = 0;
  const haptics = createHaptics(bridge, () => clock);
  assert.equal(haptics(true), true);
  clock += hapticGap;
  assert.equal(haptics(false), false, 'interruttore spento');
  assert.equal(haptics(true), true);
  assert.deepEqual(calls, [hapticEffect, hapticEffect]);
  assert.equal(hapticEffect, 'tap');
});

test('vibrazione: richieste ravvicinate scartate, mai un ronzio da impulsi in fila', () => {
  const { calls, bridge } = recorder();
  let clock = 0;
  const haptics = createHaptics(bridge, () => clock);
  assert.equal(haptics(true), true);
  clock += hapticGap - 1;
  assert.equal(haptics(true), false);
  clock += 1;
  assert.equal(haptics(true), true);
  assert.equal(calls.length, 2);
});

test('vibrazione: un ponte che fallisce non è mai un errore e non blocca la richiesta successiva', () => {
  let clock = 0;
  const broken = createHaptics(recorder(true).bridge, () => clock);
  assert.equal(broken(true), false);
  let fail = true;
  const calls: string[] = [];
  const flaky = createHaptics({ haptic: (kind) => { if (fail) throw new Error('busy'); calls.push(kind); } }, () => clock);
  assert.equal(flaky(true), false);
  fail = false;
  assert.equal(flaky(true), true, 'nessuna attesa dopo un fallimento');
  assert.deepEqual(calls, ['tap']);
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
