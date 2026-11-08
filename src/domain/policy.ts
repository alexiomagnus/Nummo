export const expensePolicy = {
  currency: 'EUR',
  decimals: 2,
  timeZone: 'Europe/Rome',
  maxAmountMinor: 9_999_999,
  maxDescriptionLength: 100,
  minDate: '2000-01-01',
} as const;

export function todayInRome(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: expensePolicy.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Shopping lists (mirrored by firestore.rules). Item names are joined by '\n' in the expense that registers a list.
export const listPolicy = {
  maxNameLength: 40,
  maxItemLength: 60,
  maxItems: 100,
  maxPosition: 999_999_999,
} as const;
