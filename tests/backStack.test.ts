import assert from 'node:assert/strict';
import test from 'node:test';
import { backLevels, createBackStack, isGuard } from '../src/theme/backStack.ts';

// A browser history: `back()` moves later (a task), as in the browser; `user()` is the Back button.
function fakeWindow(states: unknown[] = [null]) {
  const entries = states.map((state) => ({ state, url: 'https://nummo.test/' }));
  let index = entries.length - 1;
  const listeners: (() => void)[] = [];
  const tasks: (() => void)[] = [];
  const move = (delta: number) => {
    const next = index + delta;
    if (next < 0) { left = true; return; }
    index = next;
    for (const listener of listeners) listener();
  };
  let left = false;
  const win = {
    history: {
      get state() { return entries[index]!.state; },
      pushState(state: unknown, _unused: string, url?: string | null) { entries.splice(index + 1); entries.push({ state, url: url ?? entries[index]!.url }); index += 1; },
      back() { tasks.push(() => move(-1)); },
    },
    location: { get href() { return entries[index]!.url; } },
    addEventListener(_type: 'popstate', listener: () => void) { listeners.push(listener); },
  };
  const microtasks: (() => void)[] = [];
  // Runs scheduled syncs and pending history moves until nothing is left.
  const flush = () => { while (microtasks.length || tasks.length) { while (microtasks.length) microtasks.shift()!(); tasks.shift()?.(); } };
  return {
    win, flush, schedule: (run: () => void) => { microtasks.push(run); },
    user() { move(-1); flush(); },
    get length() { return index + 1; },
    get onGuard() { return isGuard(entries[index]!.state); },
    get left() { return left; },
  };
}

test('indietro: un livello aperto aggiunge una sola voce, Indietro lo chiude e resta nell’app', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  page.flush();
  assert.equal(page.length, 1);
  let open = true;
  const unregister = stack.register(backLevels.overlay, () => { open = false; return true; });
  page.flush();
  assert.equal(page.length, 2);
  assert.ok(page.onGuard);
  page.user();
  assert.equal(open, false);
  assert.equal(page.length, 1);
  assert.equal(page.left, false);
  assert.equal(stack.depth, 0);
  unregister(); // the component closes afterwards: no second move
  page.flush();
  assert.equal(page.length, 1);
  // Nothing open: Back leaves the app.
  page.user();
  assert.equal(page.left, true);
});

test('indietro: livelli annidati si chiudono dall’alto, la voce torna finché resta qualcosa', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  const closed: string[] = [];
  stack.register(backLevels.page, () => { closed.push('pagina'); return true; });
  page.flush();
  stack.register(backLevels.overlay, () => { closed.push('dialogo'); return true; });
  stack.register(backLevels.overlay, () => { closed.push('selettore'); return true; });
  page.flush();
  assert.equal(page.length, 2); // still one guard
  page.user();
  assert.deepEqual(closed, ['selettore']);
  assert.equal(page.length, 2);
  page.user();
  page.user();
  assert.deepEqual(closed, ['selettore', 'dialogo', 'pagina']);
  assert.equal(page.length, 1);
  assert.equal(page.left, false);
});

test('indietro: il livello conta più dell’ordine di registrazione (dettaglio registrato prima della pagina)', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  const closed: string[] = [];
  stack.register(backLevels.detail, () => { closed.push('lista aperta'); return true; });
  stack.register(backLevels.page, () => { closed.push('Liste'); return true; });
  page.flush();
  page.user();
  assert.deepEqual(closed, ['lista aperta']);
});

test('indietro: chiusura dall’interfaccia consuma la voce senza chiudere altro', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  let pageClosed = false;
  stack.register(backLevels.page, () => { pageClosed = true; return true; });
  const dialog = stack.register(backLevels.overlay, () => true);
  page.flush();
  dialog(); // «Annulla»: the page stays, and so does the guard
  page.flush();
  assert.equal(page.length, 2);
  page.user();
  assert.equal(pageClosed, true);
  assert.equal(page.length, 1);
});

test('indietro: l’ultimo livello chiuso dall’interfaccia toglie la voce; uno nuovo aperto subito la rimette', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  const first = stack.register(backLevels.overlay, () => true);
  page.flush();
  first(); // the menu item closes the menu…
  page.schedule(() => stack.register(backLevels.page, () => true)); // …and opens a page before our back() has moved
  page.flush();
  assert.equal(page.length, 2);
  assert.ok(page.onGuard);
  assert.equal(stack.depth, 1);
  page.user();
  assert.equal(page.length, 1);
  assert.equal(page.left, false);
});

test('indietro: un dialogo occupato rifiuta, resta aperto e la voce torna', () => {
  const page = fakeWindow();
  const stack = createBackStack(page.win, page.schedule);
  let busy = true;
  let open = true;
  stack.register(backLevels.overlay, () => { if (busy) return false; open = false; return true; });
  page.flush();
  page.user();
  assert.equal(open, true);
  assert.equal(page.length, 2);
  assert.equal(stack.depth, 1);
  busy = false;
  page.user();
  assert.equal(open, false);
  assert.equal(page.length, 1);
});

test('indietro: un ricaricamento sulla voce di guardia la toglie se non c’è nulla di aperto', () => {
  const page = fakeWindow([null, { nummoBack: true }]);
  createBackStack(page.win, page.schedule);
  page.flush();
  assert.equal(page.onGuard, false);
  assert.equal(page.length, 1);
  assert.equal(page.left, false);
});

test('indietro: popstate sintetico senza movimento (guida) non chiude nulla', () => {
  const page = fakeWindow();
  const listeners: (() => void)[] = [];
  const win = { ...page.win, addEventListener: (_type: 'popstate', listener: () => void) => { listeners.push(listener); page.win.addEventListener('popstate', listener); } };
  const stack = createBackStack(win, page.schedule);
  let open = true;
  stack.register(backLevels.page, () => { open = false; return true; });
  page.flush();
  for (const listener of listeners) listener();
  page.flush();
  assert.equal(open, true);
  assert.equal(page.length, 2);
});
