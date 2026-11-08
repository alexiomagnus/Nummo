// Startup measurement of a web build in Chromium with the Android Pixel profile, throttled CPU/network (CDP).
// Emulation only: it does not replace a test on the real device (see docs/avvio-prestazioni.md).
//
//   node scripts/measure-startup.mjs --dist DIR [--label NAME] [--cpu 4] [--net fast|4g|slow4g] [--runs 5]
//        [--theme dark|light] [--vp 412x915] [--session in|out] [--hint auto|none|cloud|local] [--snap DIR] [--out DIR]
//
// DIR is an emulator-mode build (EXPO_PUBLIC_NUMMO_BACKEND=emulator, AUTH 127.0.0.1:19099) served by this script with
// compression and cache headers like Hosting. The Auth emulator must be running on that port with emulator-seed.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const label = opt('label', 'startup'), dist = opt('dist', '');
if (!dist) { console.error('Manca --dist DIR'); process.exit(2); }
const cpu = Number(opt('cpu', 4)), runs = Number(opt('runs', 5)), net = opt('net', '4g'), theme = opt('theme', 'dark'), shots = opt('shots', '');
const nets = { fast: null, '4g': { latency: 40, down: 1.6e6 / 8 * 5, up: 750e3 / 8 }, slow4g: { latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 } };
const authPort = Number(opt('auth-port', 19099));
const signedOut = opt('session', 'in') === 'out', hintOpt = opt('hint', 'auto'), vp = opt('vp', '412x915').split('x').map(Number);

// Static server mimicking firebase.json hosting: SPA fallback, brotli/gzip, long cache only for /_expo/static.
async function serve(root) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const cache = new Map();
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(root, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    const ext = extname(file), long = path.startsWith('/_expo/static/'), accept = req.headers['accept-encoding'] ?? '';
    const enc = /br/.test(accept) ? 'br' : /gzip/.test(accept) ? 'gzip' : '';
    const binary = ['.png', '.woff2'].includes(ext), key = file + enc;
    if (!cache.has(key)) { const raw = readFileSync(file); cache.set(key, !enc || binary ? raw : enc === 'br' ? brotliCompressSync(raw) : gzipSync(raw)); }
    const body = cache.get(key);
    const headers = { 'Content-Type': types[ext] ?? 'application/octet-stream', 'Cache-Control': long ? 'public, max-age=31536000, immutable' : path.startsWith('/fonts/') || path.startsWith('/icons/') ? 'public, max-age=86400' : 'no-cache', 'Content-Length': body.length };
    if (enc && !binary) headers['Content-Encoding'] = enc;
    res.writeHead(200, headers); res.end(body);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { origin: 'http://127.0.0.1:' + server.address().port, close: () => server.close() };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hosting = await serve(resolve(dist));
const origin = hosting.origin;

async function launch() {
  const dir = mkdtempSync(join(tmpdir(), 'nummo-perf-'));
  const port = 9300 + Math.floor(Math.random() * 400);
  const child = spawn('chromium', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 60; i++) { try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); ws = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl; if (ws) break; } catch {} await sleep(250); }
  return { child, ws };
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map(); const listeners = [];
  socket.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { ok, bad } = pending.get(d.id); pending.delete(d.id); d.error ? bad(new Error(JSON.stringify(d.error))) : ok(d.result); } else listeners.forEach((l) => l(d)); };
  return new Promise((ok) => { socket.onopen = () => ok({ send: (method, params = {}) => new Promise((o, b) => { const i = ++id; pending.set(i, { ok: o, bad: b }); socket.send(JSON.stringify({ id: i, method, params })); }), on: (l) => listeners.push(l), close: () => socket.close() }); });
}

