import { useCallback, useEffect, useState } from 'react';
import type { Category, CategoryIcon } from '../../domain/category';
import { parseSyncedCategory, type SyncedCategory } from '../../domain/firestore';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
import { actionCleared, actionFailed, listenerFailed, noDataErrors, snapshotReceived, visibleError } from '../workspace/dataErrors';
export function useRemoteCategories(backend: DataStore) {
  const [categories, setCategories] = useState<SyncedCategory[]>([]);
  const [ready, setReady] = useState(false);
  // The listener's failure stays until it delivers again; a later successful operation must not hide it (dataErrors.ts).
  const [errors, setErrors] = useState(noDataErrors);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchCategories((s) => {
    setCategories(s.records); setReady(true); setErrors((old) => snapshotReceived(old, 'categories'));
    setSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setCategories([]); setReady(false); setErrors((old) => listenerFailed(old, 'categories', message(e))); }), [backend]);
  const mutate = async (action: () => Promise<void>) => {
    try { await action(); setErrors(actionCleared); return true; }
    catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
  };
  // Stable (only state setters and the backend): the memoised new-expense form receives it as a prop.
  // Resolves with the new ID once the server confirmed it, so the caller can select it; null on failure.
  const createCategory = useCallback(async (name: string, icon: CategoryIcon | null): Promise<string | null> => {
    const id = crypto.randomUUID();
    try { await backend.saveCategory(id, name, icon); setErrors(actionCleared); return id; }
    catch (e) { setErrors((old) => actionFailed(old, message(e))); return null; }
  }, [backend]);
  const find = (id: string) => {
    const record = categories.find((c) => c.id === id);
    if (!record) throw new Error('Categoria non trovata.');
    return record;
  };
  return {
    categories, ready, error: visibleError(errors), sync,
    createCategory,
    deleteCategory: (id: string) => mutate(() => backend.removeCategory(find(id))),
    updateCategory: (id: string, name: string, icon: CategoryIcon | null, expected: Category) => mutate(() => { const c = parseSyncedCategory(expected); if (!c || c.id !== id) throw new Error('Categoria non valida.'); return backend.saveCategory(id, name, icon, c); }),
  };
}
