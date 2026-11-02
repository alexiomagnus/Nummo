import { useEffect, useState } from 'react';
import type { RecurringData, RecurringExpense } from '../../domain/recurring';
import { readRecurring, recurringStorageKey, removeRecurring, storeRecurring } from '../../services/recurringStorage';

export function useRecurringExpenses() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setItems(readRecurring(window.localStorage));
        setError(null);
      } catch {
        setItems([]);
        setError('Impossibile leggere le spese ricorrenti salvate in questo browser. I dati esistenti non sono stati modificati.');
      }
      setReady(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === recurringStorageKey || event.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const create = (data: RecurringData): boolean => {
    try {
      setItems(storeRecurring(window.localStorage, data, () => window.crypto.randomUUID()));
      setError(null);
      return true;
    } catch {
      setError('Impossibile salvare la spesa ricorrente. Verifica che il browser consenta il salvataggio dei dati.');
      return false;
    }
  };
  const remove = (id: string): boolean => {
    try {
      setItems(removeRecurring(window.localStorage, id));
      setError(null);
      return true;
    } catch {
      setError('Impossibile eliminare la spesa ricorrente. Ricarica la pagina e riprova.');
      return false;
    }
  };
  return { items, error, ready, create, remove };
}
