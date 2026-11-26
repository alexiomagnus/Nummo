import { useCallback, useSyncExternalStore } from 'react';
import { noProfileImage, parseProfileImage, profileImageKeyFor, serializeProfileImage, type ProfileImage } from './profileImage';

// Shared by the account button and the Settings card (picture and, in the Advanced mode, the ring's colour), and between tabs (the `storage` event). `scope`: `local`
// (Standard) or the UID (Advanced, see `profileImageKeyFor`). One parsed value per key and raw string, so
// `useSyncExternalStore` sees a stable snapshot.
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; image: ProfileImage }>();

function readRaw(key: string): string | null {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
}

function snapshot(key: string): ProfileImage {
  const raw = readRaw(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.image;
  const image = parseProfileImage(raw);
  cache.set(key, { raw, image });
  return image;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key.startsWith('nummo.profile')) listener(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

// False when the browser refuses to keep it (storage full or blocked): the caller says so.
export function saveProfileImage(image: ProfileImage, scope: string): boolean {
  const key = profileImageKeyFor(scope);
  const raw = serializeProfileImage(image);
  try {
    if (raw === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, raw);
  } catch { return false; }
  for (const listener of listeners) listener();
  return true;
}

export function useProfileImage(scope: string): ProfileImage {
  const key = profileImageKeyFor(scope);
  const read = useCallback(() => snapshot(key), [key]);
  return useSyncExternalStore(subscribe, read, () => noProfileImage);
}
