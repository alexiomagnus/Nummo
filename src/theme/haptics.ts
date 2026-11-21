// Haptic feedback on the web: the Vibration API is the only one a page can use (Chrome/Edge/Samsung Internet on Android).
// Safari (iOS) and Firefox do not offer it, and desktop browsers have no motor: there the call does nothing. Pure and
// injectable (the navigator is passed in) so it can be tested without a browser; the switch lives in the preferences.

// `tap`: a press that selects (a destination, a chart part). `tick`: a lighter mark while a finger drags across the
// navigation pill and enters another destination. Durations in ms, short enough to read as a click, not a buzz.
export const hapticPatterns = { tap: 10, tick: 6 } as const;
export type HapticKind = keyof typeof hapticPatterns;

type VibratingNavigator = { vibrate?: (pattern: number | number[]) => boolean };

export function canVibrate(nav: VibratingNavigator | undefined): nav is Required<VibratingNavigator> {
  return typeof nav?.vibrate === 'function';
}

// Returns whether the browser accepted the vibration. It refuses (or throws, in some embedded views) before the user's
// first interaction with the page: never an error for the app.
export function vibrate(kind: HapticKind, enabled: boolean, nav: VibratingNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!enabled || !canVibrate(nav)) return false;
  try { return nav.vibrate(hapticPatterns[kind]); } catch { return false; }
}
