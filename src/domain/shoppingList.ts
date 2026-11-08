// Shopping lists (pure, no SDK). A list is a checklist of products with an optional manual total; registering it creates
// ONE ordinary one-off expense (with `list_id` and the names of the products bought) and archives the list in the same
// server transaction. Funds and budgets read that expense like any other: nothing about money is stored on the list, so
// there is nothing to count twice. Editing or deleting the expense goes through the normal expense paths.
//
// Firestore: `lists/{id}` (name, default category, total, registering expense) and a flat `listItems/{id}` collection
// (list_id, name, checked, position), so that ticking a product is one small write the SDK can queue offline. In backups
// a list carries its items as an array.
import { isListItemName, isUtcTimestamp, isUuid } from './contract.ts';
import { normalizeDescription } from './expense.ts';
import { expensePolicy, listPolicy } from './policy.ts';

export type ShoppingListData = Readonly<{
  name: string;
  // Category proposed when the list is registered (null = none chosen yet).
  category_id: string | null;
  // Total typed by hand (no prices per product); null = not entered yet.
  total_minor: number | null;
  // Expense that registered the list; null = active list. A registered list is archived (read-only).
  expense_id: string | null;
}>;
export type ShoppingList = Readonly<ShoppingListData & { id: string; created_at: string }>;
export type ListItemData = Readonly<{ list_id: string; name: string; checked: boolean; position: number }>;
export type ListItem = Readonly<ListItemData & { id: string }>;
// Backup shape: a list with its items (no list_id inside the items, they belong to the list around them).
export type BackupItem = Readonly<{ id: string; name: string; checked: boolean; position: number }>;
export type ShoppingListRecord = Readonly<ShoppingList & { items: readonly BackupItem[] }>;

export const normalizeListText = (value: string): string => normalizeDescription(value);

export function listNameError(name: string): string | null {
  const label = normalizeListText(name);
  if (!label) return 'Inserisci il nome della lista.';
  if (Array.from(label).length > listPolicy.maxNameLength) return `Usa al massimo ${listPolicy.maxNameLength} caratteri.`;
  return null;
}
export function itemNameError(name: string, count = 0): string | null {
  const label = normalizeListText(name);
  if (!label) return 'Inserisci il nome del prodotto.';
  if (Array.from(label).length > listPolicy.maxItemLength) return `Usa al massimo ${listPolicy.maxItemLength} caratteri.`;
  if (count >= listPolicy.maxItems) return `Una lista può contenere al massimo ${listPolicy.maxItems} prodotti.`;
  return null;
}

const asObject = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const isListName = (value: unknown): value is string => typeof value === 'string' && value !== '' && normalizeListText(value) === value
  && Array.from(value).length <= listPolicy.maxNameLength;
const isPosition = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= listPolicy.maxPosition;

export function parseListData(v: Record<string, unknown>): ShoppingListData | null {
  const total = v.total_minor;
  const ok = isListName(v.name)
    && (v.category_id === null || isUuid(v.category_id))
    && (total === null || (typeof total === 'number' && Number.isSafeInteger(total) && total > 0 && total <= expensePolicy.maxAmountMinor))
    && (v.expense_id === null || isUuid(v.expense_id));
  return ok ? { name: v.name as string, category_id: v.category_id as string | null, total_minor: total as number | null, expense_id: v.expense_id as string | null } : null;
}
export function parseShoppingList(value: unknown): ShoppingList | null {
  const v = asObject(value);
  if (!v || !isUuid(v.id) || typeof v.created_at !== 'string' || !Number.isFinite(Date.parse(v.created_at))) return null;
  const data = parseListData(v);
  return data && { ...data, id: v.id, created_at: v.created_at };
}
export function parseListItem(value: unknown): ListItem | null {
  const v = asObject(value);
  if (!v || !isUuid(v.id) || !isUuid(v.list_id) || !isListItemName(v.name) || typeof v.checked !== 'boolean' || !isPosition(v.position)) return null;
  return { id: v.id, list_id: v.list_id, name: v.name, checked: v.checked, position: v.position };
}
// A list read from a backup: strict, duplicates and invalid items reject the whole list.
export function parseListRecord(value: unknown): ShoppingListRecord | null {
  const v = asObject(value);
  const list = parseShoppingList(value);
  if (!v || !list || !isUtcTimestamp(list.created_at) || !Array.isArray(v.items) || v.items.length > listPolicy.maxItems) return null;
  const items: BackupItem[] = [];
  for (const raw of v.items) {
    const item = parseListItem({ ...asObject(raw), list_id: list.id });
    if (!item || items.some((i) => i.id === item.id)) return null;
    items.push({ id: item.id, name: item.name, checked: item.checked, position: item.position });
  }
  return { ...list, items: sortItems(items) };
}

// Display and backup order: position, then ID (stable when two devices added an item at the same position).
export function sortItems<T extends { id: string; position: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
export function itemsOf<T extends { list_id: string; id: string; position: number }>(listId: string, items: readonly T[]): T[] {
  return sortItems(items.filter((item) => item.list_id === listId));
}
export function nextPosition(items: readonly { position: number }[]): number {
  return Math.min(listPolicy.maxPosition, items.reduce((max, item) => Math.max(max, item.position + 1), 0));
}
export function progress(items: readonly { checked: boolean }[]): { done: number; total: number } {
  return { done: items.filter((item) => item.checked).length, total: items.length };
}
// Names copied into the registering expense: the products actually bought, in list order.
export function purchasedNames(items: readonly { id: string; position: number; checked: boolean; name: string }[]): string[] {
  return sortItems(items).filter((item) => item.checked).map((item) => item.name);
}
// Items of a new list made from an existing one (duplicate, or the products not bought): unticked, renumbered.
export function copyItems(items: readonly { id: string; position: number; checked: boolean; name: string }[], onlyUnchecked: boolean): { name: string; position: number }[] {
  return sortItems(items).filter((item) => !onlyUnchecked || !item.checked).slice(0, listPolicy.maxItems).map((item, index) => ({ name: item.name, position: index }));
}

// active: still being filled; registered: archived with its expense; detached: archived but the expense no longer exists
// (deleted by a backup replacement or another tool) — it can be brought back among the active lists.
export type ListState = 'active' | 'registered' | 'detached';
export function listState(list: Pick<ShoppingList, 'expense_id'>, expenseIds: ReadonlySet<string>): ListState {
  if (list.expense_id === null) return 'active';
  return expenseIds.has(list.expense_id) ? 'registered' : 'detached';
}

// Expense field `list_items` in Firestore: one string, names joined by '\n' (names never contain line breaks),
// so the Rules check it with one regex. Backups keep the array.
export function encodeListItems(names: readonly string[]): string {
  return names.join('\n');
}
export function decodeListItems(value: unknown): string[] | null {
  if (typeof value !== 'string') return null;
  return value === '' ? [] : value.split('\n');
}

export function sameListRecord(a: ShoppingListRecord, b: ShoppingListRecord): boolean {
  if (a.name !== b.name || a.category_id !== b.category_id || a.total_minor !== b.total_minor || a.expense_id !== b.expense_id
    || a.created_at !== b.created_at || a.items.length !== b.items.length) return false;
  const x = sortItems(a.items), y = sortItems(b.items);
  return x.every((item, i) => item.id === y[i]!.id && item.name === y[i]!.name && item.checked === y[i]!.checked && item.position === y[i]!.position);
}
