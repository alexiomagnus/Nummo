import {
  isRecurrence, maxDescriptionLength, normalizeDescription, type RecurringData, type RecurringExpense,
} from '../domain/recurring.ts';
import { expensePolicy } from '../domain/policy.ts';

export const recurringStorageKey = 'nummo.recurring.v1';
type RecurringStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isValidItem(item: unknown): item is RecurringExpense {
  if (!item || typeof item !== 'object') return false;
  const value = item as Record<string, unknown>;
  return typeof value.id === 'string' && value.id !== ''
    && Number.isSafeInteger(value.amount_minor) && (value.amount_minor as number) > 0
    && (value.amount_minor as number) <= expensePolicy.maxAmountMinor
    && typeof value.description === 'string' && normalizeDescription(value.description) === value.description
    && value.description !== '' && Array.from(value.description).length <= maxDescriptionLength
    && isRecurrence(value.recurrence);
}

export function readRecurring(storage: RecurringStorage): RecurringExpense[] {
  const raw = storage.getItem(recurringStorageKey);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Archivio spese ricorrenti non valido.');
  const items: RecurringExpense[] = [];
  for (const item of parsed) {
    if (!isValidItem(item) || items.some((existing) => existing.id === item.id)) {
      throw new Error('Archivio spese ricorrenti non valido.');
    }
    items.push({ id: item.id, amount_minor: item.amount_minor, description: item.description, recurrence: item.recurrence });
  }
  return items;
}

// Read before writing; never overwrite unreadable existing data.
export function storeRecurring(storage: RecurringStorage, data: RecurringData, createId: () => string): RecurringExpense[] {
  const items = readRecurring(storage);
  const id = createId();
  const item = { id, amount_minor: data.amount_minor, description: data.description, recurrence: data.recurrence };
  if (!isValidItem(item)) throw new Error('Spesa ricorrente non valida.');
  if (items.some((existing) => existing.id === id)) throw new Error('Identificativo spesa ricorrente non valido.');
  const updated = [...items, item];
  storage.setItem(recurringStorageKey, JSON.stringify(updated));
  return updated;
}

export function removeRecurring(storage: RecurringStorage, id: string): RecurringExpense[] {
  const items = readRecurring(storage);
  const updated = items.filter((item) => item.id !== id);
  if (updated.length === items.length) throw new Error('Spesa ricorrente non trovata.');
  storage.setItem(recurringStorageKey, JSON.stringify(updated));
  return updated;
}
