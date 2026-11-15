import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '../../domain/category';
import type { ExpenseEntry } from '../../domain/history';
import { snoozeBackup, type NotificationPreferences, type NotificationState } from '../../domain/notifications';
import { pushJobs, resolveTimeZone, type PushJob } from '../../domain/pushSchedule';
import {
  disablePush, enablePush, pushStatus, pushSupport, requestPushTest, showLocalTest, syncPush, takeSnoozes,
  type PushStatus, type PushSupport,
} from '../../services/pushNotifications';

// Last reminder times sent from this browser (`nummo.push.v1`): avoids sending the same list at every render, and
// refreshes it at least once a day so the service knows the device is still in use.
const syncKey = 'nummo.push.v1';
const refreshAfter = 86_400_000;
const readSync = (): { signature: string; at: number } | null => {
  try {
    const value = JSON.parse(localStorage.getItem(syncKey) ?? 'null') as unknown;
    return value && typeof value === 'object' && typeof (value as { signature?: unknown }).signature === 'string' && typeof (value as { at?: unknown }).at === 'number'
      ? value as { signature: string; at: number } : null;
  } catch { return null; }
};
const writeSync = (value: { signature: string; at: number } | null) => {
  try { if (value) localStorage.setItem(syncKey, JSON.stringify(value)); else localStorage.removeItem(syncKey); } catch { /* sent again next time */ }
};
// An overdue backup reminder is computed as "now": that moving instant must not count as a change.
const signature = (lang: string, jobs: readonly PushJob[], now: number) =>
  JSON.stringify([lang, jobs.map((job) => job.kind === 'backup' && Date.parse(job.at) <= now + 60_000 ? { ...job, at: 'due' } : job)]);

export type PushState = {
  support: PushSupport;
  // null while it is being read.
  status: PushStatus | null;
  // Last failure: the browser could not subscribe to its own push service, or Nummo's push service did not answer.
  failure: 'browser' | 'service' | null;
  busy: boolean;
  enable(): Promise<void>;
  disable(): Promise<void>;
  localTest(): Promise<boolean>;
  remoteTest(delaySeconds: number): Promise<'ok' | 'rate' | 'gone' | 'error'>;
};

// System notifications of this browser, for one archive. While they are active, the reminder times are computed here
// from the data (which the push service never sees) and sent again whenever they change.
export function usePushNotifications({ preferences, state, updateState, lastChange, expenses, categories, ready, lang, backupReminders, timeZone }: {
  preferences: NotificationPreferences; state: NotificationState; updateState: (update: (current: NotificationState) => NotificationState) => void;
  lastChange: string | null; expenses: readonly ExpenseEntry[]; categories: readonly Category[]; ready: boolean; lang: string; backupReminders: boolean; timeZone: string;
}): PushState {
  const [support] = useState(() => pushSupport());
  const [status, setStatus] = useState<PushStatus | null>(support === 'supported' ? null : 'off');
  const [failure, setFailure] = useState<'browser' | 'service' | null>(null);
  const [busy, setBusy] = useState(false);
  const jobs = useRef<PushJob[]>([]);
  const compute = () => pushJobs({ preferences, state, expenses, categories, now: new Date(), lastChange: backupReminders ? lastChange : null, timeZone: resolveTimeZone(timeZone) });

  // Status at start and when the page comes back (the permission may have changed in the browser settings).
  useEffect(() => {
    if (support !== 'supported') return;
    let active = true;
    const read = () => { pushStatus().then((next) => { if (active) setStatus(next); }, () => { if (active) setStatus('off'); }); };
    read();
    const visible = () => { if (document.visibilityState === 'visible') read(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; document.removeEventListener('visibilitychange', visible); };
  }, [support]);

  // «Ricordamelo tra 3 giorni» pressed on a notification while the app was closed: recorded in this archive's state.
  useEffect(() => {
    if (!backupReminders || support !== 'supported') return;
    takeSnoozes().then((times) => { for (const at of times) updateState((current) => snoozeBackup(current, new Date(at))); }, () => {});
  }, [backupReminders, support, updateState]);

  // Sends the reminder times when they change (after a short pause: several changes in a row make one request).
  useEffect(() => {
    if (status !== 'active' || !ready) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      jobs.current = compute();
      const next = signature(lang, jobs.current, now);
      const last = readSync();
      if (last && last.signature === next && now - last.at < refreshAfter) return;
      syncPush(lang, jobs.current).then((subscribed) => {
        setFailure(null);
        if (subscribed) writeSync({ signature: next, at: now }); else { writeSync(null); setStatus('off'); }
      }, () => setFailure('service'));
    }, 1500);
    return () => clearTimeout(timer);
  });

  const enable = async () => {
    setBusy(true);
    try {
      const next = await enablePush(lang, compute());
      setStatus(next); setFailure(null);
      writeSync(null);
    } catch (error) {
      setFailure((error as { stage?: string }).stage === 'browser' ? 'browser' : 'service');
      setStatus(await pushStatus().catch(() => 'off' as const));
    }
    finally { setBusy(false); }
  };
  const disable = useCallback(async () => {
    setBusy(true);
    try { await disablePush(); setFailure(null); } catch { setFailure('service'); }
    finally { writeSync(null); setStatus(await pushStatus().catch(() => 'off' as const)); setBusy(false); }
  }, []);
  const localTest = useCallback(async () => { try { await showLocalTest(lang); return true; } catch { return false; } }, [lang]);
  const remoteTest = useCallback((delaySeconds: number) => requestPushTest(lang, delaySeconds).catch(() => 'error' as const), [lang]);
  return { support, status, failure, busy, enable, disable, localTest, remoteTest };
}
