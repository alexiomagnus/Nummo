// Receipt scanning, pure part: what can be read from the JSON answer of an AI model, and how a reviewed proposal reaches
// the new-expense draft. Nothing here saves an expense: a scan only proposes values for the base fields of the form
// (amount, date, description, merchant, category). Conservative on purpose: a value that is not on the receipt stays
// missing. The local OCR (text of a receipt read on the device) was removed on 21 November, on request.
import type { Category } from './category.ts';
import type { ExpenseDraft } from './expense.ts';
import { displayMerchantName, merchantPolicy } from './merchant.ts';
import { clipToLength, expensePolicy, isValidDate, listPolicy } from './policy.ts';

export type ReceiptField = 'description' | 'merchant' | 'amount' | 'date' | 'categoryId';
export const receiptFields: readonly ReceiptField[] = ['amount', 'date', 'description', 'merchant', 'categoryId'];
// found = read plainly; uncertain = read but to be checked; missing = not on the receipt or unreadable.
export type ReceiptStatus = 'found' | 'uncertain' | 'missing';

export type ReceiptProposal = Readonly<{
  // What was bought, in a word or two («Spesa», «Carburante»): a suggestion, never the shop's name. '' when unknown.
  description: string;
  // The shop's name as printed («Esercente» of the form), '' when unreadable.
  merchant: string;
  amountMinor: number | null;
  // Civil date YYYY-MM-DD, '' when missing.
  date: string;
  // Always the ID of an existing category, '' when none is suggested.
  categoryId: string;
  status: Readonly<Record<ReceiptField, ReceiptStatus>>;
  // Products and discount: shown in the review only, never saved (the expense model has no field for them).
  items: readonly string[];
  discountMinor: number | null;
  // Source-language (Italian) remarks for the review, translated at the UI boundary.
  notes: readonly string[];
}>;

export const receiptNotes = {
  notEuro: 'Lo scontrino non è in euro: controlla l’importo.',
  unknownCategory: 'La categoria proposta dall’AI non esiste tra le tue: scegline una.',
  amountRange: 'L’importo letto non è valido per una spesa: inseriscilo a mano.',
  dateRange: 'La data letta non è valida per una spesa: controllala.',
} as const;

// Lower case, no accents, single spaces: only for matching names, never shown.
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const validAmount = (amount: number) => Number.isSafeInteger(amount) && amount > 0 && amount <= expensePolicy.maxAmountMinor;
// A date an expense may have: real, not before 2000, not after today.
const usableDate = (date: string, today: string) => isValidDate(date) && date >= expensePolicy.minDate && date <= today;

// True when a scan gave nothing to review (blurred or cut picture, not a receipt).
// A description alone does not count: it is the model's guess, not something read.
export const emptyProposal = (proposal: ReceiptProposal) => receiptFields.every((field) => field === 'description' || proposal.status[field] === 'missing');

export const aiResponseError = 'La risposta dell’AI non è valida.';

// An amount of the model's answer in cents: a decimal string («24.75», «24,75») or a JSON number. Never guessed.
function aiAmount(value: unknown): number | null {
  const text = typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : typeof value === 'string' ? value.trim().replace(/\s?(€|eur|euro)$/i, '') : '';
  // Up to 12 whole digits: anything past the largest amount is then reported as out of range (`amountRange`), not as unread.
  const match = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(text);
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : null;
}

const aiFieldNames: Readonly<Record<string, ReceiptField>> = { merchant: 'merchant', description: 'description', total: 'amount', date: 'date', category: 'categoryId' };

