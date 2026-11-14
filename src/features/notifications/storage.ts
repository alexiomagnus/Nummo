import { useCallback, useEffect, useRef, useState } from 'react';
import {
  changeNotificationPreferences, notificationPreferencesKey, notificationStateKey, parseNotificationPreferences, parseNotificationState,
  type NotificationPreferences, type NotificationState,
} from '../../domain/notifications';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* kept for this session only */ } };

// A value kept in this browser and shared by every open tab: a change made in one tab (a reminder postponed, a summary
// closed) reaches the others through the `storage` event, so no notice is shown twice.
function useStored<T>(key: string, parse: (raw: string | null) => T, initialise: boolean): [T, (update: (current: T) => T) => void] {
  const [value, setValue] = useState(() => parse(read(key)));
  const current = useRef(value);
  useEffect(() => {
    const now = parse(read(key));
    current.current = now; setValue(now);
    // Saved at once, so the starting date of a new archive is fixed at its first visit.
    if (initialise && read(key) === null) write(key, now);
    const sync = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = parse(event.newValue);
      current.current = next; setValue(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  const update = useCallback((change: (value: T) => T) => {
    // Always from the latest saved value: another tab may have changed it since this one last rendered.
    const raw = read(key);
    const next = change(raw === null ? current.current : parse(raw));
    current.current = next; setValue(next); write(key, next);
  }, [key]);
  return [value, update];
}

export function useNotificationPreferences(): [NotificationPreferences, (change: Partial<NotificationPreferences>) => void] {
  const [preferences, update] = useStored(notificationPreferencesKey, parseNotificationPreferences, false);
  const change = useCallback((next: Partial<NotificationPreferences>) => update((current) => changeNotificationPreferences(current, next, new Date())), [update]);
  return [preferences, change];
}

// `scope`: the archive (`local` or the Firebase UID): each keeps its own dates.
export function useNotificationState(scope: string): [NotificationState, (update: (current: NotificationState) => NotificationState) => void] {
  return useStored(notificationStateKey(scope), (raw) => parseNotificationState(raw, new Date()), true);
}
