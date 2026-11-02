import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider, initializeAuth,
  onAuthStateChanged, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache,
  persistentMultipleTabManager, waitForPendingWrites, type Firestore,
} from 'firebase/firestore';
import { authEmulator, firebaseWebConfig, firestoreEmulator, persistentCache } from './backendConfig';

let services: { auth: Auth; db: Firestore } | undefined;
function getServices() {
  if (services) return services;
  const app = initializeApp(firebaseWebConfig);
  const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const db = initializeFirestore(app, {
    localCache: persistentCache && typeof indexedDB !== 'undefined'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache(),
  });
  if (authEmulator) connectAuthEmulator(auth, `http://${authEmulator.host}:${authEmulator.port}`, { disableWarnings: true });
  if (firestoreEmulator) connectFirestoreEmulator(db, firestoreEmulator.host, firestoreEmulator.port);
  services = { auth, db };
  return services;
}
export const getDatabase = (): Firestore => getServices().db;
export type SessionUser = Readonly<{ uid: string; email: string | null }>;
const toSessionUser = (user: User | null): SessionUser | null => user && { uid: user.uid, email: user.email };
export function watchSession(listener: (user: SessionUser | null) => void): () => void {
  return onAuthStateChanged(getServices().auth, (user) => listener(toSessionUser(user)));
}
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getServices().auth, new GoogleAuthProvider());
}
export async function signOutUser(): Promise<void> {
  // Do not strand acknowledged-in-the-UI operations under a different account.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      waitForPendingWrites(getDatabase()),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Scritture in attesa: riconnettiti prima di uscire.')), 5000); }),
    ]);
    await signOut(getServices().auth);
  } finally { clearTimeout(timer); }
}
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown';
}
