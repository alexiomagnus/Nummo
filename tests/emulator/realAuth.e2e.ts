// Runs inside `npm run test:emulator:real`: real project ID, Functions + Firestore emulated,
// NO Auth emulator. The Functions emulator itself skips token verification, so this proves
// that the backend's own verifyIdToken rejects tokens not signed by Firebase Authentication.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const projectId = process.env.GCLOUD_PROJECT ?? '';
const base = `http://127.0.0.1:${process.env.FUNCTIONS_PORT ?? 5001}/${projectId}/europe-west1`;

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
function forgedToken(uid: string, alg: string): string {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: `https://securetoken.google.com/${projectId}`, aud: projectId, auth_time: now, iat: now, exp: now + 3600,
    sub: uid, user_id: uid, firebase: { sign_in_provider: 'google.com', identities: {} },
  };
  return `${b64({ alg, kid: 'falso', typ: 'JWT' })}.${b64(claims)}.${alg === 'none' ? '' : b64('firma-falsa')}`;
}

async function call(name: string, token?: string) {
  const response = await fetch(`${base}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data: {} }),
  });
  const error = (await response.json() as { error?: { status: string; message: string } }).error;
  return error && `${error.status}: ${error.message}`;
}
const missing = 'UNAUTHENTICATED: Accedi per continuare.';
// Only the backend's own verifyIdToken produces this message.
const rejected = 'UNAUTHENTICATED: Sessione non valida o scaduta. Accedi di nuovo.';

test('progetto reale senza emulatore Auth', () => {
  assert.ok(projectId && !projectId.startsWith('demo-'), `progetto inatteso: ${projectId}`);
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, undefined);
});

test('senza token: nessun accesso', async () => {
  assert.equal(await call('listExpenses'), missing);
  assert.equal(await call('submitExpense'), missing);
});

test('token falsificati con le giuste affermazioni: rifiutati dal backend', async () => {
  for (const alg of ['none', 'RS256']) {
    const token = forgedToken('uid-qualsiasi', alg);
    assert.equal(await call('listExpenses', token), rejected, alg);
    assert.equal(await call('submitExpense', token), rejected, alg);
  }
});
