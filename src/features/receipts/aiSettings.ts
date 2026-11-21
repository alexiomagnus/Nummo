// Settings of the receipt scan (AI only since 21 November), shared by the Settings card, the new-expense form (which
// shows «Scansiona scontrino» only while `enabled`) and the scan dialog. Switch, provider, model and the consent given
// are kept in this browser (`nummo.receiptAi.v1`). The API keys are kept apart, one per destination, in
// `nummo.receiptAi.keys.v1` (user's choice of 17 November: before, the key lived in memory only and had to be written
// again after every reload). They never leave this browser except in the requests to their own service.
import { useSyncExternalStore } from 'react';
import { aiDestination, aiKeysStorageKey, aiSettingsKey, defaultAiSettings, parseAiKeys, parseAiSettings, withAiKey, type AiKeys, type AiSettings } from '../../domain/receiptAi';

// `keys`: what was typed for each destination in this page (starting from the saved ones); only usable keys are saved.
type State = Readonly<{ settings: AiSettings; keys: AiKeys }>;

function load(): State {
  try { return { settings: parseAiSettings(localStorage.getItem(aiSettingsKey)), keys: parseAiKeys(localStorage.getItem(aiKeysStorageKey)) }; }
  catch { return { settings: parseAiSettings(null), keys: {} }; }
}

let state: State = load();
const listeners = new Set<() => void>();
const set = (next: State) => { state = next; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

function changeSettings(change: Partial<AiSettings>) {
  const settings = { ...state.settings, ...change };
  try { localStorage.setItem(aiSettingsKey, JSON.stringify(settings)); } catch { /* kept for this session only */ }
  set({ ...state, settings });
}

function setApiKey(value: string) {
  const destination = aiDestination(state.settings);
  const keys = { ...state.keys, [destination]: value };
  // No destination yet (no service chosen): the key waits in memory.
  if (destination !== '') {
    let saved: AiKeys = {};
    try { saved = parseAiKeys(localStorage.getItem(aiKeysStorageKey)); } catch { /* storage denied */ }
    const next = withAiKey(saved, destination, value);
    try {
      if (Object.keys(next).length > 0) localStorage.setItem(aiKeysStorageKey, JSON.stringify(next));
      else localStorage.removeItem(aiKeysStorageKey);
    } catch { /* kept for this session only */ }
  }
  set({ ...state, keys });
}

// «Ripristina predefiniti» of Settings (user's request, 21 November): scan off, no service, model or consent. The saved
// API keys are kept: they are credentials, not settings, and only «Dimentica la chiave» deletes them (choosing the same
// service again shows its key).
export function resetReceiptAi(): void {
  try { localStorage.removeItem(aiSettingsKey); } catch { /* kept for this session only */ }
  set({ ...state, settings: defaultAiSettings });
}

export function useReceiptAi() {
  const current = useSyncExternalStore(subscribe, () => state);
  const destination = aiDestination(current.settings);
  return {
    settings: current.settings, destination,
    // A key belongs to one service: another provider or address shows (and uses) its own.
    apiKey: current.keys[destination] ?? '',
    // Consent is given for one destination: another provider or address asks again.
    consented: destination !== '' && current.settings.consent === destination,
    change: changeSettings,
    setApiKey,
    giveConsent: () => changeSettings({ consent: aiDestination(state.settings) }),
  };
}
