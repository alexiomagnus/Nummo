// Optional AI analysis of a receipt with the user's own API key (BYOK), pure part: saved settings, the HTTP request for
// each provider and the reading of its answer. The key is never part of the settings: it lives in memory only
// (features/receipts/aiSettings.ts) and reaches this module just to build one request.
import type { Category } from './category.ts';

export const aiProviders = ['openai', 'gemini', 'claude', 'compatible'] as const;
export type AiProvider = (typeof aiProviders)[number];
export const aiProviderLabels: Readonly<Record<AiProvider, string>> = { openai: 'OpenAI', gemini: 'Google Gemini', claude: 'Claude', compatible: 'API compatibile OpenAI' };

// `consent`: the destination (see `aiDestination`) the user agreed to send receipt pictures to; '' = never asked.
// `scan`: the kind of scan the dialog starts with (the AI one only once it is set up); the other stays one tap away.
export type AiSettings = Readonly<{ provider: AiProvider | 'none'; model: string; endpoint: string; consent: string; scan: 'ocr' | 'ai' }>;
export const aiSettingsKey = 'nummo.receiptAi.v1';
export const defaultAiSettings: AiSettings = { provider: 'none', model: '', endpoint: '', consent: '', scan: 'ocr' };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Untrusted input (localStorage can be edited): every field falls back on its own. A saved key, if someone added one
// by hand, is ignored: this object has no field for it.
export function parseAiSettings(raw: string | null): AiSettings {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const o = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const provider = (aiProviders as readonly string[]).includes(o.provider as string) ? (o.provider as AiProvider) : 'none';
  return { provider, model: text(o.model, 100), endpoint: text(o.endpoint, 300), consent: text(o.consent, 400), scan: o.scan === 'ai' ? 'ai' : 'ocr' };
}

const openAiBase = 'https://api.openai.com/v1';
const geminiBase = 'https://generativelanguage.googleapis.com/v1beta';
const claudeBase = 'https://api.anthropic.com/v1';

// Base address of an OpenAI-compatible API: HTTPS only, or plain HTTP for a server on this same device. null = not usable.
export function compatibleBase(endpoint: string): string | null {
  let url: URL;
  try { url = new URL(endpoint.trim()); } catch { return null; }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return (url.origin + url.pathname).replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

// Where the picture goes with these settings (host only for the known providers); also what consent is given for.
export function aiDestination(settings: AiSettings): string {
  if (settings.provider === 'openai') return 'api.openai.com';
  if (settings.provider === 'gemini') return 'generativelanguage.googleapis.com';
  if (settings.provider === 'claude') return 'api.anthropic.com';
  if (settings.provider === 'compatible') { const base = compatibleBase(settings.endpoint); return base ? new URL(base).host : ''; }
  return '';
}

// What is still missing before the AI scan can be offered (source-language message), or null when it is set up.
export function aiSetupProblem(settings: AiSettings): string | null {
  if (settings.provider === 'none') return 'Analisi con AI non attiva.';
  if (!settings.model) return 'Indica il modello da usare.';
  if (settings.provider === 'compatible' && !compatibleBase(settings.endpoint)) return 'Indica un indirizzo HTTPS valido per l’API.';
  return null;
}

export type AiImage = Readonly<{ mime: string; base64: string }>;
export type AiRequest = Readonly<{ url: string; init: { method: 'POST'; headers: Record<string, string>; body: string } }>;

// The instructions. The model must answer with one JSON object and may only choose among the given category names.
export function receiptPrompt(categories: readonly Category[], today: string, ocrText?: string, language: 'Italian' | 'English' = 'Italian'): string {
  const names = categories.map((category) => JSON.stringify(category.label)).join(', ');
  return [
    'You read a photo of a purchase receipt (often Italian) and extract its data. Answer with ONE JSON object and nothing else:',
    '{"merchant": string|null, "description": string|null, "date": "YYYY-MM-DD"|null, "total": string|null, "currency": string|null, "items": string[], "discount_total": string|null, "category": string|null, "uncertain": string[]}',
    '- merchant: the shop name as printed, short, without legal form or address.',
    `- description: what was bought, in one to three words in ${language}, never the shop name: ${language === 'Italian' ? '"Spesa" for groceries, "Pranzo", "Carburante", "Farmaci"' : '"Groceries", "Lunch", "Fuel", "Medicines"'}. null if unclear.`,
    `- date: the purchase date. Italian receipts write day/month/year. Today is ${today}; a later date is a misreading.`,
    '- total: the final amount actually paid, as a decimal string with a dot ("24.75"). Not the subtotal, VAT, discounts, cash handed over or change.',
    '- currency: ISO code of the receipt currency (e.g. "EUR").',
    '- items: names of the purchased products, in order, without prices; [] if unreadable.',
    '- discount_total: sum of the discounts if printed, else null.',
    names ? `- category: the best fitting one of exactly these names, or null if none fits: ${names}. Never invent another name.` : '- category: null.',
    '- uncertain: the names among "merchant", "description", "date", "total", "category" you are not sure about.',
    'Use null for anything missing or unreadable. Never guess or invent a value. If the picture is not a receipt, answer with all nulls.',
    ...(ocrText ? ['Text read from the same picture by an OCR, possibly with errors (the picture prevails):', ocrText.slice(0, 4000)] : []),
  ].join('\n');
}

// One request per scan. Throws (source-language message) only when the settings are incomplete.
export function buildAiRequest(settings: AiSettings, apiKey: string, image: AiImage, prompt: string): AiRequest {
  const problem = aiSetupProblem(settings);
  if (problem) throw new Error(problem);
  if (!apiKey.trim()) throw new Error('Inserisci la chiave API.');
  const post = (url: string, headers: Record<string, string>, body: unknown): AiRequest =>
    ({ url, init: { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) } });
  if (settings.provider === 'gemini') {
    return post(`${geminiBase}/models/${encodeURIComponent(settings.model)}:generateContent`, { 'x-goog-api-key': apiKey.trim() }, {
      contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: image.mime, data: image.base64 } }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
  }
  if (settings.provider === 'claude') {
    // Raw Messages API call (the project adds no SDK for an optional feature). The last header is what Anthropic
    // requires for a request sent straight from a browser with the user's own key. No `thinking` or sampling
    // parameter: current models think adaptively by default and reject the others; `max_tokens` leaves room for it.
    return post(`${claudeBase}/messages`, { 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, {
      model: settings.model, max_tokens: 16000,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } }, { type: 'text', text: prompt }] }],
    });
  }
  const base = settings.provider === 'openai' ? openAiBase : compatibleBase(settings.endpoint)!;
  return post(`${base}/chat/completions`, { Authorization: `Bearer ${apiKey.trim()}` }, {
    model: settings.model,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } }] }],
    response_format: { type: 'json_object' },
  });
}

