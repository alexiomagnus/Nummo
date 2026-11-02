// Expo inlines literal public environment accesses at build time. No credentials here.
export type BackendMode = 'emulator' | 'firebase';
const requested = process.env.EXPO_PUBLIC_NUMMO_BACKEND;
export const backendMode: BackendMode = requested === 'emulator' ? 'emulator' : 'firebase';
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
export const missingFirebaseConfig: readonly string[] = [
  ...(backendMode === 'firebase' ? Object.entries(realConfig).filter(([, value]) => !value?.trim()).map(([key]) => key) : []),
  ...(requested && !['firebase', 'emulator'].includes(requested) ? ['EXPO_PUBLIC_NUMMO_BACKEND non valido'] : []),
  ...(emulatorValue && !parseEndpoint(emulatorValue) ? ['EXPO_PUBLIC_FIRESTORE_EMULATOR non valido'] : []),
  // Old local-backend configuration must never silently start writing to the real cloud.
  ...(backendMode === 'firebase' && process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR && !emulatorValue
    ? ['Sostituisci EXPO_PUBLIC_FUNCTIONS_EMULATOR con EXPO_PUBLIC_FIRESTORE_EMULATOR'] : []),
];
export const firebaseWebConfig: FirebaseWebConfig = backendMode === 'emulator'
  ? { apiKey: 'demo-key', authDomain: 'demo-nummo.firebaseapp.com', projectId: 'demo-nummo', appId: 'demo-app' }
  : { apiKey: realConfig.apiKey ?? '', authDomain: realConfig.authDomain ?? '', projectId: realConfig.projectId ?? '', appId: realConfig.appId ?? '' };
export const authEmulator: Endpoint | null = backendMode === 'emulator' ? (parseEndpoint(authEmulatorValue) ?? { host: '127.0.0.1', port: 9099 }) : null;
export const firestoreEmulator: Endpoint | null = backendMode === 'emulator' ? (parseEndpoint(emulatorValue) ?? { host: '127.0.0.1', port: 8180 }) : parseEndpoint(emulatorValue);
export const persistentCache = process.env.EXPO_PUBLIC_FIRESTORE_CACHE === 'persistent';
