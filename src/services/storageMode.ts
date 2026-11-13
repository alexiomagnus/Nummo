// Where the archive lives, chosen on the first screen and remembered in this browser (a preference, never data):
// - standard: on this device (IndexedDB), no account, optional Google Drive backups;
// - advanced: the user's own Firebase project (BYOF), Google sign-in, Firestore.
// The two archives are separate: changing mode never copies, moves or deletes anything.
import type { SessionHint } from './sessionHint.ts';

export const storageModeKey = 'nummo.storageMode.v1';
export type StorageMode = 'standard' | 'advanced';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const parseStorageMode = (raw: string | null): StorageMode | null => raw === 'standard' || raw === 'advanced' ? raw : null;

export function readStorageMode(storage: Storage = localStorage): StorageMode | null {
  try { return parseStorageMode(storage.getItem(storageModeKey)); } catch { return null; }
}
export function writeStorageMode(mode: StorageMode | null, storage: Storage = localStorage): void {
  try { if (mode) storage.setItem(storageModeKey, mode); else storage.removeItem(storageModeKey); } catch { /* storage denied: the choice lasts for the session */ }
}

// No choice saved yet: a browser whose last visit ended signed in to Firebase (before the two modes existed) keeps
// opening its Firebase archive; everyone else is asked.
export function initialStorageMode(stored: StorageMode | null, hint: SessionHint | null): StorageMode | null {
  return stored ?? (hint !== null ? 'advanced' : null);
}
