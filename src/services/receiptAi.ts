// Sends one receipt picture to the AI provider chosen by the user, with the user's own key, straight from the browser
// (no proxy, no Nummo server). Nothing is logged or stored: not the picture, not the key, not the answer.
import { aiErrors, buildAiRequest, buildModelsRequest, readAiAnswer, readAiModels, type AiImage, type AiProvider, type AiSettings } from '../domain/receiptAi.ts';

type Fetcher = (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;

// The model's raw text answer (to be validated by `parseAiReceipt`). Rejects with a source-language message, or with
// an AbortError when `signal` stops the request.
export async function analyzeReceipt(settings: AiSettings, apiKey: string, image: AiImage, prompt: string, signal: AbortSignal,
  fetcher: Fetcher = (url, init) => fetch(url, init), timeoutMs = 60_000): Promise<string> {
  const request = buildAiRequest(settings, apiKey, image, prompt);
  const controller = new AbortController();
  let timedOut = false;
  const stop = () => controller.abort();
  if (signal.aborted) controller.abort(); else signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    let response: Pick<Response, 'status' | 'json'>;
    try {
      response = await fetcher(request.url, { ...request.init, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      throw new Error(timedOut ? aiErrors.timeout : aiErrors.network);
    }
    let body: unknown = null;
    try { body = await response.json(); } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (timedOut) throw new Error(aiErrors.timeout);
    }
    return readAiAnswer(settings.provider as AiProvider, response.status, body);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
  }
}

// The models the provider offers to this key (Settings, «Modello»); [] when there is nothing to ask yet. Only the key
// travels, to the provider it belongs to. A browser reports a refused cross-origin call (CORS) like a network failure.
export async function listAiModels(settings: AiSettings, apiKey: string, signal: AbortSignal,
  fetcher: Fetcher = (url, init) => fetch(url, init), timeoutMs = 15_000): Promise<string[]> {
  const request = buildModelsRequest(settings, apiKey);
  if (!request) return [];
  const controller = new AbortController();
  let timedOut = false;
  const stop = () => controller.abort();
  if (signal.aborted) controller.abort(); else signal.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    let response: Pick<Response, 'status' | 'json'>;
    try {
      response = await fetcher(request.url, { ...request.init, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      throw new Error(timedOut ? aiErrors.timeout : aiErrors.network);
    }
    let body: unknown = null;
    try { body = await response.json(); } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (timedOut) throw new Error(aiErrors.timeout);
    }
    return readAiModels(settings.provider as AiProvider, response.status, body);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
  }
}
