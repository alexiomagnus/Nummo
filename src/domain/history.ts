import { isInTrial, paymentStart } from './trial.ts';
import type { Category } from './category.ts';
import { nextRenewal, priceAt, type PriceChange } from './pricing.ts';
import { maxOccurrences, recurrenceAt, scheduleDates, type CalendarChange, type Recurrence } from './recurrence.ts';
import { currentStatus, nextPaidRenewal, statusAt, type StatusChange, type SubscriptionStatus } from './subscription.ts';

// Structural subset of a stored expense, so the domain does not depend on storage.
export type ExpenseEntry = Readonly<{
  id: string; amount_minor: number; description: string; category_id: string | null;
  expense_date: string; recurrence: Recurrence | null; created_at: string;
  // Absent on expenses saved before price schedules existed.
  price_changes?: readonly PriceChange[];
  first_payment_date?: string;
  // Absent on expenses saved before subscription statuses existed (= always active).
  status_changes?: readonly StatusChange[];
  // Absent on series that never changed frequency (the original calendar).
  calendar_changes?: readonly CalendarChange[];
}>;
export type Occurrence = Readonly<{
  key: string; expenseId: string; date: string; amount_minor: number;
  description: string; category_id: string | null; recurrence: Recurrence | null;
}>;

function toOccurrence(entry: ExpenseEntry, date: string, index: number): Occurrence {
  return {
    key: `${entry.id}:${date}`, expenseId: entry.id, date, amount_minor: priceAt(entry.amount_minor, entry.price_changes ?? [], index),
    description: entry.description, category_id: entry.category_id,
    recurrence: entry.recurrence ? recurrenceAt(entry.recurrence, entry.calendar_changes ?? [], index) : null,
  };
}

// A legacy series has already paid occurrence 0 at creation. A trial has not: its first billing slot also obeys status changes.
function paid(entry: ExpenseEntry, date: string, index: number): boolean {
  return (index === 0 && !entry.first_payment_date) || statusAt(entry.status_changes ?? [], date) === 'active';
}

// A recurring expense counts once per paid occurrence up to today, at the price it had on that occurrence;
// future ones are not spending yet (see forecastOccurrences).
export function expandOccurrences(entries: readonly ExpenseEntry[], today: string): Occurrence[] {
  return entries.flatMap((entry) => {
    const dates = entry.recurrence ? scheduleDates(paymentStart(entry), entry.recurrence, entry.calendar_changes ?? [], today) : [entry.expense_date];
    return dates.flatMap((date, index) => (date <= today && paid(entry, date, index) ? [toOccurrence(entry, date, index)] : []));
  });
}

// Planned (not yet paid) occurrences after `today` up to `until` inclusive, with their scheduled price.
export function forecastOccurrences(entries: readonly ExpenseEntry[], today: string, until: string): Occurrence[] {
  return entries.flatMap((entry) => {
    if (!entry.recurrence) return [];
    const dates = scheduleDates(paymentStart(entry), entry.recurrence, entry.calendar_changes ?? [], until);
    return dates.flatMap((date, index) => (date > today && paid(entry, date, index) ? [toOccurrence(entry, date, index)] : []));
  });
}

// The next renewal of every active recurring expense, soonest first. `previous` is the price of the
// occurrence before it, so a scheduled change can be pointed out.
export type Renewal = Readonly<{ occurrence: Occurrence; previous: number }>;
export function upcomingRenewals(entries: readonly ExpenseEntry[], today: string): Renewal[] {
  return entries.flatMap((entry) => {
    const next = nextPaidRenewal(paymentStart(entry), entry.recurrence, entry.status_changes ?? [], today, entry.calendar_changes ?? []);
    if (!next) return [];
    const changes = entry.price_changes ?? [];
    return [{ occurrence: toOccurrence(entry, next.date, next.index), previous: priceAt(entry.amount_minor, changes, next.index - 1) }];
  }).sort((a, b) => a.occurrence.date.localeCompare(b.occurrence.date) || a.occurrence.key.localeCompare(b.occurrence.key));
}

// ---- Subscriptions (recurring series) ----

export type SubscriptionSummary = Readonly<{
  entry: ExpenseEntry; status: SubscriptionStatus; inTrial: boolean;
  // Price of the next paid renewal; for paused/cancelled series, the price of the next calendar slot.
  amount_minor: number;
  // Frequency in force for the next calendar slot (the last one after a frequency change); null for one-off expenses.
  frequency: Recurrence | null;
  next: { index: number; date: string } | null;
  // Paid occurrences up to today, newest first; `total` is exactly their sum (same figures as the dashboard).
  payments: Occurrence[]; total: number;
}>;

export function subscriptionSummary(entry: ExpenseEntry, today: string): SubscriptionSummary {
  const payments = expandOccurrences([entry], today).reverse();
  const changes = entry.status_changes ?? [];
  const slot = nextRenewal(paymentStart(entry), entry.recurrence, today, entry.calendar_changes ?? []);
  return {
    entry, status: currentStatus(changes), inTrial: currentStatus(changes) === 'active' && isInTrial(entry, today), next: nextPaidRenewal(paymentStart(entry), entry.recurrence, changes, today, entry.calendar_changes ?? []),
    frequency: entry.recurrence ? recurrenceAt(entry.recurrence, entry.calendar_changes ?? [], slot?.index ?? maxOccurrences) : null,
    amount_minor: slot ? priceAt(entry.amount_minor, entry.price_changes ?? [], slot.index) : entry.amount_minor,
    payments, total: payments.reduce((sum, item) => sum + item.amount_minor, 0),
  };
}

