// Models offered by the chosen AI provider, asked shortly after the key stops changing. Kept in the state of the
// Settings card only: nothing is saved. An empty key (also while the scan is off) asks nothing.
import { useEffect, useState } from 'react';
import { buildModelsRequest, type AiSettings } from '../../domain/receiptAi';
import { listAiModels } from '../../services/receiptAi';

export type AiModels = Readonly<{ status: 'idle' | 'loading' | 'ready' | 'error'; models: readonly string[]; error: string }>;
const idle: AiModels = { status: 'idle', models: [], error: '' };
const debounceMs = 500;

export function useAiModels(settings: AiSettings, apiKey: string): AiModels & { retry: () => void } {
  const [state, setState] = useState<AiModels>(idle);
  const [attempt, setAttempt] = useState(0);
  const { provider } = settings;
  useEffect(() => {
    const target: AiSettings = { enabled: true, provider, model: '', consent: '' };
    if (!buildModelsRequest(target, apiKey)) { setState(idle); return; }
    const controller = new AbortController();
    setState({ status: 'loading', models: [], error: '' });
    const timer = setTimeout(() => {
      listAiModels(target, apiKey, controller.signal).then(
        (models) => { if (!controller.signal.aborted) setState({ status: 'ready', models, error: '' }); },
        (reason: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', models: [], error: reason instanceof Error ? reason.message : '' }); },
      );
    }, debounceMs);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [provider, apiKey, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
