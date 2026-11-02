import { parseAmountMinor } from './expense.ts';

export const recurrences = ['weekly', 'monthly', 'yearly'] as const;
export type Recurrence = (typeof recurrences)[number];
export const recurrenceLabels: Record<Recurrence, string> = {
  weekly: 'Settimanale', monthly: 'Mensile', yearly: 'Annuale',
};
export const maxDescriptionLength = 100;

export type RecurringDraft = { amount: string; description: string; recurrence: Recurrence | '' };
export type RecurringData = Readonly<{ amount_minor: number; description: string; recurrence: Recurrence }>;
export type RecurringExpense = Readonly<RecurringData & { id: string }>;
export type RecurringErrors = Partial<Record<keyof RecurringDraft, string>>;

export function newRecurringDraft(): RecurringDraft {
  return { amount: '', description: '', recurrence: '' };
}

export function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === 'string' && (recurrences as readonly string[]).includes(value);
}

export function normalizeDescription(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validateRecurring(draft: RecurringDraft):
  { ok: true; data: RecurringData } | { ok: false; errors: RecurringErrors } {
  const errors: RecurringErrors = {};
  const amount = parseAmountMinor(draft.amount);
  if (amount === null) errors.amount = 'Inserisci un importo da 0,01 a 99.999,99 €, con massimo 2 decimali.';
  const description = normalizeDescription(draft.description);
  if (!description) errors.description = 'Inserisci una descrizione.';
  else if (Array.from(description).length > maxDescriptionLength) {
    errors.description = `Usa al massimo ${maxDescriptionLength} caratteri.`;
  }
  if (!isRecurrence(draft.recurrence)) errors.recurrence = 'Scegli la ricorrenza.';
  if (amount === null || !isRecurrence(draft.recurrence) || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { amount_minor: amount, description, recurrence: draft.recurrence } };
}
