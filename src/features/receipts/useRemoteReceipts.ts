import { useCallback, useEffect, useMemo, useState } from 'react';
import { sortScannedReceipts, type ScannedReceipt } from '../../domain/scannedReceipt';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
import { actionCleared, actionFailed, listenerFailed, listenerRecovered, noDataErrors, visibleError } from '../workspace/dataErrors';

// Scanned receipts («Lista scontrini», 26 November), from one listener, newest first. They are written only with their
// expense; here they are only read, or removed one by one (a plain delete queued by the store, like a template).
export function useRemoteReceipts(backend: DataStore) {
  const [records, setRecords] = useState<ScannedReceipt[]>([]);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState(noDataErrors);
  useEffect(() => backend.watchReceipts((s) => {
    setRecords(s.records); setReady(true);
    setErrors((old) => listenerRecovered(old, 'receipts'));
  }, (e) => { setRecords([]); setReady(false); setErrors((old) => listenerFailed(old, 'receipts', message(e))); }), [backend]);
  useEffect(() => backend.onQueuedWriteError((reason) => setErrors((old) => actionFailed(old, message(reason)))), [backend]);
  const receipts = useMemo(() => sortScannedReceipts(records), [records]);
  const remove = useCallback((receipt: ScannedReceipt) => {
    try { backend.removeReceipt(receipt); setErrors(actionCleared); return true; } catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
  }, [backend]);
  return { receipts, ready, error: visibleError(errors), remove };
}
export type RemoteReceipts = ReturnType<typeof useRemoteReceipts>;
