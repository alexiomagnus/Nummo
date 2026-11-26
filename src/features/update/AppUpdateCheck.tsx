import { useEffect, useState } from 'react';
import type { AppRelease } from '../../domain/appUpdate';
import { UpdateDialog } from './UpdateDialog';
import { useAppUpdate } from './useAppUpdate';

// The automatic check at the start of the Android app (27 November, on request): at most once every 24 hours, a few seconds
// after the start (the page first settles: startup, lock), then «Aggiornamento disponibile» if GitHub has a newer release.
// A failed check stays silent (it is retried the next day, or from Info). Nothing in the browser.
const startDelay = 3000;

export function AppUpdateCheck() {
  const { installed, runIfDue } = useAppUpdate();
  const [release, setRelease] = useState<AppRelease | null>(null);
  useEffect(() => {
    if (!installed) return;
    let live = true;
    const timer = setTimeout(() => {
      void runIfDue().then((result) => { if (live && result.kind === 'available') setRelease(result.release); });
    }, startDelay);
    return () => { live = false; clearTimeout(timer); };
  }, [installed, runIfDue]);
  if (!installed) return null;
  return <UpdateDialog release={release} installed={installed} onClose={() => setRelease(null)} />;
}
