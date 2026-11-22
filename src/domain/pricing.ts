import { expensePolicy } from './policy.ts';
import { maxOccurrences, scheduleDateAt, scheduleDates, type CalendarChange, type Recurrence } from './recurrence.ts';

// Price schedule of a recurring series. `amount_minor` of the expense is the price of occurrence 0;
// each change refers to an occurrence NUMBER (1 = first renewal), so past occurrences keep the price
// they had and the schedule does not depend on dates:
// - persistent (`once: false`): from that renewal on, until a later persistent change;
// - one-off (`once: true`): that renewal only, over whatever persistent price applies.
export type PriceChange = Readonly<{ index: number; amount_minor: number; once: boolean }>;

// Mirrored by firestore.rules (they cannot import TypeScript). Rules have no loops, so each slot is
// unrolled by hand and the 1000-expression budget caps it at 8 (10 already exceeds it).
export const maxPriceChanges = 8;
const maxIndex = maxOccurrences - 1;

export function makeChange(index: number, amount_minor: number, once: boolean): PriceChange {
  return { index, amount_minor, once };
}

function isChange(value: unknown): value is PriceChange {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 3 && typeof v.index === 'number' && Number.isSafeInteger(v.index)
    && v.index >= 1 && v.index <= maxIndex
    && typeof v.amount_minor === 'number' && Number.isSafeInteger(v.amount_minor)
    && v.amount_minor > 0 && v.amount_minor <= expensePolicy.maxAmountMinor && typeof v.once === 'boolean';
}

// Missing field (expenses saved before price schedules) = no changes. Anything else invalid → null.
export function parsePriceChanges(value: unknown): PriceChange[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxPriceChanges || !value.every(isChange)) return null;
  const seen = new Set(value.map((change) => `${change.index}:${change.once}`));
  return seen.size === value.length ? value.map((c) => makeChange(c.index, c.amount_minor, c.once)) : null;
}

function sorted(changes: readonly PriceChange[]): PriceChange[] {
  return [...changes].sort((a, b) => a.index - b.index || Number(a.once) - Number(b.once));
}

// Price of occurrence `index`: the latest persistent change up to it, unless a one-off applies.
export function priceAt(base: number, changes: readonly PriceChange[], index: number): number {
  let price = base;
  let from = 0;
  for (const change of changes) if (!change.once && change.index <= index && change.index > from) { price = change.amount_minor; from = change.index; }
  return changes.find((change) => change.once && change.index === index)?.amount_minor ?? price;
}

// First occurrence after `today`: its number and date (null for a one-off expense or past the safety limit).
export function nextRenewal(start: string, recurrence: Recurrence | null, today: string, calendar: readonly CalendarChange[] = []): { index: number; date: string } | null {
  if (!recurrence) return null;
  const index = scheduleDates(start, recurrence, calendar, today).length;
  return index > maxIndex ? null : { index, date: scheduleDateAt(start, recurrence, calendar, index) };
}

export type PriceScope = 'once' | 'future';

// New schedule after the user sets `amount` for the next renewal (`nextIndex`). Earlier changes are
// never touched. 'future' replaces every change from the next renewal on; 'once' touches only that
// renewal. A change equal to the price already in force is not stored. null = too many changes.
export function changePrice(base: number, changes: readonly PriceChange[], nextIndex: number, amount: number, scope: PriceScope): PriceChange[] | null {
  const kept = scope === 'future' ? changes.filter((c) => c.index < nextIndex) : changes.filter((c) => !(c.once && c.index === nextIndex));
  const inForce = priceAt(base, kept.filter((c) => !c.once), nextIndex);
  const next = amount === inForce ? kept : [...kept, makeChange(nextIndex, amount, scope === 'once')];
  return next.length > maxPriceChanges ? null : sorted(next);
}

// Promotional price: `amount` now, `after` renewals later the price becomes `then`.
export function promoChanges(after: number, then: number): PriceChange[] {
  return [makeChange(after, then, false)];
}
export const maxPromoAfter = maxIndex;

// Trials use schema 2 and a compact Firestore representation to keep Rules below their expression budget.
// Domain/backup prices remain arrays; version 1 Firestore documents keep their original array representation.
export function encodeTrialPrices(changes: readonly PriceChange[]): string {
  return changes.map(c => `${c.index}:${c.amount_minor}:${c.once ? 1 : 0}`).join(';');
}
export function decodeTrialPrices(value: unknown): PriceChange[] | null {
  if (typeof value !== 'string') return null;
  if (value === '') return [];
  if (!/^[1-9][0-9]{0,2}:[1-9][0-9]{0,10}:[01](;[1-9][0-9]{0,2}:[1-9][0-9]{0,10}:[01]){0,7}$/.test(value)) return null;
  return parsePriceChanges(value.split(';').map(part => {
    const [index, amount, once] = part.split(':');
    return { index: Number(index), amount_minor: Number(amount), once: once === '1' };
  }));
}
