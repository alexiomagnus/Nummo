import { otherCategoriesKey, uncategorizedKey, type Breakdown, type Series } from '../../domain/history.ts';
import { treemap, type Rect } from './treemap.ts';

// A visual budget, never an archive/category limit. All three charts share this projection.
const visibleSeries = 8;
export function categoryPresentation(source: Breakdown): { data: Breakdown; others: Series[] } {
  const ranked = source.series.filter((series) => series.total > 0)
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  if (ranked.length <= visibleSeries) return { data: { ...source, series: ranked }, others: [] };
  const uncategorized = ranked.find((series) => series.key === uncategorizedKey);
  const named = ranked.filter((series) => series.key !== uncategorizedKey);
  const keep = visibleSeries - 1 - (uncategorized ? 1 : 0);
  const others = named.slice(keep);
  const group: Series = {
    key: otherCategoriesKey, label: 'Altre categorie', slot: null,
    total: others.reduce((sum, series) => sum + series.total, 0),
    values: source.buckets.map((_, index) => others.reduce((sum, series) => sum + series.values[index]!, 0)),
  };
  return { data: { ...source, series: [...named.slice(0, keep), group, ...(uncategorized ? [uncategorized] : [])] }, others };
}

export const blockGap = 3;
export function blockLayout(series: readonly Series[], width: number) {
  const height = Math.round(Math.min(Math.max(width * 0.5, 260), 460));
  const tiles = treemap(series.map((item) => ({ item, value: item.total })), width, height);
  return { height, tiles };
}

// Keep a visible proportional tile even when a fixed gutter would consume it entirely.
// Shrink inside its original bounds, never grow hit areas into adjacent tiles.
export function blockTileBounds(tile: Rect): Rect {
  const inset = Math.min(blockGap, Math.min(tile.w, tile.h) * 0.1);
  return { x: tile.x + inset, y: tile.y + inset, w: tile.w - 2 * inset, h: tile.h - 2 * inset };
}

export function categoryPercent(part: number, total: number): string {
  if (total <= 0) return '0%';
  const value = part / total * 100;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
}
