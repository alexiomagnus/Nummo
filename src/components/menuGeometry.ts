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

// A bottom sheet dragged down closes past a third of its height (at most 160 dp) or after a quick downward flick
// (`velocity` in px/ms at release, see `recentVelocity`).
export function sheetDragOutcome(offset: number, velocity: number, sheetHeight: number): 'dismiss' | 'settle' {
  if (offset <= 0) return 'settle';
  if (offset >= Math.min(sheetHeight / 3, 160)) return 'dismiss';
  return offset >= 24 && velocity >= 0.5 ? 'dismiss' : 'settle';
}

export type DragSample = { t: number; y: number };

// Velocity over the last `windowMs` of the gesture, not its average: a slow drag that ends in a flick still counts as a
// flick, and a finger that stopped before lifting does not. The release itself is the last sample.
export function recentVelocity(samples: readonly DragSample[], windowMs = 100): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const sample = samples[i];
    if (!sample || last.t - sample.t > windowMs) break;
    first = sample;
  }
  const elapsed = last.t - first.t;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

export const sheetDragSlop = 8;

// Owner of a touch that started on the sheet's list. Only a gesture that starts with the list at its top and moves
// mostly downward past the slop drags the sheet; everything else stays a native scroll, decided once per gesture
// (scrolling back up to the top does not turn into a close within the same gesture).
export function sheetGestureOwner(dx: number, dy: number, scrollTopAtStart: number): 'pending' | 'sheet' | 'list' {
  if (scrollTopAtStart > 0) return 'list';
  if (Math.abs(dx) < sheetDragSlop && Math.abs(dy) < sheetDragSlop) return 'pending';
  return dy > 0 && dy > Math.abs(dx) ? 'sheet' : 'list';
}
