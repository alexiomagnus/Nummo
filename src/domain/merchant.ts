// Merchants («Esercente»): the shop, business or service an expense was paid to. Optional on every expense.
//
// A merchant is a reusable record { id, name } and expenses point at it with `merchant_id`. The ID is DERIVED from the
// comparison form of the name (`merchantKey`): «amazon», «AMAZON» and «  Amazon  » all give `m-amazon`, so the same
// merchant is one document by construction — on every device, offline, in two tabs and across backups — with no name
// index to keep and no duplicates to merge. The displayed `name` is separate from the key: it is set when the merchant is
// first used and never rewritten by a later spelling, so a custom form («eBay», «McDonald's») stays as it is.
//
// Usage (how often and how recently) is not stored: it is computed from the expenses that point at a merchant, so it
// can never drift from the transactions (an edited or deleted expense changes it at once).
import { isValidDate } from './policy.ts';

export type Merchant = Readonly<{ id: string; name: string }>;

export const merchantPolicy = {
  // Saved names (and backups) up to 60, still valid; the field accepts 30 since 22 November (user's request).
  maxNameLength: 60,
  maxTypedLength: 30,
  // Suggestions shown while typing.
  maxSuggestions: 5,
  // A use counts half after this many days: recent habits win over old ones without forgetting them.
  halfLifeDays: 90,
} as const;

// Comparison form: NFC, trimmed, single spaces. The displayed name keeps its own capitals.
export function normalizeMerchantName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// Stable ID of a merchant, from its name: case-insensitive, spaces normalised. Escapes keep it a valid Firestore document
// ID (no '/'); mirrored by `merchantKey` in firestore.rules.
export function merchantKey(name: string): string {
  return 'm-' + normalizeMerchantName(name).toLowerCase().replaceAll('%', '%25').replaceAll('/', '%2F');
}

// Shape of a merchant ID on an expense (the merchant itself is checked by `parseMerchant`): the key of a non-empty name of
// at most 60 characters, so at most 60 × 3 escaped characters after the prefix (Firestore: well under the ID limit).
export function isMerchantId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('m-') && value.length > 2 && value.length <= 400 && !value.includes('/')
    && !/[\s\u0000-\u001f]$|^m-\s/u.test(value) && !/[\t\r\n]/u.test(value);
}

// Short words that stay lowercase inside a name written all in one case («Bar da mario» → «Bar da Mario»).
const minorWords = new Set(['a', 'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'da', 'dal', 'dalla', 'dei', 'degli', 'delle', 'del', 'della', 'dello',
  'di', 'e', 'ed', 'in', 'con', 'per', 'su', 'il', 'la', 'lo', 'le', 'gli', 'and', 'of', 'the', '&']);

const capitalize = (word: string) => {
  const chars = Array.from(word.toLocaleLowerCase('it'));
  return chars.length ? chars[0]!.toLocaleUpperCase('it') + chars.slice(1).join('') : word;
};

