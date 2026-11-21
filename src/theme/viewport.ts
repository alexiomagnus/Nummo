// The keyboard may resize only the visual viewport. Keep pinch zoom independent
// of layout: resizing the app to the magnified viewport would reflow its contents.
export function visibleViewportHeight(layoutHeight: number, visual?: { height: number; scale: number } | null): number | null {
  if (visual && Math.abs(visual.scale - 1) > 0.01) return null;
  const height = visual?.height ?? layoutHeight;
  return Number.isFinite(height) && height > 0 ? Math.round(height) : null;
}

// Virtual keyboard: no web API reports it everywhere, so it is inferred. A text field with focus and a visibly shorter
// viewport confirms it; touch entry anticipates opening and recovered height confirms closing even after blur.
// The reference is the tallest viewport seen at the same width (resizes-content shrinks the layout
// viewport, iOS only the visual one; both are covered). A rotation or window resize changes the width and resets the
// reference; browser bars and pinch zoom stay below the threshold or are ignored.
export const keyboardHeightRatio = 0.8;
export type KeyboardReference = { width: number; tallest: number };

export function nextKeyboardReference(previous: KeyboardReference | null, width: number, height: number): KeyboardReference {
  return previous && previous.width === width ? { width, tallest: Math.max(previous.tallest, height) } : { width, tallest: height };
}

export function keyboardOpen(reference: KeyboardReference | null, height: number, editing: boolean): boolean {
  return editing && reference !== null && height < reference.tallest * keyboardHeightRatio;
}

const nonTextInputs = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);
type FocusTarget = { tagName?: string; type?: string; readOnly?: boolean; disabled?: boolean; isContentEditable?: boolean } | null;

// Fields that bring up a virtual keyboard (read-only pickers such as Data/Categoria do not).
export function isTextEntry(element: FocusTarget): boolean {
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName?.toLowerCase();
  if (tag === 'textarea') return !element.readOnly && !element.disabled;
  if (tag !== 'input') return false;
  return !nonTextInputs.has((element.type ?? 'text').toLowerCase()) && !element.readOnly && !element.disabled;
}

// Whether an overlay may move the focus to `element` on opening. On touch-first devices (no hover, coarse pointer) a
// text field would bring up the on-screen keyboard over half of the dialog before the user has chosen a field.
// `textEntry` lifts that rule for the few dialogs whose whole purpose is to type a name (Nuova lista, Nuovo fondo).
export function initialFocusAllowed(element: FocusTarget, touchFirst: boolean, textEntry = false): boolean {
  return textEntry || !(touchFirst && isTextEntry(element));
}

// `update` hides navigation immediately; `onConfirmedChange` permits layout changes only after viewport confirmation.
export function observeVirtualKeyboard(target: Window, update: (open: boolean) => void, onConfirmedChange?: (confirmed: boolean) => void): () => void {
  const visual = target.visualViewport;
  const doc = target.document;
  let reference: KeyboardReference | null = null;
  let height: number | null = null;
  let open = false;
  let opening = false;
  let confirmed = false;
  let publishedConfirmed = false;
  let openingTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (next: boolean) => {
    if (next !== open) { open = next; update(open); }
    if (confirmed !== publishedConfirmed) { publishedConfirmed = confirmed; onConfirmedChange?.(confirmed); }
  };
  const evaluate = () => {
    const detected = height !== null && keyboardOpen(reference, height, isTextEntry(doc.activeElement as FocusTarget));
    if (detected) { confirmed = true; opening = false; clearTimeout(openingTimer); }
    // Blur often precedes the keyboard's closing animation. Keep navigation out
    // of the shrinking viewport until it has almost recovered its full height.
    const closing = confirmed && height !== null && reference !== null && height < reference.tallest * 0.95;
    const next = opening || detected || closing;
    if (!next) confirmed = false;
    publish(next);
  };
  const touchEntry = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !isTextEntry(event.target as FocusTarget)) return;
    // Hide before the first viewport resize, not halfway through the animation.
    opening = true;
    publish(true);
    clearTimeout(openingTimer);
    // A hardware keyboard or a prevented focus may leave the viewport unchanged.
    openingTimer = setTimeout(() => { opening = false; evaluate(); }, 800);
  };
  // A touch that starts on a field and turns into a scroll (pointercancel when the browser takes over the pan, or a
  // scroll before any field has focus) brings no keyboard: show navigation again at once instead of after the timeout,
  // or scrolling a form full of fields keeps hiding it.
  const touchAbandoned = () => {
    if (!opening || isTextEntry(doc.activeElement as FocusTarget)) return;
    opening = false;
    clearTimeout(openingTimer);
    evaluate();
  };
  const resize = () => {
    const measured = visibleViewportHeight(target.innerHeight, visual);
    if (measured === null) return; // pinch zoom: keep the current state
    // The visual width: the layout viewport can widen while a wide overlay is shown, the visual one cannot.
    const width = Math.round(visual?.width ?? target.innerWidth);
    height = measured;
    reference = nextKeyboardReference(reference, width, measured);
    evaluate();
  };
  // Focus moving between two fields passes through <body>: decide after the new field has received focus.
  let pending: ReturnType<typeof setTimeout> | undefined;
  const focusChange = () => { clearTimeout(pending); pending = setTimeout(evaluate, 0); };
  resize();
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  doc.addEventListener('focusin', focusChange);
  doc.addEventListener('focusout', focusChange);
  doc.addEventListener('pointerdown', touchEntry, true);
  doc.addEventListener('pointercancel', touchAbandoned, true);
  doc.addEventListener('scroll', touchAbandoned, true);
  return () => {
    clearTimeout(pending);
    clearTimeout(openingTimer);
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
    doc.removeEventListener('focusin', focusChange);
    doc.removeEventListener('focusout', focusChange);
    doc.removeEventListener('pointerdown', touchEntry, true);
    doc.removeEventListener('pointercancel', touchAbandoned, true);
    doc.removeEventListener('scroll', touchAbandoned, true);
  };
}

