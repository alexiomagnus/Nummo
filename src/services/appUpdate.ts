import { readReleases, readUpdateCheckState, releasesApiUrl, type AppRelease } from '../domain/appUpdate.ts';

// The app's releases from GitHub's public API (no token, no backend: 60 requests an hour per address, one a day here).
// Only the repository's public release list is read; nothing about the user is sent.
export type ReleasesFailure = 'offline' | 'limited' | 'unavailable';
export class ReleasesError extends Error {
  readonly reason: ReleasesFailure;
  constructor(reason: ReleasesFailure) { super(reason); this.reason = reason; }
}

export async function fetchReleases(signal?: AbortSignal, request: typeof fetch = fetch): Promise<AppRelease[]> {
  let response: Response;
  try {
    response = await request(releasesApiUrl, { signal, headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ReleasesError('offline');
  }
  if (response.status === 403 || response.status === 429) throw new ReleasesError('limited');
  if (!response.ok) throw new ReleasesError('unavailable');
  try { return readReleases(await response.json()); } catch { throw new ReleasesError('unavailable'); }
}

// When the last automatic check ran (`nummo.appUpdate.v1`): only a time, never data.
const storageKey = 'nummo.appUpdate.v1';
export function lastUpdateCheck(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): number | null {
  try { return readUpdateCheckState(storage?.getItem(storageKey) ?? null).checkedAt; } catch { return null; }
}
export function saveUpdateCheck(at: number, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try { storage?.setItem(storageKey, JSON.stringify({ checkedAt: at })); } catch { /* storage full or blocked: check again next time */ }
}
