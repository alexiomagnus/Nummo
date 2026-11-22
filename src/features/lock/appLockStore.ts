import { useSyncExternalStore } from 'react';
import { appLockKey, defaultAppLock, defaultLockDelay, parseAppLock, type AppLockSettings } from '../../domain/appLock';

// App lock state shared by the lock screen (App.tsx), the Settings card and the Advanced mode's way out. `locked` starts
// true when the lock is on: the first frame already covers the app.
type State = Readonly<{ settings: AppLockSettings; locked: boolean; recovery: (() => void) | null }>;

function read(): AppLockSettings {
  try { return parseAppLock(globalThis.localStorage?.getItem(appLockKey) ?? null); } catch { return defaultAppLock; }
}

const initial = read();
let state: State = { settings: initial, locked: initial.enabled, recovery: null };
const listeners = new Set<() => void>();
const set = (change: Partial<State>) => { state = { ...state, ...change }; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export const useAppLock = (): State => useSyncExternalStore(subscribe, () => state, () => state);

// False when the browser refused to keep it: the lock does not change then (never on in memory and off after a reload).
export function saveAppLock(settings: AppLockSettings): boolean {
  try { localStorage.setItem(appLockKey, JSON.stringify(settings)); } catch { return false; }
  set({ settings, locked: settings.enabled ? state.locked : false });
  return true;
}

export const lockApp = () => { if (state.settings.enabled && !state.locked) set({ locked: true }); };
export const unlockApp = () => { if (state.locked) set({ locked: false }); };
export const appLockState = () => state;

// Off without asking the device: only from the lock screen's way out (after a confirmation, or after signing out in the
// Advanced mode). The credential is kept, so turning the lock on again does not create a new one; the PIN goes with the
// lock (a new one is chosen when it is turned on again).
export function disableAppLock() {
  saveAppLock({ ...state.settings, enabled: false, pin: null });
  unlockApp();
}

// The Advanced mode, signed in, offers «Esci» as the way out (signing in again with Google is the proof); elsewhere the
// lock screen offers to turn the lock off after a confirmation.
export function setLockRecovery(recovery: (() => void) | null) {
  if (state.recovery !== recovery) set({ recovery });
}

// «Ripristina predefiniti»: the delay only (the lock itself is turned off with the fingerprint, never by a reset).
export function resetAppLockDelay() {
  if (state.settings.delay !== defaultLockDelay) saveAppLock({ ...state.settings, delay: defaultLockDelay });
}
