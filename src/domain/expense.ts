import type { Category } from './category.ts';
import { expensePolicy, todayInRome } from './policy.ts';
import { isRecurrence, type Recurrence } from './recurrence.ts';

export type ExpenseDraft = {
  amount: string;
  description: string;
  categoryId: string;
  date: string;
  repeat: boolean;
  recurrence: Recurrence | '';
};

export type ExpenseData = Readonly<{
  amount_minor: number;
  currency: 'EUR';
  description: string;
  category_id: string | null;
  expense_date: string;
  // null = one-off; otherwise the series starts on expense_date.
  recurrence: Recurrence | null;
  source: 'web_app';
  schema_version: 1;
}>;

export type ExpenseRequest = Readonly<ExpenseData & { expense_id: string }>;
export type FieldErrors = Partial<Record<keyof ExpenseDraft, string>>;
export type Validation = { ok: true; data: ExpenseData } | { ok: false; errors: FieldErrors };

export function newDraft(): ExpenseDraft {
  return { amount: '', description: '', categoryId: '', date: '', repeat: false, recurrence: '' };
}

// Parse digit strings, never multiply a floating-point monetary value.
export function parseAmountMinor(input: string): number | null {
  const match = /^(\d{1,5})(?:[,.](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return amount > 0 && amount <= expensePolicy.maxAmountMinor ? amount : null;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeDescription(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validateDraft(draft: ExpenseDraft, categories: readonly Category[], now = new Date()): Validation {
  const errors: FieldErrors = {};
  const amount = parseAmountMinor(draft.amount);
  if (amount === null) errors.amount = draft.amount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo.';
  const description = normalizeDescription(draft.description);
  if (!description) errors.description = 'Inserisci il nome dell’acquisto.';
  else if (Array.from(description).length > expensePolicy.maxDescriptionLength) {
    errors.description = `Usa al massimo ${expensePolicy.maxDescriptionLength} caratteri.`;
  }
  // Category is optional, but a chosen one must still exist.
  const category = draft.categoryId ? categories.find((item) => item.id === draft.categoryId) : undefined;
  if (draft.categoryId && !category) errors.categoryId = 'La categoria scelta non esiste più.';
  const date = draft.date || todayInRome(now);
  if (!isValidDate(date) || date < expensePolicy.minDate || date > todayInRome(now)) {
    errors.date = 'Inserisci una data valida dal 01/01/2000 a oggi (AAAA-MM-GG).';
  }
  if (draft.repeat && !isRecurrence(draft.recurrence)) errors.recurrence = 'Scegli ogni quanto si ripete.';
  if (amount === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: {
    amount_minor: amount, currency: expensePolicy.currency, description, category_id: category?.id ?? null,
    expense_date: date, recurrence: draft.repeat && isRecurrence(draft.recurrence) ? draft.recurrence : null,
    source: 'web_app', schema_version: 1,
  } };
}

// Display only; never feed the result back into calculations.
export function formatAmountMinor(amountMinor: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: expensePolicy.currency }).format(amountMinor / 100);
}
