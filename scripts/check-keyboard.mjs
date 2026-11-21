// Manual check of the virtual keyboard transition (never part of `npm run check`). Serves a demo export in Standard
// mode (IndexedDB, no account, external network blocked), simulates the keyboard as Chrome Android does with
// interactive-widget=resizes-content (the viewport shrinks) and prints the layout of every animation frame: viewport,
// #root, page scroller (height and scrollTop), navigation bar, focused field. A correct transition goes from the
// state before to the final state in one frame; an intermediate frame (scroller still short of the hidden bar's room,
// field cut, empty strip on closing) is the glitch fixed on 21 November (see useVirtualKeyboard in AppShell).
// Requires `chromium` in PATH. A real keyboard (its animation, iOS) is not reproduced: confirm on a device.
//
// npm run build:demo && node scripts/check-keyboard.mjs dist-demo [--field top|low|dialog] [--keyboard 330]
//   [--vp 390x844] [--cpu 4] [--switch] [--cycles 1] [--out DIR]
// --field: first field of Nuova spesa, the lowest visible one, or the name of the Nuova lista dialog.
// --switch: with the keyboard open, move to the first and then to the lowest field. --cpu: CPU throttling rate.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';

const opt = (name, fallback) => { const index = process.argv.indexOf('--' + name); return index < 0 ? fallback : process.argv[index + 1]; };
const dist = process.argv[2];
assert.ok(dist && existsSync(join(dist, 'index.html')), 'Pass a demo web export (npm run build:demo → dist-demo)');
const field = opt('field', 'low');
assert.ok(['top', 'low', 'dialog'].includes(field), '--field top|low|dialog');
const [width, height] = opt('vp', '390x844').split('x').map(Number);
const keyboard = Number(opt('keyboard', '330'));
const cpu = Number(opt('cpu', '1'));
const cycles = Number(opt('cycles', '1'));
const switching = process.argv.includes('--switch');
const out = opt('out', null);
assert.ok(width > 0 && height > keyboard && keyboard >= 0 && cpu >= 1 && cycles >= 1);
const mobile = width < 600;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  let path = join(dist, new URL(req.url, 'http://x').pathname);
  if (!existsSync(path) || statSync(path).isDirectory()) path = join(dist, 'index.html');
  res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const profile = mkdtempSync(join(tmpdir(), 'nummo-keyboard-chrome-'));
