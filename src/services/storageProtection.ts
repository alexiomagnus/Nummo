// Protection of the device archive («Standard» mode): asks the browser to keep this site's data when space runs low
// (`navigator.storage.persist`). It lowers the risk of eviction; it is not a backup and guarantees nothing more.
// The request is made only once the archive holds data, and at most once every `retryDays` days: some browsers
// (Firefox) show a prompt, others decide on their own and may agree later. No setting for the user.
// The browser objects are injected so the rules can be tested without a browser.

export type ProtectionState = 'protected' | 'unprotected' | 'unavailable';
export type StorageManagerLike = { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };
export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };

// Only the time of the last request is kept: never data, never the answer (the browser is asked again each time).
export const protectionKey = 'nummo.storageProtection.v1';
export const retryDays = 30;

export function lastRequest(storage: KeyValueStore | undefined): number | null {
  try {
    const raw = storage?.getItem(protectionKey);
    const data: unknown = raw ? JSON.parse(raw) : null;
    const at = typeof data === 'object' && data !== null ? (data as { requestedAt?: unknown }).requestedAt : undefined;
    const time = typeof at === 'string' ? Date.parse(at) : NaN;
    return Number.isFinite(time) ? time : null;
  } catch { return null; }
}

export function shouldRequest(previous: number | null, now: Date): boolean {
  return previous === null || previous > now.getTime() || now.getTime() - previous >= retryDays * 86_400_000;
}

// The current state, without asking for anything. An API that is missing or fails counts as not available.
export async function readProtection(manager: StorageManagerLike | undefined): Promise<ProtectionState> {
  if (typeof manager?.persisted !== 'function' || typeof manager.persist !== 'function') return 'unavailable';
  try { return (await manager.persisted()) ? 'protected' : 'unprotected'; } catch { return 'unavailable'; }
}

// Asks for protection when it is missing and the last request is old enough. The attempt is recorded before asking,
// so a refused, failed or interrupted request is not repeated at every start. Never throws: the app works either way.
export async function ensureProtection(manager: StorageManagerLike | undefined, storage: KeyValueStore | undefined, now = new Date()): Promise<ProtectionState> {
  const state = await readProtection(manager);
  if (state !== 'unprotected' || !shouldRequest(lastRequest(storage), now)) return state;
  try { storage?.setItem(protectionKey, JSON.stringify({ requestedAt: now.toISOString() })); } catch { /* storage denied: asked once in this session */ }
  try { return (await manager!.persist!()) ? 'protected' : 'unprotected'; } catch { return 'unprotected'; }
}

export const browserStorageManager = (): StorageManagerLike | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.storage as StorageManagerLike | undefined;
export const browserKeyValueStore = (): KeyValueStore | undefined => {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
};
