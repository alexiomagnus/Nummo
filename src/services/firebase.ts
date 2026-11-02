import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, GoogleAuthProvider, initializeAuth,
  onAuthStateChanged, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { parseExpenseList, parseReceipt, type ExpenseList, type Receipt } from '../domain/contract';
import type { ExpenseRequest } from '../domain/expense';
import { authEmulator, firebaseWebConfig, functionsEmulator, functionsRegion } from './backendConfig';

let services: { auth: Auth; functions: Functions } | undefined;

function getServices() {
  if (services) return services;
  const app = initializeApp(firebaseWebConfig);
  // Explicit persistence: the SDK keeps the session; the app never stores tokens itself.
  const auth = initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const functions = getFunctions(app, functionsRegion);
  if (authEmulator) connectAuthEmulator(auth, `http://${authEmulator.host}:${authEmulator.port}`, { disableWarnings: true });
  if (functionsEmulator) connectFunctionsEmulator(functions, functionsEmulator.host, functionsEmulator.port);
  services = { auth, functions };
  return services;
}

export type SessionUser = Readonly<{ uid: string; email: string | null }>;
const toSessionUser = (user: User | null): SessionUser | null => user && { uid: user.uid, email: user.email };

export function watchSession(listener: (user: SessionUser | null) => void): () => void {
  return onAuthStateChanged(getServices().auth, (user) => listener(toSessionUser(user)));
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getServices().auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  await signOut(getServices().auth);
}

export class InvalidResponseError extends Error {}

// Only an application receipt for this expense_id counts as confirmation, not the HTTP status.
export async function submitExpense(request: ExpenseRequest): Promise<Receipt> {
  const call = httpsCallable(getServices().functions, 'submitExpense', { timeout: 30_000 });
  const receipt = parseReceipt((await call(request)).data);
  if (!receipt || receipt.expense_id !== request.expense_id) throw new InvalidResponseError('Conferma non valida.');
  return receipt;
}

export async function listExpenses(): Promise<ExpenseList> {
  const call = httpsCallable(getServices().functions, 'listExpenses', { timeout: 30_000 });
  const list = parseExpenseList((await call({})).data);
  if (!list) throw new InvalidResponseError('Elenco non valido.');
  return list;
}

export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown';
}
