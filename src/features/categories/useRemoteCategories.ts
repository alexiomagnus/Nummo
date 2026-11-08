import { useEffect, useState } from 'react';
import type { Category, CategoryIcon } from '../../domain/category';
import { parseSyncedCategory, type SyncedCategory } from '../../domain/firestore';
import type { FirestoreStore } from '../../services/firestoreStore';
import { message } from '../expenses/useRemoteExpenses';
export function useRemoteCategories(backend: FirestoreStore) {
  const [categories, setCategories] = useState<SyncedCategory[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchCategories((s) => {
    setCategories(s.records); setReady(true); setError(null);
    setSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setCategories([]); setReady(false); setError(message(e)); }), [backend]);
  const mutate = async (action: () => Promise<void>) => {
    try { await action(); setError(null); return true; }
    catch (e) { setError(message(e)); return false; }
  };
  const find = (id: string) => {
    const record = categories.find((c) => c.id === id);
    if (!record) throw new Error('Categoria non trovata.');
    return record;
  };
  return {
    categories, ready, error, sync,
    createCategory: (name: string, icon: CategoryIcon | null) => mutate(() => backend.saveCategory(crypto.randomUUID(), name, icon)),
    deleteCategory: (id: string) => mutate(() => backend.removeCategory(find(id))),
    updateCategory: (id: string, name: string, icon: CategoryIcon | null, expected: Category) => mutate(() => { const c = parseSyncedCategory(expected); if (!c || c.id !== id) throw new Error('Categoria non valida.'); return backend.saveCategory(id, name, icon, c); }),
  };
}
