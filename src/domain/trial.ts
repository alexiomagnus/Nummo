import { isValidDate } from './expense.ts';

// The subscription starts on expense_date; billing starts on first_payment_date when a trial exists.
// Legacy/ordinary expenses omit the field. The first paid occurrence is always billing index 0.
export type BillingDates = { expense_date: string; first_payment_date?: string };
export const maxFirstPaymentDate = '2099-12-31';
export const paymentStart = (entry: BillingDates): string => entry.first_payment_date ?? entry.expense_date;
export function validFirstPayment(start: string, first: unknown): first is string {
  return typeof first === 'string' && isValidDate(first) && first > start && first <= maxFirstPaymentDate;
}
export const isInTrial = (entry: BillingDates, today: string): boolean => Boolean(entry.first_payment_date && today < entry.first_payment_date);

// Editing never adds a trial to an already billed ordinary series, removes a saved trial,
// backdates a future first payment, or moves a billing calendar that has already started.
export function trialTimingError(previous: BillingDates & { recurrence: unknown }, data: BillingDates & { recurrence: unknown }, today: string): string | null {
  if (!previous.first_payment_date) return data.first_payment_date ? 'La prova gratuita va configurata alla creazione dell’abbonamento.' : null;
  if (!data.first_payment_date || !data.recurrence || (previous.first_payment_date <= today &&
    (data.first_payment_date !== previous.first_payment_date || data.expense_date !== previous.expense_date || data.recurrence !== previous.recurrence))) {
    return 'La prova già registrata non può essere rimossa e i pagamenti maturati non possono essere spostati.';
  }
  return previous.first_payment_date > today && data.first_payment_date <= today ? 'Il nuovo primo pagamento deve essere successivo a oggi.' : null;
}
