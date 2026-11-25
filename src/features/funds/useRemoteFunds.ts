import { useEffect, useState } from 'react';
import type { SyncedExpense, SyncedFund, SyncedMovement } from '../../domain/firestore';
import { parseSyncedFund } from '../../domain/firestore';
import type { FundData, MovementData } from '../../domain/funds';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
import { actionCleared, actionFailed, listenerFailed, noDataErrors, snapshotReceived, visibleError } from '../workspace/dataErrors';

// Funds and movements of the account, from two listeners (movements of earlier versions still count in fundInUse). Every
// mutation is a server transaction: it reports success only
// after the server has confirmed it (offline it fails with a clear message instead of queuing silently).
export function useRemoteFunds(backend: DataStore) {
  const [funds, setFunds] = useState<SyncedFund[]>([]);
  const [movements, setMovements] = useState<SyncedMovement[]>([]);
  const [fundsReady, setFundsReady] = useState(false);
  const [movementsReady, setMovementsReady] = useState(false);
  // Each listener's failure stays until that listener recovers (see dataErrors.ts).
  const [errors, setErrors] = useState(noDataErrors);
  const [fundSync, setFundSync] = useState({ fromCache: true, pending: false });
  const [movementSync, setMovementSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchFunds((s) => {
    setFunds(s.records); setFundsReady(true); setErrors((old) => snapshotReceived(old, 'funds')); setFundSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setFunds([]); setFundsReady(false); setErrors((old) => listenerFailed(old, 'funds', message(e))); }), [backend]);
  useEffect(() => backend.watchMovements((s) => {
    setMovements(s.records); setMovementsReady(true); setErrors((old) => snapshotReceived(old, 'movements')); setMovementSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setMovements([]); setMovementsReady(false); setErrors((old) => listenerFailed(old, 'movements', message(e))); }), [backend]);
  const mutate = async (action: () => Promise<unknown>) => {
    try { await action(); setErrors(actionCleared); return true; }
    catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
  };
  const checked = (fund: SyncedFund) => {
    const parsed = parseSyncedFund(fund);
    if (!parsed) throw new Error('Fondo non valido.');
    return parsed;
  };
  return {
    funds, movements, error: visibleError(errors), ready: fundsReady && movementsReady,
    // The funds alone, for the new-expense form (the fund field), which uses no movement. At start an empty collection is
    // never delivered from the device's cache, only by the server: most archives have no movements, and waiting for them
    // kept the form covered until the server answered on every start (25 November).
    fundsReady,
    sync: { fromCache: fundSync.fromCache || movementSync.fromCache, pending: fundSync.pending || movementSync.pending },
    clearError: () => setErrors(actionCleared),
    createFund: (data: FundData) => mutate(() => backend.saveFund(crypto.randomUUID(), data)),
    updateFund: (expected: SyncedFund, data: FundData) => mutate(() => backend.saveFund(expected.id, data, checked(expected))),
    removeFund: (expected: SyncedFund) => mutate(() => backend.removeFund(checked(expected))),
    // The ID comes from the dialog (one per opening), so a repeated press never adds a second movement.
    createMovement: (id: string, data: MovementData) => mutate(() => backend.createMovement(id, data)),
    assignFund: (records: readonly SyncedExpense[], fundId: string) => mutate(() => backend.assignFund(records, fundId)),
  };
}
export type RemoteFunds = ReturnType<typeof useRemoteFunds>;
