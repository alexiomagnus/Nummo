// Geometry of the compact navigation pill: equal slots separated by a gap, inside a padding. Pure, so the drag-to-switch
// mapping (finger → fractional slot → destination) is testable without a DOM.

export type PillGeometry = Readonly<{ slot: number; step: number }>;

// Width of one slot and distance between the starts of two neighbouring slots; null while the pill has not been measured.
export function pillGeometry(width: number, count: number, padding: number, gap: number): PillGeometry | null {
  if (!(width > 0) || count < 1) return null;
  const slot = (width - padding * 2 - gap * (count - 1)) / count;
  return slot > 0 ? { slot, step: slot + gap } : null;
}

// Fractional slot under the finger (x relative to the pill's left edge): the indicator is centred on the finger and
// clamped to the first/last slot, so it never leaves the pill.
export function slotAt(x: number, width: number, count: number, padding: number, gap: number): number {
  const geometry = pillGeometry(width, count, padding, gap);
  if (!geometry) return 0;
  const raw = (x - padding - geometry.slot / 2) / geometry.step;
  return Math.min(count - 1, Math.max(0, raw));
}

// A drag becomes a navigation gesture only once clearly horizontal: small or vertical movements stay taps.
export const dragThreshold = 8;
export function isHorizontalDrag(dx: number, dy: number): boolean {
  return Math.abs(dx) >= dragThreshold && Math.abs(dx) > Math.abs(dy);
}

// Space below the floating bar. Elsewhere the bar sits a gap above the bottom safe area. On iPhone the home indicator
// lives inside that area (34 pt on Face ID models, indicator top ≈ 13 pt from the edge), so gap + inset left ~46 pt of
// empty space: there the bar overlaps the inset by one gap and still stays clear of the indicator.
export function floatingBarBottomSpace(inset: number, gap: number, iPhone: boolean): number {
  return iPhone && inset > 0 ? Math.max(gap, inset - gap) : gap + inset;
}

// Space at the sides of the floating bar. Elsewhere a few points from the edge. iPhone displays have strongly rounded
// corners (≈ 55–62 pt on Face ID models): with 4 pt the round ends of the pill went past the corner curve and looked cut
// by the edge of the screen (iPhone 16 Pro Max, 17 November). 12 pt keeps them inside a 62 pt corner at either bottom space.
export function floatingBarSideSpace(iPhone: boolean, gap: number, tight: number): number {
  return iPhone ? gap : tight;
}

// Whether a pill of `height` placed `side` from the side and `bottom` from the bottom edge stays inside a display corner
// of radius `corner`: its round end (a circle of radius height / 2) must lie within the corner's circle.
export function pillInsideCorner(side: number, bottom: number, height: number, corner: number): boolean {
  const r = height / 2;
  const dx = corner - (side + r);
  const dy = corner - (bottom + r);
  // Ends already beyond the corner's centre on an axis meet only the straight edge there.
  if (dx <= 0 || dy <= 0) return side >= 0 && bottom >= 0;
  return Math.hypot(dx, dy) + r <= corner;
}

// iPhone (and iPod touch) Safari and home-screen apps; iPad and other platforms keep the default spacing.
export function isIPhone(userAgent: string): boolean {
  return /\b(iPhone|iPod)\b/.test(userAgent);
}
