import { useEffect, useState } from 'react';
import { inAndroidApp } from '../../services/androidApp';
import type { LocalStore } from '../../services/localStore';
import { browserKeyValueStore, browserStorageManager, ensureProtection, readProtection, type ProtectionState } from '../../services/storageProtection';

// Protection of the device archive (Standard mode): requested automatically once the archive holds data (at start if
// it already does, otherwise after the first saved change), read again when the app comes back to the foreground.
// `null` while unknown. Failures only leave the state as it is: saving never depends on it.
export function useStorageProtection(store: LocalStore): ProtectionState | null {
  const [state, setState] = useState<ProtectionState | null>(null);
  useEffect(() => {
    // In the Android app the data lives in the app's own space, not in a browser profile that can drop a site's data when
    // space runs low: always protected, nothing to ask (user's request, 27 November).
    if (inAndroidApp()) { setState('protected'); return undefined; }
    let active = true;
    let requested = false;
    // A slower, older answer never replaces a newer one.
    let sequence = 0;
    const track = (answer: Promise<ProtectionState>) => {
      const order = ++sequence;
      void answer.then((next) => { if (active && order === sequence) setState(next); });
    };
    const request = () => {
      if (requested) return;
      requested = true;
      track(ensureProtection(browserStorageManager(), browserKeyValueStore()));
    };
    track(readProtection(browserStorageManager()));
    let stop: (() => void) | undefined = store.onChange(() => { stop?.(); stop = undefined; request(); });
    store.lastChange().then((changed) => { if (changed && active) { stop?.(); stop = undefined; request(); } }, () => { /* unknown: wait for a change */ });
    const refresh = () => { if (document.visibilityState === 'visible') track(readProtection(browserStorageManager())); };
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; stop?.(); document.removeEventListener('visibilitychange', refresh); };
  }, [store]);
  return state;
}
