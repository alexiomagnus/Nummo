import { useEffect, useState } from 'react';
import type { AppRelease } from '../../domain/appUpdate';
import { UpdateDialog } from './UpdateDialog';
import { useAppUpdate } from './useAppUpdate';

// The automatic check at the start of the Android app (27 November, on request; **at every start and mandatory** from 28 November, on
// request): a few seconds after the start (the page first settles: startup, lock), then «Aggiornamento disponibile» if GitHub has a newer
// release, a screen that cannot be dismissed until the update is installed (`required` of `UpdateDialog`). A failed or offline check stays
// silent and the app is usable (retried at the next start, or from Info). Nothing in the browser.
const startDelay = 3000;

export function AppUpdateCheck() {
  const { installed, run } = useAppUpdate();
  const [release, setRelease] = useState<AppRelease | null>(null);
  useEffect(() => {
    if (!installed) return;
    let live = true;
    const timer = setTimeout(() => {
      void run().then((result) => { if (live && result.kind === 'available') setRelease(result.release); });
    }, startDelay);
    return () => { live = false; clearTimeout(timer); };
  }, [installed, run]);
  if (!installed) return null;
  return <UpdateDialog release={release} installed={installed} onClose={() => setRelease(null)} required />;
}
