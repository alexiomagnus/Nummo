import { useEffect, useState } from 'react';
import type { ExpenseData } from '../../domain/expense';
import { expenseStorageKey, readExpenses, removeExpense, storeExpense, type ExpenseRecord } from '../../services/expenseStorage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setExpenses(readExpenses(window.localStorage));
        setError(null);
      } catch {
        setExpenses([]);
        setError('Impossibile leggere le spese salvate in questo browser. I dati esistenti non sono stati modificati.');
      }
      setReady(true);
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === expenseStorageKey || event.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = (data: ExpenseData): boolean => {
    try {
      setExpenses(storeExpense(window.localStorage, data, () => window.crypto.randomUUID()));
      setError(null);
      return true;
    } catch {
      setError('Impossibile salvare la spesa. Verifica che il browser consenta il salvataggio dei dati.');
      return false;
    }
  };
  const remove = (id: string): boolean => {
    try {
      setExpenses(removeExpense(window.localStorage, id));
      setError(null);
      return true;
    } catch {
      setError('Impossibile eliminare la spesa. Ricarica la pagina e riprova.');
      return false;
    }
  };
  return { expenses, error, ready, save, remove };
}
