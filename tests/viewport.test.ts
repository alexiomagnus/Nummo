import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTextEntry, keyboardOpen, nextKeyboardReference, observeVirtualKeyboard, observeViewportHeight, reserveScrollPadding, stickyBottomProperty, visibleViewportHeight } from '../src/theme/viewport.ts';

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

test('tastiera virtuale: apertura, passaggio tra campi, chiusura, zoom e rimozione dei listener', async () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
  const doc = Object.assign(new EventTarget(), { activeElement: { tagName: 'BODY' } as object });
  const visual = Object.assign(new EventTarget(), { height: 915, width: 412, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, innerWidth: 412, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open));
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
});

test('tastiera virtuale: tocco anticipa apertura, nessun flash nei primi resize e fallback con tastiera fisica', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const input = { tagName: 'INPUT', type: 'text' };
  const doc = Object.assign(new EventTarget(), { activeElement: input });
  const visual = Object.assign(new EventTarget(), { height: 915, width: 412, scale: 1 });
  const target = Object.assign(new EventTarget(), { innerHeight: 915, innerWidth: 412, visualViewport: visual, document: doc });
  const states: boolean[] = [];
  const stop = observeVirtualKeyboard(target as unknown as Window, (open) => states.push(open));
  const pointer = (pointerType: string, entry: object) => {
    const event = Object.assign(new Event('pointerdown'), { pointerType });
    Object.defineProperty(event, 'target', { value: entry });
    doc.dispatchEvent(event);
  };
  pointer('mouse', input);
  pointer('touch', { ...input, readOnly: true });
  assert.deepEqual(states, [], 'mouse e picker non anticipano la tastiera');
  pointer('touch', input);
  assert.deepEqual(states, [true], 'barra nascosta prima del primo resize');
  visual.height = 880; visual.dispatchEvent(new Event('resize'));
  assert.deepEqual(states, [true], 'nessuna ricomparsa all’inizio dell’animazione');
  visual.height = 503; visual.dispatchEvent(new Event('resize'));
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true], 'tastiera confermata dal viewport');
  visual.height = 915; visual.dispatchEvent(new Event('resize'));
  pointer('touch', input);
  visual.height = 860; visual.dispatchEvent(new Event('resize'));
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true, false, true, false], 'con sole barre browser il tocco non lascia la barra nascosta');
  pointer('touch', input);
  stop();
  context.mock.timers.tick(1000);
  assert.deepEqual(states, [true, false, true, false, true], 'cleanup annulla anche l’anticipo pendente');
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
