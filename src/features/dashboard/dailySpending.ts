import { addDays, type Breakdown, type Occurrence } from '../../domain/history.ts';

export const initialDayCount = 7;

// Daily detail over the same window as the charts, including multi-month windows.
// Keep original occurrences so expanding a day needs no database request.
export function dailySpendingRows(data: Pick<Breakdown, 'buckets'>, occurrences: readonly Occurrence[], today: string, withEmpty = false) {
  const from = data.buckets[0]?.from;
  const end = data.buckets[data.buckets.length - 1]?.to;
  if (!from || !end) return [];
  const until = end < today ? end : today;
  const byDate = new Map<string, Occurrence[]>();
  for (const item of occurrences) {
    if (item.date < from || item.date > until) continue;
    const items = byDate.get(item.date) ?? [];
    items.push(item);
    byDate.set(item.date, items);
  }
  const rows: { date: string; total: number; items: Occurrence[] }[] = [];
  for (let date = from; date <= until; date = addDays(date, 1)) {
    const items = [...(byDate.get(date) ?? [])].sort((a, b) => a.description.localeCompare(b.description, 'it') || a.key.localeCompare(b.key));
    const total = items.reduce((sum, item) => sum + item.amount_minor, 0);
    if (withEmpty || total > 0) rows.push({ date, total, items });
  }
  return rows.reverse();
}