const statusOrder: Record<SubscriptionStatus, number> = { active: 0, paused: 1, cancelled: 2 };
// Active first (soonest renewal first), then paused, then cancelled; alphabetical within a group.
export function subscriptionSummaries(entries: readonly ExpenseEntry[], today: string): SubscriptionSummary[] {
  return entries.filter((entry) => entry.recurrence !== null).map((entry) => subscriptionSummary(entry, today))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (a.next?.date ?? '').localeCompare(b.next?.date ?? '')
      || a.entry.description.localeCompare(b.entry.description) || a.entry.id.localeCompare(b.entry.id));
}

// Name search over the series (same normalisation as the expense list); an empty query keeps every series.
export function searchSubscriptions(items: readonly SubscriptionSummary[], query: string): SubscriptionSummary[] {
  const needle = searchKey(query);
  return needle ? items.filter((item) => searchKey(item.entry.description).includes(needle)) : [...items];
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
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

export const periods = ['month', 'previous-month', 'quarter', 'half-year', 'year'] as const;
export type Period = (typeof periods)[number];
export const periodLabels: Record<Period, string> = { month: 'Questo mese', 'previous-month': 'Mese scorso', quarter: 'Ultimi 3 mesi', 'half-year': 'Ultimi 6 mesi', year: 'Ultimi 12 mesi' };
export const isDailyPeriod = (period: Period): boolean => period === 'month' || period === 'previous-month';

export type Bucket = Readonly<{ key: string; label: string; from: string; to: string }>;
const monthNames = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const pad = (value: number) => String(value).padStart(2, '0');

// Daily buckets for this/previous month; multi-month windows include the current month.
export function bucketsFor(period: Period, today: string): Bucket[] {
  let [year, month] = today.split('-').map(Number) as [number, number];
  if (isDailyPeriod(period)) {
    if (period === 'previous-month') {
      const previous = new Date(Date.UTC(year, month - 2, 1));
      year = previous.getUTCFullYear(); month = previous.getUTCMonth() + 1;
    }
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, index) => {
      const date = `${year}-${pad(month)}-${pad(index + 1)}`;
      return { key: date, label: String(index + 1), from: date, to: date };
    });
  }
  const count = period === 'quarter' ? 3 : period === 'half-year' ? 6 : 12;
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
export type Series = Readonly<{ key: string; label: string; slot: number | null; total: number; values: number[] }>;
export type Breakdown = Readonly<{ buckets: Bucket[]; series: Series[]; totals: number[]; total: number; count: number }>;

// Colour slot preferred by a category: a hash of its ID, independent of every other category.
export function categoryColorSlot(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % colorSlots;
}

const colorSlots = 12;
// Slots for a stable set of categories (those with spending anywhere in the archive, never the selected period):
// IDs in sorted order each take their preferred slot, or the next free one, so up to 12 categories never share a colour.
// The result depends only on the set of IDs, so it is the same across periods, charts, filters, names and ordering; it can
// change only when a category gains its first spending or loses its last. Beyond 12 a finite palette must repeat: then the
// 12 categories with the most spending in the whole archive (`weights`, ties by ID) keep distinct colours, being the ones
// the charts show side by side, and the others take their hashed slot. Labels and amounts remain the primary identification.
export function categoryColorSlots(ids: Iterable<string>, weights?: ReadonlyMap<string, number>): Map<string, number> {
  const all = [...new Set(ids)].sort();
  const distinct = all.length <= colorSlots || !weights ? all
    : [...all].sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0) || a.localeCompare(b)).slice(0, colorSlots).sort();
  const taken = new Set<number>();
  const slots = new Map<string, number>();
  for (const id of distinct) {
    let slot = categoryColorSlot(id);
    if (taken.size < colorSlots) while (taken.has(slot)) slot = (slot + 1) % colorSlots;
    taken.add(slot);
    slots.set(id, slot);
  }
  for (const id of all) if (!slots.has(id)) slots.set(id, categoryColorSlot(id));
  return slots;
}

export function breakdown(items: readonly Occurrence[], categories: readonly Category[], period: Period, today: string): Breakdown {
  const buckets = bucketsFor(period, today);
  const from = buckets[0]!.from;
  const to = buckets[buckets.length - 1]!.to;
  const seriesMap = new Map<string, { key: string; label: string; slot: number | null; values: number[] }>();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const spending = new Map<string, number>();
  for (const item of items) if (item.category_id && categoryMap.has(item.category_id)) spending.set(item.category_id, (spending.get(item.category_id) ?? 0) + item.amount_minor);
  const slots = categoryColorSlots(spending.keys(), spending);
  let count = 0;
  for (const item of items) {
    if (item.date < from || item.date > to) continue;
    const index = buckets.findIndex((bucket) => item.date >= bucket.from && item.date <= bucket.to);
    if (index === -1) continue;
    const category = categoryMap.get(item.category_id ?? '');
    const info = category ? { key: category.id, label: category.label, slot: slots.get(category.id) ?? categoryColorSlot(category.id) }
      : { key: uncategorizedKey, label: 'Senza categoria', slot: null };
    let series = seriesMap.get(info.key);
    if (!series) {
      series = { ...info, values: buckets.map(() => 0) };
      seriesMap.set(info.key, series);
    }
    series.values[index]! += item.amount_minor;
    count++;
  }
  // Only contributing categories appear; keep every category separate in the domain.
  const series = [...seriesMap.values()].sort((a, b) => a.key.localeCompare(b.key))
    .map((s) => ({ ...s, total: s.values.reduce((sum, value) => sum + value, 0) }));
  const totals = buckets.map((_, index) => series.reduce((sum, s) => sum + s.values[index]!, 0));
  return { buckets, series, totals, total: totals.reduce((sum, value) => sum + value, 0), count };
}
