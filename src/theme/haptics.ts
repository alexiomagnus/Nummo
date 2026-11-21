// Haptic feedback on the web: the Vibration API is the only one a page can use (Chrome/Edge/Samsung Internet on Android).
// Safari (iOS) and Firefox do not offer it, and desktop browsers have no motor: there the call does nothing. Pure and
// injectable (navigator and clock are passed in) so it can be tested without a browser; the switch lives in the preferences.
//
// A page cannot reach Android's native haptic effects (EFFECT_CLICK/TICK, the primitives behind `performHapticFeedback`
// and expo-haptics' `performAndroidHapticsAsync`, which exist only in native apps): the browser turns every request into
// a plain one-shot vibration of the given length. Expo-haptics on the web does the same with 35–60 ms pulses, longer than
// these. So crispness depends on what is left to the page: pulses as short as still felt, never chained into a buzz.

// `tap`: a press that moves somewhere (a destination of the navigation bar, «Nuova spesa», the release of a drag on the
// pill). `tick`: a lighter mark for a selection (chart parts, a destination crossed while dragging).
// Durations in ms; to compare others on a phone, `docs/testing/prova-vibrazione.html`.
// Shortened twice on 21 November on request (10/6 → 6/4 → 4/3): felt too strong and buzzy on a Pixel 8; a shorter pulse is
// the only way a page can make it softer (the browser fixes the strength). At 4/3 the Pixel 8 gave nothing at all (the motor
// does not start for so short a pulse): back to 6 for `tap`, the shortest felt, and 5 for `tick`, just under it.
export const hapticPatterns = { tap: 6, tick: 5 } as const;
export type HapticKind = keyof typeof hapticPatterns;

// Minimum time between two accepted vibrations. Each call restarts the motor, and pulses closer than this are felt as one
// longer buzz (fast drag across the pill, finger hovering on a slot border, release right after the last tick): the later
// request is dropped, never queued.
export const hapticGap = 60;

type VibratingNavigator = { vibrate?: (pattern: number | number[]) => boolean };

export function canVibrate(nav: VibratingNavigator | undefined): nav is Required<VibratingNavigator> {
  return typeof nav?.vibrate === 'function';
}

export type Haptics = (kind: HapticKind, enabled: boolean) => boolean;

// One gate per app (the provider creates it). Returns whether the browser accepted the vibration. It refuses (or throws,
// in some embedded views) before the user's first interaction with the page: never an error for the app, and a refused
// request does not hold back the next one.
export function createHaptics(
  nav: VibratingNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
  now: () => number = () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
): Haptics {
  let last = Number.NEGATIVE_INFINITY;
  return (kind, enabled) => {
    if (!enabled || !canVibrate(nav)) return false;
    const time = now();
    if (time - last < hapticGap) return false;
    let accepted = false;
    try { accepted = nav.vibrate(hapticPatterns[kind]); } catch { accepted = false; }
    if (accepted) last = time;
    return accepted;
  };
}
