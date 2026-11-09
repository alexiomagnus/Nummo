// Coordinate anchors have zero width in Paper: its right-edge fallback puts the
// whole menu to the left of the field. Position the outer wrapper explicitly.
export function menuHorizontalBounds(x: number, fieldWidth: number, viewportWidth: number, leftInset: number, rightInset: number, margin: number) {
  const leftEdge = leftInset + margin;
  const rightEdge = Math.max(leftEdge, viewportWidth - rightInset - margin);
  const width = Math.max(0, Math.min(fieldWidth, rightEdge - leftEdge));
  return { left: Math.max(leftEdge, Math.min(x, rightEdge - width)), width };
}

export type MenuPlacement =
  | { side: 'below'; top: number; maxHeight: number }
  // `bottom`: window y of the menu's bottom edge (just above the trigger).
  | { side: 'above'; bottom: number; maxHeight: number };

// Below the trigger when there is room for `minBelow` (or for the whole cap), otherwise on the roomier side; the height
// is capped to the room on that side, inside the viewport, its safe area and margin. Never under the screen edge.
export function menuVerticalPlacement(anchorTop: number, anchorBottom: number, viewportHeight: number, topInset: number, bottomInset: number,
  margin: number, gap: number, maxHeight: number, minBelow: number): MenuPlacement {
  const below = viewportHeight - bottomInset - margin - (anchorBottom + gap);
  const above = anchorTop - gap - (topInset + margin);
  if (below >= Math.min(maxHeight, minBelow) || below >= above) {
    return { side: 'below', top: anchorBottom + gap, maxHeight: Math.max(0, Math.min(maxHeight, below)) };
  }
  return { side: 'above', bottom: anchorTop - gap, maxHeight: Math.max(0, Math.min(maxHeight, above)) };
}

// A bottom sheet dragged down closes past a third of its height (at most 160 dp) or after a quick downward flick.
export function sheetDragOutcome(offset: number, elapsedMs: number, sheetHeight: number): 'dismiss' | 'settle' {
  if (offset <= 0) return 'settle';
  if (offset >= Math.min(sheetHeight / 3, 160)) return 'dismiss';
  const velocity = elapsedMs > 0 ? offset / elapsedMs : 0;
  return offset >= 24 && velocity >= 0.5 ? 'dismiss' : 'settle';
}
