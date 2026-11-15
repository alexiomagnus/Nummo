// System notifications (Web Push) in the browser: support, service worker, permission, subscription and the
// reminder times sent to the push service. Never sends expense data: only the subscription, the language and the
// times computed by `domain/pushSchedule.ts`. Configured at build time; without configuration the feature is
// reported as unavailable and nothing is registered.
import type { PushJob } from '../domain/pushSchedule';

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
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.userAgent.includes('Macintosh') && nav.maxTouchPoints > 1);
}
export function pushSupport(env: Env = {}, configured = pushConfig !== null): PushSupport {
  const { win, nav } = browser(env);
  if (!win || !nav) return 'unsupported';
  const capable = 'serviceWorker' in nav && 'PushManager' in win && 'Notification' in win && win.isSecureContext;
  if (!capable) {
    const standalone = win.matchMedia?.('(display-mode: standalone)').matches || (nav as Navigator & { standalone?: boolean }).standalone === true;
    return isAppleMobile(nav) && !standalone ? 'needs-install' : 'unsupported';
  }
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

let registration: Promise<ServiceWorkerRegistration> | null = null;
function register(): Promise<ServiceWorkerRegistration> {
  const config = pushConfig!;
  registration ??= navigator.serviceWorker.register(`/sw.js?push=${encodeURIComponent(config.url)}&key=${config.key}`, { scope: '/' })
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => { registration = null; throw error; });
  return registration;
}

async function call(method: 'PUT' | 'POST' | 'DELETE', path: string, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(new URL(path, pushConfig!.url), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok && response.status !== 202) throw Object.assign(new Error('push-service'), { status: response.status, stage: 'service' });
  return response;
}

// The current state on this device. `active` = permission granted and a subscription with the configured key.
export async function pushStatus(): Promise<PushStatus> {
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const existing = await navigator.serviceWorker.getRegistration('/');
  const subscription = await existing?.pushManager.getSubscription();
  return subscription && sameKey(subscription.options.applicationServerKey, toKey(pushConfig!.key)) ? 'active' : 'off';
}

// Must run inside a user gesture: asks the permission (once) and subscribes this browser.
export async function enablePush(lang: string, jobs: readonly PushJob[]): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await register();
  const key = toKey(pushConfig!.key);
  let subscription = await reg.pushManager.getSubscription();
  // A subscription made with another key (service changed) cannot receive our messages: replace it.
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) { await subscription.unsubscribe(); subscription = null; }
  // The browser registers with its own push service (Google, Mozilla, Apple…): failures there are not ours.
  if (!subscription) {
    try { subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); }
    catch (error) { throw Object.assign(new Error('push-browser'), { stage: 'browser', cause: error }); }
  }
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
  const reg = await navigator.serviceWorker.getRegistration('/');
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  try { await call('DELETE', 'v1/subscription', { subscription: subscription.toJSON() }); } finally { await subscription.unsubscribe(); }
}

// Sends the reminder times computed now (an empty list cancels them). Re-registers the service worker, so a new
// version of sw.js is picked up.
export async function syncPush(lang: string, jobs: readonly PushJob[]): Promise<boolean> {
  const reg = await register();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return false;
  await call('PUT', 'v1/subscription', { subscription: subscription.toJSON(), lang, jobs });
  return true;
}

// Visual test: a real system notification shown by the service worker, without the push service.
export async function showLocalTest(lang: string): Promise<void> {
  const reg = await register();
  (reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: 'nummo-local-test', lang });
}
// Delivery test: the push service sends a real push now (0) or after a delay, so the app can be closed meanwhile.
export async function requestPushTest(lang: string, delaySeconds: number): Promise<'ok' | 'rate' | 'gone' | 'error'> {
  const reg = await register();
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return 'gone';
  try { await call('POST', 'v1/test', { subscription: subscription.toJSON(), lang, delaySeconds }); return 'ok'; }
  catch (error) { const status = (error as { status?: number }).status; return status === 429 ? 'rate' : status === 410 ? 'gone' : 'error'; }
}

// Postponements chosen on a notification while the app was closed (written by sw.js), read once and cleared.
export function takeSnoozes(): Promise<string[]> {
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
  navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as Record<string, unknown> | null;
    if (data?.type !== 'nummo-notification') return;
    const opened = parseOpened(data.kind, data.from, data.to);
    if (!opened) return;
    if (listeners.size === 0) pending = opened;
    listeners.forEach((listener) => listener(opened));
  });
}
// The workspace listens while mounted; a notification tapped before it is ready is delivered at subscription.
export function onNotificationOpened(listener: (opened: OpenedNotification) => void): () => void {
  listeners.add(listener);
  if (pending) { const opened = pending; pending = null; listener(opened); }
  return () => listeners.delete(listener);
}
