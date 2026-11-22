import assert from 'node:assert/strict';
import { test } from 'node:test';
import { batchKeyboardReports, initialFocusAllowed, isTextEntry, keyboardOpen, nextKeyboardReference, observeViewportShrink, observeVirtualKeyboard, observeViewportHeight, reserveScrollPadding, stickyBottomProperty, visibleViewportHeight } from '../src/theme/viewport.ts';

test('viewport: tastiera e barre browser riducono lo spazio disponibile; fallback senza API e zoom indipendente', () => {
  assert.equal(visibleViewportHeight(900, { height: 750.4, scale: 1 }), 750);
  assert.equal(visibleViewportHeight(900, { height: 380, scale: 1 }), 380);
  assert.equal(visibleViewportHeight(900, null), 900);
  assert.equal(visibleViewportHeight(900, { height: 380, scale: 2 }), null);
  assert.equal(visibleViewportHeight(0, null), null);
  assert.equal(visibleViewportHeight(NaN, null), null);
});

test('viewport: apertura/chiusura tastiera, rotazione, zoom e rimozione dei listener', () => {
  const visual = Object.assign(new EventTarget(), { height: 750, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 900, visualViewport: visual });
  const heights: number[] = [];
  const stop = observeViewportHeight(target as unknown as Window, (height) => heights.push(height));
  visual.height = 380;
  visual.dispatchEvent(new Event('resize'));
  target.dispatchEvent(new Event('resize')); // Same height is not emitted twice.
  visual.height = 750;
  visual.dispatchEvent(new Event('resize'));
  visual.scale = 2; visual.height = 375;
  visual.dispatchEvent(new Event('resize')); // Pinch zoom must not reflow the app.
  visual.scale = 1; visual.height = 400;
  target.dispatchEvent(new Event('resize')); // Landscape.
  assert.deepEqual(heights, [750, 380, 750, 400]);
  stop();
  visual.height = 800;
  visual.dispatchEvent(new Event('resize'));
  target.dispatchEvent(new Event('resize'));
  assert.deepEqual(heights, [750, 380, 750, 400]);
});

test('viewport: ridimensionamento finestra senza VisualViewport', () => {
  const target = Object.assign(new EventTarget(), { innerHeight: 900 });
  const heights: number[] = [];
  const stop = observeViewportHeight(target as unknown as Window, (height) => heights.push(height));
  target.innerHeight = 600;
  target.dispatchEvent(new Event('resize'));
  assert.deepEqual(heights, [900, 600]);
  stop();
});

test('viewport: Home e multitasking ignorano misure nascoste e rimisurano alla ripresa senza resize', () => {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const visual = Object.assign(new EventTarget(), { height: 915, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, visualViewport: visual, document: doc });
  const heights: number[] = [];
  const stop = observeViewportHeight(target as unknown as Window, (height) => heights.push(height));
  doc.visibilityState = 'hidden';
  visual.height = 400;
  visual.dispatchEvent(new Event('resize'));
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(heights, [915]);
  visual.height = 880;
  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  visual.height = 915;
  target.dispatchEvent(new Event('pageshow'));
  assert.deepEqual(heights, [915, 880, 915]);
  stop();
  visual.height = 600;
  doc.dispatchEvent(new Event('visibilitychange'));
  target.dispatchEvent(new Event('pageshow'));
  assert.deepEqual(heights, [915, 880, 915]);
});

test('tastiera virtuale: riferimento per larghezza, soglia, solo con un campo di testo attivo', () => {
  let reference = nextKeyboardReference(null, 412, 915);
  reference = nextKeyboardReference(reference, 412, 503); // keyboard: the tallest height is kept
  assert.deepEqual(reference, { width: 412, tallest: 915 });
  assert.equal(keyboardOpen(reference, 503, true), true);
  assert.equal(keyboardOpen(reference, 503, false), false, 'senza campo attivo non è una tastiera');
  assert.equal(keyboardOpen(reference, 860, true), false, 'barre del browser: sotto la soglia');
  assert.equal(keyboardOpen(null, 503, true), false);
  assert.deepEqual(nextKeyboardReference(reference, 915, 412), { width: 915, tallest: 412 }, 'rotazione: nuovo riferimento');
});

