import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider, initializeAuth,
  onAuthStateChanged, signInWithCredential, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence, connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache,
  persistentMultipleTabManager, terminate, waitForPendingWrites, type Firestore,
} from 'firebase/firestore';
import { androidGoogleSignIn, googleSignInOnDevice, type AndroidOutcome } from './androidApp';
import { activeFirebaseConfig, authEmulator, firestoreEmulator, persistentCache } from './backendConfig';
import { readSessionHint } from './sessionHint';
import { profilePhotoURL } from './sessionProfile';

// Nummo's Android app signs in with Google natively (a WebView cannot show Google's sign-in page), only for the project
// it is registered with; everywhere else the popup, as always.
const appSignIn = () => androidGoogleSignIn(activeFirebaseConfig.projectId);

let services: { auth: Auth; db: Firestore; persistent: boolean } | undefined;
function getServices() {
  if (services) return services;
  const app = initializeApp(activeFirebaseConfig);
  // On mobile browsers a popup resolver given here is initialised eagerly (Google's gapi script and an iframe) and the
  // saved session is restored only afterwards. Restoring needs none of it, so when the last visit ended signed in the
  // resolver is only supplied at sign-in (below), where the SDK initialises it on demand.
  // The app never uses the popup: no resolver (and none of its Google scripts and frames) there.
  const auth = initializeAuth(app, readSessionHint() === null && !appSignIn()
    ? { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver }
    : { persistence: browserLocalPersistence });
  const persistent = persistentCache && typeof indexedDB !== 'undefined';
  const db = initializeFirestore(app, {
    localCache: persistent ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache(),
  });
  if (authEmulator) connectAuthEmulator(auth, `http://${authEmulator.host}:${authEmulator.port}`, { disableWarnings: true });
  if (firestoreEmulator) connectFirestoreEmulator(db, firestoreEmulator.host, firestoreEmulator.port);
  services = { auth, db, persistent };
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
// Outcomes of the app's sign-in as `auth/...` codes for `signInError`: a dismissed sheet is silent, like a closed popup.
const appSignInCodes: Record<Exclude<AndroidOutcome, 'ok'>, string> = {
  cancelled: 'auth/popup-closed-by-user', unavailable: 'auth/app-no-google-account', error: 'auth/app-sign-in-failed',
};

export async function signInWithGoogle(): Promise<void> {
  const app = appSignIn();
  if (app) {
    const result = await googleSignInOnDevice(app);
    if (result.outcome !== 'ok') throw Object.assign(new Error('Accesso dall\'app non riuscito.'), { code: appSignInCodes[result.outcome] });
    await signInWithCredential(getServices().auth, GoogleAuthProvider.credential(result.idToken));
    return;
  }
  await signInWithPopup(getServices().auth, new GoogleAuthProvider(), browserPopupRedirectResolver);
}
// Signs out after the pending writes. With the on-disk cache (EXPO_PUBLIC_FIRESTORE_CACHE=persistent) it then stops
// Firestore and deletes that cache, so the account's data does not stay in the browser after «Esci». A stopped
// Firestore cannot start again in this page: `true` = the caller must reload it. Deleting fails while another tab of
// Nummo keeps the cache open: then the cache stays (signing out still succeeds) until a later sign-out in a single tab.
export async function signOutUser(): Promise<boolean> {
  // Do not strand acknowledged-in-the-UI operations under a different account.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { auth, db, persistent } = getServices();
  try {
    await Promise.race([
      waitForPendingWrites(db),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Scritture in attesa: riconnettiti prima di uscire.')), 5000); }),
    ]);
    await signOut(auth);
    // The app: forget the chosen account too, so the next sign-in offers the choice again.
    try { appSignIn()?.googleSignOut(); } catch { /* app gone */ }
  } finally { clearTimeout(timer); }
  if (!persistent) return false;
  await terminate(db);
  try { await clearIndexedDbPersistence(db); } catch { /* another tab holds the cache: kept until a later sign-out */ }
  return true;
}
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown';
}
