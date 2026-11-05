// Expo inlines literal public environment accesses at build time. No credentials here.
// emulator = everything local (demo-nummo); hybrid = real Google sign-in + Firestore emulator;
// cloud = real Auth + real Firestore. No default: a missing/unknown mode is a configuration error.
export type BackendMode = 'emulator' | 'hybrid' | 'cloud';
const requested = process.env.EXPO_PUBLIC_NUMMO_BACKEND;
export const backendMode: BackendMode = requested === 'emulator' || requested === 'hybrid' ? requested : 'cloud';
export type FirebaseWebConfig = Readonly<{ apiKey: string; authDomain: string; projectId: string; appId: string }>;
export type Endpoint = Readonly<{ host: string; port: number }>;
export function parseEndpoint(value: string | undefined): Endpoint | null {
  const match = /^([\w.-]+):(\d{1,5})$/.exec(value ?? '');
  const port = Number(match?.[2]);
  return match && port > 0 && port <= 65535 ? { host: match[1]!, port } : null;
}
const realConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const emulatorValue = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR;
const authEmulatorValue = process.env.EXPO_PUBLIC_AUTH_EMULATOR;
const functionsEmulatorValue = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR;
const modeProblems = (): string[] => {
  if (!requested) return ['EXPO_PUBLIC_NUMMO_BACKEND mancante (emulator | hybrid | cloud)'];
  if (requested !== 'emulator' && requested !== 'hybrid' && requested !== 'cloud') {
    return [requested === 'firebase'
      ? 'EXPO_PUBLIC_NUMMO_BACKEND=firebase non è più valido: usa hybrid (Firestore locale) o cloud'
      : 'EXPO_PUBLIC_NUMMO_BACKEND non valido (emulator | hybrid | cloud)'];
  }
  const problems: string[] = [];
  if (backendMode !== 'emulator') {
    problems.push(...Object.entries(realConfig).filter(([, value]) => !value?.trim()).map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`));
    // Old local-backend configuration must never silently start writing to the real cloud.
    if (functionsEmulatorValue) problems.push('Rimuovi EXPO_PUBLIC_FUNCTIONS_EMULATOR (backend Functions non più supportato)');
    if (authEmulatorValue) problems.push('EXPO_PUBLIC_AUTH_EMULATOR è ammesso solo con emulator');
  }
  if (backendMode === 'hybrid' && !parseEndpoint(emulatorValue)) problems.push('EXPO_PUBLIC_FIRESTORE_EMULATOR mancante o non valido (host:porta) per hybrid');
  if (backendMode === 'cloud' && emulatorValue) problems.push('EXPO_PUBLIC_FIRESTORE_EMULATOR non è ammesso con cloud');
  if (backendMode === 'emulator' && emulatorValue && !parseEndpoint(emulatorValue)) problems.push('EXPO_PUBLIC_FIRESTORE_EMULATOR non valido');
  return problems;
};
export const missingFirebaseConfig: readonly string[] = modeProblems();
export const firebaseWebConfig: FirebaseWebConfig = backendMode === 'emulator'
  ? { apiKey: 'demo-key', authDomain: 'demo-nummo.firebaseapp.com', projectId: 'demo-nummo', appId: 'demo-app' }
  : { apiKey: realConfig.apiKey ?? '', authDomain: realConfig.authDomain ?? '', projectId: realConfig.projectId ?? '', appId: realConfig.appId ?? '' };
export const authEmulator: Endpoint | null = backendMode === 'emulator' ? (parseEndpoint(authEmulatorValue) ?? { host: '127.0.0.1', port: 9099 }) : null;
export const firestoreEmulator: Endpoint | null = backendMode === 'emulator'
  ? (parseEndpoint(emulatorValue) ?? { host: '127.0.0.1', port: 8180 })
  : backendMode === 'hybrid' ? parseEndpoint(emulatorValue) : null;
export const persistentCache = process.env.EXPO_PUBLIC_FIRESTORE_CACHE === 'persistent';
