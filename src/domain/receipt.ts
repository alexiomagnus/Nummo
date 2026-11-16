// Receipt scanning, pure part: what can be read from the text of a receipt (local OCR) or from the JSON answer of an AI
// model, and how a reviewed proposal reaches the new-expense draft. Nothing here saves an expense: a scan only proposes
// values for the base fields of the form (amount, date, description, merchant, category). Conservative on purpose: a value that is not on the receipt stays missing.
import type { Category, CategoryIcon } from './category.ts';
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
  manyTotals: 'Sullo scontrino ci sono più totali diversi: controlla l’importo.',
  fromPayment: 'Totale non trovato: l’importo viene dalla riga del pagamento.',
  largest: 'Totale non trovato: è stato preso l’importo più alto letto.',
  manyDates: 'Sullo scontrino ci sono più date: controlla quella proposta.',
  notEuro: 'Lo scontrino non è in euro: controlla l’importo.',
  unknownCategory: 'La categoria proposta dall’AI non esiste tra le tue: scegline una.',
  amountRange: 'L’importo letto non è valido per una spesa: inseriscilo a mano.',
  dateRange: 'La data letta non è valida per una spesa: controllala.',
} as const;

// Lower case, no accents, single spaces: only for matching words, never shown.
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// The same with the usual OCR confusions inside words undone (T0TALE, TOTA1E).
const unconfuse = (text: string) => text.replace(/0/g, 'o').replace(/[1|]/g, 'l').replace(/5/g, 's');
const matches = (line: string, pattern: RegExp) => pattern.test(line) || pattern.test(unconfuse(line));

// «12,50», «1.234,56», «12.50», «12, 50» (OCR often adds a space after the comma). Two decimals are required: an
// integer on a receipt is more often a quantity or a code than a price.
const moneyPattern = /(?<![\d,.])(\d{1,3}(?:[.\s]\d{3})+|\d{1,7})\s?[,.]\s?(\d{2})(?![\d,.]\d|\d)/g;

export function amountsIn(line: string): number[] {
  const found: number[] = [];
  for (const match of line.matchAll(moneyPattern)) {
    const units = Number(match[1]!.replace(/[.\s]/g, ''));
    const amount = units * 100 + Number(match[2]);
    if (Number.isSafeInteger(amount)) found.push(amount);
  }
  return found;
}

const validAmount = (amount: number) => Number.isSafeInteger(amount) && amount > 0 && amount <= expensePolicy.maxAmountMinor;

const strongTotal = /\b(totale complessivo|importo pagato|totale pagato|totale da pagare|importo da pagare|totale euro|totale eur|totale scontrino|grand total|amount due|total due|balance due|total paid|amount paid)\b/;
const plainTotal = /\b(totale|total|importo)\b|\btot\b\.?/;
// Lines that carry an amount which is not what was paid.
const notTotal = /\b(sub ?-? ?totale|subtotal|sub total|parziale|iva|i\.v\.a|vat|tax|tasse|imposta|imponibile|di cui|sconto|sconti|discount|risparmi\w*|buono|buoni|coupon|resto|change|non riscosso|arrotondamento|rounding|articoli|pezzi|items|punti|points|saldo punti)\b/;
const tendered = /\b(contanti|contante|cash|ricevuto|versato|tendered|consegnato)\b/;
const electronic = /\b(pagamento elettronico|carta|carta di credito|bancomat|pos|card|debit|credit|visa|mastercard|maestro|satispay|contactless)\b/;
const change = /\b(resto|change)\b/;

type Line = { text: string; folded: string; amounts: number[] };

