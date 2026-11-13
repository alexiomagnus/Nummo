import { useEffect, useState } from 'react';
import type { SyncedBudget, SyncedExpense, SyncedFund, SyncedMovement } from '../../domain/firestore';
import { parseSyncedFund, parseSyncedMovement } from '../../domain/firestore';
import type { BudgetChange, FundData, MovementData } from '../../domain/funds';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';

const noBudget: readonly BudgetChange[] = [];

// Funds and movements of the account, from two listeners. Every mutation is a server transaction: it reports success only
// after the server has confirmed it (offline it fails with a clear message instead of queuing silently).
export function useRemoteFunds(backend: DataStore) {
  const [funds, setFunds] = useState<SyncedFund[]>([]);
  const [movements, setMovements] = useState<SyncedMovement[]>([]);
  const [fundsReady, setFundsReady] = useState(false);
  const [movementsReady, setMovementsReady] = useState(false);
  // General monthly budget (issue #7): its own listener, so a failure here never hides the funds.
  const [budget, setBudget] = useState<SyncedBudget | null>(null);
  const [budgetReady, setBudgetReady] = useState(false);
  const [budgetSync, setBudgetSync] = useState({ fromCache: true, pending: false });
  const [error, setError] = useState<string | null>(null);
  const [fundSync, setFundSync] = useState({ fromCache: true, pending: false });
  const [movementSync, setMovementSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchFunds((s) => {
    setFunds(s.records); setFundsReady(true); setError(null); setFundSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setFunds([]); setFundsReady(false); setError(message(e)); }), [backend]);
  useEffect(() => backend.watchMovements((s) => {
    setMovements(s.records); setMovementsReady(true); setError(null); setMovementSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setMovements([]); setMovementsReady(false); setError(message(e)); }), [backend]);
  useEffect(() => backend.watchBudget((s) => {
    setBudget(s.budget); setBudgetReady(true); setBudgetSync({ fromCache: s.fromCache, pending: s.pending });
  }, () => { setBudget(null); setBudgetReady(false); }), [backend]);
  const mutate = async (action: () => Promise<unknown>) => {
    try { await action(); setError(null); return true; }
    catch (e) { setError(message(e)); return false; }
  };
  const checked = (fund: SyncedFund) => {
    const parsed = parseSyncedFund(fund);
    if (!parsed) throw new Error('Fondo non valido.');
    return parsed;
  };
  return {
    funds, movements, error, ready: fundsReady && movementsReady,
    // Schedule of the general monthly budget (empty = none); `budgetReady` is false until its listener has answered.
    budgets: budget?.budgets ?? noBudget, budgetReady, budgetSync,
    saveBudget: (budgets: readonly BudgetChange[]) => mutate(() => backend.saveBudget(budgets, budget)),
    sync: { fromCache: fundSync.fromCache || movementSync.fromCache, pending: fundSync.pending || movementSync.pending },
    clearError: () => setError(null),
    createFund: (data: FundData) => mutate(() => backend.saveFund(crypto.randomUUID(), data)),
    updateFund: (expected: SyncedFund, data: FundData) => mutate(() => backend.saveFund(expected.id, data, checked(expected))),
    removeFund: (expected: SyncedFund) => mutate(() => backend.removeFund(checked(expected))),
    // The ID comes from the dialog (one per opening), so a repeated press never adds a second movement.
    createMovement: (id: string, data: MovementData) => mutate(() => backend.createMovement(id, data)),
    removeMovement: (expected: SyncedMovement) => mutate(() => {
      const parsed = parseSyncedMovement(expected);
      if (!parsed) throw new Error('Movimento non valido.');
      return backend.removeMovement(parsed);
    }),
    assignFund: (records: readonly SyncedExpense[], fundId: string) => mutate(() => backend.assignFund(records, fundId)),
  };
}
export type RemoteFunds = ReturnType<typeof useRemoteFunds>;
