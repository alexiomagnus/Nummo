import { chartTextColors, spacing } from '../../theme/tokens.ts';

export type TextMeasure = (text: string, size: number, weight: '400' | '600') => number;
export type BlockLabelPlan = {
  padding: number; fontSize: number; lineHeight: number; name: string[];
  amount: boolean; percent: boolean; usedHeight: number;
};

// Wraps on word boundaries only: a word that does not fit the width makes the name unusable at this size (never split,
// never cut; the legend and the details name every category).
function linesFor(text: string, width: number, measure: (value: string) => number): string[] | null {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/u)) {
    if (measure(word) > width) return null;
    const joined = line ? `${line} ${word}` : word;
    if (measure(joined) <= width) { line = joined; continue; }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

// [font size, line height, maximum name lines], from the most to the least comfortable. 11 px is the legibility floor.
const labelSizes = [[14, 20, 2], [12, 16, 2], [11, 15, 2]] as const;

// Only label content changes. Rectangle dimensions/area and category percentages never enter the decision.
export function blockLabelPlan(width: number, height: number,
  text: { name: string; amount: string; percent: string }, measure: TextMeasure): BlockLabelPlan {
  // Very narrow tiles (phones) give up inner margin first, so the name can stay whole at a small size.
  const padding = width >= 120 && height >= 64 ? spacing.sm : width < 72 ? 2 : spacing.xs;
  const innerWidth = width - 2 * padding - 1; // rounding/font rasterisation allowance
  const innerHeight = height - 2 * padding;
  const empty: BlockLabelPlan = { padding, fontSize: 12, lineHeight: 16, name: [], amount: false, percent: false, usedHeight: 0 };
  if (innerWidth <= 0 || innerHeight < 16) return empty;
  // Large tiles: name, amount and share; medium: name and amount, or the name alone; small: nothing. The text shrinks
  // (14 → 11 px) before giving up, and the amount line comes before the share.
  for (const [fontSize, lineHeight, maxLines] of labelSizes) {
    const name = linesFor(text.name, innerWidth, (value) => measure(value, fontSize, '600'));
    if (!name?.length || name.length > maxLines || name.length * lineHeight > innerHeight) continue;
    let usedHeight = name.length * lineHeight;
    const fitsLine = (value: string) => measure(value, fontSize, '400') <= innerWidth
      && usedHeight + spacing.xs + lineHeight <= innerHeight;
    const amount = fitsLine(text.amount);
    if (amount) usedHeight += spacing.xs + lineHeight;
    const percent = amount && fitsLine(text.percent);
    if (percent) usedHeight += spacing.xs + lineHeight;
    return { padding, fontSize, lineHeight, name, amount, percent, usedHeight };
  }
  // A tile too small for its name stays blank: the legend beside the chart names every category.
  return empty;
}

// Tile text follows the selected page theme, independently of the category fill.
export function blockLabelColors(dark: boolean, onSurface: string): { ink: string; layer: string } {
  return { ink: dark ? chartTextColors.light : onSurface,
    layer: dark ? chartTextColors.dark : chartTextColors.light };
}
