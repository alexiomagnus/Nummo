import { useEffect, useReducer, useRef, useState } from 'react';
import type { ExpenseData, ExpenseRequest } from '../../domain/expense';
import { sameFieldValue } from '../../domain/contract';
import { parseSyncedExpense, type SyncedExpense } from '../../domain/firestore';
import { submissionReducer } from '../../domain/submission';
import { errorCode } from '../../services/firebase';
import type { FirestoreStore } from '../../services/firestoreStore';
import type { ExpenseStore } from './expenseStore';

export function useRemoteExpenses(backend: FirestoreStore, storageNote: string): ExpenseStore {
  const pendingRecords = useRef(new Map<string, SyncedExpense>());
  const [recovery, setRecovery] = useState<SyncedExpense[]>([]);
  const [expenses, setExpenses] = useState<SyncedExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  const [submission, dispatch] = useReducer(submissionReducer, { status: 'draft' });
  const inFlight = useRef(false);
  const active = useRef(true);
  const latest = useRef(submission);
  latest.current = submission;
  useEffect(() => {
    active.current = true;
    const stop = backend.watchExpenses((s) => {
      for (const record of s.records) if (s.pendingIds.includes(record.id)) pendingRecords.current.set(record.id, record);
      if (!s.fromCache) {
        const missing: SyncedExpense[] = [];
        for (const [id, record] of pendingRecords.current) {
          if (s.pendingIds.includes(id)) continue;
          if (!s.records.some((r) => r.id === id)) missing.push(record);
          pendingRecords.current.delete(id);
        }
        if (missing.length) setRecovery((old) => [...old, ...missing]);
      }
      setExpenses(s.records); setReady(true); setError(null);
      setSync({ fromCache: s.fromCache, pending: s.pending });
      const current = latest.current;
      if (current.status === 'sending' || current.status === 'uncertain') {
        const saved = s.records.find((r) => r.id === current.request.expense_id);
        if (saved && !s.pending && !s.fromCache && Object.entries(current.request).every(([key, value]) => key === 'expense_id' || sameFieldValue(saved[key as keyof ExpenseData], value))) dispatch({ type: 'confirmed', receipt: { expense_id: saved.id, created_at: saved.created_at } });
      }
    }, (reason) => {
      setRecovery((old) => [...new Map([...old, ...pendingRecords.current.values()].map((r) => [r.id, r])).values()]);
      setExpenses([]); setReady(false); setError(message(reason));
    });
    return () => { active.current = false; stop(); };
  }, [backend]);
  const submit = (data: ExpenseData) => {
    if (inFlight.current || !ready || !['draft', 'rejected'].includes(latest.current.status)) return;
    const request: ExpenseRequest = { ...data, expense_id: crypto.randomUUID() };
    inFlight.current = true;
    latest.current = { status: 'sending', request };
    dispatch({ type: 'send', request });
    void backend.createExpense(request).then((receipt) => {
      if (active.current) dispatch({ type: 'confirmed', receipt });
    }).catch((reason: unknown) => {
      if (!active.current) return;
      if (['permission-denied', 'unauthenticated', 'invalid-argument'].includes(errorCode(reason))) {
        dispatch({ type: 'rejected', message: message(reason) });
      } else dispatch({ type: 'uncertain' });
    }).finally(() => { inFlight.current = false; });
  };
  const mutate = async (action: () => Promise<void>) => {
    try { await action(); if (active.current) setError(null); return true; }
    catch (reason) { if (active.current) setError(message(reason)); return false; }
  };
  return {
    expenses, error, ready, submission, submit, sync, recovery,
    retry: () => {
      const current = latest.current;
      if (current.status !== 'uncertain') return;
      void backend.confirmExpense(current.request).then((receipt) => {
        if (active.current) dispatch({ type: 'confirmed', receipt });
      }).catch((e) => { if (active.current) setError(message(e)); });
    }, // Read-only verification: Firestore owns reconnection and retries.
    startNew: () => dispatch({ type: 'new-draft' }),
    remove: (id) => mutate(async () => {
      const record = expenses.find((e) => e.id === id);
      if (!record) throw new Error('Spesa non trovata.');
      await backend.removeExpense(record);
    }),
    update: (record, data) => mutate(async () => {
      const parsed = parseSyncedExpense(record);
      if (!parsed) throw new Error('Spesa non valida.');
      await backend.updateExpense(parsed, data);
    }),
    storageNote,
  };
}
export function message(reason: unknown): string {
  const code = errorCode(reason);
  if (code === 'permission-denied') return 'Accesso negato: verifica UID del proprietario e regole Firestore del progetto.';
  if (code === 'unauthenticated') return 'Sessione scaduta: accedi di nuovo.';
  if (code === 'unavailable') return 'Operazione non disponibile offline: riconnettiti e riprova.';
  return reason instanceof Error && !code.includes('/') && code === 'unknown' ? reason.message : 'Operazione non riuscita. Verifica la connessione e riprova.';
}
