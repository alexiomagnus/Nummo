import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyncedTemplate } from '../../domain/firestore';
import { sortTemplates, type TemplateData } from '../../domain/template';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
import { actionCleared, actionFailed, listenerFailed, listenerRecovered, noDataErrors, visibleError } from '../workspace/dataErrors';

// Templates of «Nuova spesa», from one listener. Writes are plain, queued by the store (shown at once, errors reported here).
// A failed listener stays reported until it delivers again (dataErrors.ts); like the lists, a queued write's error arrives
// with the snapshot that rolls it back, so a snapshot does not clear an operation message.
export function useRemoteTemplates(backend: DataStore) {
  const [records, setRecords] = useState<SyncedTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState(noDataErrors);
  const [sync, setSync] = useState({ fromCache: true, pending: false });
  useEffect(() => backend.watchTemplates((s) => {
    setRecords(s.records); setReady(true); setSync({ fromCache: s.fromCache, pending: s.pending });
    setErrors((old) => listenerRecovered(old, 'templates'));
  }, (e) => { setRecords([]); setReady(false); setErrors((old) => listenerFailed(old, 'templates', message(e))); }), [backend]);
  useEffect(() => backend.onQueuedWriteError((reason) => setErrors((old) => actionFailed(old, message(reason)))), [backend]);
  const templates = useMemo(() => sortTemplates(records), [records]);
  // Synchronous validation errors (the form validates first, so these are the last guard).
  const run = useCallback((action: () => void) => {
    try { action(); setErrors(actionCleared); return true; } catch (e) { setErrors((old) => actionFailed(old, message(e))); return false; }
  }, []);
  const create = useCallback((data: TemplateData) => run(() => backend.saveTemplate(crypto.randomUUID(), data)), [backend, run]);
  const update = useCallback((template: SyncedTemplate, data: TemplateData) => run(() => backend.saveTemplate(template.id, data, template)), [backend, run]);
  const remove = useCallback((template: SyncedTemplate) => run(() => backend.removeTemplate(template)), [backend, run]);
  // «Elimina tutti i template» (22 November): the same deletion for each, queued by the SDK; stops at the first refusal and
  // returns how many were removed.
  const removeAll = useCallback((some: readonly SyncedTemplate[]) => {
    let removed = 0;
    for (const template of some) { if (!run(() => backend.removeTemplate(template))) break; removed++; }
    return removed;
  }, [backend, run]);
  return { templates, ready, error: visibleError(errors), sync, create, update, remove, removeAll, clearError: () => setErrors(actionCleared) };
}
export type RemoteTemplates = ReturnType<typeof useRemoteTemplates>;
