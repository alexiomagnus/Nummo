import type { Occurrence } from '../../domain/history.ts';

// Summarise the filtered results once, using civil month keys rather than formatted labels.
export function expenseMonths(items: readonly Occurrence[]): Map<string, { count: number; total: number }> {
  const months = new Map<string, { count: number; total: number }>();
  for (const item of items) {
    const key = item.date.slice(0, 7);
    const summary = months.get(key) ?? { count: 0, total: 0 };
    summary.count++;
    summary.total += item.amount_minor;
    months.set(key, summary);
  }
  return months;
}
