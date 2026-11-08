import type { Category } from '../../domain/category.ts';
import { addDays, uncategorizedKey, type Breakdown, type Occurrence, type Series } from '../../domain/history.ts';
import { dailySpendingRows } from './dailySpending.ts';

export function variation(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}

// Equal elapsed civil days immediately before the selected window. Future days are never compared.
export function dashboardInsights(data: Breakdown, occurrences: readonly Occurrence[], categories: readonly Category[], today: string) {
  const days = dailySpendingRows(data, occurrences, today, true).reverse();
  const from = days[0]?.date ?? today;
  const to = days.at(-1)?.date ?? today;
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(from, -days.length);
  const previous = occurrences.filter(item => item.date >= previousFrom && item.date <= previousTo);
  // An empty archive cannot establish that a historical period was observed.
  const hasHistory = occurrences.some(item => item.date <= previousFrom);
  const previousTotal = previous.reduce((sum, item) => sum + item.amount_minor, 0);
  const ids = new Set(categories.map(category => category.id));
  const keyOf = (item: Occurrence) => ids.has(item.category_id ?? '') ? item.category_id! : uncategorizedKey;
  const current = days.flatMap(day => day.items);
  const counts = new Map<string, number>();
  const previousTotals = new Map<string, number>();
  for (const item of current) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  for (const item of previous) previousTotals.set(keyOf(item), (previousTotals.get(keyOf(item)) ?? 0) + item.amount_minor);
  const rows = data.series.map(series => ({
    ...series, count: counts.get(series.key) ?? 0,
    change: hasHistory ? variation(series.total, previousTotals.get(series.key) ?? 0) : null,
  }));
  return { days, current, from, to, previousFrom, previousTo, keyOf, rows,
    change: hasHistory ? variation(data.total, previousTotal) : null };
}

export type RankingRow = Series & { count: number; change: number | null };
export function rankCategories(rows: readonly RankingRow[], order: 'amount' | 'count') {
  return [...rows].sort((a, b) => (order === 'count' ? b.count - a.count : b.total - a.total)
    || b.total - a.total || a.key.localeCompare(b.key));
}
