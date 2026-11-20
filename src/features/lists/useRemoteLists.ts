import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExpenseData } from '../../domain/expense';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { copyItems, itemsOf, nextPosition, type ShoppingListData } from '../../domain/shoppingList';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
import { actionCleared, actionFailed, listenerFailed, listenerRecovered, noDataErrors, visibleError } from '../workspace/dataErrors';

// Shopping lists and their items, from two listeners. Checklist edits are queued writes (shown at once, synchronised by
// the SDK, errors reported here); registration is a server transaction that reports success only once confirmed.
export function useRemoteLists(backend: DataStore) {
  const [lists, setLists] = useState<SyncedList[]>([]);
  const [items, setItems] = useState<SyncedListItem[]>([]);
  const [listsReady, setListsReady] = useState(false);
  const [itemsReady, setItemsReady] = useState(false);
  // Each listener's failure stays until that listener recovers (see dataErrors.ts).
  const [errors, setErrors] = useState(noDataErrors);
  const [listSync, setListSync] = useState({ fromCache: true, pending: false });
  const [itemSync, setItemSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchLists((s) => {
    setLists(s.records); setListsReady(true); setListSync({ fromCache: s.fromCache, pending: s.pending });
    setErrors((old) => listenerRecovered(old, 'lists'));
  }, (e) => { setLists([]); setListsReady(false); setErrors((old) => listenerFailed(old, 'lists', message(e))); }), [backend]);
  useEffect(() => backend.watchListItems((s) => {
    setItems(s.records); setItemsReady(true); setItemSync({ fromCache: s.fromCache, pending: s.pending });
    setErrors((old) => listenerRecovered(old, 'items'));
  }, (e) => { setItems([]); setItemsReady(false); setErrors((old) => listenerFailed(old, 'items', message(e))); }), [backend]);
  useEffect(() => backend.onQueuedWriteError((reason) => setErrors((old) => actionFailed(old, message(reason)))), [backend]);
  // Synchronous validation errors (the UI validates first, so these are the last guard).
  const run = useCallback((action: () => void) => {
    try { action(); setErrors(actionCleared); return true; } catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
  }, []);
  // Keep the total field's save handler stable while checklist snapshots arrive.
  const updateList = useCallback((list: SyncedList, change: Partial<Pick<ShoppingListData, 'name' | 'category_id' | 'total_minor'>>) =>
    run(() => backend.updateList(list, change)), [backend, run]);
  const byList = useMemo(() => {
    const map = new Map<string, SyncedListItem[]>();
    for (const list of lists) map.set(list.id, itemsOf(list.id, items));
    return map;
  }, [lists, items]);
  const itemsFor = (id: string) => byList.get(id) ?? [];
  return {
    lists, items, itemsFor, error: visibleError(errors), ready: listsReady && itemsReady,
    sync: { fromCache: listSync.fromCache || itemSync.fromCache, pending: listSync.pending || itemSync.pending },
    clearError: () => setErrors(actionCleared),
    // Returns the new list's ID (chosen here, once), or null when refused.
    createList: (data: Pick<ShoppingListData, 'name' | 'category_id'>, from?: { listId: string; onlyUnchecked: boolean }) => {
      const id = crypto.randomUUID();
      const copied = from ? copyItems(itemsFor(from.listId), from.onlyUnchecked) : [];
      return run(() => backend.createList(id, data, copied)) ? id : null;
    },
    updateList,
    reopenList: (list: SyncedList) => run(() => backend.reopenList(list)),
    removeList: (list: SyncedList) => run(() => backend.removeList(list, itemsFor(list.id))),
    addItem: (listId: string, name: string) => run(() => backend.addListItem(listId, name, nextPosition(itemsFor(listId)))),
    updateItem: (item: SyncedListItem, change: Partial<Pick<SyncedListItem, 'name' | 'checked'>>) => run(() => backend.updateListItem(item, change)),
    removeItem: (item: SyncedListItem) => run(() => backend.removeListItem(item)),
    register: async (list: SyncedList, expenseId: string, data: ExpenseData, remember: boolean) => {
      try { await backend.registerList(list, expenseId, data, remember); setErrors(actionCleared); return true; }
      catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
    },
  };
}
export type RemoteLists = ReturnType<typeof useRemoteLists>;