// Name shown for a NEW merchant. A name typed all lowercase or all capitals is not a deliberate spelling: each word gets an
// initial capital and the rest lowercase («amazon», «AMAZON» → «Amazon»; «burger king» → «Burger King»), short linking
// words stay lowercase. A name with mixed capitals («eBay», «McDonald's», «IKEA Bari») is a deliberate spelling and is
// kept as typed (spaces normalised).
export function displayMerchantName(value: string): string {
  const name = normalizeMerchantName(value);
  const hasLower = name !== name.toLocaleUpperCase('it');
  const hasUpper = name !== name.toLocaleLowerCase('it');
  if (hasLower && hasUpper) return name;
  return name.split(' ').map((word, index) => (index > 0 && minorWords.has(word.toLocaleLowerCase('it'))
    ? word.toLocaleLowerCase('it')
    // Hyphenated or apostrophised parts each get their capital («coop-italia» → «Coop-Italia», «l'angolo» → «L'Angolo»).
    : word.split(/(?<=[-'’])/u).map(capitalize).join(''))).join(' ');
}

export function merchantNameError(value: string): string | null {
  const name = normalizeMerchantName(value);
  if (Array.from(name).length > merchantPolicy.maxNameLength) return `Usa al massimo ${merchantPolicy.maxNameLength} caratteri.`;
  return null;
}

// New name chosen in the «Esercenti» page (22 November, on request): kept as typed (spaces normalised), since it is a
// deliberate spelling; its key may be another merchant's, and then the two become one (the caller confirms the merge).
export function renamedMerchant(value: string): Merchant | string {
  const name = normalizeMerchantName(value);
  if (!name) return 'Scrivi il nome dell’esercente.';
  if (/[\t\r\n]/u.test(name)) return 'Il nome non può contenere a capo o tabulazioni.';
  return merchantNameError(name) ?? { id: merchantKey(name), name };
}

// A stored merchant: name already normalised, 1..60 characters, ID equal to the key of the name.
export function parseMerchant(value: unknown): Merchant | null {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!v || typeof v.id !== 'string' || typeof v.name !== 'string' || v.name === '' || normalizeMerchantName(v.name) !== v.name
    || Array.from(v.name).length > merchantPolicy.maxNameLength || v.id !== merchantKey(v.name)) return null;
  return { id: v.id, name: v.name };
}

// What the field holds when saving: no merchant, an existing one (reused as saved, whatever the spelling typed), or a new
// one to create together with the expense. Never two merchants for the same key.
export type MerchantChoice = { merchant_id: string | null; create: Merchant | null };
export function resolveMerchant(value: string, merchants: readonly Merchant[]): MerchantChoice {
  const name = normalizeMerchantName(value);
  if (!name) return { merchant_id: null, create: null };
  const id = merchantKey(name);
  if (merchants.some((m) => m.id === id)) return { merchant_id: id, create: null };
  return { merchant_id: id, create: { id, name: displayMerchantName(name) } };
}

// --- Suggestions ---------------------------------------------------------------------------------

export type MerchantUse = Readonly<{ merchant_id?: string | null; expense_date: string }>;
export type RankedMerchant = Readonly<Merchant & { uses: number; lastUsed: string | null; score: number }>;

const dayMs = 86_400_000;
const days = (from: string, to: string) => Math.max(0, (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs);

// Every merchant with its usage: each expense pointing at it adds a weight that halves every `halfLifeDays` days since the
// expense date, so ten uses last year count less than a few this month, and frequent recent merchants come first.
// Merchants no expense uses any more keep score 0 (still suggested, after the others).
export function rankMerchants(merchants: readonly Merchant[], expenses: readonly MerchantUse[], today: string): RankedMerchant[] {
  const stats = new Map<string, { uses: number; lastUsed: string | null; score: number }>();
  for (const m of merchants) stats.set(m.id, { uses: 0, lastUsed: null, score: 0 });
  for (const e of expenses) {
    const s = e.merchant_id ? stats.get(e.merchant_id) : undefined;
    if (!s || !isValidDate(e.expense_date)) continue;
    s.uses++;
    if (!s.lastUsed || e.expense_date > s.lastUsed) s.lastUsed = e.expense_date;
    s.score += Math.pow(0.5, days(e.expense_date, today) / merchantPolicy.halfLifeDays);
  }
  return merchants.map((m) => ({ ...m, ...stats.get(m.id)! }))
    .sort((a, b) => b.score - a.score || (b.lastUsed ?? '').localeCompare(a.lastUsed ?? '') || a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id));
}

// Search form: like the key, and without accents, so «caffe» finds «Caffè».
const searchForm = (value: string) => normalizeMerchantName(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

// Suggestions for the text typed so far, best first: merchants whose name or one of its words starts with the text (in
// the order of `ranked`), then — from three characters on — those that contain it elsewhere. The merchant already
// written exactly (any capitals) is not proposed again. Empty text = no suggestions.
export function suggestMerchants(ranked: readonly RankedMerchant[], typed: string, limit: number = merchantPolicy.maxSuggestions): RankedMerchant[] {
  const query = searchForm(typed);
  if (!query) return [];
  const exact = merchantKey(typed);
  const prefix: RankedMerchant[] = [];
  const inside: RankedMerchant[] = [];
  for (const m of ranked) {
    if (m.id === exact) continue;
    const name = searchForm(m.name);
    if (name.startsWith(query) || name.split(/[\s\-'’.&/]+/u).some((word) => word.startsWith(query))) prefix.push(m);
    else if (query.length >= 3 && name.includes(query)) inside.push(m);
  }
  return [...prefix, ...inside].slice(0, limit);
}
