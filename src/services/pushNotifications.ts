// System notifications (Web Push) in the browser: support, service worker, permission, subscription and the
// reminder times sent to the push service. Never sends expense data: only the subscription, the language and the
// times computed by `domain/pushSchedule.ts`. Configured at build time; without configuration the feature is
// reported as unavailable and nothing is registered.
import type { PushJob } from '../domain/pushSchedule';
import { androidNotifications, requestNotificationsOnDevice } from './androidApp.ts';

// Nummo's Android app (`android/`, version 0.3.0): no Web Push in a WebView, so every function below has an app branch
// that hands the same times to the app (local notifications, Reminders.kt) instead of the push service. Without the
// app's notification methods (browsers, older apps) the browser path runs unchanged.
const app = () => androidNotifications();
const appStatus = (value: string): PushStatus => (value === 'active' || value === 'denied' ? value : 'off');

// Literal accesses: Expo inlines them at build time.
const rawUrl = process.env.EXPO_PUBLIC_NUMMO_PUSH_URL?.trim() ?? '';
const rawKey = process.env.EXPO_PUBLIC_NUMMO_PUSH_KEY?.trim() ?? '';
export const pushConfig = rawUrl && /^[A-Za-z0-9_-]{80,100}$/.test(rawKey) ? { url: rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`, key: rawKey } : null;

export type PushSupport = 'supported' | 'unsupported' | 'needs-install' | 'unconfigured';
export type PushStatus = 'active' | 'off' | 'denied';

type Env = { window?: Window & typeof globalThis; navigator?: Navigator };
const browser = (env: Env = {}) => ({ win: env.window ?? (typeof window === 'undefined' ? undefined : window), nav: env.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator) });

// iPhone and iPad offer Web Push only to an app added to the Home Screen (iOS/iPadOS 16.4+).
export function isAppleMobile(nav: Navigator | undefined): boolean {
  if (!nav) return false;
  const agent = nav.userAgent ?? '';
  return /iPad|iPhone|iPod/.test(agent) || (agent.includes('Macintosh') && nav.maxTouchPoints > 1);
}
// Opened as an installed app (Home Screen on iOS, WebAPK or installed desktop app elsewhere), not in a browser tab.
export function isStandalone(win: Window | undefined, nav: Navigator | undefined): boolean {
  if (!win || !nav) return false;
  try {
    if (win.matchMedia?.('(display-mode: standalone)').matches) return true;
  } catch { /* matchMedia unusable: the iOS flag below */ }
  return (nav as Navigator & { standalone?: boolean }).standalone === true;
}
export function pushSupport(env: Env = {}, configured = pushConfig !== null): PushSupport {
  const { win, nav } = browser(env);
  if (androidNotifications(win)) return 'supported';
  if (!win || !nav) return 'unsupported';
  // On iPhone and iPad the permission is asked only from the app added to the Home Screen, never from a Safari tab, even
  // where a tab exposes the push objects: there the request would fail silently or subscribe a tab that never receives.
  if (isAppleMobile(nav) && !isStandalone(win, nav)) return 'needs-install';
  const capable = 'serviceWorker' in nav && 'PushManager' in win && 'Notification' in win && win.isSecureContext;
  if (!capable) return 'unsupported';
  return configured ? 'supported' : 'unconfigured';
}

const toKey = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
const sameKey = (a: ArrayBuffer | null, b: Uint8Array): boolean => {
  if (!a || a.byteLength !== b.length) return false;
  const view = new Uint8Array(a);
  return view.every((byte, index) => byte === b[index]);
};

// One script URL for every registration (the offline page at startup, the notifications later): a different URL would
// replace the worker and drop the push configuration it reads from its own address.
export const serviceWorkerUrl = (config: { url: string; key: string } | null = pushConfig): string =>
  config ? `/sw.js?push=${encodeURIComponent(config.url)}&key=${config.key}` : '/sw.js';

// Failures of the browser itself (service worker, its push service), told apart from those of Nummo's push service.
const browserFailure = (error: unknown) => Object.assign(new Error('push-browser'), { stage: 'browser', cause: error });

let registration: Promise<ServiceWorkerRegistration> | null = null;
function register(): Promise<ServiceWorkerRegistration> {
  registration ??= navigator.serviceWorker.register(serviceWorkerUrl(), { scope: '/' })
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => { registration = null; throw browserFailure(error); });
  return registration;
}

async function call(method: 'PUT' | 'POST' | 'DELETE', path: string, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(new URL(path, pushConfig!.url), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok && response.status !== 202) throw Object.assign(new Error('push-service'), { status: response.status, stage: 'service' });
  return response;
}

// The current state on this device. `active` = permission granted and a subscription with the configured key.
export async function pushStatus(): Promise<PushStatus> {
  const android = app();
  if (android) return appStatus(android.notificationStatus());
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const existing = await navigator.serviceWorker.getRegistration('/');
  const subscription = await existing?.pushManager.getSubscription();
  return subscription && sameKey(subscription.options.applicationServerKey, toKey(pushConfig!.key)) ? 'active' : 'off';
}

// Must run inside a user gesture: asks the permission (once) and subscribes this browser.
export async function enablePush(lang: string, jobs: readonly PushJob[]): Promise<PushStatus> {
  const android = app();
  if (android) {
    const outcome = await requestNotificationsOnDevice(android);
    if (outcome !== 'ok') return outcome === 'unavailable' ? 'denied' : 'off';
    return android.scheduleNotifications(lang, JSON.stringify(jobs)) ? 'active' : appStatus(android.notificationStatus());
  }
  // Already refused: asking again would show nothing (browsers do not prompt twice), so say so without a request.
  if (Notification.permission === 'denied') return 'denied';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await register();
  const key = toKey(pushConfig!.key);
  // The browser registers with its own push service (Google, Mozilla, Apple…): failures there are not ours. One
  // subscription per browser: an existing one with our key is reused, never doubled.
  let subscription: PushSubscription | null;
  try {
    subscription = await reg.pushManager.getSubscription();
    // A subscription made with another key (service changed) cannot receive our messages: replace it.
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) { await subscription.unsubscribe(); subscription = null; }
    subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  } catch (error) { throw browserFailure(error); }
  try { await call('PUT', 'v1/subscription', { subscription: subscription.toJSON(), lang, jobs }); }
  catch (error) {
    // Not registered with the push service: nothing would arrive, so the device must not look subscribed.
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
  return 'active';
}

// Turns system notifications off on this device: the service forgets it, then the browser drops the subscription.
export async function disablePush(): Promise<void> {
  const android = app();
  if (android) { android.disableNotifications(); return; }
  const reg = await navigator.serviceWorker.getRegistration('/');
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  try { await call('DELETE', 'v1/subscription', { subscription: subscription.toJSON() }); } finally { await subscription.unsubscribe(); }
}

// Sends the reminder times computed now (an empty list cancels them). Re-registers the service worker, so a new
// version of sw.js is picked up.
export async function syncPush(lang: string, jobs: readonly PushJob[]): Promise<boolean> {
  const android = app();
  if (android) return android.scheduleNotifications(lang, JSON.stringify(jobs));
  const reg = await register();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return false;
  await call('PUT', 'v1/subscription', { subscription: subscription.toJSON(), lang, jobs });
  return true;
}

// Visual test: a real system notification shown by the service worker, without the push service.
export async function showLocalTest(lang: string): Promise<void> {
  const android = app();
  if (android) { android.testNotification(lang, 0); return; }
  const reg = await register();
  (reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: 'nummo-local-test', lang });
}
// Delivery test: the push service sends a real push now (0) or after a delay, so the app can be closed meanwhile.
export async function requestPushTest(lang: string, delaySeconds: number): Promise<'ok' | 'rate' | 'gone' | 'error'> {
  const android = app();
  if (android) { android.testNotification(lang, delaySeconds); return 'ok'; }
  const reg = await register();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return 'gone';
  try { await call('POST', 'v1/test', { subscription: subscription.toJSON(), lang, delaySeconds }); return 'ok'; }
  catch (error) { const status = (error as { status?: number }).status; return status === 429 ? 'rate' : status === 410 ? 'gone' : 'error'; }
}

// Postponements chosen on a notification while the app was closed (written by sw.js), read once and cleared.
export function takeSnoozes(): Promise<string[]> {
  const android = app();
  if (android) {
    try {
      const value = JSON.parse(android.takeSnoozes()) as unknown;
      return Promise.resolve(Array.isArray(value) ? value.filter((at): at is string => typeof at === 'string' && !Number.isNaN(Date.parse(at))) : []);
    } catch { return Promise.resolve([]); }
  }
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve([]); return; }
    const open = indexedDB.open('nummo-push', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('events', { autoIncrement: true });
    open.onerror = () => resolve([]);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const all = store.getAll();
      all.onsuccess = () => store.clear();
      tx.oncomplete = () => { db.close(); resolve((all.result as { type: string; at: string }[]).filter((e) => e.type === 'snooze').map((e) => e.at)); };
      tx.onerror = () => { db.close(); resolve([]); };
    };
  });
}

// A notification tapped: the page to open. From the URL at start (new window) or a message (window already open).
export type OpenedNotification = { kind: 'backup' | 'summary' | 'renewal' | 'test' | 'local' | 'other'; from: string | null; to: string | null };
const civil = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
export function parseOpened(kind: unknown, from: unknown, to: unknown): OpenedNotification | null {
  if (typeof kind !== 'string' || !['backup', 'summary', 'renewal', 'test', 'local', 'other'].includes(kind)) return null;
  return { kind: kind as OpenedNotification['kind'], from: civil(from) ? from : null, to: civil(to) ? to : null };
}
let pending: OpenedNotification | null = null;
const listeners = new Set<(opened: OpenedNotification) => void>();
if (typeof window !== 'undefined') {
  const query = new URLSearchParams(window.location.search);
  pending = parseOpened(query.get('notifica'), query.get('dal'), query.get('al'));
  if (pending) {
    // Removed from the address bar: a reload must not reopen it.
    ['notifica', 'dal', 'al'].forEach((name) => query.delete(name));
    const search = query.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }
  const deliver = (opened: OpenedNotification | null) => {
    if (!opened) return;
    if (listeners.size === 0) pending = opened;
    listeners.forEach((listener) => listener(opened));
  };
  navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as Record<string, unknown> | null;
    if (data?.type !== 'nummo-notification') return;
    deliver(parseOpened(data.kind, data.from, data.to));
  });
  // The Android app, for a notification tapped while Nummo is open (MainActivity.onNewIntent).
  (window as unknown as { nummoNotificationOpened?: (kind: unknown, from: unknown, to: unknown) => void })
    .nummoNotificationOpened = (kind, from, to) => deliver(parseOpened(kind, from, to));
}
// The workspace listens while mounted; a notification tapped before it is ready is delivered at subscription.
export function onNotificationOpened(listener: (opened: OpenedNotification) => void): () => void {
  listeners.add(listener);
  if (pending) { const opened = pending; pending = null; listener(opened); }
  return () => listeners.delete(listener);
}

// At startup, for everyone: the worker shows Nummo's own offline page when the app cannot load (instead of the
// browser's). It never caches the app or any data (public/sw.js). After the page has loaded, so it never delays it.
export function registerServiceWorker(env: Env = {}): void {
  const { win, nav } = browser(env);
  if (!win || !nav || !('serviceWorker' in nav) || !win.isSecureContext) return;
  const start = () => { void register().catch(() => { /* not available (private mode, blocked): the browser's page stays */ }); };
  if (win.document.readyState === 'complete') win.setTimeout(start, 0);
  else win.addEventListener('load', () => win.setTimeout(start, 0), { once: true });
}
