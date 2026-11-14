import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category } from '../../domain/category';
import type { ExpenseEntry } from '../../domain/history';
import {
  backupActive, backupReminderDue, closeSummary, confirmBackup, dueNotifications, snoozeBackup, spendingSummary, type DueNotification, type Period,
} from '../../domain/notifications';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { useNotificationPreferences, useNotificationState } from './storage';
import { usePushNotifications } from './usePushNotifications';

// The device archive's change clock (Standard mode only): the backup reminder needs to know whether the data changed
// since the last confirmed backup. In the Advanced mode there is none, so there is no backup reminder either.
export type LocalArchive = { lastChange(): Promise<string | null>; onChange(listener: () => void): () => void };

// Notifications of one archive. System notifications (Web Push, `usePushNotifications`) when the user turned them on
// in this browser: they arrive with the app closed. Otherwise the in-app notices, checked at start, when the app comes
// back to the foreground and now and then while it stays open. Never both for the same reminder.
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
  const { language } = useI18n();
  const push = usePushNotifications({ preferences, state, updateState, lastChange: archive ? lastChange : null, expenses, categories, ready,
    lang: language, backupReminders: Boolean(archive) });
  // System notifications on: the in-app notices would repeat them.
  const pushActive = push.support === 'supported' && push.status === 'active';

  return {
    preferences, changePreferences,
    // Only where a backup reminder exists (Standard): the date shown in the settings page.
    lastBackupAt: archive ? state.lastBackupAt : null,
    backupReminders: Boolean(archive),
    // While a download waits for confirmation, the reminder gives way to the question.
    due: pushActive ? [] : exportedAt ? due.filter((item) => item.kind !== 'backup') : due,
    push,
    // The backup reminder is due now (shown with its actions in the Notifications page, where a tap on it leads).
    backupDue: Boolean(archive) && ready && backupReminderDue({ preferences, state, lastChange: archive ? lastChange : null, now }),
    // The summary of a period, computed now from the data on screen (a tapped notification only carries the dates).
    summaryOf: useCallback((period: Period) => spendingSummary(expenses, categories, period, todayInRome()), [expenses, categories]),
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
