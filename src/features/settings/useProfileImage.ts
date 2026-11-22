import { useSyncExternalStore } from 'react';
import { noProfileImage, parseProfileImage, profileImageKey, serializeProfileImage, type ProfileImage } from './profileImage';

// Shared by the account button and the Settings card, and between tabs (the `storage` event): one parsed value per raw
// string, so `useSyncExternalStore` sees a stable snapshot.
const listeners = new Set<() => void>();
let cached: { raw: string | null; image: ProfileImage } = { raw: null, image: noProfileImage };

function readRaw(): string | null {
  try { return globalThis.localStorage?.getItem(profileImageKey) ?? null; } catch { return null; }
}

function snapshot(): ProfileImage {
  const raw = readRaw();
  if (raw !== cached.raw) cached = { raw, image: parseProfileImage(raw) };
  return cached.image;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === profileImageKey) listener(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

// False when the browser refuses to keep it (storage full or blocked): the caller says so.
export function saveProfileImage(image: ProfileImage): boolean {
  const raw = serializeProfileImage(image);
  try {
    if (raw === null) globalThis.localStorage?.removeItem(profileImageKey);
    else globalThis.localStorage?.setItem(profileImageKey, raw);
  } catch { return false; }
  for (const listener of listeners) listener();
  return true;
}

export function useProfileImage(): ProfileImage {
  return useSyncExternalStore(subscribe, snapshot, () => noProfileImage);
}
