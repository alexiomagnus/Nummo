// The keyboard may resize only the visual viewport. Keep pinch zoom independent
// of layout: resizing the app to the magnified viewport would reflow its contents.
export function visibleViewportHeight(layoutHeight: number, visual?: { height: number; scale: number } | null): number | null {
  if (visual && Math.abs(visual.scale - 1) > 0.01) return null;
  const height = visual?.height ?? layoutHeight;
  return Number.isFinite(height) && height > 0 ? Math.round(height) : null;
}

// Virtual keyboard: no web API reports it everywhere, so it is inferred. It is open while a text field has focus and the
// visible viewport is clearly shorter than the tallest one seen at the same width (resizes-content shrinks the layout
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

export function observeVirtualKeyboard(target: Window, update: (open: boolean) => void): () => void {
  const visual = target.visualViewport;
  const doc = target.document;
  let reference: KeyboardReference | null = null;
  let height: number | null = null;
  let open = false;
  const evaluate = () => {
    const next = height !== null && keyboardOpen(reference, height, isTextEntry(doc.activeElement as FocusTarget));
    if (next !== open) { open = next; update(open); }
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
  return () => {
    clearTimeout(pending);
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
    doc.removeEventListener('focusin', focusChange);
    doc.removeEventListener('focusout', focusChange);
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
  let previous: number | null = null;
  const resize = () => {
    const height = visibleViewportHeight(target.innerHeight, visual);
    if (height !== null && height !== previous) { previous = height; update(height); }
  };
  resize();
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  return () => {
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
  };
}