test('tastiera virtuale: campi che la aprono', () => {
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(isTextEntry({ tagName: 'INPUT' }), true);
  assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'text', readOnly: true }), false, 'Data/Categoria sono in sola lettura');
  assert.equal(isTextEntry({ tagName: 'INPUT', type: 'checkbox' }), false);
  assert.equal(isTextEntry({ tagName: 'TEXTAREA', disabled: true }), false);
  assert.equal(isTextEntry({ tagName: 'BUTTON' }), false);
  assert.equal(isTextEntry({ tagName: 'BODY' }), false);
  assert.equal(isTextEntry(null), false);
});

test('overlay: su touch nessun campo di testo riceve il focus all\'apertura, sul desktop sì', () => {
  assert.equal(initialFocusAllowed({ tagName: 'INPUT', type: 'text' }, true), false, 'Importo in Modifica spesa su smartphone');
  assert.equal(initialFocusAllowed({ tagName: 'TEXTAREA' }, true), false);
  assert.equal(initialFocusAllowed({ tagName: 'INPUT', type: 'text' }, false), true, 'tastiera fisica e mouse');
  assert.equal(initialFocusAllowed({ tagName: 'BUTTON' }, true), true, 'voci di menu e pulsanti restano il primo focus');
  assert.equal(initialFocusAllowed({ tagName: 'INPUT', type: 'text', readOnly: true }, true), true);
  assert.equal(initialFocusAllowed({ tagName: 'INPUT', type: 'text' }, true, true), true, 'Nuova lista e Nuovo fondo: tastiera subito');
  assert.equal(initialFocusAllowed({ tagName: 'INPUT', type: 'text' }, false, true), true);
});

test('tastiera virtuale: apertura, passaggio tra campi, chiusura, zoom e rimozione dei listener', async () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
  const doc = Object.assign(new EventTarget(), { activeElement: { tagName: 'BODY' } as object });
  const visual = Object.assign(new EventTarget(), { height: 915, width: 412, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, innerWidth: 412, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const confirmed: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open), (value) => confirmed.push(value));
  const input = { tagName: 'INPUT', type: 'text' }, area = { tagName: 'TEXTAREA' };
  doc.activeElement = input; doc.dispatchEvent(new Event('focusin')); await tick();
  assert.deepEqual(states, [], 'focus senza riduzione: tastiera fisica');
  visual.height = 503; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true]);
  // Importo → Descrizione passes through <body>: no flicker.
  doc.activeElement = { tagName: 'BODY' }; doc.dispatchEvent(new Event('focusout'));
  doc.activeElement = area; doc.dispatchEvent(new Event('focusin')); await tick();
  assert.deepEqual(states, [true]);
  visual.scale = 2; visual.height = 300; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true], 'pinch zoom ignorato');
  visual.scale = 1; visual.height = 915; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true, false], 'tastiera chiusa con il campo ancora attivo (tasto indietro)');
  visual.height = 503; visual.dispatchEvent(new Event('resize'));
  doc.activeElement = { tagName: 'BODY' }; doc.dispatchEvent(new Event('focusout')); await tick();
  assert.deepEqual(states, [true, false, true], 'blur: la tastiera sta ancora chiudendosi');
  visual.height = 800; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true, false, true], 'la barra resta nascosta durante la chiusura');
  visual.height = 915; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true, false, true, false], 'la navigazione torna a viewport ripristinato');
  stop();
  doc.activeElement = input; doc.dispatchEvent(new Event('focusin')); visual.dispatchEvent(new Event('resize')); await tick();
  assert.deepEqual(states, [true, false, true, false]);
  assert.deepEqual(confirmed, [true, false, true, false], 'lo spazio della barra si libera solo con tastiera confermata e torna alla fine della chiusura');
});