export type KeyboardState = Readonly<{ open: boolean; confirmed: boolean }>;

// observeVirtualKeyboard reports `open` and `confirmed` one at a time, and window and visual viewport fire their own
// resize events for one keyboard change. Gather every report made before `queue` runs into a single `commit` of the
// latest state, so the shell renders once (AppShell commits it with flushSync from a microtask, still before the paint:
// the same frame as the new viewport height). `cancel` drops a pending commit (unmount).
export function batchKeyboardReports(commit: (state: KeyboardState) => void, queue: (run: () => void) => void = queueMicrotask) {
  let next: KeyboardState = { open: false, confirmed: false };
  let queued = false;
  let live = true;
  const schedule = (change: Partial<KeyboardState>) => {
    next = { ...next, ...change };
    if (queued) return;
    queued = true;
    queue(() => { queued = false; if (live) commit(next); });
  };
  return {
    open: (open: boolean) => schedule({ open }),
    confirmed: (confirmed: boolean) => schedule({ confirmed }),
    cancel: () => { live = false; },
  };
}

// Scrollbars of overlays appear only while their content scrolls: each scrolled element is marked with
// `data-scrolling` and unmarked `delay` ms after its last scroll event (CSS in GlobalStyle draws the thumb).
export const scrollingAttribute = 'data-scrolling';
type ScrollMark = { setAttribute(name: string, value: string): void; removeAttribute(name: string): void };
export function observeScrolling(doc: Pick<Document, 'addEventListener' | 'removeEventListener'>, delay = 900): () => void {
  const timers = new Map<ScrollMark, ReturnType<typeof setTimeout>>();
  const onScroll = (event: Event) => {
    const target = event.target as Partial<ScrollMark> | null;
    if (!target || typeof target.setAttribute !== 'function' || typeof target.removeAttribute !== 'function') return; // the document itself
    const element = target as ScrollMark;
    element.setAttribute(scrollingAttribute, '');
    clearTimeout(timers.get(element));
    timers.set(element, setTimeout(() => { timers.delete(element); element.removeAttribute(scrollingAttribute); }, delay));
  };
  doc.addEventListener('scroll', onScroll, true);
  return () => {
    doc.removeEventListener('scroll', onScroll, true);
    for (const [element, timer] of timers) { clearTimeout(timer); element.removeAttribute(scrollingAttribute); }
    timers.clear();
  };
}

export const stickyBottomProperty = '--nummo-sticky-bottom';
type ScrollHost = { parentElement: ScrollHost | null; style: { getPropertyValue(name: string): string; setProperty(name: string, value: string): void; removeProperty(name: string): string } };

// A sticky bar at the bottom of a scroll container covers what the browser scrolls into view when focus moves there.
// Its height is published on the nearest scroll container; GlobalStyle turns it into scroll padding during keyboard
// navigation only (Tab), because Paper menus also move focus programmatically on mount, and that must not scroll the
// page. Returns the cleanup.
export function reserveScrollPadding(element: ScrollHost | null, height: number, overflowOf: (node: ScrollHost) => string): () => void {
  let host = element?.parentElement ?? null;
  while (host && !/(auto|scroll)/.test(overflowOf(host))) host = host.parentElement;
  if (!host || height <= 0) return () => {};
  const target = host;
  const previous = target.style.getPropertyValue(stickyBottomProperty);
  target.style.setProperty(stickyBottomProperty, `${Math.ceil(height)}px`);
  return () => { if (previous) target.style.setProperty(stickyBottomProperty, previous); else target.style.removeProperty(stickyBottomProperty); };
}

export function observeViewportHeight(target: Window, update: (height: number) => void): () => void {
  const visual = target.visualViewport;
  const doc = target.document;
  let previous: number | null = null;
  const resize = () => {
    // Background windows may report transient dimensions during Android task transitions.
    if (doc?.visibilityState === 'hidden') return;
    const height = visibleViewportHeight(target.innerHeight, visual);
    if (height !== null && height !== previous) { previous = height; update(height); }
  };
  resize();
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  doc?.addEventListener('visibilitychange', resize);
  target.addEventListener('pageshow', resize);
  return () => {
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
    doc?.removeEventListener('visibilitychange', resize);
    target.removeEventListener('pageshow', resize);
  };
}
