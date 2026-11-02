import { useEffect, useReducer, useRef, useState } from 'react';
import type { ExpenseRecord } from '../../domain/contract';
import type { ExpenseData, ExpenseRequest } from '../../domain/expense';
import { isDefinitiveRejection, submissionReducer, type Submission } from '../../domain/submission';
import { errorCode, listExpenses, submitExpense } from '../../services/firebase';
import type { ExpenseStore } from './expenseStore';

const loadError = 'Impossibile caricare le spese dal registro. Controlla la connessione e ricarica la pagina.';

// Mounted per signed-in account (keyed by UID): signing out discards all of this state.
export function useRemoteExpenses(storageNote: string): ExpenseStore {
  const [expenses, setExpenses] = useState<readonly ExpenseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [submission, dispatch] = useReducer(submissionReducer, { status: 'draft' });
  // Synchronous guards: a double tap in the same frame must not start a second call.
  const latest = useRef<Submission>(submission);
  latest.current = submission;
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    listExpenses().then((list) => {
      if (!active) return;
      setExpenses(list.expenses);
      setError(list.invalid_rows > 0
        ? `${list.invalid_rows === 1 ? '1 riga' : `${list.invalid_rows} righe`} del registro non sono leggibili e non sono mostrate.`
        : null);
      setReady(true);
    }, (reason: unknown) => {
      if (!active) return;
      const code = errorCode(reason).replace(/^functions\//, '');
      setError(code === 'permission-denied' ? 'Questo account non è autorizzato ad accedere al registro.' : loadError);
    });
    return () => { active = false; };
  }, []);

  const send = async (request: ExpenseRequest) => {
    inFlight.current = true;
    try {
      const receipt = await submitExpense(request);
      const { expense_id, ...data } = request;
      setExpenses((previous) => (previous.some((item) => item.id === expense_id)
        ? previous : [...previous, { ...data, id: expense_id, created_at: receipt.created_at }]));
      dispatch({ type: 'confirmed', receipt });
    } catch (reason) {
      const code = errorCode(reason);
      if (isDefinitiveRejection(code)) {
        dispatch({ type: 'rejected', message: rejectionMessage(code) });
      } else {
        dispatch({ type: 'uncertain' });
      }
    } finally {
      inFlight.current = false;
    }
  };

  return {
    expenses, error, ready, submission,
    submit: (data: ExpenseData) => {
      const status = latest.current.status;
      if (inFlight.current || (status !== 'draft' && status !== 'rejected')) return;
      const request: ExpenseRequest = { ...data, expense_id: window.crypto.randomUUID() };
      latest.current = { status: 'sending', request };
      dispatch({ type: 'send', request });
      void send(request);
    },
    retry: () => {
      const current = latest.current;
      if (inFlight.current || current.status !== 'uncertain') return;
      latest.current = { status: 'sending', request: current.request };
      dispatch({ type: 'retry' });
      void send(current.request);
    },
    startNew: () => dispatch({ type: 'new-draft' }),
    storageNote,
  };
}

function rejectionMessage(code: string): string {
  switch (code.replace(/^functions\//, '')) {
    case 'unauthenticated': return 'Sessione scaduta: accedi di nuovo. La spesa non è stata salvata.';
    case 'permission-denied': return 'Questo account non è autorizzato. La spesa non è stata salvata.';
    case 'already-exists': return 'Conflitto con una spesa già registrata. Salva di nuovo per crearne una nuova.';
    default: return 'Spesa rifiutata dal registro: controlla i dati e salva di nuovo.';
  }
}
