// Runs inside `npm run test:emulator` (Auth + Functions + Firestore emulators, project demo-nummo).
// Exercises the real callables and Firestore transactions; Sheets is the emulator stand-in.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const authHost = `http://127.0.0.1:${process.env.AUTH_PORT ?? 9099}`;
const functionsBase = `http://127.0.0.1:${process.env.FUNCTIONS_PORT ?? 5001}/demo-nummo/europe-west1`;

// The Auth emulator accepts an unsigned JSON id_token for a federated sign-in.
async function signIn(sub: string, email: string): Promise<string> {
  const idToken = JSON.stringify({ sub, email, email_verified: true });
  const response = await fetch(`${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: 'http://localhost', returnSecureToken: true,
    }),
  });
  const body = await response.json() as { idToken?: string; localId?: string };
  assert.ok(body.idToken, 'accesso emulato non riuscito');
  return body.idToken;
}

async function call(name: string, data: unknown, token?: string) {
  const response = await fetch(`${functionsBase}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  return await response.json() as { result?: any; error?: { status: string } };
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const expense = () => ({
  expense_id: randomUUID(), amount_minor: 1250, currency: 'EUR', description: 'Prova emulatore',
  category_id: null, expense_date: today, recurrence: null, source: 'web_app', schema_version: 1,
});

test('senza accesso o con un account non ammesso: nessuna lettura o scrittura', async () => {
  assert.equal((await call('submitExpense', expense())).error?.status, 'UNAUTHENTICATED');
  const intruder = await signIn('100000000000000000002', 'estraneo@example.com');
  assert.equal((await call('submitExpense', expense(), intruder)).error?.status, 'PERMISSION_DENIED');
  assert.equal((await call('listExpenses', {}, intruder)).error?.status, 'PERMISSION_DENIED');
});

test('invii concorrenti con lo stesso ID: una sola riga, stessa conferma', async () => {
  const owner = await signIn('100000000000000000001', 'proprietario@example.com');
  const request = expense();
  const results = await Promise.all(Array.from({ length: 6 }, () => call('submitExpense', request, owner)));
  const receipts = results.map((result) => result.result);
  for (const receipt of receipts) assert.equal(receipt?.expense_id, request.expense_id);
  assert.equal(new Set(receipts.map((receipt) => receipt.created_at)).size, 1);

  const conflict = await call('submitExpense', { ...request, amount_minor: 1 }, owner);
  assert.equal(conflict.error?.status, 'ALREADY_EXISTS');
  assert.equal((await call('submitExpense', { ...request, amount_minor: 1.5 }, owner)).error?.status, 'INVALID_ARGUMENT');

  const list = (await call('listExpenses', {}, owner)).result;
  assert.equal(list.invalid_rows, 0);
  const saved = list.expenses.filter((item: { id: string }) => item.id === request.expense_id);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].amount_minor, 1250);
});
