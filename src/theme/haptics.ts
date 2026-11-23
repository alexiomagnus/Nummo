import type { AndroidBridge } from '../services/androidApp.ts';
import { androidBridge } from '../services/androidApp.ts';

// Haptic feedback only inside Nummo's Android app (23 November 2026, user's request): there the bridge
// (`services/androidApp.ts`) reaches Android's native touch feedback (`performHapticFeedback`), which follows Android's
// touch-feedback setting and keeps working on silent and in Do Not Disturb. In the browser nothing vibrates and the
// «Vibrazione» switch is not shown: the Vibration API gave only plain one-shot pulses, silenced by Chrome on silent and in
// Do Not Disturb (VibrationManagerAndroid.java), with no way for the page to tell. History of the browser pulses (5/4 ms
// on 22 November) in HANDOFF.md; `docs/testing/prova-vibrazione.html` remains as a record of those trials.
//
// One effect everywhere, with the same strength (23 November, user's request): `tap`, Android's VIRTUAL_KEY / CLICK.
// The bridge also knows `tick` (CLOCK_TICK, lighter): no longer used, kept by the app for compatibility.
export const hapticEffect = 'tap';

// Minimum time between two accepted vibrations. Pulses closer than this are felt as one longer buzz (fast drag across
// the pill, finger hovering on a slot border, release right after the last crossing): the later request is dropped,
// never queued.
export const hapticGap = 60;

type HapticBridge = Pick<AndroidBridge, 'haptic'>;

// Whether this device gets haptics at all (and the «Vibrazione» switch is shown): only in the Android app.
export function hasHaptics(bridge: HapticBridge | undefined = androidBridge()): boolean {
  return bridge !== undefined;
}

export type Haptics = (enabled: boolean) => boolean;

// One gate per app (the provider creates it). Returns whether the vibration was requested; a bridge that throws is never
// an error for the app, and a failed request does not hold back the next one.
export function createHaptics(
  bridge: HapticBridge | undefined = androidBridge(),
  now: () => number = () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
): Haptics {
  let last = Number.NEGATIVE_INFINITY;
  return (enabled) => {
    if (!enabled || !bridge) return false;
    const time = now();
    if (time - last < hapticGap) return false;
    try { bridge.haptic(hapticEffect); } catch { return false; }
    last = time;
    return true;
  };
}
