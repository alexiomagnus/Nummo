import type { Category } from './category.ts';
import { expensePolicy, todayInRome } from './policy.ts';

export type ExpenseDraft = {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
};

export type ExpenseData = Readonly<{
  amount_minor: number;
  currency: 'EUR';
  category_id: string;
  expense_date: string;
  note: string;
  source: 'web_app';
  schema_version: 1;
}>;

export type ExpenseRequest = Readonly<ExpenseData & { expense_id: string }>;
export type FieldErrors = Partial<Record<keyof ExpenseDraft, string>>;
export type Validation = { ok: true; data: ExpenseData } | { ok: false; errors: FieldErrors };

export function newDraft(): ExpenseDraft {
  return { amount: '', categoryId: '', date: '', note: '' };
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

export function validateDraft(draft: ExpenseDraft, categories: readonly Category[], now = new Date()): Validation {
  const errors: FieldErrors = {};
  const amount = parseAmountMinor(draft.amount);
  if (amount === null) errors.amount = 'Inserisci un importo da 0,01 a 99.999,99 €, con massimo 2 decimali.';
  const category = categories.find((item) => item.id === draft.categoryId);
  if (!category) errors.categoryId = 'Scegli una categoria.';
  const date = draft.date || todayInRome(now);
  if (!isValidDate(date) || date < expensePolicy.minDate || date > todayInRome(now)) {
    errors.date = 'Inserisci una data valida dal 01/01/2000 a oggi (AAAA-MM-GG).';
  }
  if (Array.from(draft.note).length > expensePolicy.maxNoteLength) {
    errors.note = 'La nota può contenere al massimo 500 caratteri.';
  }
  if (amount === null || !category || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: {
    amount_minor: amount, currency: expensePolicy.currency, category_id: category.id,
    expense_date: date, note: draft.note, source: 'web_app', schema_version: 1,
  } };
}
