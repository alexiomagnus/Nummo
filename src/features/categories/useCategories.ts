import { useEffect, useState } from 'react';
import type { Category } from '../../domain/category';
import { categoryStorageKey, readCategories, storeCategory } from '../../services/categoryStorage';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setCategories(readCategories(window.localStorage));
        setError(null);
      } catch {
        setCategories([]);
        setError('Impossibile leggere le categorie salvate in questo browser. I dati esistenti non sono stati modificati.');
      }
      setReady(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === categoryStorageKey || event.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const createCategory = (name: string): boolean => {
    try {
      setCategories(storeCategory(window.localStorage, name, () => window.crypto.randomUUID()));
      setError(null);
      return true;
    } catch {
      setError('Impossibile aggiungere la categoria. Verifica che non esista già e che il browser consenta il salvataggio dei dati.');
      return false;
    }
  };
  return { categories, error, ready, createCategory };
}