const child = spawn('chromium', ['--headless=new', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let socket;
try {
  for (let i = 0; i < 80 && !existsSync(join(profile, 'DevToolsActivePort')); i++) await sleep(100);
  const port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => { socket.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id) { const call = pending.get(data.id); pending.delete(data.id); data.error ? call?.reject(new Error(JSON.stringify(data.error))) : call?.resolve(data.result); }
    else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push(data.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); socket.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const viewport = (h) => send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: mobile ? 3 : 1, mobile });
  const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
  const tap = async ({ x, y }) => { await touch('touchStart', x, y); await sleep(60); await touch('touchEnd', x, y); };
  const mark = (label) => evaluate(`window.__frames.push({ mark: ${JSON.stringify(label)} }); true`);

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await viewport(height);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await send('Page.navigate', { url: origin + '/manifest.webmanifest' }); await sleep(400);
  await evaluate(`localStorage.setItem('nummo.storageMode.v1', 'standard'); localStorage.setItem('nummo.preferences.v1', JSON.stringify({ theme: 'dark', language: 'it' })); true`);
  await send('Page.navigate', { url: origin });
  for (let i = 0; i < 80 && !(await evaluate(`!![...document.querySelectorAll('[role=button]')].find((n) => n.textContent === 'Salva')`)); i++) await sleep(250);
  await sleep(1500);
  if (field === 'dialog') {
    assert.ok(mobile, '--field dialog needs the phone navigation');
    await evaluate(`[...document.querySelectorAll('[role=navigation] [role=button]')].find((n) => n.textContent === 'Liste').click(); true`); await sleep(800);
    await evaluate(`[...document.querySelectorAll('[role=button]')].find((n) => n.getAttribute('aria-label') === 'Nuova lista').click(); true`); await sleep(800);
    // On touch the dialog focuses its name itself: blur it, so that the measured touch is what opens the keyboard.
    await evaluate(`document.activeElement?.blur?.(); true`); await sleep(200);
  }
  await evaluate(`window.__long = []; new PerformanceObserver((list) => window.__long.push(...list.getEntries().map((e) => Math.round(e.duration)))).observe({ type: 'longtask' }); true`);
  // Read in requestAnimationFrame: the layout the frame is about to paint.
  await evaluate(`(() => {
    window.__frames = [];
    const mobile = ${mobile};
    const start = performance.now();
    const scroller = document.querySelector('[data-whole-rows]');
    const tick = (now) => {
      const nav = document.querySelector('[role=navigation]');
      let bar = nav;
      while (bar?.parentElement && !bar.style?.paddingBottom) bar = bar.parentElement;
      const style = mobile && bar ? getComputedStyle(bar) : null;
      const active = document.activeElement !== document.body ? document.activeElement?.getBoundingClientRect() : null;
      window.__frames.push({ t: Math.round(now - start), viewport: Math.round(visualViewport.height), root: Math.round(document.querySelector('#root').getBoundingClientRect().height),
        scroller: scroller?.clientHeight, scrollTop: Math.round(scroller?.scrollTop ?? 0),
        bar: style ? style.display + '/' + style.opacity + '/' + Math.round(bar.getBoundingClientRect().height) : '-',
        field: active ? Math.round(active.top) + '..' + Math.round(active.bottom) : '-' });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })()`);
  const fieldAt = (which) => evaluate(`(() => {
    const scope = ${JSON.stringify(which)} === 'dialog' ? [...document.querySelectorAll('[role=dialog]')].pop() : document;
    const fields = [...scope.querySelectorAll('input, textarea')].filter((e) => !e.readOnly && e.offsetParent && e !== document.activeElement)
      .filter((e) => { const r = e.getBoundingClientRect(); return r.top > 60 && r.bottom < innerHeight - 100; });
    const element = ${JSON.stringify(which)} === 'low' ? fields.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0] : fields[0];
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);

  for (let cycle = 0; cycle < cycles; cycle++) {
    if (cycle) await mark(`cycle ${cycle + 1}`);
    const target = await fieldAt(field);
    assert.ok(target, 'No text field found for --field ' + field);
    await mark('touch on the field'); await tap(target); await sleep(150);
    await mark(`keyboard opens (viewport ${height - keyboard})`); await viewport(height - keyboard); await sleep(700);
    if (switching) for (const which of ['top', 'low']) {
      const next = await fieldAt(field === 'dialog' ? 'dialog' : which);
      if (!next) { await mark(`no other field (${which})`); continue; }
      await mark(`switch to the ${which} field`); await tap(next); await sleep(500);
    }
    await mark('blur'); await evaluate('document.activeElement?.blur?.(); true'); await sleep(120);
    await mark(`keyboard closes (viewport ${height})`); await viewport(height); await sleep(700);
  }
  const frames = await evaluate('window.__frames');
  // Identical consecutive frames are printed once: every printed line is a change on screen.
  let previous = '';
  for (const frame of frames) {
    if (frame.mark) { console.log('---', frame.mark); previous = ''; continue; }
    const key = JSON.stringify({ ...frame, t: 0 });
    if (key !== previous) console.log(JSON.stringify(frame));
    previous = key;
  }
  console.log('long tasks (ms):', JSON.stringify(await evaluate('window.__long')));
  console.log('errors:', JSON.stringify(errors));
  if (out) writeFileSync(join(out, `keyboard-${field}.json`), JSON.stringify({ width, height, keyboard, cpu, frames, errors }, null, 1));
} finally {
  socket?.close();
  child.kill();
  server.close();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
