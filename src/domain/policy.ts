export const expensePolicy = {
  currency: 'EUR',
  decimals: 2,
  timeZone: 'Europe/Rome',
  maxAmountMinor: 9_999_999,
  maxDescriptionLength: 100,
  minDate: '2000-01-01',
} as const;

// Typing or pasting stops at `max` characters, counted as the length check counts them (code points: an emoji is one).
export function clipToLength(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') : text;
}

export function todayInRome(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: expensePolicy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
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
  maxItems: 100,
  maxPosition: 999_999_999,
} as const;
