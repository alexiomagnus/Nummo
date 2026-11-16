// Models offered by the chosen AI provider, asked shortly after the key (or the address) stops changing. Kept in the
// state of the Settings card only: nothing is saved, and a failure never blocks writing the model by hand.
import { useEffect, useState } from 'react';
import { buildModelsRequest, type AiSettings } from '../../domain/receiptAi';
import { listAiModels } from '../../services/receiptAi';

export type AiModels = Readonly<{ status: 'idle' | 'loading' | 'ready' | 'error'; models: readonly string[]; error: string }>;
const idle: AiModels = { status: 'idle', models: [], error: '' };
const debounceMs = 500;

export function useAiModels(settings: AiSettings, apiKey: string): AiModels & { retry: () => void } {
  const [state, setState] = useState<AiModels>(idle);
  const [attempt, setAttempt] = useState(0);
  const { provider, endpoint } = settings;
  useEffect(() => {
    const target: AiSettings = { provider, endpoint, model: '', consent: '', scan: 'ocr' };
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
  }, [provider, endpoint, apiKey, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
