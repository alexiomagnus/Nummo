import { useEffect, useState } from 'react';
import type { AppRelease } from '../../domain/appUpdate';
import { UpdateDialog } from './UpdateDialog';
import { useAppUpdate } from './useAppUpdate';

// The automatic check at the start of the Android app (27 November, on request; **at every start**, 28 November): as soon as the app
// starts (no delay) it asks GitHub and, if a newer release exists, «Aggiornamento disponibile» is the first thing shown over the app. The user
// may postpone («Più tardi», Back): it comes back at the next start. A failed or offline check stays silent. Nothing in the browser.

export function AppUpdateCheck() {
  const { installed, run } = useAppUpdate();
  const [release, setRelease] = useState<AppRelease | null>(null);
  useEffect(() => {
    if (!installed) return;
    let live = true;
    void run().then((result) => { if (live && result.kind === 'available') setRelease(result.release); });
    return () => { live = false; };
  }, [installed, run]);
  if (!installed) return null;
  return <UpdateDialog release={release} installed={installed} onClose={() => setRelease(null)} />;
}
