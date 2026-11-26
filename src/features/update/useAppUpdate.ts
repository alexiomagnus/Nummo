import { useCallback, useEffect, useRef, useState } from 'react';
import { availableUpdate, updateCheckDue, type AppRelease } from '../../domain/appUpdate';
import { androidAppVersion } from '../../services/androidApp';
import { fetchReleases, lastUpdateCheck, ReleasesError, saveUpdateCheck, type ReleasesFailure } from '../../services/appUpdate';

export type UpdateCheck =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'available'; release: AppRelease }
  | { kind: 'failed'; reason: ReleasesFailure };

// The releases and the check against the installed app. Only the Android app has a version to compare (0.3.5+): elsewhere
// `installed` is null and nothing is asked. Every check (automatic or from Info) records its time, so the automatic one runs
// at most once a day.
export function useAppUpdate() {
  const [installed] = useState(() => androidAppVersion()?.name ?? null);
  const [check, setCheck] = useState<UpdateCheck>({ kind: 'idle' });
  const [releases, setReleases] = useState<AppRelease[] | null>(null);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  const load = useCallback(async (): Promise<AppRelease[] | ReleasesFailure | null> => {
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    try {
      const found = await fetchReleases(controller.signal);
      setReleases(found);
      return found;
    } catch (error) {
      if (controller.signal.aborted) return null;
      return error instanceof ReleasesError ? error.reason : 'unavailable';
    } finally {
      if (running.current === controller) running.current = null;
    }
  }, []);

  const run = useCallback(async (): Promise<UpdateCheck> => {
    if (!installed) return { kind: 'idle' };
    setCheck({ kind: 'checking' });
    saveUpdateCheck(Date.now());
    const found = await load();
    if (found === null) return { kind: 'idle' };
    const next: UpdateCheck = typeof found === 'string' ? { kind: 'failed', reason: found }
      : (() => { const release = availableUpdate(installed, found); return release ? { kind: 'available', release } as const : { kind: 'current' } as const; })();
    setCheck(next);
    return next;
  }, [installed, load]);

  // The automatic check: only in the app, at most once every 24 hours.
  const runIfDue = useCallback(async (): Promise<UpdateCheck> => {
    if (!installed || !updateCheckDue(lastUpdateCheck(), Date.now())) return { kind: 'idle' };
    return run();
  }, [installed, run]);

  return { installed, check, releases, run, runIfDue, load };
}
