import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Values from the sandbox belong to another realm: compared after a JSON round trip.
// public/sw.js in a sandbox with a fake service worker scope: what it shows for each push and where a tap leads.
function load(registered = 'https://nummo.example/sw.js?push=https%3A%2F%2Fpush.example%2F&key=BKEY') {
  const listeners: Record<string, (event: any) => void> = {};
  const shown: { title: string; options: any }[] = [];
  const windows: { url: string; focused: boolean; messages: unknown[] }[] = [];
  const opened: string[] = [];
  const fetches: { url: string; body: any }[] = [];
  const self: any = {
    location: new URL(registered),
    addEventListener: (type: string, listener: (event: any) => void) => { listeners[type] = listener; },
    skipWaiting: () => {},
    registration: {
      showNotification: async (title: string, options: unknown) => { shown.push({ title, options }); },
      pushManager: { getSubscription: async () => ({ toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/x' }) }) },
    },
    clients: {
      claim: async () => {},
      matchAll: async () => windows.map((w) => ({ url: w.url, postMessage: (m: unknown) => w.messages.push(m), focus: async () => { w.focused = true; } })),
      openWindow: async (url: string) => { opened.push(url); },
    },
  };
  const context = vm.createContext({ self, URL, Promise, Date, JSON, Uint8Array, atob, indexedDB: { open: () => { const request: any = {}; setTimeout(() => request.onerror?.()); return request; } },
    fetch: async (url: URL, init: RequestInit) => { fetches.push({ url: String(url), body: JSON.parse(String(init.body)) }); return new Response('{}'); } });
  vm.runInContext(readFileSync('public/sw.js', 'utf8'), context);
  const dispatch = async (type: string, event: any) => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]!({ ...event, waitUntil: (p: Promise<unknown>) => { work = p; } });
    await work;
  };
  return { dispatch, shown, windows, opened, fetches };
}
const push = (data: unknown) => ({ data: { json: () => { if (data === 'bad') throw new Error('x'); return data; } } });

test('service worker: testi in italiano e inglese, nome di Nummo, niente immagine grande, un solo avviso per tipo', async () => {
  const sw = load();
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-09', to: '2026-11-15' }));
  await sw.dispatch('push', push({ kind: 'backup', lang: 'en' }));
  await sw.dispatch('push', push('bad'));
  const [summary, backup, other] = sw.shown;
  assert.equal(summary!.title, 'Riepilogo spese pronto');
  assert.equal(summary!.options.body, 'Il riepilogo dal 9 novembre al 15 novembre è pronto. Tocca per vederlo.');
  assert.equal(summary!.options.tag, 'nummo-summary');
  // No large square image: Android would repeat the app icon at the right of the text.
  assert.equal('icon' in summary!.options, false);
  assert.ok(sw.shown.every((shown) => !('icon' in shown.options)), 'nessun tipo di notifica ha l’immagine a destra');
  assert.equal(summary!.options.badge, '/icons/badge-96.png');
  assert.equal(backup!.title, 'Backup reminder');
  assert.deepEqual(JSON.parse(JSON.stringify(backup!.options.actions.map((a: { title: string }) => a.title))), ['Remind me in 3 days']);
  // An unreadable message still shows something (browsers require it), without inventing content.
  assert.equal(other!.title, 'Nummo');
  assert.equal(other!.options.body, 'Tocca per aprire Nummo.');
  // No amount or category ever appears: the payload has none.
  assert.ok(!sw.shown.some((n) => /€|\d+,\d\d/.test(n.options.body)));
});

test('service worker: promemoria rinnovo con la sola data, in italiano e inglese, e apertura sulla pagina dei rinnovi', async () => {
  const sw = load();
  await sw.dispatch('push', push({ kind: 'renewal', lang: 'it', from: '2026-11-18', to: '2026-11-18' }));
  await sw.dispatch('push', push({ kind: 'renewal', lang: 'en', from: '2026-11-18', to: '2026-11-18' }));
  await sw.dispatch('push', push({ kind: 'renewal', lang: 'it' }));
  const [it, en, bare] = sw.shown;
  assert.equal(it!.title, 'Rinnovo in arrivo');
  assert.equal(it!.options.body, 'Un abbonamento si rinnova il 18 novembre. Tocca per vedere i rinnovi.');
  assert.equal(it!.options.tag, 'nummo-renewal');
  assert.equal(en!.options.body, 'A subscription renews on November 18. Tap to see your renewals.');
  assert.equal(bare!.options.body, 'Un abbonamento si rinnova a breve. Tocca per vedere i rinnovi.');
  const closed = load();
  await closed.dispatch('notificationclick', { action: '', notification: { data: { kind: 'renewal', from: '2026-11-18', to: '2026-11-18' }, close: () => {} } });
  assert.deepEqual(closed.opened, ['https://nummo.example/?notifica=renewal&dal=2026-11-18&al=2026-11-18']);
});

test('service worker: il tocco apre Nummo sulla notifica, o riusa la finestra già aperta', async () => {
  const closed = load();
  const notification = (data: unknown) => ({ data, close: () => {} });
  await closed.dispatch('notificationclick', { action: '', notification: notification({ kind: 'summary', from: '2026-11-09', to: '2026-11-15' }) });
  assert.deepEqual(closed.opened, ['https://nummo.example/?notifica=summary&dal=2026-11-09&al=2026-11-15']);
  const open = load();
  open.windows.push({ url: 'https://nummo.example/', focused: false, messages: [] }, { url: 'https://other.example/', focused: false, messages: [] });
  await open.dispatch('notificationclick', { action: '', notification: notification({ kind: 'backup', from: null, to: null }) });
  assert.deepEqual(open.opened, []);
  assert.equal(open.windows[0]!.focused, true);
  assert.deepEqual(JSON.parse(JSON.stringify(open.windows[0]!.messages)), [{ type: 'nummo-notification', kind: 'backup', from: null, to: null }]);
  assert.deepEqual(open.windows[1]!.messages, []);
});

test('service worker: «Ricordamelo tra 3 giorni» avvisa il servizio push senza aprire l’app', async () => {
  const sw = load();
  await sw.dispatch('notificationclick', { action: 'snooze', notification: { data: { kind: 'backup' }, close: () => {} } });
  assert.deepEqual(sw.opened, []);
  assert.equal(sw.fetches[0]!.url, 'https://push.example/v1/snooze');
  assert.deepEqual(JSON.parse(JSON.stringify(sw.fetches[0]!.body)), { subscription: { endpoint: 'https://fcm.googleapis.com/x' } });
});
