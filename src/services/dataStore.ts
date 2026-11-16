// The one persistence contract of the app. Two implementations, never mixed and never copied into each other:
// - firestoreStore.ts: «Avanzata», the user's own Firebase project (BYOF);
// - localStore.ts: «Standard», IndexedDB on this device.
// Hooks and pages only know this type, so every feature works the same on both.
import type { ImportData, ImportMode, ImportPlan } from '../domain/backup.ts';
import type { Category, CategoryIcon } from '../domain/category.ts';
import type { ExpenseRecord, Receipt } from '../domain/contract.ts';
import type { ExpenseData, ExpenseRequest } from '../domain/expense.ts';
import type { SyncedBudget, SyncedCategory, SyncedExpense, SyncedFund, SyncedList, SyncedListItem, SyncedMovement } from '../domain/firestore.ts';
import type { BudgetChange, Fund, FundData, Movement, MovementData } from '../domain/funds.ts';
import { parseMerchant, type Merchant } from '../domain/merchant.ts';
import { sortItems, type ShoppingListData, type ShoppingListRecord } from '../domain/shoppingList.ts';

export type SnapshotState<T> = { records: T[]; fromCache: boolean; pending: boolean; pendingIds: string[] };
export type BudgetSnapshot = { budget: SyncedBudget | null; fromCache: boolean; pending: boolean };
export type Unsubscribe = () => void;
type Watch<T> = (next: (value: SnapshotState<T>) => void, error: (reason: Error) => void) => Unsubscribe;

// A complete, confirmed copy of the archive (backups and CSV).
export type ArchiveSnapshot = {
  expenses: SyncedExpense[]; categories: SyncedCategory[]; funds: SyncedFund[]; movements: SyncedMovement[];
  lists: ShoppingListRecord[]; budget: BudgetChange[]; merchants: Merchant[];
};

export type DataStore = {
  // `local` writes are atomic and final at once: there is no queue, no server confirmation and no «uncertain» outcome.
  readonly kind: 'firestore' | 'local';
  watchExpenses: Watch<SyncedExpense>;
  watchCategories: Watch<SyncedCategory>;
  watchFunds: Watch<SyncedFund>;
  watchMovements: Watch<SyncedMovement>;
  watchLists: Watch<SyncedList>;
  watchListItems: Watch<SyncedListItem>;
  watchBudget(next: (value: BudgetSnapshot) => void, error: (reason: Error) => void): Unsubscribe;
  // Merchants (merchant.ts): created only together with the first expense that uses them, never edited or deleted from
  // the interface (only a «replace» import removes them).
  watchMerchants: Watch<Merchant>;
  // Read-only verification of an uncertain save; never a second write.
  confirmExpense(request: ExpenseRequest): Promise<Receipt>;
  // `merchant`: a merchant used for the first time (its ID is `request.merchant_id`), saved in the same atomic write as the
  // expense; a merchant that already exists keeps the name it has.
  createExpense(request: ExpenseRequest, merchant?: Merchant | null): Promise<Receipt>;
  // Updates and removals act on the revision seen when the editor opened; a newer one is an explicit conflict.
  updateExpense(previous: SyncedExpense, data: ExpenseData, merchant?: Merchant | null): Promise<void>;
  removeExpense(previous: SyncedExpense): Promise<void>;
  saveCategory(id: string, name: string, icon: CategoryIcon | null, previous?: SyncedCategory): Promise<void>;
  removeCategory(previous: SyncedCategory): Promise<void>;
  saveBudget(budgets: readonly BudgetChange[], previous: SyncedBudget | null): Promise<void>;
  saveFund(id: string, data: FundData, previous?: SyncedFund): Promise<void>;
  removeFund(previous: SyncedFund): Promise<void>;
  createMovement(id: string, data: MovementData): Promise<void>;
  removeMovement(previous: SyncedMovement): Promise<void>;
  assignFund(records: readonly SyncedExpense[], fundId: string): Promise<number>;
  // Checklist edits: validated at once (they throw), saved in the background; a failed save reaches this handler.
  onQueuedWriteError(handler: (reason: unknown) => void): Unsubscribe;
  createList(id: string, data: Pick<ShoppingListData, 'name' | 'category_id'>, items?: readonly { name: string; position: number }[]): void;
  updateList(list: SyncedList, change: Partial<Pick<ShoppingListData, 'name' | 'category_id' | 'total_minor'>>): void;
  reopenList(list: SyncedList): void;
  removeList(list: SyncedList, items: readonly SyncedListItem[]): void;
  addListItem(listId: string, name: string, position: number): void;
  updateListItem(item: SyncedListItem, change: Partial<Pick<SyncedListItem, 'name' | 'checked'>>): void;
  removeListItem(item: SyncedListItem): void;
  registerList(list: SyncedList, expenseId: string, data: ExpenseData, remember?: boolean): Promise<void>;
  exportSnapshot(): Promise<ArchiveSnapshot>;
  previewImport(data: ImportData): Promise<{ merge: ImportPlan; replace: ImportPlan }>;
  importRecords(records: readonly ExpenseRecord[], categoryRecords: readonly Category[], mode?: ImportMode, fundRecords?: readonly Fund[],
    movementRecords?: readonly Movement[], shoppingLists?: readonly ShoppingListRecord[], generalBudget?: readonly BudgetChange[], merchantRecords?: readonly Merchant[]): Promise<void>;
};

// Lists of the archive with their items (backups and import plans). Items whose list no longer exists are left out.
export function listRecords(lists: readonly SyncedList[], items: readonly SyncedListItem[]): ShoppingListRecord[] {
  return lists.map((l) => ({ id: l.id, name: l.name, category_id: l.category_id, total_minor: l.total_minor, expense_id: l.expense_id, created_at: l.created_at,
    items: sortItems(items.filter((i) => i.list_id === l.id)).map((i) => ({ id: i.id, name: i.name, checked: i.checked, position: i.position })) }));
}
export const invalidArchive = 'Archivio non valido: esportazione e modifiche bloccate.';

// The merchant sent with a new or edited expense must be the one its `merchant_id` names (checked by both stores).
export function checkNewMerchant(data: Pick<ExpenseData, 'merchant_id'>, merchant: Merchant | null | undefined): Merchant | null {
  if (!merchant) return null;
  if (data.merchant_id !== merchant.id || !parseMerchant(merchant)) throw new Error('Esercente non valido.');
  return merchant;
}
