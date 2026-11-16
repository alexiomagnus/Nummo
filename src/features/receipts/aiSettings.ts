// Settings of the optional AI scan, shared by the Settings card and the scan dialog. Provider, model, address and the
// consent given are kept in this browser (`nummo.receiptAi.v1`); the API key is NEVER written anywhere: it stays in
// this module's memory and is gone when the page is closed or reloaded.
import { useSyncExternalStore } from 'react';
import { aiDestination, aiSettingsKey, parseAiSettings, type AiSettings } from '../../domain/receiptAi';

type State = Readonly<{ settings: AiSettings; apiKey: string }>;

function load(): AiSettings {
  try { return parseAiSettings(localStorage.getItem(aiSettingsKey)); } catch { return parseAiSettings(null); }
}

let state: State = { settings: load(), apiKey: '' };
const listeners = new Set<() => void>();
const set = (next: State) => { state = next; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

function changeSettings(change: Partial<AiSettings>) {
  const settings = { ...state.settings, ...change };
  // A key belongs to one service: it is forgotten as soon as the destination changes.
  const moved = aiDestination(settings) !== aiDestination(state.settings);
  try { localStorage.setItem(aiSettingsKey, JSON.stringify(settings)); } catch { /* kept for this session only */ }
  set({ settings, apiKey: moved ? '' : state.apiKey });
}

export function useReceiptAi() {
  const current = useSyncExternalStore(subscribe, () => state);
  const destination = aiDestination(current.settings);
  return {
    ...current, destination,
    // Consent is given for one destination: another provider or address asks again.
    consented: destination !== '' && current.settings.consent === destination,
    change: changeSettings,
    setApiKey: (apiKey: string) => set({ ...state, apiKey }),
    giveConsent: () => changeSettings({ consent: aiDestination(state.settings) }),
  };
}
