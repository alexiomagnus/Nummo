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

// iPhone (and iPod touch) Safari and home-screen apps; iPad and other platforms keep the default spacing.
export function isIPhone(userAgent: string): boolean {
  return /\b(iPhone|iPod)\b/.test(userAgent);
}
