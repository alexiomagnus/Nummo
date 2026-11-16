import { maxOccurrences } from './recurrence.ts';

// Payments of a subscription removed by hand (for example a renewal charged because the user forgot to pause or cancel it).
// Payments are computed, never stored (see history.ts), so a removal is the number of the occurrence, which never changes
// (prices and frequency switches use the same numbers). Only series have them; absent or empty = none.
export const maxSkippedPayments = 60;

// Strictly increasing occurrence numbers within the calendar's range, at most `maxSkippedPayments`.
export function parseSkippedPayments(value: unknown): number[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxSkippedPayments) return null;
  for (let i = 0; i < value.length; i++) {
    const n = value[i];
    if (!Number.isSafeInteger(n) || n < 0 || n >= maxOccurrences || (i > 0 && !(value[i - 1] < n))) return null;
  }
  return [...value];
}

// Adds a removed payment (sorted, no duplicates); null when the list is full.
export function skipPayment(skipped: readonly number[], index: number): number[] | null {
  if (skipped.includes(index)) return [...skipped];
  const next = [...skipped, index].sort((a, b) => a - b);
  return next.length > maxSkippedPayments ? null : next;
}

// Firestore form: one string "3,7,12" (firestore.rules validates it with a single regex). Never stored when empty; backups keep
// the readable array.
export const encodeSkippedPayments = (skipped: readonly number[]): string => skipped.join(',');
// Inverse of encodeSkippedPayments; anything but a well-formed string → null (record invalid).
export function decodeSkippedPayments(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{1,4}(,\d{1,4})*$/.test(value)) return null;
  return value.split(',').map(Number);
}