// Page-side probe: timeline of visible states from the first frame, keyed to performance.now() (0 = navigation start).
const probe = `(() => {
  const log = (window.__nummo = { events: [], last: '' });
  const live = (e) => !e.closest('[inert]');           // real screen (the startup placeholder lives in an inert container)
  const all = (sel) => [...document.querySelectorAll(sel)];
  const textEl = (t, real) => all('div,span,button,[role=button]').find((e) => e.children.length === 0 && e.textContent.trim() === t && (real === undefined || live(e) === real));
  const shown = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.opacity === '0' || s.display === 'none' || s.visibility === 'hidden') return false; } return !!e; };
  const tick = () => {
    const root = document.getElementById('root');
    const banners = all('[role=banner]');
    const realForm = textEl('Salva', true), skelForm = textEl('Salva', false);
    const state = [
      'bg=' + getComputedStyle(document.body).backgroundColor,
      root && root.childElementCount ? 'react' : 'noreact',
      banners.some((b) => !live(b)) ? 'startup' : '',
      banners.some(live) ? 'header' : '',
      all('[aria-label="Caricamento della sessione"]').length ? 'spin:session' : '',
      all('[aria-label="Caricamento dei dati"]').length ? 'spin:data' : '',
      skelForm && shown(skelForm) ? 'skeleton:form' : '',
      realForm ? (shown(realForm) ? 'form:visible' : 'form:hidden') : '',
      textEl('Caricamento…', true) ? 'cat:loading' : '',
      textEl('Accedi con Google') ? 'signin' : '',
    ].filter(Boolean).join(' ');
    if (state !== log.last) { log.last = state; log.events.push([Math.round(performance.now()), state]); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

async function setupSession(cdp) {
  // Sign in through the Auth emulator and store the user where the SDK keeps it (IndexedDB), as after a real login.
  const r = await (await fetch(`http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'id_token=' + encodeURIComponent(JSON.stringify({ sub: '100000000000000000001', email: 'proprietario@example.com', email_verified: true })) + '&providerId=google.com' }) })).json();
  if (!r.idToken) throw new Error('login emulatore fallito ' + JSON.stringify(r));
  const user = { uid: r.localId, email: r.email, emailVerified: true, isAnonymous: false, providerData: [{ providerId: 'google.com', uid: '100000000000000000001', email: r.email, displayName: null, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: r.refreshToken, accessToken: r.idToken, expirationTime: Date.now() + 3600e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: 'demo-key', appName: '[DEFAULT]' };
  const prefs = JSON.stringify({ version: 1, theme, accent: 'amber', colorMode: 'mono', font: 'google', language: 'it' });
  await cdp.send('Page.navigate', { url: origin + '/manifest.webmanifest' }); await sleep(500);
  const expr = `${signedOut ? '' : `localStorage.setItem('firebase:authUser:demo-key:[DEFAULT]', ${JSON.stringify(JSON.stringify(user))});`} localStorage.setItem('nummo.preferences.v1', ${JSON.stringify(prefs)}); ${hintOpt !== 'auto' && hintOpt !== 'none' ? `localStorage.setItem('nummo.session.hint.v1', '${hintOpt}');` : ''} true`;
  await cdp.send('Runtime.evaluate', { expression: expr });
}

async function once(cdp, { cache, warmup = false }) {
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: !cache });
  if (nets[net]) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: nets[net].latency, downloadThroughput: nets[net].down, uploadThroughput: nets[net].up });
  else await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
  const frames = [];
  if (shots) { cdp.on((d) => { if (d.method === 'Page.screencastFrame') { frames.push({ t: d.params.metadata.timestamp, data: d.params.data }); cdp.send('Page.screencastFrameAck', { sessionId: d.params.sessionId }); } }); await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 40, maxWidth: 206, maxHeight: 458, everyNthFrame: 1 }); }
  await cdp.send('Page.navigate', { url: origin + '/' });
  const started = Date.now();
  let res;
  while (Date.now() - started < 20000) {
    await sleep(250);
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__nummo ?? null)', returnByValue: true });
    res = JSON.parse(result.value ?? 'null');
    if (res && res.last.includes('form:visible') && !res.last.includes('spin:') && !res.last.includes('cat:loading') && !res.last.includes('startup')) break;
  }
  await sleep(400);
  const { result } = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify({ events: window.__nummo?.events, paint: performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]),
    nav: (n => n && { ttfb: Math.round(n.responseStart), html: Math.round(n.responseEnd), dcl: Math.round(n.domContentLoadedEventEnd) })(performance.getEntriesByType('navigation')[0]),
    res: performance.getEntriesByType('resource').map(r => [r.name.split('/').pop().slice(0, 60), Math.round(r.startTime), Math.round(r.responseEnd), r.transferSize]) })` });
  if (shots) { await cdp.send('Page.stopScreencast'); mkdirSync(shots, { recursive: true }); const t0 = frames[0]?.t; frames.forEach((f, i) => writeFileSync(join(shots, `${label}-${cache ? 'warm' : 'cold'}-${String(i).padStart(2, '0')}-${Math.round((f.t - t0) * 1000)}ms.jpg`), Buffer.from(f.data, 'base64'))); }
  return JSON.parse(result.value);
}

const { child, ws } = await launch();
const cdp = await connect(ws);
await cdp.send('Page.enable'); await cdp.send('Network.enable'); await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp[0], height: vp[1], deviceScaleFactor: vp[0] < 600 ? 2.625 : 1, mobile: vp[0] < 600 });
await cdp.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36' });
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await setupSession(cdp);
// First load fills HTTP cache/IDB/Firestore seed; discarded.
await once(cdp, { cache: true, warmup: true });
const snap = opt('snap', '');
if (snap) {
  mkdirSync(snap, { recursive: true });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  if (nets[net]) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: nets[net].latency, downloadThroughput: nets[net].down, uploadThroughput: nets[net].up });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Page.navigate', { url: origin + '/manifest.webmanifest' }); await sleep(300);
  if (hintOpt !== 'auto' && hintOpt !== 'none') await cdp.send('Runtime.evaluate', { expression: `localStorage.setItem('nummo.session.hint.v1', '${hintOpt}')` });
  await cdp.send('Page.navigate', { url: origin + '/' });
  let last = '', n = 0; const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window.__nummo?.last ?? ""', returnByValue: true });
    if (result.value !== last) { last = result.value; const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 55, clip: { x: 0, y: 0, width: 412, height: 915, scale: 0.45 } });
      writeFileSync(join(snap, `${label}-${String(n++).padStart(2, '0')}.jpg`), Buffer.from(shot.data, 'base64')); console.log(label, n - 1, Date.now() - t0, last); }
    await sleep(15);
  }
  const hint = await cdp.send('Runtime.evaluate', { expression: "JSON.stringify([localStorage.getItem('nummo.session.hint.v1'), localStorage.getItem('nummo.boot-theme.v1')])", returnByValue: true }); console.log('storage:', hint.result.value);
  cdp.close(); child.kill(); hosting.close(); process.exit(0);
}
const out = { label, cpu, net, theme, cold: [], warm: [] };
for (const mode of ['cold', 'warm']) for (let i = 0; i < runs; i++) out[mode].push(await once(cdp, { cache: mode === 'warm' }));
writeFileSync(join(opt('out', '.'), `${label}.json`), JSON.stringify(out, null, 1));
const find = (events, pred) => events.find(([, s]) => pred(s))?.[0];
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
for (const mode of ['cold', 'warm']) {
  const rows = out[mode].map((r) => {
    const ev = r.events, endT = (find(ev, (st) => st.includes('form:visible') && !/spin:|cat:loading|startup/.test(st)) ?? ev.at(-1)[0]);
    let blank = 0; // time with a header on screen but no form layout visible (spinner-only screens)
    ev.forEach(([t0, st], i) => { const t1 = Math.min(ev[i + 1]?.[0] ?? endT, endT); if (t0 < endT && /header|spin:/.test(st) && !/skeleton:form|form:visible/.test(st)) blank += Math.max(0, t1 - t0); });
    const bgs = new Set(ev.filter(([, st]) => !st.startsWith('bg=rgba(0, 0, 0, 0)')).map(([, st]) => st.split(' ').slice(0, 3).join(' ').split(' react')[0].split(' noreact')[0]));
    return {
      fcp: r.paint.find(([n]) => n === 'first-contentful-paint')?.[1],
      reactMounted: find(ev, (st) => /\breact\b/.test(st)),
      firstLayout: find(ev, (st) => /skeleton:form|form:visible/.test(st)),
      spinnerOnlyMs: blank,
      stable: endT,
      bgColours: new Set(ev.map(([, st]) => st.split(' ')[0] + st.split(' ')[1] + st.split(' ')[2])).size && new Set(ev.map(([, st]) => st.match(/^bg=rgb\([^)]*\)/)[0])).size,
    };
  });
  console.log(`${label} ${mode} (cpu×${cpu}, net ${net}, ${theme}), mediana di ${runs} [ms]:`, Object.fromEntries(Object.keys(rows[0]).map((k) => [k, med(rows.map((r) => r[k]))])));
}
console.log('timeline esempio (warm):', JSON.stringify(out.warm[0].events));
console.log('timeline esempio (cold):', JSON.stringify(out.cold[0].events));
cdp.close(); child.kill(); hosting.close();
