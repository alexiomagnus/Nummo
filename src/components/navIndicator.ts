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
