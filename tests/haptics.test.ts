import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canVibrate, hapticPatterns, vibrate } from '../src/theme/haptics.ts';

test('vibrazione: durata per tipo, solo se attiva e disponibile', () => {
  const calls: (number | number[])[] = [];
  const nav = { vibrate: (pattern: number | number[]) => { calls.push(pattern); return true; } };
  assert.equal(vibrate('tap', true, nav), true);
  assert.equal(vibrate('tick', true, nav), true);
  assert.deepEqual(calls, [hapticPatterns.tap, hapticPatterns.tick]);
  assert.ok(hapticPatterns.tick < hapticPatterns.tap && hapticPatterns.tap <= 20);
  assert.equal(vibrate('tap', false, nav), false);
  assert.equal(calls.length, 2);
});

test('vibrazione: browser senza Vibration API o che rifiuta, mai un errore', () => {
  assert.equal(canVibrate(undefined), false);
  assert.equal(canVibrate({}), false);
  assert.equal(vibrate('tap', true, undefined), false);
  assert.equal(vibrate('tap', true, {}), false);
  assert.equal(vibrate('tap', true, { vibrate: () => false }), false);
  assert.equal(vibrate('tap', true, { vibrate: () => { throw new Error('blocked'); } }), false);
});
