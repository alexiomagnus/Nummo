import type { Category } from './category.ts';
import { expensePolicy, isValidDate, todayInRome } from './policy.ts';
import { changePrice, makeChange, maxPromoAfter, nextRenewal, priceAt, type PriceChange, type PriceScope } from './pricing.ts';
import { isRecurrence, recurrenceAt, switchFrequency, type CalendarChange, type Recurrence } from './recurrence.ts';
import { paymentStart, trialTimingError, validFirstPayment } from './trial.ts';
import type { StatusChange } from './subscription.ts';
import { merchantNameError, resolveMerchant, type Merchant } from './merchant.ts';

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
  trial: boolean;
  firstPaymentDate: string;
  // Fund that pays the expense ('' = none).
  fundId: string;
  // Merchant as typed ('' or absent = none); resolved to an existing or new merchant when saving (merchant.ts).
  merchant?: string;
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
  // Fund that pays it (every occurrence of a series); null = «Senza fondo» (expenses saved before funds existed).
  fund_id: string | null;
  // Shopping list registered by this expense (one-off only) and the names of the products actually bought, copied at
  // registration so the expense stays complete even if the list changes or is deleted. null / [] for every other expense.
  list_id: string | null;
  list_items: readonly string[];
  // Merchant paid (merchant.ts); null = none (also every expense saved before merchants existed).
  // Optional in the type (like skipped_payments) so records built before merchants existed stay valid; read back as null.
  merchant_id?: string | null;
  source: 'web_app';
  // Version 2 is used only for trials: older clients reject it instead of counting phantom payments.
  first_payment_date?: string;
  // Frequency switches of a series (issue #9); absent = the original calendar. Present only with schema_version 3.
  calendar_changes?: readonly CalendarChange[];
  // Payments of a series removed by hand (occurrence numbers, see skippedPayments.ts); absent = none.
  skipped_payments?: readonly number[];
  schema_version: 1 | 2 | 3;
}>;

export type ExpenseRequest = Readonly<ExpenseData & { expense_id: string }>;
export type FieldErrors = Partial<Record<keyof ExpenseDraft, string>>;
// `merchant`: a merchant used for the first time, to be saved together with the expense (null = none or already saved).
export type Validation = { ok: true; data: ExpenseData; merchant: Merchant | null } | { ok: false; errors: FieldErrors };

export function newDraft(): ExpenseDraft {
  return { amount: '', description: '', categoryId: '', date: '', repeat: false, recurrence: '', promo: false, promoAmount: '', promoAfter: '', fundId: '', trial: false, firstPaymentDate: '', merchant: '' };
}

