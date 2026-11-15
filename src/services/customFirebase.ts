// Advanced mode with a Firebase project connected from the app (BYOF without rebuilding): the user pastes the web
// configuration of their own project, saved in this browser only. It is public configuration, never a credential: the
// data stay protected by the project's Google sign-in, its Rules and `config/owner`. Pure module (no SDK), so that the
// parser and the storage can be tested without a browser.
import type { FirebaseWebConfig } from './backendConfig.ts';

export const customFirebaseKey = 'nummo.firebaseConfig.v1';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
// `cloud` accepts only real projects; the local demo (emulators) only `demo-` projects, which never reach the cloud.
export type CustomFirebaseTarget = 'cloud' | 'demo';

const fields = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const patterns: Readonly<Record<(typeof fields)[number], RegExp>> = {
  apiKey: /^[A-Za-z0-9_-]{20,100}$/,
  authDomain: /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/,
  projectId: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
  appId: /^1:\d{1,20}:web:[0-9a-f]{1,64}$/,
};

// The four values as they appear in what the Firebase console offers to copy: the `firebaseConfig` snippet (JavaScript
// object, quoted or unquoted keys, single or double quotes) or the same object in JSON. Other keys are ignored.
const valueOf = (text: string, key: string): string | null => {
  const match = new RegExp(`["']?\\b${key}\\b["']?\\s*:\\s*(["'])([^"'\\n]*)\\1`).exec(text);
  return match ? match[2]!.trim() : null;
};

// `error` is a source-language message, translated at the UI; `{p0}` stands for `fields` (names of the configuration keys).
export type ParsedFirebaseConfig = { config: FirebaseWebConfig } | { error: string; fields?: string };

export function parseFirebaseConfig(text: string, target: CustomFirebaseTarget): ParsedFirebaseConfig {
  if (text.length > 4000) return { error: 'Testo troppo lungo: incolla solo la configurazione del progetto.' };
  const values = Object.fromEntries(fields.map((key) => [key, valueOf(text, key)])) as Record<(typeof fields)[number], string | null>;
  const missing = fields.filter((key) => !values[key]);
  if (missing.length === fields.length) return { error: 'Configurazione non riconosciuta: incolla il blocco firebaseConfig del tuo progetto.' };
  if (missing.length > 0) return { error: 'Mancano nella configurazione: {p0}.', fields: missing.join(', ') };
  return checkFirebaseConfig(values as FirebaseWebConfig, target);
}

export function checkFirebaseConfig(config: FirebaseWebConfig, target: CustomFirebaseTarget): ParsedFirebaseConfig {
  const invalid = fields.filter((key) => typeof config[key] !== 'string' || !patterns[key].test(config[key]));
  if (invalid.length > 0) return { error: 'Valori non validi nella configurazione: {p0}.', fields: invalid.join(', ') };
  const demo = config.projectId.startsWith('demo-');
  if (target === 'cloud' && demo) return { error: 'I progetti demo- funzionano solo con gli emulatori locali.' };
  if (target === 'demo' && !demo) return { error: 'Nella demo locale si possono collegare solo progetti demo-.' };
  return { config: { apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId } };
}

// A saved value that is not exactly a valid configuration for this build is ignored (the site's project is used).
export function readCustomFirebase(target: CustomFirebaseTarget, storage: Storage = localStorage): FirebaseWebConfig | null {
  try {
    const raw = storage.getItem(customFirebaseKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => !(fields as readonly string[]).includes(key))) return null;
    const parsed = checkFirebaseConfig(record as unknown as FirebaseWebConfig, target);
    return 'config' in parsed ? parsed.config : null;
  } catch { return null; }
}

export function writeCustomFirebase(config: FirebaseWebConfig | null, storage: Storage = localStorage): boolean {
  try {
    if (config) storage.setItem(customFirebaseKey, JSON.stringify({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId }));
    else storage.removeItem(customFirebaseKey);
    return true;
  } catch { return false; }
}

export const sameFirebaseProject = (a: FirebaseWebConfig, b: FirebaseWebConfig): boolean =>
  a.projectId === b.projectId && a.apiKey === b.apiKey && a.appId === b.appId && a.authDomain === b.authDomain;
