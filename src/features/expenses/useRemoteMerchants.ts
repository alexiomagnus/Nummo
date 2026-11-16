import { useEffect, useState } from 'react';
import type { Merchant } from '../../domain/merchant';
import type { DataStore } from '../../services/dataStore';
import { message } from './useRemoteExpenses';

// Saved merchants (read only: they are created with the expense that first uses them). The form works without them too:
// a merchant not loaded yet is simply sent as new, and its name key makes it the same document.
export function useRemoteMerchants(backend: DataStore) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchMerchants((s) => {
    setMerchants(s.records); setReady(true); setError(null);
    setSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setMerchants([]); setReady(false); setError(message(e)); }), [backend]);
  return { merchants, ready, error, sync };
}
