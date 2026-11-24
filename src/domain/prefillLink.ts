// Link that opens «Nuova spesa» with some fields already filled (`#nuova?importo=12,50&descrizione=Bar`), for an automation
// of the phone after a payment (iPhone Shortcuts, Tasker…). It only proposes: the user checks the fields and presses «Salva»,
// with the usual validation; nothing is ever saved from a link. Pure rules: reading the address, normalising the values and
// matching category and fund by name. Nothing leaves the device.
import { normalizeCategoryName, type Category } from './category.ts';
import { parseAmountMinor, type ExpenseDraft } from './expense.ts';
import { noFund, type Fund } from './funds.ts';
import { merchantPolicy } from './merchant.ts';
import { clipToLength, expensePolicy, isValidDate } from './policy.ts';

export const prefillHash = '#nuova';
// Parameters, as written in the address (Italian, like `?notifica=`).
export const prefillParams = ['importo', 'descrizione', 'esercente', 'data', 'categoria', 'fondo'] as const;
type Param = (typeof prefillParams)[number];

// The values found in the address, still as text; `unknown` counts the parameters that are not ours (a typo, say).
export type PrefillLink = Readonly<{ values: Readonly<Partial<Record<Param, string>>>; unknown: number }>;
// What the form takes: only the fields the link fills; `ignored` = how many values could not be used.
export type Prefill = Readonly<{ patch: Partial<ExpenseDraft>; ignored: number }>;

// `#nuova` or `#nuova?…`; anything else is not a prefill link. Repeated parameters: the first counts.
export function readPrefillHash(hash: string): PrefillLink | null {
  if (hash !== prefillHash && !hash.startsWith(`${prefillHash}?`)) return null;
  const query = new URLSearchParams(hash.slice(prefillHash.length + 1));
  const values: Partial<Record<Param, string>> = {};
  let unknown = 0;
  for (const [name, value] of query) {
    const key = name.trim().toLowerCase();
    if (!(prefillParams as readonly string[]).includes(key)) { unknown += 1; continue; }
    if (values[key as Param] === undefined) values[key as Param] = value;
  }
  return { values, unknown };
}

// An amount as a payment app or a shortcut writes it: «12,50», «12.50», «€ 12,50», «1.234,56», «1,234.56», «1.234».
// Currency signs and spaces go; with two kinds of separator the last one is the decimal one; one kind repeated, or one
// followed by exactly three digits, separates thousands. The result is written as the field writes it («1234,56»).
export function normalizeAmount(input: string): string | null {
  const text = input.replace(/€|eur(?:o)?/giu, '').replace(/[\s  ']/gu, '');
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const separators = text.replace(/\d/g, '');
  let whole = text;
  let decimals = '';
  const last = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
  if (separators.length > 0) {
    const kinds = new Set(separators);
    const tail = text.slice(last + 1);
    const decimal = kinds.size === 2 || (separators.length === 1 && tail.length !== 3);
    if (decimal) { whole = text.slice(0, last); decimals = tail; }
    // Thousands only in groups of three («12,345,6» is not an amount).
    if (/[.,]/.test(whole) && !/^\d{1,3}(?:[.,]\d{3})+$/.test(whole)) return null;
    whole = whole.replace(/[.,]/g, '');
  }
  const amount = decimals ? `${whole},${decimals}` : whole;
  return parseAmountMinor(amount) === null ? null : amount;
}

// «2026-11-24», «24/11/2026», «24-11-2026», «24.11.2026»: a civil date that exists; limits (not before 2000, not in the
// future…) stay with the validation on save, which explains them.
export function normalizeDate(input: string): string | null {
  const text = input.trim();
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const iso = local ? `${local[3]}-${local[2]!.padStart(2, '0')}-${local[1]!.padStart(2, '0')}` : text;
  return isValidDate(iso) ? iso : null;
}

const nameKey = (name: string) => normalizeCategoryName(name).toLowerCase();
const text = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ');

// The fields to fill. Category and fund are found by name (any case and spacing), among the existing categories and the funds
// that can pay a new expense; «nessuno»/«nessun fondo» = «Nessun fondo». Description and merchant stop at the field's limit,
// as typing does. Values that cannot be used are left out (the field keeps what it had) and counted in `ignored`.
export function resolvePrefill(link: PrefillLink, categories: readonly Pick<Category, 'id' | 'label'>[],
  funds: readonly Pick<Fund, 'id' | 'name'>[]): Prefill {
  const { values } = link;
  const patch: Partial<ExpenseDraft> = {};
  let ignored = link.unknown;
  const take = <K extends keyof ExpenseDraft>(raw: string | undefined, field: K, value: ExpenseDraft[K] | null) => {
    if (raw === undefined) return;
    if (value === null) ignored += 1;
    else patch[field] = value;
  };
  if (values.importo !== undefined) take(values.importo, 'amount', normalizeAmount(values.importo));
  if (values.descrizione !== undefined) {
    const description = clipToLength(text(values.descrizione), expensePolicy.maxDescriptionLength);
    take(values.descrizione, 'description', description || null);
  }
  if (values.esercente !== undefined) {
    const merchant = clipToLength(text(values.esercente), merchantPolicy.maxTypedLength);
    take(values.esercente, 'merchant', merchant || null);
  }
  if (values.data !== undefined) take(values.data, 'date', normalizeDate(values.data));
  if (values.categoria !== undefined) {
    const key = nameKey(values.categoria);
    take(values.categoria, 'categoryId', key ? categories.find((category) => nameKey(category.label) === key)?.id ?? null : null);
  }
  if (values.fondo !== undefined) {
    const key = nameKey(values.fondo);
    const none = key === 'nessuno' || key === 'nessun fondo' || key === 'none' || key === 'no fund';
    take(values.fondo, 'fundId', none ? noFund : key ? funds.find((fund) => nameKey(fund.name) === key)?.id ?? null : null);
  }
  return { patch, ignored };
}
