import { useEffect, useReducer, useRef, useState } from 'react';
import type { ExpenseData, ExpenseRequest } from '../../domain/expense';
import type { Merchant } from '../../domain/merchant';
import { sameFieldValue } from '../../domain/contract';
import { parseSyncedExpense, type SyncedExpense } from '../../domain/firestore';
import { submissionReducer } from '../../domain/submission';
import { errorCode } from '../../services/firebase';
import type { DataStore } from '../../services/dataStore';
import type { ExpenseStore } from './expenseStore';
import { actionCleared, actionFailed, listenerFailed, noDataErrors, snapshotReceived, visibleError } from '../workspace/dataErrors';

// Advanced mode: an expense already written to the device's copy of the archive but not confirmed by the server frees the
// form at once when the browser is offline, or after this delay on a weak connection (the server usually answers first).
const queueDelay = 2000;
const sameSet = (a: ReadonlySet<string>, b: readonly string[]) => a.size === b.length && b.every((id) => a.has(id));

export function useRemoteExpenses(backend: DataStore, storageNote: string): ExpenseStore {
  const pendingRecords = useRef(new Map<string, SyncedExpense>());
  const [recovery, setRecovery] = useState<SyncedExpense[]>([]);
  const [expenses, setExpenses] = useState<SyncedExpense[]>([]);
  // The listener's failure stays until it delivers again; a later successful operation must not hide it (dataErrors.ts).
  const [errors, setErrors] = useState(noDataErrors);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  const [submission, dispatch] = useReducer(submissionReducer, { status: 'draft' });
  // The expense being sent (its ID), until confirmed, rejected or queued: one at a time.
  const inFlight = useRef<string | null>(null);
  const queueTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Expenses written on this device and still waiting for the server (Advanced mode; always empty in Standard).
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const active = useRef(true);
  const latest = useRef(submission);
  latest.current = submission;
  const queue = (id: string) => {
    const current = latest.current;
    if (current.status !== 'sending' || current.request.expense_id !== id) return;
    clearTimeout(queueTimer.current);
    latest.current = { status: 'queued', request: current.request };
    if (inFlight.current === id) inFlight.current = null;
    dispatch({ type: 'queued' });
  };
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
      setExpenses(s.records); setReady(true); setErrors((old) => snapshotReceived(old, 'expenses'));
      setSync({ fromCache: s.fromCache, pending: s.pending });
      setPendingIds((old) => sameSet(old, s.pendingIds) ? old : new Set(s.pendingIds));
      const current = latest.current;
      // The expense is in the device's copy, waiting for the server: free the form (offline now, otherwise after a delay).
      if (current.status === 'sending' && backend.kind !== 'local' && s.pendingIds.includes(current.request.expense_id)) {
        const id = current.request.expense_id;
        const local = s.records.find((r) => r.id === id);
        if (local && Object.entries(current.request).every(([key, value]) => key === 'expense_id' || sameFieldValue(local[key as keyof ExpenseData], value))) {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) queue(id);
          else if (queueTimer.current === undefined) queueTimer.current = setTimeout(() => { queueTimer.current = undefined; queue(id); }, queueDelay);
        }
      }
      if (current.status === 'sending' || current.status === 'uncertain') {
        const saved = s.records.find((r) => r.id === current.request.expense_id);
        if (saved && !s.pending && !s.fromCache && Object.entries(current.request).every(([key, value]) => key === 'expense_id' || sameFieldValue(saved[key as keyof ExpenseData], value))) dispatch({ type: 'confirmed', receipt: { expense_id: saved.id, created_at: saved.created_at } });
      }
    }, (reason) => {
      setRecovery((old) => [...new Map([...old, ...pendingRecords.current.values()].map((r) => [r.id, r])).values()]);
      setExpenses([]); setReady(false); setErrors((old) => listenerFailed(old, 'expenses', message(reason)));
    });
    return () => { active.current = false; clearTimeout(queueTimer.current); queueTimer.current = undefined; stop(); };
  }, [backend]);
  const submit = (data: ExpenseData, merchant?: Merchant | null) => {
    if (inFlight.current || !ready || !['draft', 'rejected'].includes(latest.current.status)) return;
    const request: ExpenseRequest = { ...data, expense_id: crypto.randomUUID() };
    const id = request.expense_id;
    inFlight.current = id;
    clearTimeout(queueTimer.current); queueTimer.current = undefined;
    latest.current = { status: 'sending', request };
    dispatch({ type: 'send', request });
    // Still the expense of the form (not queued meanwhile, not followed by another one)?
    const current = () => {
      const state = latest.current;
      return (state.status === 'sending' || state.status === 'uncertain') && state.request.expense_id === id;
    };
    const definitive = (reason: unknown) => ['permission-denied', 'unauthenticated', 'invalid-argument'].includes(errorCode(reason));
    void backend.createExpense(request, merchant).then((receipt) => {
      // A queued expense confirmed later needs nothing here: the listener shows it as no longer waiting.
      if (active.current && current()) dispatch({ type: 'confirmed', receipt });
    }).catch((reason: unknown) => {
      if (!active.current) return;
      if (!current()) {
        // A queued expense refused by the server: the listener keeps a recovery copy of it; say why.
        if (definitive(reason)) setErrors((old) => actionFailed(old, message(reason)));
        return;
      }
      // A device write is atomic: a failure wrote nothing, so the draft can simply be sent again.
      if (backend.kind === 'local' || definitive(reason)) {
        dispatch({ type: 'rejected', message: message(reason) });
      } else dispatch({ type: 'uncertain' });
    }).finally(() => {
      if (inFlight.current === id) inFlight.current = null;
      if (latest.current.status !== 'sending') { clearTimeout(queueTimer.current); queueTimer.current = undefined; }
    });
  };
  const mutate = async (action: () => Promise<void>) => {
    try { await action(); if (active.current) setErrors(actionCleared); return true; }
    catch (reason) { if (active.current) setErrors((old) => actionFailed(old, message(reason))); return false; }
  };
  return {
    expenses, error: visibleError(errors), ready, submission, submit, sync, recovery, pendingIds,
    retry: () => {
      const current = latest.current;
      if (current.status !== 'uncertain') return;
      void backend.confirmExpense(current.request).then((receipt) => {
        if (active.current) dispatch({ type: 'confirmed', receipt });
      }).catch((e) => { if (active.current) setErrors((old) => actionFailed(old, message(e))); });
    }, // Read-only verification: Firestore owns reconnection and retries.
    startNew: () => dispatch({ type: 'new-draft' }),
    remove: (record) => mutate(async () => {
      const parsed = parseSyncedExpense(record);
      if (!parsed) throw new Error('Spesa non valida.');
      await backend.removeExpense(parsed);
    }),
    update: (record, data, merchant) => mutate(async () => {
      const parsed = parseSyncedExpense(record);
      if (!parsed) throw new Error('Spesa non valida.');
      await backend.updateExpense(parsed, data, merchant);
    }),
    storageNote, local: backend.kind === 'local',
  };
}
export function message(reason: unknown): string {
  const code = errorCode(reason);
  if (code === 'permission-denied') return 'Accesso negato: verifica UID del proprietario e regole Firestore del progetto.';
  if (code === 'unauthenticated') return 'Sessione scaduta: accedi di nuovo.';
  if (code === 'unavailable') return 'Operazione non disponibile offline: riconnettiti e riprova.';
  return reason instanceof Error && !code.includes('/') && code === 'unknown' ? reason.message : 'Operazione non riuscita. Verifica la connessione e riprova.';
}
