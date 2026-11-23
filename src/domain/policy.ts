export const expensePolicy = {
  currency: 'EUR',
  decimals: 2,
  timeZone: 'Europe/Rome',
  // 999.999.999,99 € since 22 November (user's request, for completeness: 9 whole digits and 2 decimals); 99.999,99 € before.
  // Far below Number.MAX_SAFE_INTEGER, also when many are added up.
  maxAmountMinor: 99_999_999_999,
  maxDescriptionLength: 100,
  minDate: '2000-01-01',
} as const;

// Search fields (Categorie, Spese, Abbonamenti): 30 characters are enough for any word or name to look for (user's request,
// 22 November; before, as long as what they search).
export const searchPolicy = { maxQueryLength: 30 } as const;

// Typing or pasting stops at `max` characters, counted as the length check counts them (code points: an emoji is one).
export function clipToLength(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') : text;
}

// One formatter for every call: building an Intl.DateTimeFormat costs far more than using it, and today's date is asked
// for many times while the workspace first renders (startup profile, 23 November: the largest self time of our code).
let romeDay: Intl.DateTimeFormat | null = null;
export function todayInRome(now = new Date()): string {
  romeDay ??= new Intl.DateTimeFormat('en-GB', { timeZone: expensePolicy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = romeDay.formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Civil date «YYYY-MM-DD» that exists in the calendar.
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Shopping lists (mirrored by firestore.rules). Item names are joined by '\n' in the expense that registers a list.
export const listPolicy = {
  maxNameLength: 40,
  maxItemLength: 60,
  // Products per list: 500 (100 until 22 November, on request). Duplicating or deleting a full list is one batch of 501 writes:
  // Firestore no longer limits writes per commit (since March 2023; 10 MiB per request remains).
  maxItems: 500,
  maxPosition: 999_999_999,
} as const;
