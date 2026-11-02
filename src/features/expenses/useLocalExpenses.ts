import { useEffect, useReducer, useState } from 'react';
import type { ExpenseData } from '../../domain/expense';
import { submissionReducer } from '../../domain/submission';
import { expenseStorageKey, readExpenses, removeExpense, storeExpense, type ExpenseRecord } from '../../services/expenseStorage';
import type { ExpenseStore } from './expenseStore';

export function useLocalExpenses(): ExpenseStore {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [submission, dispatch] = useReducer(submissionReducer, { status: 'draft' });

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

  // A local write is synchronous: it either happened or threw before changing anything.
  const submit = (data: ExpenseData) => {
    if (submission.status !== 'draft' && submission.status !== 'rejected') return;
    const id = window.crypto.randomUUID();
    dispatch({ type: 'send', request: { ...data, expense_id: id } });
    try {
      const updated = storeExpense(window.localStorage, data, () => id);
      setExpenses(updated);
      setError(null);
      dispatch({ type: 'confirmed', receipt: { expense_id: id, created_at: updated.find((r) => r.id === id)!.created_at } });
    } catch {
      dispatch({ type: 'rejected', message: 'Impossibile salvare la spesa. Verifica che il browser consenta il salvataggio dei dati.' });
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
  return {
    expenses, error, ready, submission, submit, remove,
    retry: () => {},
    startNew: () => dispatch({ type: 'new-draft' }),
    storageNote: 'Le spese sono salvate solo in questo browser: Google Sheets non è collegato.',
  };
}
