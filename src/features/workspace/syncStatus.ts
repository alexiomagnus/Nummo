// Pure description of the Firestore sync state shown in the top app bar.
// «synced» is only reported when everything is confirmed by the server.
export type SyncKind = 'loading' | 'synced' | 'pending' | 'cached' | 'offline' | 'error';
export type SyncInput = { ready: boolean; online: boolean; pending: boolean; cached: boolean; error: string | null };
export type SyncDescription = { kind: SyncKind; label: string; detail: string };

// An initial empty cache is not proof of an empty archive. Existing cached categories
// can be shown immediately; only a server snapshot can establish that none exist.
export function hasUsableCategorySnapshot(state: { ready: boolean; categories: readonly unknown[]; sync: { fromCache: boolean } }): boolean {
  return state.ready && (state.categories.length > 0 || !state.sync.fromCache);
}

export function describeSync({ ready, online, pending, cached, error }: SyncInput): SyncDescription {
  if (error) return { kind: 'error', label: 'Problema di sincronizzazione', detail: error };
  if (pending) return { kind: 'pending', label: 'Sincronizzazione…', detail: 'Alcune modifiche attendono la conferma di Firestore.' };
  if (!online) return { kind: 'offline', label: 'Offline', detail: 'Sei offline: i dati sono letti dalla cache e le nuove spese restano in coda.' };
  if (!ready) return { kind: 'loading', label: 'Caricamento…', detail: 'Lettura dei dati da Firestore in corso.' };
  if (cached) return { kind: 'cached', label: 'Dati dalla cache', detail: 'Dati dalla cache: la connessione al server non è ancora verificata.' };
  return { kind: 'synced', label: 'Sincronizzato', detail: 'Tutti i dati sono confermati da Firestore.' };
}
