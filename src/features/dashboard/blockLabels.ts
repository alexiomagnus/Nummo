import { chartTextColors, spacing } from '../../theme/tokens.ts';

export type TextMeasure = (text: string, size: number, weight: '400' | '600') => number;
export type BlockLabelPlan = {
  padding: number; fontSize: number; lineHeight: number; name: string[];
  amount: boolean; percent: boolean; usedHeight: number;
};

// Prefer word boundaries, but allow a long category name to wrap without dropping any characters.
function linesFor(text: string, width: number, measure: (value: string) => number): string[] | null {
  const lines: string[] = [];
  let line = '';
  const words = text.trim().split(/\s+/u);
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const word of words) {
    const joined = line ? `${line} ${word}` : word;
    if (measure(joined) <= width) { line = joined; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const { segment } of graphemes.segment(word)) {
      if (measure(segment) > width) return null;
      if (measure(line + segment) > width) { lines.push(line); line = ''; }
      line += segment;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Only label content changes. Rectangle dimensions/area and category percentages never enter the decision.
export function blockLabelPlan(width: number, height: number,
  text: { name: string; amount: string; percent: string }, measure: TextMeasure): BlockLabelPlan {
  const padding = width >= 120 && height >= 64 ? spacing.sm : spacing.xs;
  const innerWidth = width - 2 * padding - 1; // rounding/font rasterisation allowance
  const innerHeight = height - 2 * padding;
  const empty: BlockLabelPlan = { padding, fontSize: 12, lineHeight: 16, name: [], amount: false, percent: false, usedHeight: 0 };
  if (innerWidth <= 0 || innerHeight < 16) return empty;
  for (const [fontSize, lineHeight, maxLines] of [[14, 20, 2], [12, 16, 3]] as const) {
    const name = linesFor(text.name, innerWidth, (value) => measure(value, fontSize, '600'));
    if (!name?.length || name.length > maxLines || name.length * lineHeight > innerHeight) continue;
    let usedHeight = name.length * lineHeight;
    const fitsLine = (value: string) => measure(value, fontSize, '400') <= innerWidth
      && usedHeight + spacing.xs + lineHeight <= innerHeight;
    const amount = fitsLine(text.amount);
    if (amount) usedHeight += spacing.xs + lineHeight;
    const percent = fitsLine(text.percent);
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
