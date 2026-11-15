import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyncedTemplate } from '../../domain/firestore';
import { sortTemplates, type TemplateData } from '../../domain/template';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';

// Templates of «Nuova spesa», from one listener. Writes are plain, queued by the store (shown at once, errors reported here).
export function useRemoteTemplates(backend: DataStore) {
  const [records, setRecords] = useState<SyncedTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchTemplates((s) => {
    setRecords(s.records); setReady(true); setSync({ fromCache: s.fromCache, pending: s.pending });
  }, (e) => { setRecords([]); setReady(false); setError(message(e)); }), [backend]);
  useEffect(() => backend.onQueuedWriteError((reason) => setError(message(reason))), [backend]);
  const templates = useMemo(() => sortTemplates(records), [records]);
  // Synchronous validation errors (the form validates first, so these are the last guard).
  const run = useCallback((action: () => void) => {
    try { action(); setError(null); return true; } catch (e) { setError(message(e)); return false; }
  }, []);
  const create = useCallback((data: TemplateData) => run(() => backend.saveTemplate(crypto.randomUUID(), data)), [backend, run]);
  const update = useCallback((template: SyncedTemplate, data: TemplateData) => run(() => backend.saveTemplate(template.id, data, template)), [backend, run]);
  const remove = useCallback((template: SyncedTemplate) => run(() => backend.removeTemplate(template)), [backend, run]);
  return { templates, ready, error, sync, create, update, remove, clearError: () => setError(null) };
}
export type RemoteTemplates = ReturnType<typeof useRemoteTemplates>;
