import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category } from '../../domain/category';
import type { ExpenseEntry } from '../../domain/history';
import {
  backupActive, closeSummary, confirmBackup, dueNotifications, snoozeBackup, type DueNotification, type Period,
} from '../../domain/notifications';
import { todayInRome } from '../../domain/policy';
import { useNotificationPreferences, useNotificationState } from './storage';

// The device archive's change clock (Standard mode only): the backup reminder needs to know whether the data changed
// since the last confirmed backup. In the Advanced mode there is none, so there is no backup reminder either.
export type LocalArchive = { lastChange(): Promise<string | null>; onChange(listener: () => void): () => void };

// In-app notifications: checked at start, when the app comes back to the foreground, and now and then while it stays
// open. Shown as discreet notices inside the page; never system notifications, never with the app closed.
export function useNotifications({ scope, expenses, categories, ready, archive }: {
  scope: string; expenses: readonly ExpenseEntry[]; categories: readonly Category[]; ready: boolean; archive?: LocalArchive;
}) {
  const [preferences, changePreferences] = useNotificationPreferences();
  const [state, updateState] = useNotificationState(scope);
  const [now, setNow] = useState(() => new Date());
  const [lastChange, setLastChange] = useState<string | null>(null);
  // A full backup whose download started in this session and that the user has not confirmed yet.
  const [exportedAt, setExportedAt] = useState<string | null>(null);

  useEffect(() => {
    const wake = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    const timer = setInterval(wake, 15 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', wake); window.removeEventListener('focus', wake); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!archive) { setLastChange(null); return; }
    let active = true;
    const load = () => { archive.lastChange().then((value) => { if (active) setLastChange(value); }, () => { /* unknown: no reminder */ }); };
    load();
    const stop = archive.onChange(load);
    return () => { active = false; stop(); };
  }, [archive, now]);

  const due: DueNotification[] = useMemo(() => ready ? dueNotifications({
    preferences, state, expenses, categories, today: todayInRome(now), lastChange: archive ? lastChange : null, now,
  }) : [], [ready, preferences, state, expenses, categories, now, lastChange, archive]);
  const reminders = Boolean(archive) && backupActive(preferences);

  return {
    preferences, changePreferences,
    // Only where a backup reminder exists (Standard): the date shown in the settings page.
    lastBackupAt: archive ? state.lastBackupAt : null,
    backupReminders: Boolean(archive),
    // While a download waits for confirmation, the reminder gives way to the question.
    due: exportedAt ? due.filter((item) => item.kind !== 'backup') : due,
    exportedAt: reminders ? exportedAt : null,
    backupDownloaded: useCallback((at: string) => setExportedAt(at), []),
    confirmBackup: useCallback(() => {
      if (exportedAt) updateState((current) => confirmBackup(current, exportedAt));
      setExportedAt(null);
    }, [exportedAt, updateState]),
    notConfirmed: useCallback(() => setExportedAt(null), []),
    snoozeBackup: useCallback(() => updateState((current) => snoozeBackup(current, new Date())), [updateState]),
    closeSummary: useCallback((period: Period) => updateState((current) => closeSummary(current, period)), [updateState]),
  };
}
export type Notifications = ReturnType<typeof useNotifications>;