function totalOf(lines: readonly Line[]): { amount: number | null; status: ReceiptStatus; note?: string } {
  // The amount of a total line is the last one on it; a label alone takes the amount of the next line.
  const labelled = (index: number): number | null => {
    const line = lines[index]!;
    if (line.amounts.length > 0) return line.amounts.at(-1)!;
    const next = lines[index + 1];
    return next && next.amounts.length === 1 && !matches(next.folded, notTotal) && !matches(next.folded, tendered) ? next.amounts[0]! : null;
  };
  const pick = (pattern: RegExp) => {
    const values: number[] = [];
    lines.forEach((line, index) => {
      if (!matches(line.folded, pattern) || matches(line.folded, notTotal) || matches(line.folded, tendered)) return;
      const amount = labelled(index);
      if (amount !== null && validAmount(amount)) values.push(amount);
    });
    return values;
  };
  for (const pattern of [strongTotal, plainTotal]) {
    const values = pick(pattern);
    if (values.length === 0) continue;
    const distinct = new Set(values);
    // Several different totals (before and after a discount, per department): the last one closes the receipt.
    return distinct.size === 1 ? { amount: values[0]!, status: 'found' } : { amount: values.at(-1)!, status: 'uncertain', note: receiptNotes.manyTotals };
  }
  // No total line: what was paid by card, or cash handed over minus the change.
  const paid = (pattern: RegExp) => lines.filter((line) => matches(line.folded, pattern) && !matches(line.folded, notTotal) && line.amounts.length > 0)
    .map((line) => line.amounts.at(-1)!).filter(validAmount);
  const card = paid(electronic);
  if (card.length === 1) return { amount: card[0]!, status: 'uncertain', note: receiptNotes.fromPayment };
  const cash = paid(tendered);
  const back = lines.filter((line) => matches(line.folded, change) && line.amounts.length > 0).map((line) => line.amounts.at(-1)!);
  if (cash.length === 1 && back.length <= 1 && validAmount(cash[0]! - (back[0] ?? 0))) {
    return { amount: cash[0]! - (back[0] ?? 0), status: 'uncertain', note: receiptNotes.fromPayment };
  }
  // Last resort: the highest amount on a line that is neither tax, discount, change nor money handed over.
  const others = lines.filter((line) => !matches(line.folded, notTotal) && !matches(line.folded, tendered)).flatMap((line) => line.amounts).filter(validAmount);
  if (others.length > 0) return { amount: Math.max(...others), status: 'uncertain', note: receiptNotes.largest };
  return { amount: null, status: 'missing' };
}

const monthNames: Readonly<Record<string, number>> = {
  gen: 1, gennaio: 1, jan: 1, january: 1, feb: 2, febbraio: 2, february: 2, mar: 3, marzo: 3, march: 3, apr: 4, aprile: 4, april: 4,
  mag: 5, maggio: 5, may: 5, giu: 6, giugno: 6, jun: 6, june: 6, lug: 7, luglio: 7, jul: 7, july: 7, ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, sett: 9, settembre: 9, sep: 9, sept: 9, september: 9, ott: 10, ottobre: 10, oct: 10, october: 10, nov: 11, novembre: 11, november: 11,
  dic: 12, dicembre: 12, dec: 12, december: 12,
};
const iso = (year: number, month: number, day: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const fullYear = (text: string) => (text.length === 2 ? 2000 + Number(text) : Number(text));
// A date an expense may have: real, not before 2000, not after today.
const usableDate = (date: string, today: string) => isValidDate(date) && date >= expensePolicy.minDate && date <= today;

// Every date written on the receipt that an expense may have, in reading order. Italian order (day first); the
// American order is tried only when the day-first reading is not a date.
export function datesIn(text: string, today: string): string[] {
  const found: { at: number; date: string }[] = [];
  const add = (at: number, date: string) => { if (usableDate(date, today)) found.push({ at, date }); };
  for (const match of text.matchAll(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g)) add(match.index, iso(Number(match[1]), Number(match[2]), Number(match[3])));
  for (const match of text.matchAll(/(?<![\d/.-])(\d{1,2})\s?([/.-])\s?(\d{1,2})\s?\2\s?(\d{4}|\d{2})(?![\d/-])/g)) {
    const [first, second, year] = [Number(match[1]), Number(match[3]), fullYear(match[4]!)];
    const dayFirst = iso(year, second, first);
    add(match.index, usableDate(dayFirst, today) ? dayFirst : iso(year, first, second));
  }
  for (const match of fold(text).matchAll(/(?<!\d)(\d{1,2})\s([a-z]{3,9})\.?\s(\d{4})(?!\d)/g)) {
    const month = monthNames[match[2]!];
    if (month) add(match.index, iso(Number(match[3]), month, Number(match[1])));
  }
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.date);
}