test('tastiera virtuale: il tocco che entra in un campo anticipa l’apertura, nessun flash nei primi resize e fallback con tastiera fisica', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const body = { tagName: 'BODY' }, input = { tagName: 'INPUT', type: 'text' }, picker = { ...input, readOnly: true };
  const doc = Object.assign(new EventTarget(), { activeElement: body as object });
  const visual = Object.assign(new EventTarget(), { height: 915, width: 412, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, innerWidth: 412, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const confirmed: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open), (value) => confirmed.push(value));
  const pointer = (type: string, pointerType: string, entry: object) => {
    const event = Object.assign(new Event(type), { pointerType });
    Object.defineProperty(event, 'target', { value: entry });
    doc.dispatchEvent(event);
  };
  const focus = (entry: object) => { doc.activeElement = entry; doc.dispatchEvent(new Event('focusin')); };
  // A tap: pointerdown, pointerup, then the focus.
  const tap = (entry: object, pointerType = 'touch') => { pointer('pointerdown', pointerType, entry); pointer('pointerup', pointerType, entry); focus(entry); };
  tap(input, 'mouse');
  focus(body); context.mock.timers.tick(10);
  tap(picker);
  focus(body); context.mock.timers.tick(10);
  assert.deepEqual(states, [], 'mouse e picker non anticipano la tastiera');
  pointer('pointerdown', 'touch', input);
  assert.deepEqual(states, [], 'la sola pressione non nasconde la barra: potrebbe diventare uno scorrimento');
  pointer('pointerup', 'touch', input); focus(input);
  assert.deepEqual(states, [true], 'barra nascosta al focus dato dal tocco, prima del primo resize');
  assert.deepEqual(confirmed, [], 'il tocco non deve liberare spazio e spostare il bersaglio');
  visual.height = 880; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true], 'nessuna ricomparsa all’inizio dell’animazione');
  visual.height = 503; visual.dispatchEvent(new Event('resize'));
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true], 'tastiera confermata dal viewport');
  assert.deepEqual(confirmed, [true]);
  // Back closes the keyboard, the field keeps the focus; a tap on it opens the keyboard again without a new focus.
  visual.height = 915; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true, false]);
  pointer('pointerdown', 'touch', input); pointer('pointerup', 'touch', input);
  assert.deepEqual(states, [true, false, true], 'tocco sul campo già attivo: anticipo al rilascio');
  visual.height = 860; visual.dispatchEvent(new Event('resize'));
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true, false, true, false], 'con sole barre browser il tocco non lascia la barra nascosta');
  assert.deepEqual(confirmed, [true, false], 'il fallback non cambia la geometria della pagina');
  // A focus long after the touch (programmatic) does not count as a touch.
  focus(body); context.mock.timers.tick(10);
  pointer('pointerup', 'touch', input); context.mock.timers.tick(600); focus(input);
  assert.deepEqual(states, [true, false, true, false], 'focus lontano dal tocco: nessun anticipo');
  focus(body); context.mock.timers.tick(10);
  tap(input);
  stop();
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true, false, true, false, true], 'cleanup annulla anche l’anticipo pendente');
});

test('tastiera virtuale: uno scorrimento iniziato su un campo non fa sparire la barra', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const body = { tagName: 'BODY' }, input = { tagName: 'INPUT', type: 'text' };
  const doc = Object.assign(new EventTarget(), { activeElement: body as object });
  const visual = Object.assign(new EventTarget(), { height: 844, width: 390, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 844, innerWidth: 390, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open));
  const touch = (type: string) => {
    const event = Object.assign(new Event(type), { pointerType: 'touch' });
    Object.defineProperty(event, 'target', { value: input });
    doc.dispatchEvent(event);
  };
  touch('pointerdown');
  doc.dispatchEvent(new Event('scroll'));
  touch('pointercancel'); // the browser took over the pan
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [], 'nessuna scomparsa né ricomparsa: prima la barra lampeggiava a ogni scorrimento');
  // A tap that stops a fling focuses nothing.
  touch('pointerdown'); touch('pointerup');
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [], 'tocco che ferma lo scorrimento: la barra resta');
  // A real tap: focus arrives, then the field is scrolled into view while the keyboard opens.
  touch('pointerdown'); touch('pointerup');
  doc.activeElement = input; doc.dispatchEvent(new Event('focusin'));
  doc.dispatchEvent(new Event('scroll'));
  assert.deepEqual(states, [true], 'con il campo attivo la barra resta nascosta');
  visual.height = 450; visual.dispatchEvent(new Event('resize'));
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true], 'tastiera confermata');
  stop();
});

