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
// Longest time the navigation stays hidden for a keyboard that is closing. Recovering 95 % of the tallest height ends it
// sooner; without a limit, a viewport that never got that tall again (the browser's address bar shown again after it
// had been hidden while the reference was measured, an Android task switch) kept the bar hidden for good.
export const keyboardClosingLimit = 1000;
// Longest time between the touch leaving a field (pointerup) and the focus it gives, for that focus to count as a touch.
export const touchFocusWindow = 500;
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
  // On touch-first devices a text field is never focused on opening, not even in creation screens (user's request,
  // 23 November: Nuova lista and Nuovo fondo no longer bring up the keyboard by themselves); `textEntry` only picks the
  // field with a physical keyboard and mouse.
  void textEntry;
  return !(touchFirst && isTextEntry(element));
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
  let closingTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (next: boolean) => {
    if (next !== open) { open = next; update(open); }
    if (confirmed !== publishedConfirmed) { publishedConfirmed = confirmed; onConfirmedChange?.(confirmed); }
  };
  const evaluate = () => {
    const detected = height !== null && keyboardOpen(reference, height, isTextEntry(doc.activeElement as FocusTarget));
    if (detected) { confirmed = true; opening = false; clearTimeout(openingTimer); clearTimeout(closingTimer); closingTimer = undefined; }
    // Blur often precedes the keyboard's closing animation. Keep navigation out
    // of the shrinking viewport until it has almost recovered its full height, for keyboardClosingLimit at most.
    const closing = !detected && confirmed && height !== null && reference !== null && height < reference.tallest * 0.95;
    if (closing && closingTimer === undefined) {
      // Still short when the limit expires: that height is the page's own now, the new reference.
      closingTimer = setTimeout(() => {
        closingTimer = undefined;
        confirmed = false;
        if (reference !== null && height !== null) reference = { width: reference.width, tallest: height };
        evaluate();
      }, keyboardClosingLimit);
    }
    if (!closing && !detected) { clearTimeout(closingTimer); closingTimer = undefined; }
    const next = opening || detected || closing;
    if (!next) confirmed = false;
    publish(next);
  };
  // Anticipation: hide before the first viewport resize, not halfway through the animation. It starts when a touch has
  // really entered a field, never on pointerdown: a touch on a field that turns into a scroll (and on Nuova spesa almost
  // every scroll starts on a field) hid the bar on pointerdown and showed it again on pointercancel, a flash at every
  // scroll (user's report, 22 November). A tap focuses the field after the finger lifts and before the keyboard opens:
  // so on pointerup, the touched field is remembered and the focus it receives anticipates the keyboard; a tap on the
  // field that already has focus (keyboard closed with Back) anticipates on pointerup itself. A tap that stops a fling
  // focuses nothing and hides nothing.
  const anticipate = () => {
    opening = true;
    publish(true);
    clearTimeout(openingTimer);
    // A hardware keyboard or a prevented focus may leave the viewport unchanged.
    openingTimer = setTimeout(() => { opening = false; evaluate(); }, 800);
  };
  let touchedField: unknown = null;
  let touchedAt = 0;
  const touchEnd = (event: PointerEvent) => {
    touchedField = null;
    if (event.pointerType !== 'touch' || !isTextEntry(event.target as FocusTarget)) return;
    if (event.target === doc.activeElement) { anticipate(); return; }
    touchedField = event.target;
    touchedAt = Date.now();
  };
  const touchFocus = () => {
    const active = doc.activeElement;
    const touched = active !== null && active === touchedField && Date.now() - touchedAt < touchFocusWindow;
    touchedField = null;
    if (touched && isTextEntry(active as FocusTarget)) anticipate();
  };
  const resize = () => {
    // Background windows may report transient dimensions during Android task transitions: they must not become the
    // reference, or the bar would wait for a height the page never reaches again.
    if (doc.visibilityState === 'hidden') return;
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
  const focusChange = (event: Event) => { if (event.type === 'focusin') touchFocus(); clearTimeout(pending); pending = setTimeout(evaluate, 0); };
  resize();
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  doc.addEventListener('focusin', focusChange);
  doc.addEventListener('focusout', focusChange);
  doc.addEventListener('pointerup', touchEnd, true);
  return () => {
    clearTimeout(pending);
    clearTimeout(openingTimer);
    clearTimeout(closingTimer);
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
    doc.removeEventListener('focusin', focusChange);
    doc.removeEventListener('focusout', focusChange);
    doc.removeEventListener('pointerup', touchEnd, true);
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

// Brings the focused field into view with `margin` left under it, for this scroll only (`scroll-margin-bottom`). Shared by the
// shell (page scroller) and the screens (their own scroller, which shrinks one render after the viewport: ScreenLayer).
export function revealFocusedField(doc: Document, margin: number, within?: Element | null): void {
  const active = doc.activeElement;
  if (!(active instanceof HTMLElement) || active === doc.body || (within && !within.contains(active))) return;
  const previous = active.style.scrollMarginBottom;
  active.style.scrollMarginBottom = `${margin}px`;
  active.scrollIntoView({ block: 'nearest' });
  active.style.scrollMarginBottom = previous;
}

// While the keyboard is open, call `onShrink` whenever the visible viewport gets shorter again: iOS shrinks its visual
// viewport in steps during the keyboard animation, and a suggestion strip may shrink it later. `onShrink` runs in a
// microtask, after every listener of that resize event (GlobalStyle's new --nummo-viewport-height included) and still
// before the paint. Growth (keyboard closing, browser bars) is ignored. Returns the cleanup.
export function observeViewportShrink(target: Window, onShrink: () => void, queue: (run: () => void) => void = queueMicrotask): () => void {
  const visual = target.visualViewport;
  const measure = () => visual?.height ?? target.innerHeight;
  let last = measure();
  const resize = () => {
    const height = measure();
    const shrunk = height < last - 1;
    last = height;
    if (shrunk) queue(onShrink);
  };
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  return () => { target.removeEventListener('resize', resize); visual?.removeEventListener('resize', resize); };
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

// Where the visible part of the page starts, from the top of the layout viewport. iOS never shrinks the layout viewport
// for its keyboard: it shrinks only the visual one and, to show a field the keyboard would cover, pans it down inside the
// layout viewport (`offsetTop`). An app sized to the visual height but drawn from the layout top then had its top bar
// scrolled out of view and an empty strip of background above the keyboard. #root is `position: fixed` at this offset
// (index.html, `--nummo-viewport-top`), so it always covers exactly what can be seen. Chrome on Android
// (resizes-content) and desktop browsers always report 0. Pinch zoom (offset of a magnified view): null, keep the value.
export function visibleViewportTop(visual?: { offsetTop: number; scale: number } | null): number | null {
  if (!visual) return 0;
  if (Math.abs(visual.scale - 1) > 0.01) return null;
  return Number.isFinite(visual.offsetTop) ? Math.max(0, Math.round(visual.offsetTop)) : 0;
}

// Reports visibleViewportTop on every change: the visual viewport's own `scroll` (the pan) and `resize`, plus the same
// resumption events as observeViewportHeight. Returns the cleanup.
export function observeViewportTop(target: Window, update: (top: number) => void): () => void {
  const visual = target.visualViewport;
  const doc = target.document;
  let previous: number | null = null;
  const measure = () => {
    if (doc?.visibilityState === 'hidden') return;
    const top = visibleViewportTop(visual);
    if (top !== null && top !== previous) { previous = top; update(top); }
  };
  measure();
  visual?.addEventListener('scroll', measure);
  visual?.addEventListener('resize', measure);
  target.addEventListener('resize', measure);
  doc?.addEventListener('visibilitychange', measure);
  target.addEventListener('pageshow', measure);
  return () => {
    visual?.removeEventListener('scroll', measure);
    visual?.removeEventListener('resize', measure);
    target.removeEventListener('resize', measure);
    doc?.removeEventListener('visibilitychange', measure);
    target.removeEventListener('pageshow', measure);
  };
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
