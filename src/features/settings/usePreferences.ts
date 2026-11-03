import { useCallback, useState } from 'react';
import { defaultPreferences, parsePreferences, preferencesKey, type Preferences } from './preferences';

function load(): Preferences {
  try { return parsePreferences(localStorage.getItem(preferencesKey)); } catch { return defaultPreferences; }
}

// Preferences persisted in this browser only (not synced). Storage may be denied: the choice
// then still applies for the session.
export function usePreferences(): [Preferences, (change: Partial<Preferences>) => void, () => void] {
  const [preferences, setPreferences] = useState<Preferences>(load);
  const save = (next: Preferences) => { try { localStorage.setItem(preferencesKey, JSON.stringify(next)); } catch { /* session-only */ } };
  const update = useCallback((change: Partial<Preferences>) => {
    setPreferences((current) => { const next = { ...current, ...change }; save(next); return next; });
  }, []);
  const reset = useCallback(() => { setPreferences(defaultPreferences); save(defaultPreferences); }, []);
  return [preferences, update, reset];
}