test('tastiera virtuale: la barra torna anche se il viewport non recupera l’altezza di riferimento', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const body = { tagName: 'BODY' }, input = { tagName: 'INPUT', type: 'text' };
  const doc = Object.assign(new EventTarget(), { activeElement: input as object, visibilityState: 'visible' });
  // Reference measured with the address bar hidden (915); with the bar shown again the page is 859 tall.
  const visual = Object.assign(new EventTarget(), { height: 915, width: 412, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, innerWidth: 412, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const confirmed: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open), (value) => confirmed.push(value));
  const resize = (height: number) => { visual.height = height; visual.dispatchEvent(new Event('resize')); };
  resize(503);
  assert.deepEqual(states, [true]);
  doc.activeElement = body; doc.dispatchEvent(new Event('focusout'));
  context.mock.timers.tick(0);
  resize(859);
  context.mock.timers.tick(900);
  assert.deepEqual(states, [true], 'durante la chiusura la barra resta nascosta');
  context.mock.timers.tick(200);
  assert.deepEqual(states, [true, false], 'oltre il limite di chiusura la barra ricompare');
  assert.deepEqual(confirmed, [true, false]);
  // The new reference is the page's own height: the next keyboard closes without waiting.
  doc.activeElement = input; doc.dispatchEvent(new Event('focusin')); context.mock.timers.tick(0);
  resize(480);
  doc.activeElement = body; doc.dispatchEvent(new Event('focusout')); context.mock.timers.tick(0);
  resize(859);
  assert.deepEqual(states, [true, false, true, false], 'altezza ritrovata: barra subito visibile');
  // A page in the background (task switch) does not move the reference.
  doc.visibilityState = 'hidden'; resize(1200); doc.visibilityState = 'visible';
  doc.activeElement = input; doc.dispatchEvent(new Event('focusin')); context.mock.timers.tick(0);
  resize(480);
  doc.activeElement = body; doc.dispatchEvent(new Event('focusout')); context.mock.timers.tick(0);
  resize(859);
  assert.deepEqual(states, [true, false, true, false, true, false], 'misure in background ignorate');
  stop();
});

test('scroll padding: altezza della barra pubblicata sul contenitore scorrevole più vicino e ripristinata', () => {
  const style = (initial: Record<string, string> = {}) => {
    const values = new Map(Object.entries(initial));
    return { values, getPropertyValue: (name: string) => values.get(name) ?? '', setProperty: (name: string, value: string) => { values.set(name, value); },
      removeProperty: (name: string) => { const old = values.get(name) ?? ''; values.delete(name); return old; } };
  };
  type Node = { parentElement: Node | null; style: ReturnType<typeof style>; overflow: string };
  const scroller: Node = { parentElement: null, style: style(), overflow: 'auto' };
  const page: Node = { parentElement: scroller, style: style(), overflow: 'visible' };
  const footer: Node = { parentElement: page, style: style(), overflow: 'visible' };
  const overflowOf = (node: unknown) => (node as Node).overflow;
  const restore = reserveScrollPadding(footer, 87.5, overflowOf);
  assert.equal(scroller.style.getPropertyValue(stickyBottomProperty), '88px');
  assert.equal(page.style.values.size, 0);
  restore();
  assert.equal(scroller.style.values.size, 0);
  scroller.style.setProperty(stickyBottomProperty, '4px');
  reserveScrollPadding(footer, 50, overflowOf)();
  assert.equal(scroller.style.getPropertyValue(stickyBottomProperty), '4px', 'valore precedente ripristinato');
  reserveScrollPadding(footer, 0, overflowOf)();
  assert.equal(scroller.style.getPropertyValue(stickyBottomProperty), '4px', 'altezza ignota: nessuna modifica');
  reserveScrollPadding({ ...footer, parentElement: null }, 50, overflowOf)();
});