// Parse digit strings, never multiply a floating-point monetary value.
export function parseAmountMinor(input: string): number | null {
  const match = /^(\d{1,5})(?:[,.](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return amount > 0 && amount <= expensePolicy.maxAmountMinor ? amount : null;
}

// What the amount field still accepts while typing: at most 5 digits before the decimal separator and 2 after it, as many as
// the largest amount (99.999,99 €, `maxAmountMinor`). A key that would go past them is ignored, so the field stops there
// (user's request, 22 November). Other characters are left to the validation, as before.
export function amountInputFits(input: string): boolean {
  const [whole = '', ...rest] = input.split(/[,.]/);
  return whole.replace(/\D/g, '').length <= 5 && rest.join('').replace(/\D/g, '').length <= 2;
}

// Lives in policy.ts so trial.ts can use it without importing this module (no require cycle).
export { isValidDate };

export function normalizeDescription(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// `funds`: the funds that may pay a new or edited expense; a chosen fund must be one of them.
// `merchants`: the saved ones; the merchant typed is optional and never blocks the save except for its length.
export function validateDraft(draft: ExpenseDraft, categories: readonly Category[], now = new Date(), funds: readonly { id: string }[] = [], merchants: readonly Merchant[] = []): Validation {
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
  const fund = draft.fundId ? funds.find((item) => item.id === draft.fundId) : undefined;
  if (draft.fundId && !fund) errors.fundId = 'Il fondo scelto non esiste più.';
  const merchantError = merchantNameError(draft.merchant ?? '');
  if (merchantError) errors.merchant = merchantError;
  const merchant = resolveMerchant(draft.merchant ?? '', merchants);
  const date = draft.date || todayInRome(now);
  if (!isValidDate(date) || date < expensePolicy.minDate || date > todayInRome(now)) {
    errors.date = 'Inserisci una data valida dal 01/01/2000 a oggi (AAAA-MM-GG).';
  }
  if (draft.repeat && draft.trial && !validFirstPayment(date, draft.firstPaymentDate)) {
    errors.firstPaymentDate = 'Il primo pagamento deve essere dopo l’inizio della prova ed entro il 31/12/2099.';
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
  return { ok: true, merchant: merchant.create, data: {
    amount_minor: amount, currency: expensePolicy.currency, description, category_id: category?.id ?? null,
    expense_date: date, recurrence: draft.repeat && isRecurrence(draft.recurrence) ? draft.recurrence : null, price_changes, status_changes: [],
    fund_id: fund?.id ?? null, list_id: null, list_items: [], ...(merchant.merchant_id ? { merchant_id: merchant.merchant_id } : {}), source: 'web_app',
    ...(draft.repeat && draft.trial ? { first_payment_date: draft.firstPaymentDate, schema_version: 2 as const } : { schema_version: 1 as const }),
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
export function applyPriceEdit(previous: Pick<ExpenseData, 'amount_minor' | 'expense_date' | 'recurrence'> & { status_changes?: readonly StatusChange[]; first_payment_date?: string; calendar_changes?: readonly CalendarChange[] }, data: ExpenseData, edit: PriceEdit, today: string): { ok: true; data: ExpenseData } | { ok: false; error: string } {
  const timingError = trialTimingError(previous, data, today);
  if (timingError) return { ok: false, error: timingError };
  if (previous.first_payment_date && previous.first_payment_date > today) {
    return { ok: true, data: { ...data, price_changes: edit.changes, status_changes: previous.status_changes ?? [] } };
  }
  if (!previous.recurrence || !data.recurrence) return { ok: true, data: { ...data, price_changes: [], status_changes: [] } };
  const next = nextRenewal(paymentStart(previous), data.recurrence, today, previous.calendar_changes ?? []);
  if (!next) return { ok: false, error: 'Non ci sono rinnovi futuri a cui applicare il prezzo.' };
  // The form never edits the status: pauses and cancellations of the series are kept as they are.
  const withBase = { ...data, amount_minor: previous.amount_minor, status_changes: previous.status_changes ?? [] };
  if (data.amount_minor === edit.shownAmount) return { ok: true, data: { ...withBase, price_changes: edit.changes } };
  const changes = changePrice(previous.amount_minor, edit.changes, next.index, data.amount_minor, edit.scope);
  return changes ? { ok: true, data: { ...withBase, price_changes: changes } } : { ok: false, error: 'Troppe variazioni di prezzo: rimuovi quelle programmate che non servono.' };
}

export type FrequencyEdit = Readonly<{ recurrence: Recurrence; firstDate: string }>;
export type FrequencyResult = { ok: true; recurrence: Recurrence | null; calendar_changes: readonly CalendarChange[]; schema_version: 1 | 2 | 3 } | { ok: false; error: string };

// Calendar of a series after the user switches its frequency (issue #9). Only the FUTURE changes: payments already due keep
// their dates and numbers. Before the first payment (a trial still running) there is no history, so the frequency itself
// is replaced; afterwards the calendar restarts on `firstDate` (after today) from the next renewal on, as a new switch
// stored next to the earlier ones (schema 3). `edit` null or the frequency already in force = nothing changes.
export function applyFrequencyChange(previous: Pick<ExpenseData, 'expense_date' | 'recurrence' | 'schema_version'> & { first_payment_date?: string; calendar_changes?: readonly CalendarChange[] },
  edit: FrequencyEdit | null, today: string): FrequencyResult {
  const calendar = previous.calendar_changes ?? [];
  const unchanged: FrequencyResult = { ok: true, recurrence: previous.recurrence, calendar_changes: calendar, schema_version: previous.schema_version };
  if (!previous.recurrence || !edit) return unchanged;
  const next = nextRenewal(paymentStart(previous), previous.recurrence, today, calendar);
  if (!next) return { ok: false, error: 'Non ci sono rinnovi futuri a cui applicare la frequenza.' };
  if (next.index === 0) return edit.recurrence === previous.recurrence ? unchanged : { ...unchanged, recurrence: edit.recurrence };
  if (edit.recurrence === recurrenceAt(previous.recurrence, calendar, next.index)) return unchanged;
  if (!isValidDate(edit.firstDate) || edit.firstDate <= today || edit.firstDate > '2099-12-31') return { ok: false, error: 'La data del primo rinnovo con la nuova frequenza deve essere successiva a oggi.' };
  const changes = switchFrequency(calendar, next.index, edit.recurrence, edit.firstDate);
  return changes ? { ok: true, recurrence: previous.recurrence, calendar_changes: changes, schema_version: 3 }
    : { ok: false, error: 'Troppi cambi di frequenza: il limite è quattro per abbonamento.' };
}

// Price shown when opening a series for editing: the next renewal's, or the base for one-off expenses.
export function currentPrice(expense: Pick<ExpenseData, 'amount_minor' | 'expense_date' | 'recurrence'> & { price_changes?: readonly PriceChange[]; first_payment_date?: string; calendar_changes?: readonly CalendarChange[] }, today: string): number {
  const next = nextRenewal(paymentStart(expense), expense.recurrence, today, expense.calendar_changes ?? []);
  return next ? priceAt(expense.amount_minor, expense.price_changes ?? [], next.index) : expense.amount_minor;
}

// The savable fields of a stored record (drops id, timestamps and Firestore bookkeeping).
export function dataOf(record: ExpenseData): ExpenseData {
  const { amount_minor, currency, description, category_id, expense_date, recurrence, price_changes, status_changes, source, schema_version } = record;
  // Records read before funds existed may lack the field: they are «Senza fondo».
  const fund_id = record.fund_id ?? null;
  // Likewise expenses saved before shopping lists existed have no list.
  const list_id = record.list_id ?? null;
  const list_items = record.list_items ?? [];
  return { amount_minor, currency, description, category_id, expense_date, recurrence, price_changes, status_changes, fund_id, list_id, list_items, source, schema_version,
    // Absent = no merchant (also every expense saved before merchants existed).
    ...(record.merchant_id ? { merchant_id: record.merchant_id } : {}), ...(record.first_payment_date ? { first_payment_date: record.first_payment_date } : {}),
    ...(record.calendar_changes?.length ? { calendar_changes: record.calendar_changes } : {}),
    ...(record.skipped_payments?.length ? { skipped_payments: record.skipped_payments } : {}) };
}
