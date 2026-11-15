import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category } from '../../domain/category';
import type { ExpenseEntry } from '../../domain/history';
import {
  backupReminderDue, closeSummary, recordBackup, snoozeBackup, spendingSummary, type Period,
} from '../../domain/notifications';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { useNotificationPreferences, useNotificationState } from './storage';
import { usePushNotifications } from './usePushNotifications';

// The device archive's change clock (Standard mode only): the backup reminder needs to know whether the data changed
// since the last backup. In the Advanced mode there is none, so there is no backup reminder either.
export type LocalArchive = { lastChange(): Promise<string | null>; onChange(listener: () => void): () => void };

// Notifications of one archive: only system notifications (Web Push, `usePushNotifications`), when the user turned them
// on in this browser. There are no notices inside the app; the Notifications page, where a tapped notification leads,
// shows the settings, the backup reminder's actions and the summary of the tapped period.
export function useNotifications({ scope, expenses, categories, ready, archive, timeZone }: {
  // The zone of the notification hour: «auto» (device) or an IANA name.
  timeZone: string; scope: string; expenses: readonly ExpenseEntry[]; categories: readonly Category[]; ready: boolean; archive?: LocalArchive;
}) {
  const [preferences, changePreferences] = useNotificationPreferences();
  const [state, updateState] = useNotificationState(scope);
  const [now, setNow] = useState(() => new Date());
  const [lastChange, setLastChange] = useState<string | null>(null);

  // Back to the foreground: the reminder state of the Notifications page is recomputed.
  useEffect(() => {
    const wake = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => { document.removeEventListener('visibilitychange', wake); window.removeEventListener('focus', wake); };
  }, []);
  useEffect(() => {
    if (!archive) { setLastChange(null); return; }
    let active = true;
    const load = () => { archive.lastChange().then((value) => { if (active) setLastChange(value); }, () => { /* unknown: no reminder */ }); };
    load();
    const stop = archive.onChange(load);
    return () => { active = false; stop(); };
  }, [archive, now]);

  const { language } = useI18n();
  const push = usePushNotifications({ preferences, state, updateState, lastChange: archive ? lastChange : null, expenses, categories, ready,
    lang: language, backupReminders: Boolean(archive), timeZone });

  return {
    preferences, changePreferences,
    // Only where a backup reminder exists (Standard): the date shown in the settings page.
    lastBackupAt: archive ? state.lastBackupAt : null,
    backupReminders: Boolean(archive),
    push,
    // The backup reminder is due now (shown with its actions in the Notifications page, where a tap on it leads).
    backupDue: Boolean(archive) && ready && backupReminderDue({ preferences, state, lastChange: archive ? lastChange : null, now }),
    // The summary of a period, computed now from the data on screen (a tapped notification only carries the dates).
    summaryOf: useCallback((period: Period) => spendingSummary(expenses, categories, period, todayInRome()), [expenses, categories]),
    // A full backup was downloaded (Settings or the reminder): it counts as the last backup, no confirmation asked.
    backupDownloaded: useCallback((at: string) => { if (archive) updateState((current) => recordBackup(current, at)); }, [archive, updateState]),
    snoozeBackup: useCallback(() => updateState((current) => snoozeBackup(current, new Date())), [updateState]),
    closeSummary: useCallback((period: Period) => updateState((current) => closeSummary(current, period)), [updateState]),
  };
}
export type Notifications = ReturnType<typeof useNotifications>;