test('barre di scorrimento dei dialoghi: visibili solo durante lo scorrimento', async () => {
  const { observeScrolling, scrollingAttribute } = await import('../src/theme/viewport.ts');
  let listener: ((event: Event) => void) | null = null;
  const doc = { addEventListener: (_: string, l: (event: Event) => void) => { listener = l; }, removeEventListener: () => { listener = null; } };
  const attrs = new Set<string>();
  const element = { setAttribute: (name: string) => attrs.add(name), removeAttribute: (name: string) => attrs.delete(name) };
  const stop = observeScrolling(doc as never, 20);
  listener!({ target: element } as never);
  assert.ok(attrs.has(scrollingAttribute), 'compare scorrendo');
  await new Promise((r) => setTimeout(r, 10));
  listener!({ target: element } as never);
  await new Promise((r) => setTimeout(r, 15));
  assert.ok(attrs.has(scrollingAttribute), 'resta finché si continua a scorrere');
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(!attrs.has(scrollingAttribute), 'scompare dopo la pausa');
  listener!({ target: {} } as never); // the document: ignored
  listener!({ target: element } as never);
  stop();
  assert.ok(!attrs.has(scrollingAttribute) && listener === null, 'arresto pulito');
});

test('tastiera virtuale: gli avvisi dello stesso evento diventano un solo aggiornamento, mai dopo lo smontaggio', () => {
  const queued: (() => void)[] = [];
  const commits: { open: boolean; confirmed: boolean }[] = [];
  const reports = batchKeyboardReports((state) => commits.push(state), (run) => queued.push(run));
  // Opening confirmed by a resize: `open` and `confirmed` in one event, window and visual viewport both firing.
  reports.open(true); reports.confirmed(true); reports.open(true);
  assert.equal(queued.length, 1, 'one commit scheduled per batch');
  assert.deepEqual(commits, []);
  queued.shift()!();
  assert.deepEqual(commits, [{ open: true, confirmed: true }]);
  // Closing: the latest values win, the earlier ones of the batch are not committed.
  reports.open(false); reports.confirmed(false);
  queued.shift()!();
  assert.deepEqual(commits.at(-1), { open: false, confirmed: false });
  assert.equal(commits.length, 2);
  // A batch still pending when the shell unmounts is dropped.
  reports.open(true);
  reports.cancel();
  queued.shift()!();
  assert.equal(commits.length, 2);
});

test('tastiera virtuale: ogni nuovo restringimento del viewport riporta in vista il campo, la crescita no', () => {
  const queued: (() => void)[] = [];
  let reveals = 0;
  const visual = Object.assign(new EventTarget(), { height: 604, width: 390, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 844, innerWidth: 390, visualViewport: visual });
  const stop = observeViewportShrink(target as unknown as Window, () => { reveals++; }, (run) => queued.push(run));
  const resize = (height: number, on: EventTarget = visual) => { visual.height = height; on.dispatchEvent(new Event('resize')); };
  // iOS: the visual viewport keeps shrinking after the keyboard has been confirmed.
  resize(484); resize(364);
  assert.equal(queued.length, 2, 'un passo, un controllo');
  for (const run of queued.splice(0)) run();
  assert.equal(reveals, 2);
  // The same height reported by the window too, sub-pixel noise and growth: nothing to do.
  resize(364, target); resize(363.5); resize(500); resize(844);
  assert.equal(queued.length, 0);
  // A shrink measured against the latest height, not the first one.
  resize(700);
  assert.equal(queued.length, 1);
  stop();
  resize(300);
  assert.equal(queued.length, 1, 'nessun ascolto dopo la rimozione');
});