export const aiErrors = {
  key: 'Chiave API non valida o senza permessi.',
  limit: 'Limite di utilizzo dell’API raggiunto: riprova più tardi.',
  model: 'Modello o indirizzo non trovato: controlla le impostazioni dell’AI.',
  request: 'Il servizio AI ha rifiutato la richiesta: controlla che il modello accetti immagini.',
  server: 'Il servizio AI non è disponibile in questo momento.',
  timeout: 'Il servizio AI non ha risposto in tempo.',
  network: 'Servizio AI non raggiungibile: controlla la connessione.',
  empty: 'La risposta dell’AI non è valida.',
  models: 'Elenco dei modelli non disponibile per questo servizio o indirizzo.',
} as const;

// The model's text from a provider answer, or a thrown source-language error. `body` is the parsed JSON of the answer
// (null if it was not JSON). Error texts of the provider are never shown or logged: they may echo the key.
export function readAiAnswer(provider: AiProvider, status: number, body: unknown): string {
  const o = (value: unknown) => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {});
  if (status < 200 || status >= 300) {
    const message = String(o(o(body).error).message ?? '').toLowerCase();
    if (status === 401 || status === 403 || (status === 400 && /api[ _-]?key/.test(message))) throw new Error(aiErrors.key);
    if (status === 429) throw new Error(aiErrors.limit);
    if (status === 404) throw new Error(aiErrors.model);
    if (status >= 500) throw new Error(aiErrors.server);
    throw new Error(aiErrors.request);
  }
  let answer: unknown;
  if (provider === 'claude') {
    // A refusal answers 200 with no usable text: `stop_reason` says so before the content is read.
    const blocks = o(body).stop_reason === 'refusal' ? null : o(body).content;
    answer = Array.isArray(blocks) ? blocks.filter((block) => o(block).type === 'text').map((block) => o(block).text).filter((part) => typeof part === 'string').join('') : undefined;
  } else if (provider === 'gemini') {
    const parts = o(o(Array.isArray(o(body).candidates) ? (o(body).candidates as unknown[])[0] : null).content).parts;
    answer = Array.isArray(parts) ? parts.map((part) => o(part).text).filter((part) => typeof part === 'string').join('') : undefined;
  } else {
    const content = o(o(Array.isArray(o(body).choices) ? (o(body).choices as unknown[])[0] : null).message).content;
    // Some compatible servers answer with content parts instead of one string.
    answer = Array.isArray(content) ? content.map((part) => o(part).text).filter((part) => typeof part === 'string').join('') : content;
  }
  if (typeof answer !== 'string' || !answer.trim()) throw new Error(aiErrors.empty);
  return answer;
}

