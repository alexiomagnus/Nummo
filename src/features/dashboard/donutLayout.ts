export const donutMaxSize = 340;
export const donutMaxAmountFont = 40;
export const donutLegendWidth = 360;

// The text box is a square inscribed inside the hole, with breathing room.
// Scale the ring on narrow surfaces so its inner radius can never turn negative.
export function donutMetrics(width: number, amount: string) {
  const size = Number.isFinite(width) ? Math.max(0, Math.min(width, donutMaxSize)) : 0;
  const outer = size / 2;
  const inner = outer - Math.min(40, size / 8);
  const centerSide = Math.max(0, inner * Math.SQRT2 - 8);
  const amountFontSize = Math.min(donutMaxAmountFont, centerSide / Math.max(1, Array.from(amount).length * 0.7));
  return { size, outer, inner, centerSide, amountFontSize };
}
