// Preferred categories, chosen in Settings: the one «Nuova spesa» starts with and the one proposed for a new list.
// Remembered per archive in this browser (identifiers only, never expense data), like the default fund; a category
// that no longer exists is simply ignored by the forms.
export type PreferredCategories = { expense: string; list: string };
export const noPreferredCategories: PreferredCategories = { expense: '', list: '' };
export const preferredCategoriesKey = (scope: string) => `nummo.preferredCategories.v1.${scope}`;

const id = (value: unknown): string => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value) ? value : '';

// Untrusted input (localStorage can be edited or corrupted): each field falls back on its own.
export function parsePreferredCategories(raw: string | null): PreferredCategories {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const o = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return { expense: id(o.expense), list: id(o.list) };
}

// The preferred category when it still exists, otherwise ''.
export function existingCategory(preferred: string, categories: readonly { id: string }[]): string {
  return preferred && categories.some((category) => category.id === preferred) ? preferred : '';
}

export function readPreferredCategories(scope: string): PreferredCategories {
  try { return parsePreferredCategories(localStorage.getItem(preferredCategoriesKey(scope))); } catch { return noPreferredCategories; }
}

export function writePreferredCategories(scope: string, value: PreferredCategories): void {
  try {
    if (value.expense || value.list) localStorage.setItem(preferredCategoriesKey(scope), JSON.stringify(value));
    else localStorage.removeItem(preferredCategoriesKey(scope));
  } catch { /* storage denied: the choice lasts for the session */ }
}