// Proposal from the model's answer. The answer is untrusted text: it must be a JSON object, every field is checked on
// its own (a wrong type is a missing value, not an error), amounts and dates must be possible for an expense and the
// category must be one of the existing ones, matched by name. Anything else throws `aiResponseError`.
export function parseAiReceipt(raw: string, categories: readonly Category[], today: string): ReceiptProposal {
  let data: unknown;
  // Models may wrap the object in a Markdown fence or a sentence: only the outermost braces are read.
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  try { data = start >= 0 && end > start ? JSON.parse(raw.slice(start, end + 1)) : null; } catch { data = null; }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error(aiResponseError);
  const o = data as Record<string, unknown>;
  const known = ['merchant', 'description', 'date', 'total', 'currency', 'items', 'discount_total', 'category', 'uncertain'];
  if (!known.some((key) => key in o)) throw new Error(aiResponseError);
  const notes: string[] = [];
  const doubted = new Set((Array.isArray(o.uncertain) ? o.uncertain : []).map((name) => (typeof name === 'string' ? aiFieldNames[name] : undefined)));
  const status = (field: ReceiptField, present: boolean): ReceiptStatus => (!present ? 'missing' : doubted.has(field) ? 'uncertain' : 'found');

  const short = (value: unknown, max: number) => (typeof value === 'string' ? clipToLength(value.normalize('NFC').replace(/\s+/gu, ' ').trim(), max).trim() : '');
  // Shown as it will be saved: receipts shout («SPAZIO CONAD» → «Spazio Conad»), mixed capitals are kept.
  const merchant = displayMerchantName(short(o.merchant, merchantPolicy.maxNameLength));
  const description = short(o.description, expensePolicy.maxDescriptionLength);

  let amountMinor = aiAmount(o.total);
  if (amountMinor !== null && !validAmount(amountMinor)) { amountMinor = null; notes.push(receiptNotes.amountRange); }
  const currency = typeof o.currency === 'string' ? o.currency.trim().toUpperCase() : '';
  const foreign = currency !== '' && currency !== expensePolicy.currency && currency !== '€';
  if (foreign && amountMinor !== null) notes.push(receiptNotes.notEuro);

  let date = typeof o.date === 'string' ? o.date.trim() : '';
  if (date && !usableDate(date, today)) { date = ''; notes.push(receiptNotes.dateRange); }

  let categoryId = '';
  if (typeof o.category === 'string' && o.category.trim()) {
    const wanted = fold(o.category);
    categoryId = categories.find((category) => fold(category.label) === wanted)?.id ?? '';
    if (!categoryId) notes.push(receiptNotes.unknownCategory);
  }

  const items = (Array.isArray(o.items) ? o.items : []).map((item) => (typeof item === 'string' ? item
    : typeof item === 'object' && item !== null && typeof (item as { name?: unknown }).name === 'string' ? (item as { name: string }).name : ''))
    .map((name) => clipToLength(name.replace(/\s+/gu, ' ').trim(), listPolicy.maxItemLength)).filter(Boolean).slice(0, listPolicy.maxItems);
  const discount = aiAmount(o.discount_total);

  return {
    description, merchant, amountMinor, date, categoryId, items, notes, discountMinor: discount !== null && validAmount(discount) ? discount : null,
    status: {
      // Like the category, the description is the model's opinion, not something printed on the receipt.
      description: description ? 'uncertain' : 'missing',
      merchant: status('merchant', merchant !== ''),
      amount: amountMinor === null ? 'missing' : foreign ? 'uncertain' : status('amount', true),
      date: status('date', date !== ''),
      // A category is the model's opinion, not something printed on the receipt.
      categoryId: categoryId ? 'uncertain' : 'missing',
    },
  };
}

// Amount as the form takes it («24,75»; the form accepts both separators).
export function amountText(amountMinor: number | null, decimal: ',' | '.' = ','): string {
  return amountMinor === null ? '' : `${Math.floor(amountMinor / 100)}${decimal}${String(amountMinor % 100).padStart(2, '0')}`;
}

export type ReceiptValues = Readonly<Record<ReceiptField, string>>;
// The form's draft: the merchant may be absent (drafts older than the field).
type ScanDraft = Pick<ExpenseDraft, ReceiptField>;
const typed = (draft: ScanDraft, field: ReceiptField) => (draft[field] ?? '').trim();

// Fields the user already filled in the form with something else than the reviewed scan proposes.
export function scanConflicts(draft: ScanDraft, values: ReceiptValues): ReceiptField[] {
  return receiptFields.filter((field) => typed(draft, field) !== '' && values[field].trim() !== '' && typed(draft, field) !== values[field].trim());
}

// What a reviewed scan changes in the draft: only the base fields, only with values the user accepted, and
// never over something already typed unless `replace` was chosen. Recurrence, fund and prices are never touched.
export function scanPatch(draft: ScanDraft, values: ReceiptValues, replace: boolean): Partial<Record<ReceiptField, string>> {
  const patch: Partial<Record<ReceiptField, string>> = {};
  for (const field of receiptFields) {
    const value = values[field].trim();
    if (value === '' || value === typed(draft, field)) continue;
    if (typed(draft, field) === '' || replace) patch[field] = value;
  }
  return patch;
}
