import type { Category } from '../../domain/category.ts';
import { uncategorizedKey, type Breakdown, type Occurrence, type Series } from '../../domain/history.ts';
import { dailySpendingRows } from './dailySpending.ts';

// Days elapsed in the selected window; future days are never counted.
export function dashboardInsights(data: Breakdown, occurrences: readonly Occurrence[], categories: readonly Category[], today: string) {
  const days = dailySpendingRows(data, occurrences, today, true).reverse();
  const from = days[0]?.date ?? today;
  const to = days.at(-1)?.date ?? today;
  const ids = new Set(categories.map(category => category.id));
  const keyOf = (item: Occurrence) => ids.has(item.category_id ?? '') ? item.category_id! : uncategorizedKey;
  const current = days.flatMap(day => day.items);
  const counts = new Map<string, number>();
  for (const item of current) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  const rows = data.series.map(series => ({
    ...series, count: counts.get(series.key) ?? 0,
  }));
  return { days, current, from, to, keyOf, rows };
}

export type RankingRow = Series & { count: number };
export function rankCategories(rows: readonly RankingRow[], order: 'amount' | 'count') {
  return [...rows].sort((a, b) => (order === 'count' ? b.count - a.count : b.total - a.total)
    || b.total - a.total || a.key.localeCompare(b.key));
}
