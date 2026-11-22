// Nummo service worker: system notifications and Nummo's own offline page. The app always loads from the network: only
// when a page navigation fails (no connection) the worker answers with /offline.html, cached at install with the font
// it uses. Never the app, never any data, no offline start (21 November). Registered at startup by
// src/services/pushNotifications.ts as /sw.js, or /sw.js?push=<push service URL>&key=… when notifications are configured;
// the push service sends only the kind of reminder and, for a summary, its dates.
'use strict';

const params = new URL(self.location.href).searchParams;
const pushService = params.get('push') || '';
const texts = {
  it: {
    backup: { title: 'Promemoria backup', body: 'I dati di Nummo sono cambiati dall’ultimo backup. Tocca per esportarne una copia.' },
    summary: { title: 'Riepilogo spese pronto', body: 'Il riepilogo {period} è pronto. Tocca per vederlo.' },
    renewal: { title: 'Rinnovo in arrivo', body: 'Un abbonamento si rinnova {date}. Tocca per vedere i rinnovi.' },
    test: { title: 'Notifica push di prova', body: 'Arrivata dal servizio di notifiche: funzionano anche ad app chiusa.' },
    local: { title: 'Notifica di prova', body: 'Così appariranno le notifiche di Nummo su questo dispositivo.' },
    other: { title: 'Nummo', body: 'Tocca per aprire Nummo.' },
    snooze: 'Ricordamelo tra 3 giorni', months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  },
  en: {
    backup: { title: 'Backup reminder', body: 'Your Nummo data changed since the last backup. Tap to export a copy.' },
    summary: { title: 'Spending summary ready', body: 'Your summary {period} is ready. Tap to see it.' },
    renewal: { title: 'Upcoming renewal', body: 'A subscription renews {date}. Tap to see your renewals.' },
    test: { title: 'Test push notification', body: 'Delivered by the notification service: they work even with the app closed.' },
    local: { title: 'Test notification', body: 'This is how Nummo notifications look on this device.' },
    other: { title: 'Nummo', body: 'Tap to open Nummo.' },
    snooze: 'Remind me in 3 days', months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};
// 64×64 fully transparent PNG, inline: no network request, so it also works offline.
const blankIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAJ0lEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAIB3A0BAAAGveg7oAAAAAElFTkSuQmCC';
const civil = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const day = (lang, date) => {
  const [, month, dd] = date.split('-').map(Number);
  const name = texts[lang].months[month - 1];
  return lang === 'it' ? `${dd} ${name}` : `${name} ${dd}`;
};
// Italian elides the article before a day read with a vowel (uno, otto, undici): «dall’8 al 14», «all’1», «l’11 novembre».
const elided = (date) => [1, 8, 11].includes(Number(date.slice(8, 10)));
const period = (lang, from, to) => lang === 'it'
  ? `${elided(from) ? 'dall’' : 'dal '}${day(lang, from)} ${elided(to) ? 'all’' : 'al '}${day(lang, to)}`
  : `for ${day(lang, from)} – ${day(lang, to)}`;
const on = (lang, date) => lang === 'it' ? `${elided(date) ? 'l’' : 'il '}${day(lang, date)}` : `on ${day(lang, date)}`;

function notification(data) {
  const lang = data && data.lang === 'en' ? 'en' : 'it';
  const kind = data && ['backup', 'summary', 'renewal', 'test', 'local'].includes(data.kind) ? data.kind : 'other';
  const t = texts[lang];
  let body = t[kind].body;
  if (kind === 'summary') {
    const dates = civil(data.from) && civil(data.to) ? period(lang, data.from, data.to) : '';
    body = body.replace(' {period}', dates ? ` ${dates}` : '');
  }
  if (kind === 'renewal') {
    // Without a valid date the sentence still reads: «Un abbonamento si rinnova a breve.».
    body = civil(data.from) ? body.replace('{date}', on(lang, data.from))
      : body.replace(' {date}', lang === 'it' ? ' a breve' : ' soon');
  }
  return {
    title: t[kind].title,
    options: {
      // The app's mark is the small icon at the left (the badge). Android also shows `icon` as a large square image at the
      // right of the text, and when it is missing Chrome draws a grey circle with the site's initial instead: so `icon` is a
      // fully transparent image, which leaves nothing visible there (no app icon repeated, no placeholder).
      body, lang, icon: blankIcon, badge: '/icons/badge-96.png',
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

// The offline page and what it shows. A new name for every change of these files: the old cache is deleted on activate.
const offlineCache = 'nummo-offline-v1';
const offlineFiles = ['/offline.html', '/fonts/GoogleSans-latin.woff2'];
self.addEventListener('install', (event) => {
  // Fetched fresh (not from the HTTP cache); a failure must not stop the notifications, so it is never fatal.
  event.waitUntil(caches.open(offlineCache)
    .then((cache) => cache.addAll(offlineFiles.map((path) => new Request(path, { cache: 'reload' }))))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => event.waitUntil(caches.keys()
  .then((names) => Promise.all(names.filter((name) => name.startsWith('nummo-offline-') && name !== offlineCache).map((name) => caches.delete(name))))
  .then(() => self.clients.claim())));

// Network first, always: the cache answers only when the network fails. Page navigations get the offline page; the
// offline page's own files get their cached copy. Every other request is left to the browser (no respondWith).
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(offlineCache)
      .then((cache) => cache.match('/offline.html'))
      .then((page) => page || Response.error())));
  } else if (offlineFiles.includes(url.pathname) && url.pathname !== '/offline.html') {
    event.respondWith(fetch(request).catch(() => caches.open(offlineCache)
      .then((cache) => cache.match(url.pathname))
      .then((file) => file || Response.error())));
  }
});

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
