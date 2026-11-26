import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Values from the sandbox belong to another realm: compared after a JSON round trip.
// public/sw.js in a sandbox with a fake service worker scope: what it shows for each push and where a tap leads.
function load(registered = 'https://nummo.example/sw.js?push=https%3A%2F%2Fpush.example%2F&key=BKEY') {
  const listeners: Record<string, (event: any) => void> = {};
  const shown: { title: string; options: any }[] = [];
  type FakeWindow = { url: string; focused: boolean; messages: unknown[]; postMessage?: (m: unknown) => void; navigate?: (url: string) => Promise<unknown> };
  const windows: FakeWindow[] = [];
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
      matchAll: async () => windows.map((w) => ({ url: w.url, focused: w.focused, navigate: w.navigate,
        postMessage: w.postMessage ?? ((m: unknown) => { w.messages.push(m); }), focus: async () => { w.focused = true; } })),
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
const push = (data: unknown) => ({ data: { json: () => { if (data === 'bad') throw new Error('x'); return data; }, text: () => 'bad' } });
const textPush = (text: string) => ({ data: { json: () => JSON.parse(text), text: () => text } });

test('service worker: testi in italiano e inglese, nome di Nummo, niente immagine grande, un solo avviso per tipo', async () => {
  const sw = load();
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-09', to: '2026-11-15' }));
  await sw.dispatch('push', push({ kind: 'backup', lang: 'en' }));
  await sw.dispatch('push', push('bad'));
  const [summary, backup, other] = sw.shown;
  assert.equal(summary!.title, 'Riepilogo spese pronto');
  assert.equal(summary!.options.body, 'Il riepilogo dal 9 novembre al 15 novembre è pronto. Tocca per vederlo.');
  assert.equal(summary!.options.tag, 'nummo-summary');
  // Large image at the right of the text: fully transparent (an app icon would be repeated, and with no `icon` Chrome on
  // Android draws a grey circle with the initial). Same for every kind of notification.
  const blank = summary!.options.icon as string;
  assert.match(blank, /^data:image\/png;base64,/);
  const png = Buffer.from(blank.split(',')[1]!, 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt8(25), 6, 'RGBA');
  assert.ok(sw.shown.every((shown) => shown.options.icon === blank), 'stessa immagine trasparente per ogni tipo');
  assert.equal(summary!.options.badge, '/icons/badge-96.png');
  assert.equal(backup!.title, 'Backup reminder');
  assert.deepEqual(JSON.parse(JSON.stringify(backup!.options.actions.map((a: { title: string }) => a.title))), ['Remind me in 3 days']);
  // An unreadable message still shows something (browsers require it), without inventing content. No title repeats
  // «Nummo»: the system already names the app in the header.
  assert.equal(other!.title, 'Nuovo avviso');
  assert.ok(sw.shown.every((shown) => !shown.title.includes('Nummo')));
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

// The offline page (21 November): the worker caches /offline.html and its font at install and answers a failed page
// navigation with it; every other request is left to the browser, and the network always comes first.
function loadOffline() {
  const listeners: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, string>>([['nummo-offline-v0', new Map()], ['other-cache', new Map()]]);
  let online = true;
  const requested: string[] = [];
  const base = 'https://nummo.example/sw.js';
  const self: any = {
    location: new URL(base), addEventListener: (type: string, listener: (event: any) => void) => { listeners[type] = listener; },
    skipWaiting: () => {}, registration: {}, clients: { claim: async () => {} },
  };
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    const key = (request: string | Request) => new URL(typeof request === 'string' ? request : request.url, base).pathname;
    return {
      addAll: async (requests: Request[]) => { for (const request of requests) store.set(key(request), `${key(request)} (${request.cache})`); },
      match: async (request: string) => (store.has(key(request)) ? new Response(store.get(key(request))) : undefined),
    };
  };
  const caches = { open, keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name) };
  const fetch = async (request: Request) => {
    requested.push(request.url);
    if (!online) throw new TypeError('Failed to fetch');
    return new Response(`network ${new URL(request.url).pathname}`);
  };
  // Relative URLs resolve against the worker's address, as in a real service worker.
  class SandboxRequest extends Request { constructor(input: string, init?: RequestInit) { super(new URL(input, base), init); } }
  const context = vm.createContext({ self, URL, Promise, JSON, Response, Request: SandboxRequest, TypeError, caches, fetch });
  vm.runInContext(readFileSync('public/sw.js', 'utf8'), context);
  const lifecycle = async (type: string) => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]!({ waitUntil: (p: Promise<unknown>) => { work = p; } });
    await work;
  };
  // undefined: not handled (the browser fetches as without a worker).
  const navigate = async (path: string, mode: RequestMode | 'navigate' = 'navigate', method = 'GET') => {
    let answer: Promise<Response> | undefined;
    listeners.fetch!({ request: { url: new URL(path, base).href, mode, method }, respondWith: (p: Promise<Response>) => { answer = p; } });
    if (!answer) return undefined;
    const response = await answer.catch(() => null);
    return response ? (response.type === 'error' ? 'error' : await response.text()) : 'rejected';
  };
  return { lifecycle, navigate, stores, requested, setOnline: (value: boolean) => { online = value; } };
}

