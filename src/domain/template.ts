// Templates (pure, no SDK): saved presets for «Nuova spesa». A template holds what the form fills in at once: amount
// (optional), date, description, merchant (optional), category and fund. Never the repeat: a recurring expense already
// repeats by itself. Removed on 16 November 2026 and reintroduced on 21 November on request; the merchant came with the
// reintroduction. It is only a name: a merchant is created together with the expense saved from the form, never by a
// template (merchant.ts).
// Templates are archive data like lists (Firestore `templates/{id}` or the device archive, included in backups), saved with
// plain writes (last write wins, no revision). They never count as spending: only the expense saved from the form does.
import type { Category } from './category.ts';
import { isUtcTimestamp, isUuid } from './contract.ts';
import { normalizeDescription, parseAmountMinor } from './expense.ts';
import { merchantNameError, merchantPolicy, normalizeMerchantName } from './merchant.ts';
import { expensePolicy, isValidDate, todayInRome } from './policy.ts';

export const templatePolicy = { maxTemplates: 100, maxDate: '2099-12-31' } as const;

export type TemplateData = Readonly<{
  description: string;
  // Optional: a template can leave the amount to be typed each time.
  amount_minor: number | null;
  // Civil date (Europe/Rome) the form is filled with.
  date: string;
  category_id: string;
  // null = «Nessun fondo».
  fund_id: string | null;
  // Name typed in «Esercente» (normalised, at most 60 characters); null = none. Templates saved before 21 November have none.
  merchant: string | null;
}>;
export type TemplateRecord = Readonly<TemplateData & { id: string; created_at: string }>;

// What the editor holds while typing; the fund is '' until chosen when funds exist, and `noFund` («Nessun fondo») is an
// explicit choice resolved by the caller.
export type TemplateDraft = { description: string; amount: string; date: string; categoryId: string; fundId: string; merchant: string };
export type TemplateErrors = Partial<Record<keyof TemplateDraft, string>>;
export type TemplateValidation = { ok: true; data: TemplateData } | { ok: false; errors: TemplateErrors };

export const newTemplateDraft = (today = todayInRome()): TemplateDraft => ({ description: '', amount: '', date: today, categoryId: '', fundId: '', merchant: '' });

export function draftOfTemplate(template: TemplateData): TemplateDraft {
  const amount = template.amount_minor;
  return { description: template.description, categoryId: template.category_id, fundId: template.fund_id ?? '', date: template.date, merchant: template.merchant ?? '',
    amount: amount === null ? '' : `${Math.floor(amount / 100)},${String(amount % 100).padStart(2, '0')}` };
}

// `funds`: the funds the template may use (active ones); `fundChosen` is false while funds exist and none (nor
// «Nessun fondo») has been picked yet, like in the new-expense form.
export function validateTemplateDraft(draft: TemplateDraft, categories: readonly Category[], funds: readonly { id: string }[],
  options: { fundChosen: boolean; now?: Date }): TemplateValidation {
  const errors: TemplateErrors = {};
  const description = normalizeDescription(draft.description);
  if (!description) errors.description = 'Inserisci la descrizione.';
  else if (Array.from(description).length > expensePolicy.maxDescriptionLength) errors.description = `Usa al massimo ${expensePolicy.maxDescriptionLength} caratteri.`;
  const amountText = draft.amount.trim();
  const amount = amountText ? parseAmountMinor(amountText) : null;
  if (amountText && amount === null) errors.amount = 'Importo non valido (es. 12,50).';
  const category = draft.categoryId ? categories.find((item) => item.id === draft.categoryId) : undefined;
  if (!draft.categoryId) errors.categoryId = categories.length === 0 ? 'Crea prima una categoria nella sezione Categorie.' : 'Seleziona una categoria.';
  else if (!category) errors.categoryId = 'La categoria scelta non esiste più.';
  const fund = draft.fundId ? funds.find((item) => item.id === draft.fundId) : undefined;
  if (draft.fundId && !fund) errors.fundId = 'Il fondo scelto non esiste più.';
  else if (!draft.fundId && funds.length > 0 && !options.fundChosen) errors.fundId = 'Scegli il fondo, oppure Nessun fondo.';
  const merchant = normalizeMerchantName(draft.merchant ?? '');
  const merchantProblem = merchantNameError(merchant);
  if (merchantProblem) errors.merchant = merchantProblem;
  const now = options.now ?? new Date();
  if (!draft.date || !isValidDate(draft.date) || draft.date < expensePolicy.minDate || draft.date > todayInRome(now)) {
    errors.date = 'Inserisci una data valida dal 01/01/2000 a oggi (AAAA-MM-GG).';
  }
  if (Object.keys(errors).length > 0 || !category) return { ok: false, errors };
  return { ok: true, data: { description, amount_minor: amount, date: draft.date, category_id: category.id, fund_id: fund?.id ?? null, merchant: merchant || null } };
}

const asObject = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

// A merchant name as stored: normalised, 1..60 characters; absent (older templates) reads as none.
const storedMerchant = (value: unknown): string | null | undefined => value === undefined || value === null ? null
  : typeof value === 'string' && value !== '' && normalizeMerchantName(value) === value && Array.from(value).length <= merchantPolicy.maxNameLength ? value : undefined;

// Untrusted input (a stored document, a backup): the same limits as the form, plus a date that exists.
export function parseTemplateData(v: Record<string, unknown>): TemplateData | null {
  const amount = v.amount_minor;
  const merchant = storedMerchant(v.merchant);
  if (merchant === undefined) return null;
  const ok = typeof v.description === 'string' && v.description !== '' && normalizeDescription(v.description) === v.description
    && Array.from(v.description).length <= expensePolicy.maxDescriptionLength
    && (amount === null || (typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 && amount <= expensePolicy.maxAmountMinor))
    && typeof v.date === 'string' && isValidDate(v.date) && v.date >= expensePolicy.minDate && v.date <= templatePolicy.maxDate
    && isUuid(v.category_id) && (v.fund_id === null || isUuid(v.fund_id));
  return ok ? { description: v.description as string, amount_minor: amount as number | null, date: v.date as string, category_id: v.category_id as string, fund_id: v.fund_id as string | null, merchant } : null;
}
export function parseTemplate(value: unknown): TemplateRecord | null {
  const v = asObject(value);
  if (!v || !isUuid(v.id) || !isUtcTimestamp(v.created_at)) return null;
  const data = parseTemplateData(v);
  return data ? { ...data, id: v.id as string, created_at: v.created_at as string } : null;
}

export const templateFields = (data: TemplateData): TemplateData => ({ description: data.description, amount_minor: data.amount_minor, date: data.date,
  category_id: data.category_id, fund_id: data.fund_id, merchant: data.merchant ?? null });
export const sameTemplateData = (a: TemplateData, b: TemplateData): boolean => a.description === b.description && a.amount_minor === b.amount_minor
  && a.date === b.date && a.category_id === b.category_id && a.fund_id === b.fund_id && (a.merchant ?? null) === (b.merchant ?? null);
export const sameTemplate = (a: TemplateRecord, b: TemplateRecord): boolean => a.id === b.id && a.created_at === b.created_at && sameTemplateData(a, b);

// Alphabetical for the picker and the page, then by creation.
export const sortTemplates = <T extends TemplateRecord>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.description.localeCompare(b.description) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