// Header lines that are not the shop's name.
const notMerchant = /\b(documento commerciale|di vendita|scontrino|ricevuta|fattura|receipt|invoice|p\.? ?iva|partita iva|c\.? ?f\.?|cod\.? ?fisc\w*|vat|via|viale|v\.le|piazza|p\.zza|corso|strada|largo|street|road|tel|telefono|fax|www|http|cap|cassa|operatore|descrizione|prezzo|euro|benvenut\w*|grazie|welcome|thank)\b/;

function merchantOf(lines: readonly Line[]): string {
  for (const line of lines.slice(0, 8)) {
    const letters = (line.text.match(/\p{L}/gu) ?? []).length;
    const visible = line.text.replace(/\s/g, '').length;
    if (letters < 3 || letters / visible < 0.6) continue;
    if (line.amounts.length > 0 || /\d{5,}/.test(line.text) || matches(line.folded, notMerchant) || matches(line.folded, plainTotal)) continue;
    const name = line.text.replace(/[^\p{L}\p{N}&'’.\- ]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (name.length < 3) continue;
    // Receipts shout: «LIDL ITALIA SRL» reads better as «Lidl Italia Srl».
    const shown = name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s\-'’.&])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase()) : name;
    return clipToLength(shown, merchantPolicy.maxNameLength).trim();
  }
  return '';
}

// Kinds of shop recognised from words on the receipt. A kind proposes a category only if the archive already has a
// fitting one: by a word of its name first, then by its icon. Nothing is ever created.
const shopKinds: readonly { words: RegExp; labels: RegExp; icons: readonly CategoryIcon[]; description: string }[] = [
  { words: /\b(supermercat\w*|supermarket|ipermercat\w*|minimarket|market|lidl|conad|coop|esselunga|eurospin|carrefour|penny|despar|eurospar|interspar|aldi|iper|famila|sigma|crai|pam|tigre|bennet|unes|panificio|macelleria|ortofrutta|salumeria|alimentari|grocery|groceries)\b/,
    labels: /aliment|spesa|supermerc|grocer|cibo|food/, icons: ['cart', 'bag'], description: 'Spesa' },
  { words: /\b(ristorante|pizzeria|trattoria|osteria|bar|caffe|caffetteria|tavola calda|rosticceria|mcdonald\w*|burger|sushi|pub|gelateria|pasticceria|restaurant|cafe|coperto|coperti)\b/,
    labels: /ristor|\bbar\b|caff|mangiare|restaurant|eating|cene|pranz|dining/, icons: ['utensils', 'pizza', 'burger', 'pasta', 'coffee', 'cake'], description: 'Ristorante' },
  { words: /\b(carburante|carburanti|benzina|gasolio|diesel|gpl|metano|eni|q8|esso|tamoil|agip|fuel|petrol|litri|self service|stazione di servizio)\b/,
    labels: /carbur|benzin|auto|fuel|car\b/, icons: ['fuel'], description: 'Carburante' },
  { words: /\b(farmacia|parafarmacia|pharmacy|farmaco|farmaci|ticket sanitario|erboristeria)\b/,
    labels: /salute|farmac|medic|health|pharma/, icons: ['cross', 'heartpulse'], description: 'Farmacia' },
  { words: /\b(trenitalia|italo|trenord|biglietto|autobus|metro|taxi|parcheggio|pedaggio|autostrade|ticket|parking)\b/,
    labels: /trasport|transport|viagg|travel/, icons: ['train', 'bike'], description: 'Trasporti' },
  { words: /\b(abbigliamento|calzature|scarpe|zara|ovs|decathlon|primark|benetton|clothing|fashion)\b/,
    labels: /shopping|abbigl|vestit|cloth/, icons: ['shirt'], description: 'Abbigliamento' },
  { words: /\b(mediaworld|unieuro|euronics|trony|elettronica|informatica|electronics)\b/,
    labels: /tecnolog|elettron|tech|electron/, icons: ['laptop'], description: 'Elettronica' },
];

// Descriptions the local scan may propose (source language, translated at the UI boundary).
export const receiptDescriptions: readonly string[] = shopKinds.map((kind) => kind.description);

// What was bought, from the kind of shop: '' when no kind, or two kinds equally, are recognised.
export function suggestDescription(text: string): string {
  const folded = fold(text);
  const scored = shopKinds.map((kind) => ({ kind, hits: (folded.match(new RegExp(kind.words.source, 'g')) ?? []).length })).filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.length > 0 && !(scored[1] && scored[1].hits === scored[0]!.hits) ? scored[0]!.kind.description : '';
}

// A category among the existing ones that fits the receipt, or '' when none clearly does.
export function suggestCategory(text: string, categories: readonly Category[]): string {
  const folded = fold(text);
  const scored = shopKinds.map((kind) => ({ kind, hits: (folded.match(new RegExp(kind.words.source, 'g')) ?? []).length })).filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  // Two kinds equally present (a bar inside a supermarket): no guess.
  if (scored.length > 0 && !(scored[1] && scored[1].hits === scored[0]!.hits)) {
    const kind = scored[0]!.kind;
    const byName = categories.filter((category) => kind.labels.test(fold(category.label)));
    if (byName.length === 1) return byName[0]!.id;
    if (byName.length === 0) {
      const byIcon = categories.filter((category) => category.icon !== null && kind.icons.includes(category.icon));
      if (byIcon.length === 1) return byIcon[0]!.id;
    }
    return '';
  }
  if (scored.length > 0) return '';
  // Otherwise a category whose own name is printed on the receipt.
  const named = categories.filter((category) => {
    const label = fold(category.label);
    return label.length >= 4 && new RegExp(`(?<![a-z])${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(folded);
  });
  return named.length === 1 ? named[0]!.id : '';
}

// Proposal from the text read by the local OCR. The shop's name, the description and the category are always to be
// checked: a header is often a logo the OCR misreads, description and category are only suggestions from the kind of shop.
export function parseReceiptText(text: string, categories: readonly Category[], today: string): ReceiptProposal {
  const lines: Line[] = text.split(/\r?\n/).map((raw) => raw.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .map((line) => ({ text: line, folded: fold(line), amounts: amountsIn(line) }));
  const total = totalOf(lines);
  const dates = [...new Set(datesIn(lines.map((line) => line.text).join('\n'), today))];
  const merchant = merchantOf(lines);
  const description = suggestDescription(text);
  const categoryId = suggestCategory(text, categories);
  const notes = [total.note, dates.length > 1 ? receiptNotes.manyDates : undefined].filter((note): note is NonNullable<typeof note> => Boolean(note));
  return {
    description, merchant, amountMinor: total.amount, date: dates[0] ?? '', categoryId, items: [], discountMinor: null, notes,
    status: {
      amount: total.status,
      date: dates.length === 0 ? 'missing' : dates.length === 1 ? 'found' : 'uncertain',
      description: description ? 'uncertain' : 'missing',
      merchant: merchant ? 'uncertain' : 'missing',
      categoryId: categoryId ? 'uncertain' : 'missing',
    },
  };
}

// True when a scan gave nothing to review (blurred or cut picture, not a receipt).
// A description alone does not count: it is a guess from a word, not something read.
export const emptyProposal = (proposal: ReceiptProposal) => receiptFields.every((field) => field === 'description' || proposal.status[field] === 'missing');

export const aiResponseError = 'La risposta dell’AI non è valida.';

// An amount of the model's answer in cents: a decimal string («24.75», «24,75») or a JSON number. Never guessed.
function aiAmount(value: unknown): number | null {
  const text = typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : typeof value === 'string' ? value.trim().replace(/\s?(€|eur|euro)$/i, '') : '';
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text);
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
