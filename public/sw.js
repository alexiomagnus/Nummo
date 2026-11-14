// Nummo service worker: system notifications only. No `fetch` handler and no cache: the app keeps loading from the
// network exactly as without it (no offline start is promised). Registered by src/services/pushNotifications.ts as
// /sw.js?push=<push service URL>; the push service sends only the kind of reminder and, for a summary, its dates.
'use strict';

const params = new URL(self.location.href).searchParams;
const pushService = params.get('push') || '';
const texts = {
  it: {
    backup: { title: 'Promemoria backup', body: 'I dati di Nummo sono cambiati dall’ultimo backup confermato. Tocca per esportarne una copia.' },
    summary: { title: 'Riepilogo spese pronto', body: 'Il riepilogo {period} è pronto. Tocca per vederlo.' },
    test: { title: 'Notifica push di prova', body: 'Arrivata dal servizio di notifiche: funzionano anche ad app chiusa.' },
    local: { title: 'Notifica di prova', body: 'Così appariranno le notifiche di Nummo su questo dispositivo.' },
    other: { title: 'Nummo', body: 'Tocca per aprire Nummo.' },
    snooze: 'Ricordamelo tra 3 giorni', period: 'dal {from} al {to}', months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  },
  en: {
    backup: { title: 'Backup reminder', body: 'Your Nummo data changed since the last confirmed backup. Tap to export a copy.' },
    summary: { title: 'Spending summary ready', body: 'Your summary {period} is ready. Tap to see it.' },
    test: { title: 'Test push notification', body: 'Delivered by the notification service: they work even with the app closed.' },
    local: { title: 'Test notification', body: 'This is how Nummo notifications look on this device.' },
    other: { title: 'Nummo', body: 'Tap to open Nummo.' },
    snooze: 'Remind me in 3 days', period: 'for {from} – {to}', months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};
const civil = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const day = (lang, date) => {
  const [, month, dd] = date.split('-').map(Number);
  const name = texts[lang].months[month - 1];
  return lang === 'it' ? `${dd} ${name}` : `${name} ${dd}`;
};

function notification(data) {
  const lang = data && data.lang === 'en' ? 'en' : 'it';
  const kind = data && ['backup', 'summary', 'test', 'local'].includes(data.kind) ? data.kind : 'other';
  const t = texts[lang];
  let body = t[kind].body;
  if (kind === 'summary') {
    const period = civil(data.from) && civil(data.to) ? t.period.replace('{from}', day(lang, data.from)).replace('{to}', day(lang, data.to)) : '';
    body = body.replace(' {period}', period ? ` ${period}` : '');
  }
  return {
    title: t[kind].title,
    options: {
      body, lang, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png',
      // One notification per kind: a newer one replaces the older instead of piling up.
      tag: `nummo-${kind}`, renotify: kind === 'test' || kind === 'local', timestamp: Date.now(),
      actions: kind === 'backup' ? [{ action: 'snooze', title: t.snooze }] : [],
      data: { kind, from: civil(data && data.from) ? data.from : null, to: civil(data && data.to) ? data.to : null },
    },
  };
}
const show = (data) => {
  const { title, options } = notification(data);
  return self.registration.showNotification(title, options);
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Every push must show a notification (browsers require it): an unreadable message shows the generic one.
self.addEventListener('push', (event) => {
  let data = null;
  try { data = event.data ? event.data.json() : null; } catch { data = null; }
  event.waitUntil(show(data));
});

// The local visual test of the settings page: same code path as a real push, but nothing leaves the device.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'nummo-local-test') event.waitUntil(show({ kind: 'local', lang: event.data.lang }));
});

// Postponements chosen on a notification, read (and cleared) by the app at its next start.
function recordSnooze(at) {
  return new Promise((resolve) => {
    const open = indexedDB.open('nummo-push', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('events', { autoIncrement: true });
    open.onerror = () => resolve();
    open.onsuccess = () => {
      const tx = open.result.transaction('events', 'readwrite');
      tx.objectStore('events').add({ type: 'snooze', at });
      tx.oncomplete = tx.onerror = () => { open.result.close(); resolve(); };
    };
  });
}
async function post(path, body) {
  if (!pushService) return;
  const subscription = await self.registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch(new URL(path, pushService), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), ...body }) });
}

// Tap: the app opens on the page of that reminder, reusing a window already open on Nummo when there is one.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  if (event.action === 'snooze') {
    event.waitUntil(Promise.all([recordSnooze(new Date().toISOString()), post('v1/snooze', {}).catch(() => {})]));
    return;
  }
  const message = { type: 'nummo-notification', kind: data.kind, from: data.from, to: data.to };
  const url = new URL('/', self.location.origin);
  url.searchParams.set('notifica', data.kind || 'other');
  if (data.from && data.to) { url.searchParams.set('dal', data.from); url.searchParams.set('al', data.to); }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (open) {
      open.postMessage(message);
      try { await open.focus(); } catch { /* focus not allowed: the message still navigates */ }
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});

// The browser replaced the subscription: subscribe again with the same key and move the reminders to it.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const key = params.get('key');
    if (!key || !pushService) return;
    const padded = key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (key.length % 4)) % 4);
    const applicationServerKey = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const subscription = event.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const old = event.oldSubscription ? { endpoint: event.oldSubscription.endpoint } : null;
    if (old) await fetch(new URL('v1/renew', pushService), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), old }) });
  })());
});
