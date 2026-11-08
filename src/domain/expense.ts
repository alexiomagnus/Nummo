import type { Category } from './category.ts';
import { expensePolicy, todayInRome } from './policy.ts';
import { changePrice, makeChange, maxPromoAfter, nextRenewal, priceAt, type PriceChange, type PriceScope } from './pricing.ts';
import { isRecurrence, type Recurrence } from './recurrence.ts';
import type { StatusChange } from './subscription.ts';

export type ExpenseDraft = {
  amount: string;
  description: string;
  categoryId: string;
  date: string;
  repeat: boolean;
  recurrence: Recurrence | '';
  // Promotional price of a new series: `amount` is the starting price, `promoAmount` applies from renewal `promoAfter`.
  promo: boolean;
  promoAmount: string;
  promoAfter: string;
};

export type ExpenseData = Readonly<{
  amount_minor: number;
  currency: 'EUR';
  description: string;
  category_id: string | null;
  expense_date: string;
  // null = one-off; otherwise the series starts on expense_date.
  recurrence: Recurrence | null;
  // amount_minor is the price of the first occurrence; later prices come from this schedule.
  price_changes: readonly PriceChange[];
  // Pause/cancel/resume history of a series (see subscription.ts); always empty for one-off expenses.
  status_changes: readonly StatusChange[];
  source: 'web_app';
  schema_version: 1;
}>;

export type ExpenseRequest = Readonly<ExpenseData & { expense_id: string }>;
export type FieldErrors = Partial<Record<keyof ExpenseDraft, string>>;
export type Validation = { ok: true; data: ExpenseData } | { ok: false; errors: FieldErrors };

export function newDraft(): ExpenseDraft {
  return { amount: '', description: '', categoryId: '', date: '', repeat: false, recurrence: '', promo: false, promoAmount: '', promoAfter: '' };
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
  if (!description) errors.description = 'Inserisci la descrizione.';
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
  let price_changes: PriceChange[] = [];
  if (draft.repeat && draft.promo) {
    const then = parseAmountMinor(draft.promoAmount);
    const after = /^\d{1,3}$/.test(draft.promoAfter.trim()) ? Number(draft.promoAfter) : 0;
    if (then === null) errors.promoAmount = draft.promoAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci il nuovo importo.';
    else if (then === amount) errors.promoAmount = 'Indica un importo diverso da quello iniziale.';
    if (after < 1 || after > maxPromoAfter) errors.promoAfter = `Indica dopo quanti rinnovi (da 1 a ${maxPromoAfter}).`;
    if (then !== null && !errors.promoAmount && !errors.promoAfter) price_changes = [makeChange(after, then, false)];
  }
  if (amount === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: {
    amount_minor: amount, currency: expensePolicy.currency, description, category_id: category?.id ?? null,
    expense_date: date, recurrence: draft.repeat && isRecurrence(draft.recurrence) ? draft.recurrence : null, price_changes, status_changes: [],
    source: 'web_app', schema_version: 1,
  } };
}

// Display only; never feed the result back into calculations.
export function formatAmountMinor(amountMinor: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: expensePolicy.currency }).format(amountMinor / 100);
}

export type PriceEdit = Readonly<{
  // Price the user saw (and may have changed) in the edit form: the next renewal's price.
  shownAmount: number;
  scope: PriceScope;
  // Schedule as shown in the form, after any removals.
  changes: readonly PriceChange[];
}>;

// Data to save when editing an existing expense. A recurring series keeps the first occurrence's
// price and everything already due; a new price applies from the next renewal only (or just to it).
export function applyPriceEdit(previous: Pick<ExpenseData, 'amount_minor' | 'expense_date' | 'recurrence'> & { status_changes?: readonly StatusChange[] }, data: ExpenseData, edit: PriceEdit, today: string): { ok: true; data: ExpenseData } | { ok: false; error: string } {
  if (!previous.recurrence || !data.recurrence) return { ok: true, data: { ...data, price_changes: [], status_changes: [] } };
  const next = nextRenewal(previous.expense_date, data.recurrence, today);
  if (!next) return { ok: false, error: 'Non ci sono rinnovi futuri a cui applicare il prezzo.' };
  // The form never edits the status: pauses and cancellations of the series are kept as they are.
  const withBase = { ...data, amount_minor: previous.amount_minor, status_changes: previous.status_changes ?? [] };
  if (data.amount_minor === edit.shownAmount) return { ok: true, data: { ...withBase, price_changes: edit.changes } };
  const changes = changePrice(previous.amount_minor, edit.changes, next.index, data.amount_minor, edit.scope);
  return changes ? { ok: true, data: { ...withBase, price_changes: changes } } : { ok: false, error: 'Troppe variazioni di prezzo: rimuovi quelle programmate che non servono.' };
}

// Price shown when opening a series for editing: the next renewal's, or the base for one-off expenses.
export function currentPrice(expense: Pick<ExpenseData, 'amount_minor' | 'expense_date' | 'recurrence'> & { price_changes?: readonly PriceChange[] }, today: string): number {
  const next = nextRenewal(expense.expense_date, expense.recurrence, today);
  return next ? priceAt(expense.amount_minor, expense.price_changes ?? [], next.index) : expense.amount_minor;
}

// The savable fields of a stored record (drops id, timestamps and Firestore bookkeeping).
export function dataOf(record: ExpenseData): ExpenseData {
  const { amount_minor, currency, description, category_id, expense_date, recurrence, price_changes, status_changes, source, schema_version } = record;
  return { amount_minor, currency, description, category_id, expense_date, recurrence, price_changes, status_changes, source, schema_version };
}
