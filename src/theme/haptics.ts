// Haptic feedback on the web: the Vibration API is the only one a page can use (Chrome/Edge/Samsung Internet on Android).
// Chrome on Android gives nothing while the phone is on silent (VibrationManagerAndroid.java: vibrates only if
// getRingerMode() != RINGER_MODE_SILENT) or in Do Not Disturb (found by the user on the Pixel 8, 22 November), with no error
// and `vibrate()` still returning true: the page cannot tell or work around it. The system's own haptics (a long press)
// still work then. Said under the «Vibrazione» switch.
// Only on touch devices (primary pointer coarse: phones, tablets): never on desktop, where there is no motor and the
// switch is not shown (22 November, user's request). Safari (iOS) and Firefox do not offer the API: there it does nothing.
// Pure and injectable (navigator, clock and media query are passed in) so it can be tested without a browser.
//
// A page cannot reach Android's native haptic effects (EFFECT_CLICK/TICK, the primitives behind `performHapticFeedback`
// and expo-haptics' `performAndroidHapticsAsync`, which exist only in native apps): the browser turns every request into
// a plain one-shot vibration of the given length. Expo-haptics on the web does the same with 35–60 ms pulses, longer than
// these. So crispness depends on what is left to the page: pulses as short as still felt, never chained into a buzz.

// `tap`: a press that moves somewhere (a destination of the navigation bar, «Nuova spesa», the release of a drag on the
// pill). `tick`: a lighter mark for a selection (chart parts, a destination crossed while dragging).
// Durations in ms; to compare others on a phone, `docs/testing/prova-vibrazione.html`.
// History on the Pixel 8: 10/6 felt too strong and buzzy; 6/4, 4/3, 6/5 and 8/7 were «not felt», but the phone was in Do
// Not Disturb all along (22 November): none of those was a limit of the motor. 8/7, felt once Do Not Disturb was off, is
// still too strong for the user: 5/4, softer (a page can only shorten the pulse; the browser fixes the strength).
export const hapticPatterns = { tap: 5, tick: 4 } as const;
export type HapticKind = keyof typeof hapticPatterns;

// Minimum time between two accepted vibrations. Each call restarts the motor, and pulses closer than this are felt as one
// longer buzz (fast drag across the pill, finger hovering on a slot border, release right after the last tick): the later
// request is dropped, never queued.
export const hapticGap = 60;

type VibratingNavigator = { vibrate?: (pattern: number | number[]) => boolean };
type MediaQuery = (query: string) => { matches: boolean };

export function canVibrate(nav: VibratingNavigator | undefined): nav is Required<VibratingNavigator> {
  return typeof nav?.vibrate === 'function';
}

const browserMedia: MediaQuery | undefined = typeof matchMedia === 'function' ? (query) => matchMedia(query) : undefined;

// Whether this device gets haptics at all (and the «Vibrazione» switch is shown): the API exists and the primary pointer
// is a finger. Desktop (mouse, touchpad) never, even with a touchscreen as a second pointer.
export function hasHaptics(
  nav: VibratingNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
  media: MediaQuery | undefined = browserMedia,
): boolean {
  return canVibrate(nav) && media?.('(pointer: coarse)').matches === true;
}

export type Haptics = (kind: HapticKind, enabled: boolean) => boolean;

// One gate per app (the provider creates it). Returns whether the browser accepted the vibration. It refuses (or throws,
// in some embedded views) before the user's first interaction with the page: never an error for the app, and a refused
// request does not hold back the next one.
export function createHaptics(
  nav: VibratingNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
  now: () => number = () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
  media: MediaQuery | undefined = browserMedia,
): Haptics {
  let last = Number.NEGATIVE_INFINITY;
  const available = hasHaptics(nav, media);
  return (kind, enabled) => {
    if (!enabled || !available || !canVibrate(nav)) return false;
    const time = now();
    if (time - last < hapticGap) return false;
    let accepted = false;
    try { accepted = nav.vibrate(hapticPatterns[kind]); } catch { accepted = false; }
    if (accepted) last = time;
    return accepted;
  };
}
