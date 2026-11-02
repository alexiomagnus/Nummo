import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { GoogleAuth } from 'google-auth-library';
import { authorize } from './authorize.ts';
import { listExpenses as listFromSheet, submitExpense as submitToSheet } from './expenses.ts';
import { emulatorSheet, firestoreLedger } from './firestoreLedger.ts';
import { googleSheet } from './googleSheet.ts';
import type { Sheet } from './ports.ts';

// Region and instance cap are cost/abuse limits; review them before any deployment.
setGlobalOptions({ region: 'europe-west1', maxInstances: 2 });

const allowedUid = defineString('ALLOWED_UID', { description: 'UID Firebase del solo utente ammesso.' });
const spreadsheetId = defineString('SHEET_ID', { description: 'ID del foglio «Registro spese»; "emulator" solo in locale.' });
const sheetTab = defineString('SHEET_TAB', { default: 'Spese', description: 'Scheda delle spese.' });

const emulatorSheetId = 'emulator';
let services: { db: ReturnType<typeof getFirestore>; sheet: Sheet } | undefined;

function ensureApp() {
  if (getApps().length === 0) initializeApp();
}

function getServices() {
  if (services) return services;
  ensureApp();
  const db = getFirestore();
  let sheet: Sheet;
  if (spreadsheetId.value() === emulatorSheetId) {
    if (process.env.FUNCTIONS_EMULATOR !== 'true') throw new Error('Il foglio "emulator" è ammesso solo negli emulatori.');
    sheet = emulatorSheet(db);
  } else {
    // Application Default Credentials: the function's own service account, shared on the sheet only.
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    sheet = googleSheet({
      spreadsheetId: spreadsheetId.value(), tab: sheetTab.value(),
      accessToken: async () => {
        const token = await auth.getAccessToken();
        if (!token) throw new Error('Token di servizio non disponibile.');
        return token;
      },
    });
  }
  services = { db, sheet };
  return services;
}

// The Functions emulator only decodes ID tokens (skipTokenVerification), so the token is
// always verified here too: signature, expiry, issuer and audience of this project.
// With the Auth emulator running, the Admin SDK accepts its unsigned tokens instead.
async function requireOwner(request: CallableRequest): Promise<string> {
  const rawToken = request.auth?.rawToken;
  if (!rawToken) throw new HttpsError('unauthenticated', 'Accedi per continuare.');
  ensureApp();
  let verified;
  try {
    verified = await getAuth().verifyIdToken(rawToken);
  } catch {
    throw new HttpsError('unauthenticated', 'Sessione non valida o scaduta. Accedi di nuovo.');
  }
  const outcome = authorize({ uid: verified.uid, token: verified }, allowedUid.value());
  if (outcome === 'unauthenticated') throw new HttpsError('unauthenticated', 'Accedi per continuare.');
  if (outcome === 'permission-denied') throw new HttpsError('permission-denied', 'Account non autorizzato.');
  return verified.uid;
}

// Unknown failures surface as "unavailable": the client keeps the request and may retry safely.
function unexpected(operation: string, error: unknown): never {
  logger.error(`${operation} non riuscito`, { error: error instanceof Error ? error.name + ': ' + error.message : 'sconosciuto' });
  throw new HttpsError('unavailable', 'Servizio non disponibile. Riprova.');
}

export const submitExpense = onCall(async (request) => {
  const uid = await requireOwner(request);
  const { db, sheet } = getServices();
  let result;
  try {
    result = await submitToSheet({ ledger: firestoreLedger(db), sheet, now: () => new Date() }, uid, request.data);
  } catch (error) {
    unexpected('submitExpense', error);
  }
  if (!result.ok) throw new HttpsError(result.code, result.message);
  return result.receipt;
});

export const listExpenses = onCall(async (request) => {
  await requireOwner(request);
  try {
    return await listFromSheet({ sheet: getServices().sheet });
  } catch (error) {
    unexpected('listExpenses', error);
  }
});