// ── List of the models offered by a provider (Settings, «Modello») ──────────────────────────────────────────────────
// Asked with the user's key as soon as it is typed: it only says which models exist, no picture leaves the device.

export type AiModelsRequest = Readonly<{ url: string; init: { method: 'GET'; headers: Record<string, string> } }>;
export const aiModelsEmpty = 'Il servizio non ha elencato modelli adatti.';

// What can be asked right now, or null: the known providers need a key, a compatible server (often local) may not.
export function buildModelsRequest(settings: AiSettings, apiKey: string): AiModelsRequest | null {
  const key = apiKey.trim();
  const get = (url: string, headers: Record<string, string>): AiModelsRequest => ({ url, init: { method: 'GET', headers } });
  if (settings.provider === 'compatible') {
    const base = compatibleBase(settings.endpoint);
    return base ? get(`${base}/models`, key ? { Authorization: `Bearer ${key}` } : {}) : null;
  }
  if (settings.provider === 'none' || !key) return null;
  if (settings.provider === 'openai') return get(`${openAiBase}/models`, { Authorization: `Bearer ${key}` });
  // The key travels in a header, never in the address (`?key=`): addresses end up in histories and logs.
  if (settings.provider === 'gemini') return get(`${geminiBase}/models?pageSize=1000`, { 'x-goog-api-key': key });
  return get(`${claudeBase}/models?limit=1000`, { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
}

// OpenAI lists every kind of model together: only the chat families that can read a picture are kept.
const openAiChat = /^(gpt-[4-9]|chatgpt-|o\d)/;
const openAiOther = /embedding|whisper|tts|dall-e|moderation|audio|realtime|transcribe|image|instruct|search|codex/;

// The model names of a provider answer, cleaned, without duplicates, sorted; throws a source-language error.
export function readAiModels(provider: AiProvider, status: number, body: unknown): string[] {
  const o = (value: unknown) => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {});
  if (status < 200 || status >= 300) {
    const message = String(o(o(body).error).message ?? '').toLowerCase();
    if (status === 401 || status === 403 || (status === 400 && /api[ _-]?key/.test(message))) throw new Error(aiErrors.key);
    if (status === 429) throw new Error(aiErrors.limit);
    if (status === 404) throw new Error(aiErrors.models);
    if (status >= 500) throw new Error(aiErrors.server);
    throw new Error(aiErrors.models);
  }
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  let names: unknown[];
  if (provider === 'gemini') {
    names = list(o(body).models).filter((model) => list(o(model).supportedGenerationMethods).includes('generateContent'))
      .map((model) => (typeof o(model).name === 'string' ? (o(model).name as string).replace(/^models\//, '') : null));
  } else {
    // Compatible servers answer like OpenAI (`data`), a few with `models` or a bare array.
    const rows = Array.isArray(body) ? body : list(o(body).data).length ? list(o(body).data) : list(o(body).models);
    names = rows.map((model) => (typeof model === 'string' ? model : o(model).id ?? o(model).name));
    if (provider === 'openai') names = names.filter((name) => typeof name === 'string' && openAiChat.test(name) && !openAiOther.test(name));
  }
  const clean = names.filter((name): name is string => typeof name === 'string').map((name) => name.trim()).filter((name) => name !== '' && name.length <= 100);
  const unique = [...new Set(clean)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (unique.length === 0) throw new Error(aiModelsEmpty);
  return unique;
}

// Small, cheap models that read pictures well, best first: proposed when the user has not chosen one yet.
const recommendedModels: Readonly<Record<AiProvider, readonly string[]>> = {
  openai: ['gpt-5-mini', 'gpt-4o-mini'],
  gemini: ['gemini-2.5-flash', 'gemini-3.5-flash-lite'],
  claude: ['claude-haiku-4-5', 'claude-sonnet-4-6'],
  compatible: [],
};

// The first recommended model present in the list: its exact name, else its dated edition («claude-haiku-4-5-20251001»).
export function recommendedModel(provider: AiProvider, models: readonly string[]): string | null {
  for (const name of recommendedModels[provider]) {
    if (models.includes(name)) return name;
    const dated = models.filter((model) => model.startsWith(`${name}-`) && /^[\d-]+$/.test(model.slice(name.length + 1))).sort();
    if (dated.length > 0) return dated[dated.length - 1]!;
  }
  return null;
}

// Models to propose for what is written in the field: all of them while it is empty or already holds one of them
// (the field then works as a plain list), otherwise those containing every typed word.
export function matchModels(models: readonly string[], typed: string): readonly string[] {
  const words = typed.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || models.includes(typed.trim())) return models;
  return models.filter((model) => words.every((word) => model.toLowerCase().includes(word)));
}
