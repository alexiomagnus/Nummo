import type { Category } from './category.ts';
import { occurrenceDates, type Recurrence } from './recurrence.ts';

// Structural subset of a stored expense, so the domain does not depend on storage.
export type ExpenseEntry = Readonly<{
  id: string; amount_minor: number; description: string; category_id: string | null;
  expense_date: string; recurrence: Recurrence | null; created_at: string;
}>;
export type Occurrence = Readonly<{
  key: string; expenseId: string; date: string; amount_minor: number;
  description: string; category_id: string | null; recurrence: Recurrence | null;
}>;

// A recurring expense counts once per occurrence up to today; future ones are not spending yet.
export function expandOccurrences(entries: readonly ExpenseEntry[], today: string): Occurrence[] {
  return entries.flatMap((entry) => {
    const dates = entry.recurrence ? occurrenceDates(entry.expense_date, entry.recurrence, today) : [entry.expense_date];
    return dates.filter((date) => date <= today).map((date) => ({
      key: `${entry.id}:${date}`, expenseId: entry.id, date, amount_minor: entry.amount_minor,
      description: entry.description, category_id: entry.category_id, recurrence: entry.recurrence,
    }));
  });
}

export const sortOptions = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'] as const;
export type SortOption = (typeof sortOptions)[number];
export const sortLabels: Record<SortOption, string> = {
  'date-desc': 'Più recenti', 'date-asc': 'Meno recenti', 'amount-desc': 'Importo più alto', 'amount-asc': 'Importo più basso',
};

// Case- and accent-insensitive: "caffe" finds "Caffè".
export function searchKey(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it').trim().replace(/\s+/gu, ' ');
}

export function searchAndSort(items: readonly Occurrence[], query: string, sort: SortOption): Occurrence[] {
  const needle = searchKey(query);
  const found = needle ? items.filter((item) => searchKey(item.description).includes(needle)) : [...items];
  const byDate = (a: Occurrence, b: Occurrence) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key);
  const compare: Record<SortOption, (a: Occurrence, b: Occurrence) => number> = {
    'date-desc': (a, b) => byDate(b, a),
    'date-asc': byDate,
    'amount-desc': (a, b) => b.amount_minor - a.amount_minor || byDate(b, a),
    'amount-asc': (a, b) => a.amount_minor - b.amount_minor || byDate(b, a),
  };
  return found.sort(compare[sort]);
}

// ---- Dashboard aggregation ----

export const periods = ['month', 'half-year', 'year'] as const;
export type Period = (typeof periods)[number];
export const periodLabels: Record<Period, string> = { month: 'Questo mese', 'half-year': 'Ultimi 6 mesi', year: 'Ultimi 12 mesi' };

export type Bucket = Readonly<{ key: string; label: string; from: string; to: string }>;
const monthNames = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const pad = (value: number) => String(value).padStart(2, '0');

// Days of the current month, or the last 6/12 calendar months including the current one.
export function bucketsFor(period: Period, today: string): Bucket[] {
  const [year, month] = today.split('-').map(Number) as [number, number];
  if (period === 'month') {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, index) => {
      const date = `${year}-${pad(month)}-${pad(index + 1)}`;
      return { key: date, label: String(index + 1), from: date, to: date };
    });
  }
  const count = period === 'half-year' ? 6 : 12;
  return Array.from({ length: count }, (_, index) => {
    const total = year * 12 + (month - 1) - (count - 1 - index);
    const y = Math.floor(total / 12);
    const m = total % 12;
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return { key: `${y}-${pad(m + 1)}`, label: monthNames[m]!, from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
  });
}

export const otherCategoriesKey = '__other';
export const uncategorizedKey = '__none';
// Matches the 8 validated categorical slots: 7 categories + "Altre categorie".
export const maxNamedCategories = 7;

export type Series = Readonly<{ key: string; label: string; slot: number | null; total: number; values: number[] }>;
export type Breakdown = Readonly<{ buckets: Bucket[]; series: Series[]; totals: number[]; total: number; count: number }>;

// Colour follows the category (its position in the user's list), never its rank by amount.
export function seriesKeyOf(categoryId: string | null, categories: readonly Category[]): { key: string; label: string; slot: number | null } {
  if (categoryId === null) return { key: uncategorizedKey, label: 'Senza categoria', slot: null };
  const index = categories.findIndex((category) => category.id === categoryId);
  if (index === -1) return { key: uncategorizedKey, label: 'Senza categoria', slot: null };
  if (index >= maxNamedCategories) return { key: otherCategoriesKey, label: 'Altre categorie', slot: maxNamedCategories };
  return { key: categories[index]!.id, label: categories[index]!.label, slot: index };
}

export function breakdown(items: readonly Occurrence[], categories: readonly Category[], period: Period, today: string): Breakdown {
  const buckets = bucketsFor(period, today);
  const from = buckets[0]!.from;
  const to = buckets[buckets.length - 1]!.to;
  const seriesMap = new Map<string, { key: string; label: string; slot: number | null; values: number[] }>();
  let count = 0;
  for (const item of items) {
    if (item.date < from || item.date > to) continue;
    const index = buckets.findIndex((bucket) => item.date >= bucket.from && item.date <= bucket.to);
    if (index === -1) continue;
    const info = seriesKeyOf(item.category_id, categories);
    let series = seriesMap.get(info.key);
    if (!series) {
      series = { ...info, values: buckets.map(() => 0) };
      seriesMap.set(info.key, series);
    }
    series.values[index]! += item.amount_minor;
    count++;
  }
  // Stable legend/stack order: list order, then "Altre", then "Senza categoria".
  const order = (s: { slot: number | null }) => (s.slot === null ? Number.MAX_SAFE_INTEGER : s.slot);
  const series = [...seriesMap.values()].sort((a, b) => order(a) - order(b))
    .map((s) => ({ ...s, total: s.values.reduce((sum, value) => sum + value, 0) }));
  const totals = buckets.map((_, index) => series.reduce((sum, s) => sum + s.values[index]!, 0));
  return { buckets, series, totals, total: totals.reduce((sum, value) => sum + value, 0), count };
}
