// Chosen at build time from EXPO_PUBLIC_* variables (inlined by Expo; never put secrets here).
// - unset:     browser-only, no login.
// - emulator:  everything emulated (project demo-nummo, fake Google accounts).
// - firebase:  real Firebase Authentication from EXPO_PUBLIC_FIREBASE_*; Cloud Functions
//              on EXPO_PUBLIC_FUNCTIONS_EMULATOR (host:port) when set, otherwise deployed ones.
export type BackendMode = 'local' | 'emulator' | 'firebase';

const requested = process.env.EXPO_PUBLIC_NUMMO_BACKEND;
export const backendMode: BackendMode = requested === 'emulator' || requested === 'firebase' ? requested : 'local';

export type FirebaseWebConfig = Readonly<{ apiKey: string; authDomain: string; projectId: string; appId: string }>;

const demoConfig: FirebaseWebConfig = {
  apiKey: 'demo-key', authDomain: 'demo-nummo.firebaseapp.com', projectId: 'demo-nummo', appId: 'demo-app',
};

// Expo only inlines literal `process.env.EXPO_PUBLIC_…` accesses.
const realConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const missingFirebaseConfig: readonly string[] = backendMode === 'firebase'
  ? Object.entries(realConfig).filter(([, value]) => !value).map(([key]) => key) : [];

// Real and emulated projects never mix: the emulator mode ignores EXPO_PUBLIC_FIREBASE_*.
export const firebaseWebConfig: FirebaseWebConfig = backendMode === 'emulator' ? demoConfig : {
  apiKey: realConfig.apiKey ?? '', authDomain: realConfig.authDomain ?? '',
  projectId: realConfig.projectId ?? '', appId: realConfig.appId ?? '',
};

export type Endpoint = Readonly<{ host: string; port: number }>;

export function parseEndpoint(value: string | undefined): Endpoint | null {
  const match = /^([\w.-]+):(\d{1,5})$/.exec(value ?? '');
  return match ? { host: match[1]!, port: Number(match[2]) } : null;
}

export const authEmulator: Endpoint | null = backendMode === 'emulator' ? { host: '127.0.0.1', port: 9099 } : null;
export const functionsEmulator: Endpoint | null = backendMode === 'emulator'
  ? { host: '127.0.0.1', port: 5001 }
  : parseEndpoint(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR);

// Must match setGlobalOptions in functions/src/index.ts.
export const functionsRegion = 'europe-west1';
