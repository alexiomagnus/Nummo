import { isValidDate } from './expense.ts';
import { nextRenewal } from './pricing.ts';
import type { CalendarChange, Recurrence } from './recurrence.ts';

// Lifecycle of a recurring series (a subscription). A change made on day D takes effect for the
// occurrences AFTER D: the occurrence of D itself has already been counted (or skipped), so a change
// never alters a payment that is already in the history. Dates are strictly increasing; the status
// in force before the first change is 'active'. Skipped occurrences keep their number, so price
// schedules (which refer to occurrence numbers of the original calendar) stay valid after a pause.
export const subscriptionStatuses = ['active', 'paused', 'cancelled'] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type StatusChange = Readonly<{ date: string; status: SubscriptionStatus }>;
export const statusLabels: Record<SubscriptionStatus, string> = { active: 'Attivo', paused: 'In pausa', cancelled: 'Annullato' };

// Mirrored by firestore.rules (positional checks, same budget reasoning as price changes).
export const maxStatusChanges = 8;

function isStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && (subscriptionStatuses as readonly string[]).includes(value);
}

function isChange(value: unknown): value is StatusChange {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 2 && typeof v.date === 'string' && isValidDate(v.date) && isStatus(v.status);
}

// Missing field (series saved before statuses existed) = always active. Anything else invalid → null.
export function parseStatusChanges(value: unknown): StatusChange[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxStatusChanges || !value.every(isChange)) return null;
  for (let i = 1; i < value.length; i++) if (!(value[i - 1]!.date < value[i]!.date)) return null;
  return value.map((c) => ({ date: c.date, status: c.status }));
}

// Firestore form: one string "YYYY-MM-DD:status;…" (firestore.rules validates it with a single regex to stay
// within the expression budget). Never stored when empty. Backups keep the readable array.
export function encodeStatusChanges(changes: readonly StatusChange[]): string {
  return changes.map((change) => `${change.date}:${change.status}`).join(';');
}
// Inverse of encodeStatusChanges for a stored value; anything but a well-formed string → null (record invalid).
export function decodeStatusChanges(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value === '') return null;
  const parts = value.split(';').map((part) => part.split(':'));
  return parts.every((part) => part.length === 2) ? parts.map(([date, status]) => ({ date, status })) : null;
}

// Status that governs an occurrence on `date`: the latest change made strictly before that day.
export function statusAt(changes: readonly StatusChange[], date: string): SubscriptionStatus {
  let status: SubscriptionStatus = 'active';
  for (const change of changes) if (change.date < date) status = change.status;
  return status;
}

// Status shown today and applied to every future renewal.
export function currentStatus(changes: readonly StatusChange[]): SubscriptionStatus {
  return changes.length ? changes[changes.length - 1]!.status : 'active';
}

// New schedule after the user sets `status` today. Earlier changes are never touched; a second change on
// the same day replaces the first (both only affect future renewals). Returns the unchanged list when the
// status is already in force, null when `today` precedes the last change or the limit is reached.
export function setStatus(changes: readonly StatusChange[], status: SubscriptionStatus, today: string): StatusChange[] | null {
  const last = changes[changes.length - 1];
  if (last && last.date > today) return null;
  if (currentStatus(changes) === status) return [...changes];
  const kept = last && last.date === today ? changes.slice(0, -1) : [...changes];
  const next = currentStatus(kept) === status ? kept : [...kept, { date: today, status }];
  return next.length > maxStatusChanges ? null : next;
}

// First occurrence after `today` that will actually be paid: none for paused or cancelled series.
export function nextPaidRenewal(start: string, recurrence: Recurrence | null, changes: readonly StatusChange[], today: string, calendar: readonly CalendarChange[] = []): { index: number; date: string } | null {
  return currentStatus(changes) === 'active' ? nextRenewal(start, recurrence, today, calendar) : null;
}