test('service worker: pagina offline in cache all’installazione, vecchie cache della pagina eliminate, le altre no', async () => {
  const sw = loadOffline();
  await sw.lifecycle('install');
  assert.deepEqual([...sw.stores.get('nummo-offline-v2')!.keys()], ['/offline.html', '/fonts/GoogleSans-latin.woff2']);
  assert.match(sw.stores.get('nummo-offline-v2')!.get('/offline.html')!, /\(reload\)/, 'scaricata dalla rete, non dalla cache HTTP');
  await sw.lifecycle('activate');
  assert.deepEqual([...sw.stores.keys()].sort(), ['nummo-offline-v2', 'other-cache']);
});

test('service worker: rete sempre per prima; senza rete la navigazione riceve la pagina offline, il resto resta al browser', async () => {
  const sw = loadOffline();
  await sw.lifecycle('install');
  // Online: the app comes from the network, never from the cache.
  assert.equal(await sw.navigate('/'), 'network /');
  assert.equal(await sw.navigate('/fonts/GoogleSans-latin.woff2', 'cors'), 'network /fonts/GoogleSans-latin.woff2');
  sw.setOnline(false);
  assert.match((await sw.navigate('/'))!, /^\/offline\.html/);
  assert.match((await sw.navigate('/#guida'))!, /^\/offline\.html/);
  assert.match((await sw.navigate('/fonts/GoogleSans-latin.woff2', 'cors'))!, /^\/fonts\/GoogleSans-latin\.woff2/);
  // Bundle, other fonts, icons, other origins and non-GET requests: no answer from the worker (nothing cached).
  for (const [path, mode, method] of [['/_expo/static/js/web/index-abc.js', 'no-cors', 'GET'], ['/fonts/GoogleSans-latin-ext.woff2', 'cors', 'GET'],
    ['/manifest.webmanifest', 'cors', 'GET'], ['https://firestore.googleapis.com/x', 'cors', 'GET'], ['/', 'navigate', 'POST']] as const) {
    assert.equal(await sw.navigate(path, mode, method), undefined, path);
  }
});

test('service worker: senza pagina offline in cache una navigazione fallita resta un errore di rete', async () => {
  const sw = loadOffline();
  sw.setOnline(false);
  assert.equal(await sw.navigate('/'), 'error');
});

test('service worker: un solo indirizzo per la pagina offline e per le notifiche', async () => {
  const { serviceWorkerUrl } = await import('../src/services/pushNotifications.ts');
  assert.equal(serviceWorkerUrl(null), '/sw.js');
  assert.equal(serviceWorkerUrl({ url: 'https://push.example/', key: 'BKEY' }), '/sw.js?push=https%3A%2F%2Fpush.example%2F&key=BKEY');
});

