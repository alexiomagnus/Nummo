import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeBackup } from '../../domain/backup';
import {
  autoBackupDue, backupFileName, backupsToPrune, defaultDriveSettings, driveSettingsKey, isEmptyArchive, parseDriveSettings, readBackup,
  type BackupFrequency, type BackupSummary, type DriveFile, type DriveSettings,
} from '../../domain/driveBackup';
import { driveToken, forgetDriveAccess, googleClientId, requestDriveAccess, revokeDriveAccess } from '../../services/googleAuth';
import { createDriveClient, DriveError } from '../../services/googleDrive';
import type { LocalStore } from '../../services/localStore';
import { download } from '../backup/BackupActions';

function load(): DriveSettings {
  try { return parseDriveSettings(localStorage.getItem(driveSettingsKey)); } catch { return defaultDriveSettings; }
}
const describe = (reason: unknown) => reason instanceof Error ? reason.message : 'Operazione non riuscita. Riprova.';

// Google Drive backups of the device archive. Lives above the pages (it survives navigation): the settings section only
// draws it. Drive is asked for access only from a button press; the token stays in memory (googleAuth.ts).
// The automatic backup runs while the app is open and access is still valid; when it is due without access it waits
// for one press (`autoWaiting`) instead of opening a Google window on its own.
export function useDriveBackup(store: LocalStore) {
  const client = useMemo(() => createDriveClient(driveToken), []);
  const [settings, setSettings] = useState(load);
  const settingsRef = useRef(settings);
  const [busy, setBusy] = useState<'connect' | 'backup' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const working = useRef(false);
  const available = googleClientId !== '';

  const save = useCallback((change: Partial<DriveSettings>) => {
    const next = { ...settingsRef.current, ...change };
    settingsRef.current = next;
    setSettings(next);
    try { localStorage.setItem(driveSettingsKey, JSON.stringify(next)); } catch { /* session-only */ }
  }, []);

  // One operation at a time; a refused token is forgotten so that the next press asks Google again.
  const run = useCallback(async <T,>(kind: 'connect' | 'backup' | 'restore', work: () => Promise<T>): Promise<T | null> => {
    if (working.current) return null;
    working.current = true; setBusy(kind); setError(null);
    try { return await work(); }
    catch (reason) {
      if (reason instanceof DriveError && reason.kind === 'auth') forgetDriveAccess();
      setError(describe(reason));
      return null;
    } finally { working.current = false; setBusy(null); }
  }, []);

  // Uploads a new file, then drops the oldest ones. `automatic` never uploads an empty archive.
  const upload = useCallback(async (automatic: boolean) => {
    const startedAt = new Date();
    const snapshot = await store.exportSnapshot();
    if (automatic && isEmptyArchive(snapshot)) return false;
    await client.upload(backupFileName(startedAt), makeBackup(snapshot, startedAt));
    save({ lastBackupAt: startedAt.toISOString() });
    setAutoWaiting(false);
    // Housekeeping only: the new backup is already safe.
    try { for (const file of backupsToPrune(await client.list())) await client.remove(file.id); } catch { /* retried after the next backup */ }
    return true;
  }, [client, save, store]);

  const checkAuto = useCallback(async () => {
    const current = settingsRef.current;
    if (!available || working.current || !current.connected || !current.auto) { setAutoWaiting(false); return; }
    let lastChange: string | null;
    try { lastChange = await store.lastChange(); } catch { return; }
    if (!autoBackupDue({ settings: current, lastChange, empty: false, now: new Date() })) { setAutoWaiting(false); return; }
    if (!driveToken()) { setAutoWaiting(true); return; }
    if (!navigator.onLine) return;
    await run('backup', () => upload(true));
  }, [available, run, store, upload]);
  useEffect(() => {
    void checkAuto();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // After a burst of edits, not at each one.
    const stop = store.onChange(() => { clearTimeout(timer); timer = setTimeout(() => void checkAuto(), 5000); });
    const interval = setInterval(() => void checkAuto(), 5 * 60 * 1000);
    const online = () => void checkAuto();
    window.addEventListener('online', online);
    return () => { stop(); clearTimeout(timer); clearInterval(interval); window.removeEventListener('online', online); };
  }, [checkAuto, store]);

  return {
    available, settings, busy, error, autoWaiting,
    clearError: () => setError(null),
    // Checks the access right away with a first read of the application folder.
    connect: () => run('connect', async () => { await requestDriveAccess(); await client.list(); save({ connected: true }); void checkAuto(); return true; }),
    disconnect: () => { revokeDriveAccess(); setError(null); setAutoWaiting(false); save({ connected: false, auto: false }); },
    backupNow: () => run('backup', async () => { await requestDriveAccess(); return upload(false); }),
    setAuto: (auto: boolean) => { save({ auto }); void checkAuto(); },
    setFrequency: (frequency: BackupFrequency) => { save({ frequency }); void checkAuto(); },
    listBackups: () => run('restore', async (): Promise<DriveFile[]> => { await requestDriveAccess(); return client.list(); }),
    // Downloads and validates the whole file; nothing on the device changes.
    openBackup: (file: DriveFile) => run('restore', async (): Promise<BackupSummary> => { await requestDriveAccess(); return readBackup(await client.download(file)); }),
    // Replaces the device archive with the backup in one local transaction, after saving a copy of the current data.
    restore: (summary: BackupSummary) => run('restore', async () => {
      const current = await store.exportSnapshot();
      if (!isEmptyArchive(current)) download('nummo-backup-prima-del-ripristino.json', makeBackup(current), 'application/json');
      const { data } = summary;
      await store.importRecords(data.expenses, data.categories, 'replace', data.funds, data.movements, data.lists, data.budget);
      return true;
    }),
  };
}
export type DriveBackup = ReturnType<typeof useDriveBackup>;
