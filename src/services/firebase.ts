import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider, initializeAuth,
  onAuthStateChanged, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache,
  persistentMultipleTabManager, waitForPendingWrites, type Firestore,
} from 'firebase/firestore';
import { activeFirebaseConfig, authEmulator, firestoreEmulator, persistentCache } from './backendConfig';
import { readSessionHint } from './sessionHint';
import { profilePhotoURL } from './sessionProfile';

let services: { auth: Auth; db: Firestore } | undefined;
function getServices() {
  if (services) return services;
  const app = initializeApp(activeFirebaseConfig);
  // On mobile browsers a popup resolver given here is initialised eagerly (Google's gapi script and an iframe) and the
  // saved session is restored only afterwards. Restoring needs none of it, so when the last visit ended signed in the
  // resolver is only supplied at sign-in (below), where the SDK initialises it on demand.
  const auth = initializeAuth(app, readSessionHint() === null
    ? { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver }
    : { persistence: browserLocalPersistence });
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
// Starts the SDK at import time: restoring the saved session waits for a network round trip, which then overlaps
// the first render instead of starting after it. Initialisation errors are reported by useSession, as before.
export function warmUpServices(): void {
  try { getServices(); } catch { /* reported when the session is watched */ }
}
export type SessionUser = Readonly<{ uid: string; email: string | null; photoURL: string | null }>;
const toSessionUser = (user: User | null): SessionUser | null => user && {
  uid: user.uid, email: user.email,
  photoURL: profilePhotoURL(user),
};
export function watchSession(listener: (user: SessionUser | null) => void): () => void {
  return onAuthStateChanged(getServices().auth, (user) => listener(toSessionUser(user)));
}
export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getServices().auth, new GoogleAuthProvider(), browserPopupRedirectResolver);
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