test('service worker: articolo eliso davanti a 1, 8 e 11 («dall’8», «all’1», «l’11»), solo in italiano', async () => {
  const sw = load();
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-08', to: '2026-12-01' }));
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-01', to: '2026-11-11' }));
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-18', to: '2026-11-28' }));
  await sw.dispatch('push', push({ kind: 'renewal', lang: 'it', from: '2026-11-11', to: '2026-11-11' }));
  await sw.dispatch('push', push({ kind: 'renewal', lang: 'it', from: '2026-12-01', to: '2026-12-01' }));
  await sw.dispatch('push', push({ kind: 'summary', lang: 'en', from: '2026-11-08', to: '2026-11-14' }));
  assert.deepEqual(sw.shown.map((n) => n.options.body), [
    'Il riepilogo dall’8 novembre all’1 dicembre è pronto. Tocca per vederlo.',
    'Il riepilogo dall’1 novembre all’11 novembre è pronto. Tocca per vederlo.',
    'Il riepilogo dal 18 novembre al 28 novembre è pronto. Tocca per vederlo.',
    'Un abbonamento si rinnova l’11 novembre. Tocca per vedere i rinnovi.',
    'Un abbonamento si rinnova l’1 dicembre. Tocca per vedere i rinnovi.',
    'Your summary for November 8 – November 14 is ready. Tap to see it.',
  ]);
});

test('service worker: messaggi non JSON letti con indulgenza, data.url sempre di Nummo', async () => {
  const sw = load();
  await sw.dispatch('push', textPush('backup'));
  await sw.dispatch('push', textPush('qualcosa'));
  await sw.dispatch('push', textPush('[1,2]'));
  await sw.dispatch('push', { data: null });
  await sw.dispatch('push', push({ kind: 'summary', lang: 'it', from: '2026-11-09', to: '2026-11-15' }));
  const [backup, text, array, empty, summary] = sw.shown;
  assert.equal(backup!.title, 'Promemoria backup');
  assert.equal(text!.title, 'Nuovo avviso');
  assert.equal(array!.title, 'Nuovo avviso');
  assert.equal(empty!.title, 'Nuovo avviso');
  assert.equal(backup!.options.data.url, 'https://nummo.example/?notifica=backup');
  assert.equal(empty!.options.data.url, 'https://nummo.example/?notifica=other');
  assert.equal(summary!.options.data.url, 'https://nummo.example/?notifica=summary&dal=2026-11-09&al=2026-11-15');
  assert.equal(typeof summary!.options.timestamp, 'number');
  assert.equal(summary!.options.renotify, false);
});

test('service worker: il tocco usa data.url solo se di Nummo, e naviga solo se il messaggio non arriva', async () => {
  const notification = (data: unknown) => ({ data, close: () => {} });
  const foreign = load();
  await foreign.dispatch('notificationclick', { action: '', notification: notification({ kind: 'backup', url: 'https://evil.example/?x' }) });
  assert.deepEqual(foreign.opened, ['https://nummo.example/?notifica=backup']);
  // A window whose message cannot be delivered is navigated to the notification's page instead; the focused one first.
  const sw = load();
  const navigated: string[] = [];
  sw.windows.push({ url: 'https://nummo.example/', focused: false, messages: [] },
    { url: 'https://nummo.example/', focused: true, messages: [], postMessage: () => { throw new Error('closed'); },
      navigate: async (url: string) => { navigated.push(url); return { focus: async () => {} }; } });
  await sw.dispatch('notificationclick', { action: '', notification: notification({ kind: 'summary', from: '2026-11-09', to: '2026-11-15' }) });
  assert.deepEqual(navigated, ['https://nummo.example/?notifica=summary&dal=2026-11-09&al=2026-11-15']);
  assert.deepEqual(sw.opened, []);
  assert.deepEqual(sw.windows[0]!.messages, []);
});
