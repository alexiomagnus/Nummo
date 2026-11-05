// Pure rules for the three environments (no I/O, no secrets in messages: only variable names).
// emulator = all local · hybrid = real Google sign-in + local Firestore · cloud = all real.
export type Env = Readonly<Record<string, string | undefined>>;

export const FIREBASE_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;
// Chosen by the npm scripts, never by files: a file defining them could silently mix environments.
export const SCRIPT_OWNED_KEYS = [
  'EXPO_PUBLIC_NUMMO_BACKEND', 'EXPO_PUBLIC_FIRESTORE_EMULATOR', 'EXPO_PUBLIC_AUTH_EMULATOR', 'EXPO_PUBLIC_FUNCTIONS_EMULATOR',
] as const;
const CLOUD_ALLOWED = new Set<string>([...FIREBASE_KEYS, 'EXPO_PUBLIC_NUMMO_BACKEND', 'EXPO_PUBLIC_FIRESTORE_CACHE']);
const filled = (value: string | undefined): value is string => typeof value === 'string' && value.trim() !== '';

/** Development env files (`.env`, `.env.local`, …) may carry only the Firebase web config. */
export function devFileProblems(file: string, values: Env): string[] {
  return SCRIPT_OWNED_KEYS.filter((key) => key in values)
    .map((key) => `${file}: rimuovi ${key} (lo imposta lo script npm, un valore nel file lo sovrascriverebbe)`);
}

/** The same variable set to different values in `.env.production.local` and in the shell is ambiguous: refuse it. */
export function conflictProblems(fromFile: Env, fromShell: Env): string[] {
  return Object.keys(fromShell).filter((key) => key in fromFile && fromFile[key] !== fromShell[key])
    .map((key) => `${key} definita con valori diversi in .env.production.local e nella shell`);
}

/** Effective environment of a production build: everything must point to the real project. */
export function cloudEnvProblems(env: Env): string[] {
  const problems: string[] = [];
  if (env.EXPO_PUBLIC_NUMMO_BACKEND !== 'cloud') problems.push('EXPO_PUBLIC_NUMMO_BACKEND deve essere "cloud"');
  for (const key of FIREBASE_KEYS) if (!filled(env[key])) problems.push(`${key} mancante`);
  for (const key of Object.keys(env)) {
    if (key.startsWith('EXPO_PUBLIC_') && !CLOUD_ALLOWED.has(key)) problems.push(`${key} non è ammessa in una build cloud`);
  }
  const project = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '';
  if (project && (project.startsWith('demo-') || /\s/.test(project))) problems.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID non valido per il cloud (demo-* o spazi)');
  const domain = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '';
  if (domain && /^(https?:|localhost|127\.|\[::1\])/.test(domain)) problems.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN deve essere un dominio, senza schema né localhost');
  if (env.EXPO_PUBLIC_FIRESTORE_CACHE !== undefined && !['', 'persistent'].includes(env.EXPO_PUBLIC_FIRESTORE_CACHE)) problems.push('EXPO_PUBLIC_FIRESTORE_CACHE ammette solo "persistent"');
  return problems;
}

/** Patterns that must never appear in a cloud bundle (checked on the output, reported by count only). */
export const BUNDLE_FORBIDDEN: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'endpoint emulatore (host:porta locale)', pattern: /(?:127\.0\.0\.1|localhost|\[::1\]):\d{4,5}/g },
  { label: 'progetto demo-nummo con chiave demo', pattern: /demo-key.{0,80}demo-nummo\.firebaseapp\.com/g },
];
