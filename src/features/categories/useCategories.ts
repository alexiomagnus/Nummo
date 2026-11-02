import { useEffect, useState } from 'react';
import type { Category, CategoryIcon } from '../../domain/category';
import {
  categoryStorageKey, legacyCategoryStorageKey, loadCategories, readCategories, removeCategory, renameCategory, setCategoryIcon, storeCategory,
} from '../../services/categoryStorage';

const newId = () => window.crypto.randomUUID();

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = (seed: boolean) => {
      try {
        setCategories(seed ? loadCategories(window.localStorage, newId) : readCategories(window.localStorage));
        setError(null);
      } catch {
        setCategories([]);
        setError('Impossibile leggere le categorie salvate in questo browser. I dati esistenti non sono stati modificati.');
      }
      setReady(true);
    };
    refresh(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === categoryStorageKey || event.key === legacyCategoryStorageKey || event.key === null) refresh(false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const createCategory = (name: string, icon: CategoryIcon | null): boolean => {
    try {
      setCategories(storeCategory(window.localStorage, name, newId, icon));
      setError(null);
      return true;
    } catch {
      setError('Impossibile aggiungere la categoria. Verifica che non esista già e che il browser consenta il salvataggio dei dati.');
      return false;
    }
  };
  const deleteCategory = (id: string): boolean => {
    try {
      setCategories(removeCategory(window.localStorage, id));
      setError(null);
      return true;
    } catch {
      setError('Impossibile eliminare la categoria. Ricarica la pagina e riprova.');
      return false;
    }
  };
  const changeIcon = (id: string, icon: CategoryIcon | null): boolean => {
    try {
      setCategories(setCategoryIcon(window.localStorage, id, icon));
      setError(null);
      return true;
    } catch {
      setError('Impossibile modificare l’icona. Ricarica la pagina e riprova.');
      return false;
    }
  };
  const rename = (id: string, name: string): boolean => {
    try {
      setCategories(renameCategory(window.localStorage, id, name));
      setError(null);
      return true;
    } catch {
      setError('Impossibile rinominare la categoria. Ricarica la pagina e riprova.');
      return false;
    }
  };
  return { categories, error, ready, createCategory, deleteCategory, changeIcon, rename };
}
