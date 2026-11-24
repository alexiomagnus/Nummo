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

// ——— Detail screens with two positions on phones (user's request, 24 November) ———
// A detail (expense, subscription, fund) dragged down does not close at once: it stops halfway, «peek», showing its top part
// over the dimmed page, and from there it goes back up whole or down and closed. `y` is how far the screen's top edge is below
// its open position; `height` the screen's.
export type Detent = 'full' | 'peek';

// The peek position: the top half of the screen shown in the lower half.
export function peekOffset(height: number): number {
  return Math.round(Math.max(0, height) / 2);
}

// Where a released drag goes. A flick (fast enough and past the slop) moves one step in its direction: down from whole to peek,
// from peek to closed; up always to whole. Otherwise the nearest of the three positions.
export function detentOutcome(y: number, velocity: number, height: number, from: Detent): Detent | 'dismiss' {
  const peek = peekOffset(height);
  const start = from === 'full' ? 0 : peek;
  const moved = y - start;
  if (Math.abs(moved) >= 24 && Math.abs(velocity) >= 0.5) {
    if (velocity < 0) return 'full';
    return from === 'full' ? 'peek' : 'dismiss';
  }
  const stops: [Detent | 'dismiss', number][] = [['full', 0], ['peek', peek], ['dismiss', height]];
  return stops.reduce((best, stop) => Math.abs(stop[1] - y) < Math.abs(best[1] - y) ? stop : best)[0];
}

// Owner of a touch on the detail's content: whole, only a drag that starts with the content at its top and goes down moves the
// screen (as the sheets' lists); in peek every mostly vertical drag does, up or down (the content is a preview there).
export function detailGestureOwner(dx: number, dy: number, scrollTopAtStart: number, detent: Detent): 'pending' | 'sheet' | 'list' {
  if (detent === 'full') return sheetGestureOwner(dx, dy, scrollTopAtStart);
  if (Math.abs(dx) < sheetDragSlop && Math.abs(dy) < sheetDragSlop) return 'pending';
  return Math.abs(dy) > Math.abs(dx) ? 'sheet' : 'list';
}
