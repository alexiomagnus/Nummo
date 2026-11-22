import { encodeTrialPrices } from '../../src/domain/pricing.ts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, getDocFromServer, getDocsFromServer, collection,
  updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp, disableNetwork, enableNetwork, onSnapshot, terminate, waitForPendingWrites } from 'firebase/firestore';
import { createFirestoreStore } from '../../src/services/firestoreStore.ts';
import { checkOwnerAccess } from '../../src/services/ownerAccess.ts';
import { makeBackup, parseBackup } from '../../src/domain/backup.ts';
import { todayInRome } from '../../src/domain/policy.ts';
import { dataOf } from '../../src/domain/expense.ts';
import { maxStatusChanges } from '../../src/domain/subscription.ts';

// Status history of `count` entries of the longest kind («YYYY-MM-DD:cancelled»), on increasing days: with 40, exactly the
// 839 characters the Rules accept (size and regex both at their limit).
const longestStatuses = (count: number) => Array.from({ length: count }, (_, i) =>
  `${new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)}:cancelled`).join(';');
await import('../../scripts/seed-demo.ts');
const projectId = 'demo-nummo';
const suffix = randomUUID().slice(0, 8);
async function client(name: string, sub?: string, project = projectId) {
  const app = initializeApp({ projectId: project, apiKey: 'demo-key', appId: 'demo-app' }, name);
  const auth = initializeAuth(app);
  connectAuthEmulator(auth, `http://127.0.0.1:${process.env.AUTH_PORT ?? 9099}`, { disableWarnings: true });
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, '127.0.0.1', Number(process.env.FIRESTORE_PORT ?? 8180));
  if (sub) await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email: sub.endsWith('1') ? 'proprietario@example.com' : 'estraneo@example.com', email_verified: true })));
  return { app, auth, db, store: createFirestoreStore(db, auth.currentUser?.uid ?? 'demo-owner') };
}
const expense = () => ({ expense_id: randomUUID(), amount_minor: 1250, currency: 'EUR' as const, description: 'Caffè', category_id: null,
  expense_date: todayInRome(), recurrence: null, price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app' as const, schema_version: 1 as const });
const denied = (promise: Promise<unknown>) => assert.rejects(promise, (e: any) => e.code === 'permission-denied');
const deadline = <T>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout test')), 15000); })]).finally(() => clearTimeout(timer));
};
test('Firestore personale: sicurezza, CRUD, sincronizzazione e migrazione', { timeout: 90000 }, async (t) => {
  const owner = await client('owner', '100000000000000000001');
  const second = await client('second', '100000000000000000001');
  const intruder = await client('intruder', '100000000000000000002');
  const anonymous = await client('anonymous');
  const otherProject = await client('other-project', undefined, 'demo-another');
  const uid = owner.auth.currentUser!.uid;
  assert.equal(uid, 'demo-owner');
  const ref = (id: string) => doc(owner.db, 'users', uid, 'expenses', id);
  try {
    await t.test('non autenticati, estranei, altri namespace e autopromozione negati', async () => {
      for (const c of [anonymous, intruder]) {
        await denied(getDocsFromServer(collection(c.db, 'users', uid, 'expenses')));
        await denied(setDoc(doc(c.db, 'config', 'owner'), { uid: c.auth.currentUser?.uid ?? 'x' }));
        await denied(setDoc(doc(c.db, 'users', uid, 'expenses', randomUUID()), {}));
      }
      await denied(getDocsFromServer(collection(owner.db, 'users', 'other-user', 'expenses')));
      await denied(getDocsFromServer(collection(otherProject.db, 'users', uid, 'expenses')));
      await denied(getDocFromServer(doc(owner.db, 'operations', 'anything')));
    });
    await t.test('controllo del proprietario: schermata «privato» solo per gli altri account', async () => {
      assert.equal(await checkOwnerAccess(owner.db, uid), 'owner');
      assert.equal(await checkOwnerAccess(intruder.db, intruder.auth.currentUser!.uid), 'denied');
      assert.equal(await checkOwnerAccess(anonymous.db, 'nessuno'), 'denied');
    });
    await t.test('provider diverso da Google negato anche per UID proprietario', async () => {
      const app = initializeApp({ projectId, apiKey: 'demo-key', appId: 'demo-app' }, 'password-client');
      const db = initializeFirestore(app, {});
      connectFirestoreEmulator(db, '127.0.0.1', Number(process.env.FIRESTORE_PORT ?? 8180), { mockUserToken: { sub: uid, firebase: { sign_in_provider: 'password', identities: {} } } });
      try { await denied(getDocsFromServer(collection(db, 'users', uid, 'expenses'))); }
      finally { await terminate(db); await deleteApp(app); }
    });
    await t.test('creazione, lettura in seconda sessione, modifica e conflitto obsoleto', async () => {
      const request = expense();
      const receipt = await owner.store.createExpense(request);
      assert.equal(receipt.expense_id, request.expense_id);
      const data = (await second.store.exportSnapshot()).expenses.find((r) => r.id === request.expense_id)!;
      assert.equal(data.amount_minor, 1250);
      const { expense_id, ...payload } = request;
      await owner.store.updateExpense(data, { ...payload, amount_minor: 2300 });
      await assert.rejects(second.store.updateExpense(data, { ...payload, amount_minor: 100 }), /altra sessione/);
      const updated = (await second.store.exportSnapshot()).expenses.find((r) => r.id === data.id)!;
      assert.equal(updated.revision, 2);
      assert.equal(updated.amount_minor, 2300);
      await assert.rejects(owner.store.removeExpense(data), /altra sessione/);
      await owner.store.removeExpense(updated);
      assert.equal((await getDocFromServer(ref(data.id))).exists(), false);
    });
    await t.test('regole: campi, importi, date, revisioni e timestamp verificati sul server', async () => {
      // Raw documents in the stored shape: no `status_changes` unless a series has one (see firestoreStore).
      const { expense_id, status_changes: _, fund_id: _fund, list_id: _list, list_items: _items, ...data } = expense();
      const valid = { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      for (const patch of [{ amount_minor: 1.5 }, { amount_minor: 0 }, { amount_minor: 100000000000 }, { currency: 'USD' },
        { expense_date: '2025-02-30' }, { expense_date: '2099-01-01' }, { category_id: 'invalid' }, { recurrence: 'daily' },
        { description: '' }, { admin: true }, { revision: 2 }, { created_at: 'date' }, { updated_at: Timestamp.fromMillis(1) }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      // The largest amount (999.999.999,99 € since 22 November) is accepted.
      await setDoc(ref(randomUUID()), { ...valid, amount_minor: 99999999999 });
      for (const key of Object.keys(valid)) {
        const missing = { ...valid } as Record<string, unknown>;
        delete missing[key];
        await denied(setDoc(ref(randomUUID()), missing));
      }
      await setDoc(ref(expense_id), valid);
      await denied(updateDoc(ref(expense_id), { amount_minor: 1, updated_at: serverTimestamp() }));
      await denied(updateDoc(ref(expense_id), { revision: 2, created_at: Timestamp.fromMillis(1), updated_at: serverTimestamp() }));
      await denied(setDoc(ref(expense_id), valid));
    });
    await t.test('piano prezzi: variazioni validate dalle regole, storico stabile dopo la modifica', async () => {
      const { expense_id, ...data } = expense();
      const series = { ...data, recurrence: 'yearly' as const, expense_date: '2025-03-12', amount_minor: 600, price_changes: [{ index: 1, amount_minor: 1200, once: false }] };
      const { status_changes: _status, fund_id: _fund, list_id: _list, list_items: _items, ...storedSeries } = series;
      const valid = { ...storedSeries, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      const change = { index: 2, amount_minor: 1500, once: true };
      const { price_changes: _, ...withoutField } = valid;
      for (const key of ['index', 'amount_minor', 'once']) {
        const missing = { ...change } as Record<string, unknown>;
        delete missing[key];
        await denied(setDoc(ref(randomUUID()), { ...valid, price_changes: [missing] }));
      }
      await denied(setDoc(ref(randomUUID()), { ...valid, price_changes: [{ ...change, extra: true }] }));
      for (const patch of [{ price_changes: [{ ...change, index: 0 }] }, { price_changes: [{ ...change, index: 1000 }] }, { price_changes: [{ ...change, amount_minor: 0 }] },
        { price_changes: [{ ...change, amount_minor: 1.5 }] }, { price_changes: [{ ...change, once: 'si' }] }, { price_changes: [{ ...change, extra: 1 }] },
        { price_changes: [{ index: 2, amount_minor: 5 }] }, { price_changes: Array.from({ length: 9 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false })) },
        { price_changes: 'x' }, { price_changes: [1] }, { recurrence: null }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      await denied(setDoc(ref(randomUUID()), withoutField));
      await setDoc(ref(randomUUID()), { ...valid, price_changes: Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false })) });
      await owner.store.createExpense({ expense_id, ...series });
      const saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(saved.price_changes, [{ index: 1, amount_minor: 1200, once: false }]);
      const next = { ...series, price_changes: [...series.price_changes, change] };
      await owner.store.updateExpense(saved, next);
      const updated = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.equal(updated.amount_minor, 600);
      assert.deepEqual(updated.price_changes, next.price_changes);
      await owner.store.removeExpense(updated);
    });
    await t.test('prova gratuita: CRUD, versione, date future, storico protetto e budget Rules', async () => {
      const { expense_id, ...base } = expense();
      const data = { ...base, recurrence: 'monthly' as const, first_payment_date: '2099-12-09', schema_version: 2 as const };
      await owner.store.createExpense({ expense_id, ...data });
      let saved = (await owner.store.exportSnapshot()).expenses.find(r => r.id === expense_id)!;
      assert.equal(saved.first_payment_date, data.first_payment_date);
      assert.deepEqual(parseBackup(JSON.parse(makeBackup({ expenses: [saved], categories: [] }))).expenses[0]!.first_payment_date, data.first_payment_date);
      await owner.store.updateExpense(saved, { ...data, amount_minor: 1399, first_payment_date: '2099-12-19' });
      saved = (await owner.store.exportSnapshot()).expenses.find(r => r.id === expense_id)!;
      assert.equal(saved.amount_minor, 1399);
      const backup = parseBackup(JSON.parse(makeBackup({ expenses: [saved], categories: [] })));
      await owner.store.removeExpense(saved);
      await owner.store.importRecords(backup.expenses, []);
      await owner.store.importRecords(backup.expenses, []);
      saved = (await owner.store.exportSnapshot()).expenses.find(r => r.id === expense_id)!;
      assert.equal(saved.first_payment_date, '2099-12-19');
      assert.equal(saved.revision, 1, 'identical trial import is skipped');
      assert.equal((await getDocFromServer(ref(expense_id))).data()!.price_changes, '');
      const { fund_id: _f, list_id: _l, list_items: _li, status_changes: _s, ...stored } = data;
      const raw = { ...stored, price_changes: '', created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      for (const patch of [{ recurrence: null }, { amount_minor: 0 }, { schema_version: 1 },
        { first_payment_date: null }, { first_payment_date: base.expense_date }, { first_payment_date: '2027-02-30' },
        { first_payment_date: '2100-01-01' }, { price_changes: [] }, { price_changes: '0:100:0' },
        { price_changes: '1:0:0' }, { price_changes: '1:100000000000:0' }, { price_changes: '1:100:true' },
        { price_changes: Array.from({ length: 9 }, (_, i) => `${i + 1}:100:0`).join(';') }]) await denied(setDoc(ref(randomUUID()), { ...raw, ...patch }));
      await denied(updateDoc(ref(expense_id), { first_payment_date: base.expense_date, updated_at: serverTimestamp(), revision: saved.revision + 1 }));
      const pastId = randomUUID();
      const past = { ...data, expense_date: '2026-01-01', first_payment_date: '2026-01-02' };
      await owner.store.createExpense({ ...past, expense_id: pastId });
      const historic = (await owner.store.exportSnapshot()).expenses.find(r => r.id === pastId)!;
      await owner.store.updateExpense(historic, { ...past, description: 'TEST prova terminata' });
      for (const patch of [{ first_payment_date: '2026-01-03' }, { expense_date: '2025-12-31' }, { amount_minor: 1500 }, { recurrence: 'yearly' }]) {
        await denied(updateDoc(ref(pastId), { ...patch, updated_at: serverTimestamp(), revision: historic.revision + 2 }));
      }
      // The worst supported combination remains writable with a trial as well.
      const worstId = randomUUID();
      const worst = { ...raw, expense_date: '2026-01-01', first_payment_date: '2099-12-09', fund_id: randomUUID(),
        status_changes: longestStatuses(maxStatusChanges),
        price_changes: encodeTrialPrices(Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false }))) };
      t.diagnostic('trial budget: create');
      await setDoc(ref(worstId), worst);
      t.diagnostic('trial budget: update description');
      await updateDoc(ref(worstId), { description: 'TEST budget trial', updated_at: serverTimestamp(), revision: 2 });
      t.diagnostic('trial budget: update future date and price');
      await updateDoc(ref(worstId), { first_payment_date: '2099-12-19', amount_minor: 1500, updated_at: serverTimestamp(), revision: 3 });
      t.diagnostic('trial budget: create ended trial');
      await setDoc(ref(randomUUID()), { ...worst, first_payment_date: '2026-01-02' });
      const ordinaryId = randomUUID();
      await owner.store.createExpense({ ...base, expense_id: ordinaryId });
      await denied(updateDoc(ref(ordinaryId), { schema_version: 2, recurrence: 'monthly', first_payment_date: '2099-12-09', updated_at: serverTimestamp(), revision: 2 }));
      for (const id of [expense_id, pastId, worstId, ordinaryId]) await deleteDoc(ref(id));
    });
    await t.test('budget mensile generale: regole, revisioni, esportazione, unione senza sovrascritture e sostituzione', async () => {
      const budgetRef = doc(owner.db, 'users', uid, 'settings', 'budget');
      const schedule = [{ month: '2026-11', amount_minor: 30000 }];
      await deleteDoc(budgetRef);
      assert.deepEqual((await owner.store.exportSnapshot()).budget, []);
      // Rules: only the `budget` document, exact fields, compact schedule, server revision and time.
      for (const [target, data] of [
        [doc(owner.db, 'users', uid, 'settings', 'altro'), { budgets: '', revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '2026-11:30000', revision: 2, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '2026-11:30000', revision: 1, updated_at: serverTimestamp(), extra: true }],
        [budgetRef, { budgets: '2026-11:30000', revision: 1 }],
        [budgetRef, { budgets: [{ month: '2026-11', amount_minor: 30000 }], revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '2026-11:x', revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '2026-11:30000;', revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '2026-11:123456789', revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: Array.from({ length: 25 }, (_, i) => `2026-${String(i % 12 + 1).padStart(2, '0')}:100`).join(';'), revision: 1, updated_at: serverTimestamp() }],
        [budgetRef, { budgets: '', revision: 1, updated_at: Timestamp.fromDate(new Date('2020-01-01')) }],
      ] as const) await denied(setDoc(target, data));
      await denied(setDoc(doc(intruder.db, 'users', uid, 'settings', 'budget'), { budgets: '', revision: 1, updated_at: serverTimestamp() }));
      await denied(getDocFromServer(doc(intruder.db, 'users', uid, 'settings', 'budget')));
      await setDoc(budgetRef, { budgets: '', revision: 1, updated_at: serverTimestamp() }); // empty = no budget is valid
      await deleteDoc(budgetRef);
      // Store: first save requires no document, later saves the revision seen; a stale one is a conflict.
      await owner.store.saveBudget(schedule, null);
      assert.equal((await getDocFromServer(budgetRef)).data()!.budgets, '2026-11:30000');
      await assert.rejects(owner.store.saveBudget(schedule, null), /cambiati in un’altra sessione/);
      const seen = await new Promise<any>((resolve, reject) => { const stop = owner.store.watchBudget((value) => { stop(); resolve(value); }, reject); });
      assert.deepEqual(seen.budget.budgets, schedule);
      const next = [...schedule, { month: '2026-12', amount_minor: 45000 }];
      await owner.store.saveBudget(next, seen.budget);
      await assert.rejects(owner.store.saveBudget(schedule, seen.budget), /cambiati in un’altra sessione/);
      await denied(updateDoc(budgetRef, { revision: 9, updated_at: serverTimestamp() }));
      assert.deepEqual((await owner.store.exportSnapshot()).budget, next);
      // Backup: exported with the data, merge never overwrites a different saved budget, an identical one is skipped.
      const snapshot = await owner.store.exportSnapshot();
      const file = parseBackup(JSON.parse(makeBackup(snapshot)));
      assert.deepEqual(file.budget, next);
      assert.equal((await owner.store.previewImport(file)).merge.setBudget, null);
      const different = [{ month: '2026-11', amount_minor: 99900 }];
      assert.equal((await owner.store.previewImport({ ...file, budget: different })).merge.conflicts.some((c) => c.kind === 'budget'), true);
      await assert.rejects(owner.store.importRecords([], [], 'merge', [], [], [], different), /Importazione bloccata/);
      assert.deepEqual((await owner.store.exportSnapshot()).budget, next, 'nothing was written');
      // Merge fills an empty budget; replace makes it equal to the file (and to «none» when the file has none).
      await deleteDoc(budgetRef);
      await owner.store.importRecords([], [], 'merge', [], [], [], different);
      assert.deepEqual((await owner.store.exportSnapshot()).budget, different);
      await owner.store.importRecords([], [], 'replace', [], [], [], next);
      assert.deepEqual((await owner.store.exportSnapshot()).budget, next);
      await owner.store.importRecords([], [], 'replace', [], [], [], []);
      assert.deepEqual((await owner.store.exportSnapshot()).budget, []);
      await deleteDoc(budgetRef);
    });
    await t.test('frequenza: calendario con cambi (schema 3), compatibilità, storico, versione non regredibile e budget Rules', async () => {
      const { expense_id, ...base } = expense();
      const series = { ...base, recurrence: 'monthly' as const, expense_date: '2026-08-15', amount_minor: 999 };
      const changes = [{ index: 3, start: '2026-12-01', recurrence: 'yearly' as const }];
      await owner.store.createExpense({ expense_id, ...series });
      let saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.equal(saved.schema_version, 1);
      assert.equal((await getDocFromServer(ref(expense_id))).data()!.calendar_changes, undefined, 'un abbonamento senza cambi non scrive il campo');
      // The series becomes schema 3: prices become the compact string, the switch is one string, past payments are untouched.
      await owner.store.updateExpense(saved, { ...series, schema_version: 3, calendar_changes: changes, price_changes: [{ index: 4, amount_minor: 1299, once: false }] });
      saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.equal(saved.schema_version, 3);
      assert.deepEqual(saved.calendar_changes, changes);
      assert.deepEqual(saved.price_changes, [{ index: 4, amount_minor: 1299, once: false }]);
      const rawDoc = (await getDocFromServer(ref(expense_id))).data()!;
      assert.equal(rawDoc.calendar_changes, '3:2026-12-01:y');
      assert.equal(rawDoc.price_changes, '4:1299:0');
      assert.equal(rawDoc.recurrence, 'monthly', 'la frequenza di base non cambia');
      // Backup v6 round trip, then an identical import is skipped.
      const backup = parseBackup(JSON.parse(makeBackup({ expenses: [saved], categories: [] })));
      await owner.store.removeExpense(saved);
      await owner.store.importRecords(backup.expenses, []);
      await owner.store.importRecords(backup.expenses, []);
      saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(saved.calendar_changes, changes);
      assert.equal(saved.revision, 1, 'identical import is skipped');
      // Second switch (replacing nothing: a later index) and a rewrite of the first one while it is still pending.
      const two = [...changes, { index: 4, start: '2027-12-02', recurrence: 'weekly' as const }];
      await owner.store.updateExpense(saved, { ...series, schema_version: 3, calendar_changes: two, price_changes: saved.price_changes });
      saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(saved.calendar_changes, two);
      // Malformed or misplaced switches are denied by the Rules, whatever the client does.
      const { fund_id: _f, list_id: _l, list_items: _li, status_changes: _s, ...storedBase } = series;
      const raw = { ...storedBase, schema_version: 3, price_changes: '', created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      await setDoc(ref(randomUUID()), { ...raw, calendar_changes: '3:2026-12-01:y' });
      await setDoc(ref(randomUUID()), raw); // schema 3 without switches or trial is valid too
      for (const patch of [{ calendar_changes: '' }, { calendar_changes: '3:2026-12-01:x' }, { calendar_changes: '0:2026-12-01:y' }, { calendar_changes: '3:2026-12-1:y' },
        { calendar_changes: '3:2026-12-01:y;' }, { calendar_changes: [{ index: 3, start: '2026-12-01', recurrence: 'yearly' }] }, { calendar_changes: 7 },
        { calendar_changes: Array.from({ length: 5 }, (_, i) => `${i + 1}:2026-12-01:y`).join(';') },
        { calendar_changes: '3:2026-12-01:y', price_changes: [] }, { calendar_changes: '3:2026-12-01:y', recurrence: null },
        { calendar_changes: '3:2026-12-01:y', schema_version: 1 }, { calendar_changes: '3:2026-12-01:y', schema_version: 2 },
        { calendar_changes: '3:2026-12-01:y', schema_version: 4 }, { schema_version: 3, recurrence: null }, { schema_version: 3, first_payment_date: '2027-02-30' }]) {
        await denied(setDoc(ref(randomUUID()), { ...raw, ...patch }));
      }
      // A series never goes back to an older version, and its switches are never dropped or shortened.
      await denied(updateDoc(ref(expense_id), { schema_version: 1, price_changes: [], updated_at: serverTimestamp(), revision: saved.revision + 1 }));
      await denied(updateDoc(ref(expense_id), { calendar_changes: deleteField(), updated_at: serverTimestamp(), revision: saved.revision + 1 }));
      await denied(updateDoc(ref(expense_id), { calendar_changes: '3:2026-12-01:y', updated_at: serverTimestamp(), revision: saved.revision + 1 }));
      // Trial series switching to version 3 keeps its first payment; an ordinary series cannot gain a trial through it.
      const trialId = randomUUID();
      const trial = { ...series, expense_date: '2026-01-01', first_payment_date: '2099-12-09', schema_version: 2 as const };
      await owner.store.createExpense({ ...trial, expense_id: trialId });
      const trialSaved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === trialId)!;
      await owner.store.updateExpense(trialSaved, { ...trial, schema_version: 3, calendar_changes: [{ index: 1, start: '2099-12-20', recurrence: 'weekly' }] });
      const afterTrial = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === trialId)!;
      assert.equal(afterTrial.first_payment_date, '2099-12-09');
      assert.equal(afterTrial.schema_version, 3);
      await denied(updateDoc(ref(expense_id), { first_payment_date: '2099-12-09', updated_at: serverTimestamp(), revision: saved.revision + 1 }));
      // The worst supported combination (8 prices, 40 statuses of the longest kind, fund, trial, 4 switches) stays writable.
      const worstId = randomUUID();
      const worst = { ...raw, expense_date: '2026-01-01', first_payment_date: '2099-12-09', fund_id: randomUUID(),
        status_changes: longestStatuses(maxStatusChanges),
        price_changes: encodeTrialPrices(Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false }))),
        calendar_changes: '996:2099-12-31:w;997:2099-12-31:m;998:2099-12-31:y;999:2099-12-31:w',
        // Plus the longest list of removed payments (60 numbers of 4 digits) and the longest merchant ID.
        skipped_payments: Array.from({ length: 60 }, (_, i) => 9000 + i).join(','), merchant_id: 'm-' + '%25'.repeat(60) };
      t.diagnostic('frequency budget: create');
      await setDoc(ref(worstId), worst);
      t.diagnostic('frequency budget: update description');
      await updateDoc(ref(worstId), { description: 'TEST budget frequenza', updated_at: serverTimestamp(), revision: 2 });
      t.diagnostic('frequency budget: update calendar');
      await updateDoc(ref(worstId), { calendar_changes: '995:2099-12-30:w;997:2099-12-31:m;998:2099-12-31:y;999:2099-12-31:m', updated_at: serverTimestamp(), revision: 3 });
      for (const id of [expense_id, trialId, worstId]) await deleteDoc(ref(id));
    });
    await t.test('abbonamenti: stati validati dalle regole, campo assente compatibile, storico invariato', async () => {
      const { expense_id, ...data } = expense();
      const series = { ...data, recurrence: 'monthly' as const, expense_date: '2026-01-05', amount_minor: 999, status_changes: [] };
      const { fund_id: _fund, list_id: _list, list_items: _items, ...storedSeries } = series;
      const valid = { ...storedSeries, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      // Stored form: one string "date:status;…" (see subscription.ts / firestore.rules).
      const longest = longestStatuses(maxStatusChanges);
      for (const patch of [{ status_changes: '2026-03-10:stopped' }, { status_changes: '10/03/2026:paused' }, { status_changes: '' },
        { status_changes: '2026-03-10:paused;' }, { status_changes: [{ date: '2026-03-10', status: 'paused' }] }, { status_changes: `${longest};2099-12-31:paused` }, { status_changes: longestStatuses(maxStatusChanges + 1) },
        { recurrence: null, price_changes: [], status_changes: '2026-03-10:paused' }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      // Worst case for the expression budget: 40 statuses together with eight price changes.
      const { status_changes: _, ...legacy } = valid;
      const legacyWorstId = randomUUID();
      await setDoc(ref(legacyWorstId), { ...legacy, fund_id: randomUUID(), status_changes: longest, price_changes: Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false })) });
      await updateDoc(ref(legacyWorstId), { description: 'TEST budget legacy', updated_at: serverTimestamp(), revision: 2 });
      await deleteDoc(ref(legacyWorstId));
      await setDoc(ref(randomUUID()), legacy);
      await owner.store.createExpense({ expense_id, ...series });
      const raw = (await getDocFromServer(ref(expense_id))).data()!;
      assert.ok(!('status_changes' in raw), 'campo omesso quando vuoto');
      const saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(saved.status_changes, []);
      const paused = { ...series, status_changes: [{ date: '2026-03-10', status: 'paused' as const }] };
      await owner.store.updateExpense(saved, paused);
      const afterPause = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(afterPause.status_changes, paused.status_changes);
      assert.equal((await getDocFromServer(ref(expense_id))).data()!.status_changes, '2026-03-10:paused');
      assert.equal(afterPause.revision, saved.revision + 1);
      // Back to no status at all (same-day resume): the stored field is removed.
      await owner.store.updateExpense(afterPause, series);
      assert.ok(!('status_changes' in (await getDocFromServer(ref(expense_id))).data()!));
      await assert.rejects(owner.store.updateExpense(afterPause, paused), /cambiati in un’altra sessione/);
      const file = parseBackup(JSON.parse(makeBackup({ expenses: [afterPause], categories: [] })));
      assert.deepEqual(file.expenses[0]!.status_changes, paused.status_changes);
      const latest = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      await owner.store.removeExpense(latest);
    });
    await t.test('pagamenti eliminati: regole sulla stringa compatta, solo per le serie, salvataggio, rimozione del campo e backup', async () => {
      const { expense_id, ...data } = expense();
      const series = { ...data, recurrence: 'monthly' as const, expense_date: '2026-01-05', amount_minor: 999 };
      const { fund_id: _fund, list_id: _list, list_items: _items, status_changes: _status, ...storedSeries } = series;
      const valid = { ...storedSeries, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      await setDoc(ref(randomUUID()), { ...valid, skipped_payments: '0,3,12' });
      for (const patch of [{ skipped_payments: '' }, { skipped_payments: '1,' }, { skipped_payments: 'a' }, { skipped_payments: '12345' }, { skipped_payments: [1, 2] },
        { skipped_payments: Array.from({ length: 61 }, (_, i) => i).join(',') }, { recurrence: null, price_changes: [], skipped_payments: '0' }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      await owner.store.createExpense({ expense_id, ...series });
      const saved = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.ok(!('skipped_payments' in (await getDocFromServer(ref(expense_id))).data()!), 'campo assente senza pagamenti eliminati');
      await owner.store.updateExpense(saved, { ...series, skipped_payments: [1, 4] });
      assert.equal((await getDocFromServer(ref(expense_id))).data()!.skipped_payments, '1,4');
      const skipped = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!;
      assert.deepEqual(skipped.skipped_payments, [1, 4]);
      assert.deepEqual(parseBackup(JSON.parse(makeBackup({ expenses: [skipped], categories: [] }))).expenses[0]!.skipped_payments, [1, 4]);
      // Back to a one-off expense: the stored field is removed (it is valid only for series).
      await owner.store.updateExpense(skipped, { ...series, recurrence: null });
      assert.ok(!('skipped_payments' in (await getDocFromServer(ref(expense_id))).data()!));
      await owner.store.removeExpense((await owner.store.exportSnapshot()).expenses.find((r) => r.id === expense_id)!);
    });
    await t.test('categorie uniche, rinomina, icone, conflitti ed eliminazione atomica', async () => {
      const id = randomUUID();
      await denied(setDoc(doc(owner.db, 'users', uid, 'categories', id), { label: 'Senza indice', icon: null, name_key: 'n-senza indice', revision: 1, updated_at: serverTimestamp() }));
      await owner.store.saveCategory(id, `Caffè / tè % ${suffix}`, 'coffee');
      let c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
      await assert.rejects(second.store.saveCategory(randomUUID(), `CAFFÈ / TÈ % ${suffix}`, null), /già/);
      await denied(setDoc(doc(owner.db, 'users', uid, 'categoryNames', c.name_key), { category_id: randomUUID() }));
      await owner.store.saveCategory(id, `Bevande ${suffix}`, 'key', c);
      await assert.rejects(second.store.saveCategory(id, 'Vecchio', null, c), /altra sessione/);
      const openedRevision = c.revision;
      c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
      assert.equal(c.label, `Bevande ${suffix}`);
      assert.equal(c.icon, 'key');
      assert.equal(c.revision, openedRevision + 1);
      // Retired icons stay valid for existing categories (not offered by the picker any more).
      await owner.store.saveCategory(randomUUID(), `Divano ${suffix}`, 'sofa');
      await denied(deleteDoc(doc(owner.db, 'users', uid, 'categories', id)));
      await owner.store.removeCategory(c);
      await owner.store.saveCategory(randomUUID(), `Bevande ${suffix}`, null);
      const results = await Promise.allSettled([owner.store.saveCategory(randomUUID(), `Unica ${suffix}`, null), second.store.saveCategory(randomUUID(), `unica ${suffix}`, null)]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    });
    await t.test('offline: snapshot pendente, nessuna conferma anticipata, riconnessione una sola spesa', async () => {
      await disableNetwork(owner.db);
      const request = expense();
      let confirmed = false;
      const pendingSeen = new Promise<void>((resolve) => {
        const off = onSnapshot(ref(request.expense_id), { includeMetadataChanges: true }, (s) => {
          if (s.metadata.hasPendingWrites) { off(); resolve(); }
        });
      });
      const write = owner.store.createExpense(request).then(() => { confirmed = true; });
      await deadline(pendingSeen);
      assert.equal(confirmed, false);
      await enableNetwork(owner.db);
      await deadline(write);
      const all = (await second.store.exportSnapshot()).expenses;
      assert.equal(all.filter((r) => r.id === request.expense_id).length, 1);
    });
    await t.test('migrazione ripetibile, ID e date preservati, conflitti senza sovrascrittura', async () => {
      const { expense_id, ...payload } = expense();
      const cats = [{ id: randomUUID(), label: `Migrata ${suffix}`, icon: null }];
      const records = [{ ...payload, id: expense_id, category_id: cats[0]!.id, recurrence: 'monthly' as const,
        expense_date: '2025-01-31', price_changes: [{ index: 1, amount_minor: 1500, once: false }], created_at: '2025-01-01T00:00:00.000Z' }];
      const backup = parseBackup(JSON.parse(makeBackup({ expenses: records, categories: cats })));
      await owner.store.importRecords(backup.expenses, backup.categories);
      await owner.store.importRecords(backup.expenses, backup.categories);
      await owner.store.importRecords(records, cats);
      const preview = await owner.store.previewImport(backup);
      assert.deepEqual([preview.merge.addExpenses.length, preview.merge.sameExpenses, preview.merge.conflicts.length], [0, 1, 0]);
      await assert.rejects(owner.store.importRecords([{ ...records[0]!, amount_minor: 1 }], cats), /Importazione bloccata: 1 elementi/);
      // A category with the same name but another ID also blocks the merge, before any write.
      const before = (await owner.store.exportSnapshot()).expenses.length;
      await assert.rejects(owner.store.importRecords([{ ...(({ expense_id, ...data }) => ({ ...data, id: expense_id }))(expense()), created_at: '2025-02-01T00:00:00.000Z' }], [{ id: randomUUID(), label: cats[0]!.label, icon: null }]), /Importazione bloccata/);
      assert.equal((await owner.store.exportSnapshot()).expenses.length, before);
      const all = (await owner.store.exportSnapshot()).expenses;
      assert.equal(all.find((r) => r.id === expense_id)?.created_at, records[0]!.created_at);
      assert.equal(all.find((r) => r.id === expense_id)?.amount_minor, 1250);
      assert.equal(all.filter((r) => r.id === expense_id).length, 1);
      assert.deepEqual(all.find((r) => r.id === expense_id)?.price_changes, records[0]!.price_changes);
    });
    await t.test('fondi: regole, revisioni, movimenti idempotenti, fund_id nelle spese e assegnazione esplicita', async () => {
      const fundRef = (id: string) => doc(owner.db, 'users', uid, 'funds', id);
      const movementRef = (id: string) => doc(owner.db, 'users', uid, 'movements', id);
      const today = todayInRome();
      const month = today.slice(0, 7);
      const data = { name: `Vita ${suffix}`, icon: 'laptop' as const, color: 2, initial_minor: 50000, start_date: today,
        recharges: [{ month, amount_minor: 30000, day: 1, active: true }], budgets: [{ month, amount_minor: 25000 }], budget_exceptions: [], archived: false };
      const stored = { name: data.name, icon: data.icon, color: 2, initial_minor: 50000, start_date: today, recharges: `${month}:30000:1:a`,
        budgets: `${month}:25000`, budget_exceptions: '', archived: false, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      for (const patch of [{ name: '' }, { name: ' x' }, { color: 12 }, { initial_minor: -1 }, { initial_minor: 1.5 }, { start_date: '2099-01-01' },
        { recharges: '2026-01:0:1:x' }, { recharges: [] }, { budgets: '2026-01:1;' }, { icon: 'nope' }, { archived: 'no' }, { revision: 2 }, { extra: 1 },
        { recharges: Array.from({ length: 25 }, (_, i) => `20${String(30 + i)}-01:1:1:a`).join(';') }]) {
        await denied(setDoc(fundRef(randomUUID()), { ...stored, ...patch }));
      }
      for (const c of [intruder, anonymous]) await denied(setDoc(doc(c.db, 'users', uid, 'funds', randomUUID()), stored));
      const id = randomUUID();
      await owner.store.saveFund(id, data);
      const raw = (await getDocFromServer(fundRef(id))).data()!;
      assert.equal(raw.recharges, `${month}:30000:1:a`);
      let saved = (await second.store.exportSnapshot()).funds.find((f) => f.id === id)!;
      assert.deepEqual(saved.recharges, data.recharges);
      await owner.store.saveFund(id, { ...data, archived: true }, saved);
      await assert.rejects(second.store.saveFund(id, { ...data, name: 'Altro' }, saved), /altra sessione/);
      saved = (await owner.store.exportSnapshot()).funds.find((f) => f.id === id)!;
      assert.deepEqual([saved.archived, saved.revision], [true, 2]);
      await assert.rejects(owner.store.saveFund(id, { ...data, start_date: '2025-01-01' }, saved), /data di inizio/);
      await denied(updateDoc(fundRef(id), { start_date: '2025-01-01', revision: 3, updated_at: serverTimestamp() }));
      await owner.store.saveFund(id, { ...data, archived: false }, saved);
      // Movements: one document each, created once even when the same request is repeated; immutable afterwards.
      const other = randomUUID();
      await owner.store.saveFund(other, { ...data, name: `Risparmi ${suffix}`, recharges: [], budgets: [] });
      const transfer = { kind: 'transfer' as const, amount_minor: 20000, date: today, to_fund_id: id, from_fund_id: other, note: 'Per l’affitto' };
      const movementId = randomUUID();
      await owner.store.createMovement(movementId, transfer);
      await owner.store.createMovement(movementId, transfer);
      await assert.rejects(owner.store.createMovement(movementId, { ...transfer, amount_minor: 1 }), /altra sessione/);
      assert.equal((await owner.store.exportSnapshot()).movements.filter((m) => m.id === movementId).length, 1);
      await denied(updateDoc(movementRef(movementId), { amount_minor: 1 }));
      const rawMovement = { kind: 'income', amount_minor: 100, date: today, to_fund_id: id, from_fund_id: null, note: '', created_at: serverTimestamp() };
      for (const patch of [{ kind: 'gift' }, { amount_minor: 0 }, { from_fund_id: id }, { kind: 'transfer', from_fund_id: id }, { to_fund_id: 'x' },
        { date: '2099-01-01' }, { note: ' x' }, { extra: true }]) {
        await denied(setDoc(movementRef(randomUUID()), { ...rawMovement, ...patch }));
      }
      // Expenses: fund_id optional (absent = no fund), uuid when present; worst case 8 prices + 40 statuses + fund_id fits the Rules budget.
      const { expense_id: _e, status_changes: _s, fund_id: _f, list_id: _l, list_items: _li, ...base } = expense();
      const valid = { ...base, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      await denied(setDoc(ref(randomUUID()), { ...valid, fund_id: 'x' }));
      await denied(setDoc(ref(randomUUID()), { ...valid, fund_id: null }));
      const longest = longestStatuses(maxStatusChanges);
      await setDoc(ref(randomUUID()), { ...valid, recurrence: 'monthly', expense_date: '2026-01-05', fund_id: id, status_changes: longest,
        price_changes: Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false })) });
      const withFund = { ...expense(), fund_id: id };
      await owner.store.createExpense(withFund);
      assert.equal((await getDocFromServer(ref(withFund.expense_id))).data()!.fund_id, id);
      const orphan = expense();
      await owner.store.createExpense(orphan);
      assert.ok(!('fund_id' in (await getDocFromServer(ref(orphan.expense_id))).data()!), 'campo omesso senza fondo');
      // Explicit migration of expenses without a fund, on the revisions seen.
      const before = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === orphan.expense_id)!;
      assert.equal(before.fund_id, null);
      assert.equal(await owner.store.assignFund([before], other), 1);
      await assert.rejects(owner.store.assignFund([before], id), /altra sessione/);
      const after = (await owner.store.exportSnapshot()).expenses.find((r) => r.id === orphan.expense_id)!;
      assert.deepEqual([after.fund_id, after.revision, after.amount_minor, after.created_at], [other, 2, before.amount_minor, before.created_at]);
      // Back to «no fund» from the editor: the stored field is removed.
      const { id: _i, created_at: _c, revision: _r, updated_at: _u, ...afterData } = after;
      await owner.store.updateExpense(after, { ...afterData, fund_id: null });
      assert.ok(!('fund_id' in (await getDocFromServer(ref(orphan.expense_id))).data()!));
      // Backup v3 round trip of funds and movements, then a merge of the same file skips everything.
      const snapshot = await owner.store.exportSnapshot();
      const file = parseBackup(JSON.parse(makeBackup(snapshot)));
      assert.ok(file.funds.some((f) => f.id === id) && file.movements.some((m) => m.id === movementId));
      const preview = await owner.store.previewImport(file);
      assert.deepEqual([preview.merge.addFunds.length, preview.merge.addMovements.length, preview.merge.conflicts.length], [0, 0, 0]);
      const imported = { ...data, name: `Importato ${suffix}` };
      const importedFund = { ...imported, id: randomUUID(), created_at: '2026-01-02T00:00:00.000Z' };
      const importedMovement = { id: randomUUID(), kind: 'income' as const, amount_minor: 700, date: today, to_fund_id: importedFund.id, from_fund_id: null, note: '', created_at: '2026-01-03T00:00:00.000Z' };
      await owner.store.importRecords([], [], 'merge', [importedFund], [importedMovement]);
      await owner.store.importRecords([], [], 'merge', [importedFund], [importedMovement]);
      const final = await owner.store.exportSnapshot();
      assert.equal(final.funds.find((f) => f.id === importedFund.id)?.created_at, importedFund.created_at);
      assert.equal(final.movements.filter((m) => m.id === importedMovement.id).length, 1);
      await owner.store.removeMovement(final.movements.find((m) => m.id === movementId)!);
      assert.equal((await getDocFromServer(movementRef(movementId))).exists(), false);
    });
    await t.test('liste: regole, prodotti in scrittura diretta, registrazione unica, modifica e ripristino all’eliminazione', async () => {
      const listRef = (id: string) => doc(owner.db, 'users', uid, 'lists', id);
      const itemRef = (id: string) => doc(owner.db, 'users', uid, 'listItems', id);
      const listId = randomUUID();
      owner.store.createList(listId, { name: `Spesa ${suffix}`, category_id: null }, [{ name: 'Pane', position: 0 }, { name: 'Latte', position: 1 }]);
      await waitForPendingWrites(owner.db);
      const itemsOf = async () => (await owner.store.exportSnapshot()).lists.find((l) => l.id === listId)!;
      const created = await itemsOf();
      assert.deepEqual(created.items.map((i) => [i.name, i.checked]), [['Pane', false], ['Latte', false]]);
      // Ticking, adding, renaming and removing are plain writes (queued by the SDK, no revision).
      const bread = { ...created.items[0]!, list_id: listId };
      const milk = { ...created.items[1]!, list_id: listId };
      owner.store.updateListItem(bread, { checked: true });
      owner.store.addListItem(listId, 'Uova', 2);
      owner.store.updateListItem(milk, { name: 'Latte intero' });
      await waitForPendingWrites(owner.db);
      const edited = await itemsOf();
      assert.deepEqual(edited.items.map((i) => [i.name, i.checked]), [['Pane', true], ['Latte intero', false], ['Uova', false]]);
      // Isolation and Rules on lists and items.
      await denied(getDocsFromServer(collection(intruder.db, 'users', uid, 'lists')));
      await denied(getDocsFromServer(collection(intruder.db, 'users', uid, 'listItems')));
      await denied(setDoc(doc(intruder.db, 'users', uid, 'listItems', randomUUID()), { list_id: listId, name: 'x', checked: false, position: 0 }));
      const rawList = { name: 'Lista', category_id: null, total_minor: null, expense_id: null, created_at: serverTimestamp(), updated_at: serverTimestamp() };
      for (const patch of [{ name: '' }, { name: ' x' }, { name: 'x'.repeat(41) }, { total_minor: 0 }, { total_minor: 1.5 }, { total_minor: 100000000000 },
        { expense_id: 'x' }, { category_id: 'x' }, { extra: true }, { updated_at: Timestamp.fromMillis(1) }]) {
        await denied(setDoc(listRef(randomUUID()), { ...rawList, ...patch }));
      }
      await denied(setDoc(listRef('not-a-uuid'), rawList));
      await denied(updateDoc(listRef(listId), { created_at: Timestamp.fromMillis(1), updated_at: serverTimestamp() }));
      const rawItem = { list_id: listId, name: 'Mele', checked: false, position: 3 };
      for (const patch of [{ name: '' }, { name: 'a\nb' }, { name: 'x'.repeat(61) }, { checked: 'yes' }, { position: -1 }, { position: 1.5 }, { list_id: 'x' }, { extra: 1 }]) {
        await denied(setDoc(itemRef(randomUUID()), { ...rawItem, ...patch }));
      }
      await denied(updateDoc(itemRef(bread.id), { list_id: randomUUID() }));
      // Expenses: list_id + list_items both or neither, one-off only, names joined by '\n' without empty names.
      const { expense_id: _e, status_changes: _s, fund_id: _f, list_id: _l, list_items: _li, ...base } = expense();
      const valid = { ...base, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      await setDoc(ref(randomUUID()), { ...valid, list_id: randomUUID(), list_items: 'Pane\nLatte' });
      await setDoc(ref(randomUUID()), { ...valid, list_id: randomUUID(), list_items: '' });
      for (const patch of [{ list_id: randomUUID() }, { list_items: 'Pane' }, { list_id: 'x', list_items: 'Pane' }, { list_id: null, list_items: '' },
        { list_id: randomUUID(), list_items: ['Pane'] }, { list_id: randomUUID(), list_items: '\nPane' }, { list_id: randomUUID(), list_items: 'Pane\n' },
        { list_id: randomUUID(), list_items: 'Pane\n\nLatte' }, { list_id: randomUUID(), list_items: 'Pane\tx' }, { list_id: randomUUID(), list_items: 'x'.repeat(6101) },
        { list_id: randomUUID(), list_items: 'Pane', recurrence: 'monthly' }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      // Registration: one transaction creates the expense and archives the list; repeating it is harmless; a second one is refused.
      const synced = { id: listId, name: created.name, category_id: null, total_minor: null, expense_id: null, created_at: created.created_at, updated_at: created.created_at };
      const expenseId = randomUUID();
      const { expense_id: _x, ...one } = expense();
      const data = { ...one, amount_minor: 3250, description: created.name, list_id: listId, list_items: ['Pane'] };
      await owner.store.registerList(synced, expenseId, data, true);
      await owner.store.registerList(synced, expenseId, data, true);
      await assert.rejects(owner.store.registerList(synced, randomUUID(), data), /già stata registrata/);
      await assert.rejects(owner.store.registerList(synced, expenseId, { ...data, amount_minor: 1 }), /altra sessione/);
      await assert.rejects(owner.store.registerList(synced, randomUUID(), { ...data, recurrence: 'monthly' }), /non valida/);
      let snapshot = await owner.store.exportSnapshot();
      assert.equal(snapshot.expenses.filter((e) => e.list_id === listId).length, 1);
      const archived = snapshot.lists.find((l) => l.id === listId)!;
      assert.deepEqual([archived.expense_id, archived.total_minor], [expenseId, 3250]);
      assert.equal((await getDocFromServer(ref(expenseId))).data()!.list_items, 'Pane');
      // Editing the expense keeps the link and the products; an archived list refuses checklist edits from the app.
      const saved = snapshot.expenses.find((e) => e.id === expenseId)!;
      await owner.store.updateExpense(saved, { ...dataOf(saved), amount_minor: 3300 });
      assert.equal((await getDocFromServer(ref(expenseId))).data()!.list_items, 'Pane');
      assert.throws(() => owner.store.updateList({ ...synced, expense_id: expenseId }, { name: 'x' }), /non valida/);
      // Backup v4 round trip: the same file merges as identical, nothing added.
      const file = parseBackup(JSON.parse(makeBackup(await owner.store.exportSnapshot())));
      assert.ok(file.lists.some((l) => l.id === listId && l.items.length === 3));
      const preview = await owner.store.previewImport(file);
      assert.deepEqual([preview.merge.addLists.length, preview.merge.conflicts.length], [0, 0]);
      // Deleting the expense brings the list back among the active ones in the same transaction.
      snapshot = await owner.store.exportSnapshot();
      await owner.store.removeExpense(snapshot.expenses.find((e) => e.id === expenseId)!);
      assert.equal((await getDocFromServer(listRef(listId))).data()!.expense_id, null);
      // Import of a new list with items: repeatable, one list and its items only.
      const imported = { id: randomUUID(), name: `Importata ${suffix}`, category_id: null, total_minor: 1200, expense_id: null, created_at: '2026-01-02T00:00:00.000Z',
        items: [{ id: randomUUID(), name: 'Sale', checked: true, position: 0 }] };
      await owner.store.importRecords([], [], 'merge', [], [], [imported]);
      await owner.store.importRecords([], [], 'merge', [], [], [imported]);
      const after = await owner.store.exportSnapshot();
      assert.equal(after.lists.filter((l) => l.id === imported.id).length, 1);
      assert.deepEqual(after.lists.find((l) => l.id === imported.id)!.items.map((i) => i.name), ['Sale']);
      // Deleting a list removes its items too.
      const doomed = after.lists.find((l) => l.id === listId)!;
      owner.store.removeList({ ...doomed, updated_at: doomed.created_at }, doomed.items.map((i) => ({ ...i, list_id: listId })));
      await waitForPendingWrites(owner.db);
      const final = await owner.store.exportSnapshot();
      assert.equal(final.lists.some((l) => l.id === listId), false);
      assert.equal((await getDocsFromServer(collection(owner.db, 'users', uid, 'listItems'))).docs.some((d) => d.data().list_id === listId), false);
    });
    await t.test('esercenti: regole, ID dal nome, creazione con la spesa, un solo esercente per grafia, modifica, rimozione, isolamento', async () => {
      const merchantRef = (id: string) => doc(owner.db, 'users', uid, 'merchants', id);
      const name = `Amazon ${suffix}`;
      const id = `m-amazon ${suffix}`;
      // Rules: only the name, the ID must be the key of the name, no extra fields, no padding or tabs, at most 60 characters.
      for (const [badId, data] of [[id, { name: `Ebay ${suffix}` }], [id, { name, extra: 1 }], [id, { name: ` ${name}` }], [id, {}],
        [`m-${'a'.repeat(61)}`, { name: 'a'.repeat(61) }], [`m-a\tb`, { name: 'A\tb' }], [`m-a  b`, { name: 'A  b' }]] as const) {
        await denied(setDoc(merchantRef(badId), data));
      }
      // Other accounts can neither read nor write them.
      await denied(getDocsFromServer(collection(intruder.db, 'users', uid, 'merchants')));
      await denied(setDoc(doc(intruder.db, 'users', uid, 'merchants', id), { name }));
      await denied(getDocsFromServer(collection(anonymous.db, 'users', uid, 'merchants')));
      // Expense: merchant_id optional, only in the shape of a merchant ID.
      const { expense_id: rawId, ...raw } = expense();
      const { fund_id: _f, list_id: _l, list_items: _i, status_changes: _s, ...plain } = raw;
      void rawId;
      for (const merchant_id of ['', 'amazon', 'm-', 'm-a/b', 42, null]) {
        await denied(setDoc(ref(randomUUID()), { ...plain, merchant_id, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 }));
      }
      // First use: merchant and expense in one write; the other spellings reuse it (the form resolves them to the same ID).
      const first = { ...expense(), merchant_id: id };
      await owner.store.createExpense(first, { id, name });
      assert.deepEqual((await getDocFromServer(merchantRef(id))).data(), { name });
      assert.equal((await getDocFromServer(ref(first.expense_id))).data()!.merchant_id, id);
      const again = { ...expense(), merchant_id: id };
      await owner.store.createExpense(again);
      // Without merchant: the stored document has no field, exactly as before.
      const plainRequest = expense();
      await owner.store.createExpense(plainRequest);
      assert.ok(!('merchant_id' in (await getDocFromServer(ref(plainRequest.expense_id))).data()!));
      const snapshot = await second.store.exportSnapshot();
      assert.deepEqual(snapshot.merchants.filter((m) => m.id === id), [{ id, name }]);
      assert.equal(snapshot.expenses.filter((e) => e.merchant_id === id).length, 2);
      // Listener of the second session.
      const seen = await deadline(new Promise<string[]>((resolve, reject) => {
        const stop = second.store.watchMerchants((s) => { if (s.records.some((m) => m.id === id)) { stop(); resolve(s.records.map((m) => m.id)); } }, reject);
      }));
      assert.ok(seen.includes(id));
      // Edit: another (new) merchant in the same transaction, then removed; the merchants stay.
      const saved = snapshot.expenses.find((e) => e.id === first.expense_id)!;
      const { expense_id: _e, merchant_id: _m, ...data } = first;
      const coopId = `m-coop ${suffix}`;
      await owner.store.updateExpense(saved, { ...data, merchant_id: coopId }, { id: coopId, name: `Coop ${suffix}` });
      assert.equal((await getDocFromServer(ref(first.expense_id))).data()!.merchant_id, coopId);
      assert.ok((await getDocFromServer(merchantRef(coopId))).exists());
      const changed = (await owner.store.exportSnapshot()).expenses.find((e) => e.id === first.expense_id)!;
      await owner.store.updateExpense(changed, data);
      assert.ok(!('merchant_id' in (await getDocFromServer(ref(first.expense_id))).data()!));
      // An existing merchant keeps its name when an edit sends it again.
      const removed = (await owner.store.exportSnapshot()).expenses.find((e) => e.id === first.expense_id)!;
      await owner.store.updateExpense(removed, { ...data, merchant_id: id }, { id, name: name.toUpperCase() });
      assert.equal((await getDocFromServer(merchantRef(id))).data()!.name, name);
      // Backup: merchants and references round-trip.
      const backup = parseBackup(JSON.parse(makeBackup(await owner.store.exportSnapshot())));
      assert.ok(backup.merchants!.some((m) => m.id === id && m.name === name));
      for (const e of (await owner.store.exportSnapshot()).expenses.filter((x) => ([first.expense_id, again.expense_id, plainRequest.expense_id] as string[]).includes(x.id))) await owner.store.removeExpense(e);
    });
    await t.test('esercenti: rinomina, unione e eliminazione dalla pagina Esercenti, spese aggiornate con le revisioni', async () => {
      const merchantRef = (id: string) => doc(owner.db, 'users', uid, 'merchants', id);
      const suffix = randomUUID().slice(0, 8);
      const typo = { id: `m-eselunga ${suffix}`, name: `Eselunga ${suffix}` }, right = { id: `m-esselunga ${suffix}`, name: `Esselunga ${suffix}` };
      const a = { ...expense(), merchant_id: typo.id }, b = { ...expense(), merchant_id: typo.id }, c = { ...expense(), merchant_id: right.id };
      await owner.store.createExpense(a, typo);
      await owner.store.createExpense(b);
      await owner.store.createExpense(c, right);
      const revisionOf = async (id: string) => (await getDocFromServer(ref(id))).data()!.revision as number;
      // Same key: only the name.
      assert.equal(await owner.store.renameMerchant(typo, `eselunga ${suffix}`), 0);
      assert.equal((await getDocFromServer(merchantRef(typo.id))).data()!.name, `eselunga ${suffix}`);
      // Into an existing merchant: the expenses move with a new revision, the old document goes.
      const before = await revisionOf(a.expense_id);
      assert.equal(await owner.store.renameMerchant(typo, `ESSELUNGA ${suffix}`), 2);
      assert.equal((await getDocFromServer(ref(a.expense_id))).data()!.merchant_id, right.id);
      assert.equal(await revisionOf(a.expense_id), before + 1);
      assert.ok(!(await getDocFromServer(merchantRef(typo.id))).exists());
      assert.equal((await getDocFromServer(merchantRef(right.id))).data()!.name, `ESSELUNGA ${suffix}`);
      // Removal: off every expense (field removed), expenses kept, document deleted.
      assert.equal(await owner.store.removeMerchant({ id: right.id, name: `ESSELUNGA ${suffix}` }), 3);
      for (const id of [a.expense_id, b.expense_id, c.expense_id]) assert.ok(!('merchant_id' in (await getDocFromServer(ref(id))).data()!));
      assert.ok(!(await getDocFromServer(merchantRef(right.id))).exists());
      // Another account cannot touch them.
      await denied(deleteDoc(doc(intruder.db, 'users', uid, 'merchants', right.id)));
      for (const e of (await owner.store.exportSnapshot()).expenses.filter((x) => ([a.expense_id, b.expense_id, c.expense_id] as string[]).includes(x.id))) await owner.store.removeExpense(e);
    });
    await t.test('template: regole, scritture dirette con esercente, documento senza esercente, modifica che conserva la creazione, eliminazione e backup', async () => {
      const templateRef = (id: string) => doc(owner.db, 'users', uid, 'templates', id);
      const category_id = randomUUID();
      const data = { description: `Caffè ${suffix}`, amount_minor: null, date: '2026-11-10', category_id, fund_id: null, merchant: null };
      const id = randomUUID();
      owner.store.saveTemplate(id, data);
      await waitForPendingWrites(owner.db);
      const created = (await owner.store.exportSnapshot()).templates.find((x) => x.id === id)!;
      assert.deepEqual([created.description, created.amount_minor, created.fund_id, created.merchant], [data.description, null, null, null]);
      owner.store.saveTemplate(id, { ...data, amount_minor: 180, description: `Colazione ${suffix}`, merchant: 'Bar Roma' }, created);
      await waitForPendingWrites(owner.db);
      const edited = (await owner.store.exportSnapshot()).templates.find((x) => x.id === id)!;
      assert.deepEqual([edited.amount_minor, edited.merchant, edited.created_at], [180, 'Bar Roma', created.created_at]);
      // A document written before 21 November (no `merchant` field) is accepted and read as no merchant; its first edit adds it.
      const oldId = randomUUID();
      const { merchant: _none, ...oldShape } = data;
      await setDoc(templateRef(oldId), { ...oldShape, description: `Vecchio ${suffix}`, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      const old = (await owner.store.exportSnapshot()).templates.find((x) => x.id === oldId)!;
      assert.equal(old.merchant, null);
      owner.store.saveTemplate(oldId, { ...old, merchant: 'Conad' }, old);
      await waitForPendingWrites(owner.db);
      assert.equal((await getDocFromServer(templateRef(oldId))).data()?.merchant, 'Conad');
      // Isolation and Rules.
      await denied(getDocsFromServer(collection(intruder.db, 'users', uid, 'templates')));
      await denied(setDoc(doc(intruder.db, 'users', uid, 'templates', randomUUID()), { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp() }));
      const raw = { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp() };
      for (const patch of [{ description: '' }, { description: ' x' }, { description: 'x'.repeat(101) }, { amount_minor: 0 }, { amount_minor: 1.5 }, { amount_minor: 100000000000 },
        { date: '2026-02-30' }, { date: '1999-12-31' }, { date: '2100-01-01' }, { date: 'ieri' }, { category_id: 'x' }, { category_id: null }, { fund_id: 'x' },
        { merchant: '' }, { merchant: ' Bar' }, { merchant: 'Bar  Roma' }, { merchant: 'x'.repeat(61) }, { merchant: 5 },
        { extra: true }, { updated_at: Timestamp.fromMillis(1) }]) {
        await denied(setDoc(templateRef(randomUUID()), { ...raw, ...patch }));
      }
      await denied(setDoc(templateRef('not-a-uuid'), raw));
      await denied(updateDoc(templateRef(id), { created_at: Timestamp.fromMillis(1), updated_at: serverTimestamp() }));
      // Backup: included, restored identically and repeatable; a replace brings the archive back to the file.
      const file = makeBackup(await owner.store.exportSnapshot());
      assert.ok(JSON.parse(file).templates.some((x: { id: string; merchant?: string }) => x.id === id && x.merchant === 'Bar Roma'));
      const restored = parseBackup(JSON.parse(file));
      const again = () => owner.store.importRecords(restored.expenses, restored.categories, 'merge', restored.funds, restored.movements, restored.lists, restored.budget, restored.merchants, restored.templates);
      await again();
      owner.store.removeTemplate(edited);
      await waitForPendingWrites(owner.db);
      assert.equal((await owner.store.exportSnapshot()).templates.some((x) => x.id === id), false);
      await again();
      const back = (await owner.store.exportSnapshot()).templates.find((x) => x.id === id)!;
      assert.deepEqual([back.description, back.amount_minor, back.merchant, back.created_at], [edited.description, 180, 'Bar Roma', created.created_at]);
      owner.store.removeTemplate(back);
      owner.store.removeTemplate((await owner.store.exportSnapshot()).templates.find((x) => x.id === oldId)!);
      await waitForPendingWrites(owner.db);
    });
    await t.test('migrazione oltre il limite di accessi Rules: gruppi di categorie e spese ripetibili', async () => {
      const categories = Array.from({ length: 30 }, (_, i) => ({ id: randomUUID(), label: `Gruppo ${suffix} ${i}`, icon: null }));
      const records = Array.from({ length: 205 }, () => { const { expense_id, ...data } = expense(); return { ...data, id: expense_id, created_at: '2025-01-01T00:00:00.000Z' }; });
      // Exercise multiple category batches without a category-count limit.
      await owner.store.importRecords(records, categories, 'replace');
      await owner.store.importRecords(records, categories);
      const snapshot = await owner.store.exportSnapshot();
      assert.equal(snapshot.expenses.filter((r) => records.some((e) => e.id === r.id)).length, 205);
      assert.equal(snapshot.categories.filter((r) => categories.some((c) => c.id === r.id)).length, 30);
      const extra = Array.from({ length: 30 }, (_, i) => ({ id: randomUUID(), label: `Extra ${suffix} ${i}`, icon: null }));
      await owner.store.importRecords([], extra);
      await owner.store.importRecords([], extra);
      const id = randomUUID();
      await owner.store.saveCategory(id, `Creata oltre trenta ${suffix}`, null);
      const all = await owner.store.exportSnapshot();
      assert.equal(all.categories.length, 61);
      assert.ok(all.categories.some((c) => c.id === id));
      assert.equal(parseBackup(JSON.parse(makeBackup(all))).categories.length, 61);
    });
    await t.test('importazione che sostituisce: elimina i dati precedenti e importa solo il file, ripetibile', async () => {
      const cats = [{ id: randomUUID(), label: `Sostituita ${suffix}`, icon: null }];
      const records = [{ ...(({ expense_id, ...data }) => ({ ...data, id: expense_id }))(expense()), category_id: cats[0]!.id, created_at: '2025-02-01T00:00:00.000Z' }];
      await owner.store.importRecords(records, cats, 'replace');
      let snapshot = await owner.store.exportSnapshot();
      assert.deepEqual(snapshot.expenses.map((r) => r.id), [records[0]!.id]);
      assert.deepEqual(snapshot.categories.map((r) => r.id), [cats[0]!.id]);
      await owner.store.importRecords(records, cats, 'replace');
      snapshot = await owner.store.exportSnapshot();
      assert.equal(snapshot.expenses.length, 1);
      assert.equal(snapshot.categories.length, 1);
      // Identical items are skipped, not deleted and rewritten: the revision did not move.
      assert.deepEqual([snapshot.expenses[0]!.revision, snapshot.categories[0]!.revision], [1, 1]);
      // Full JSON round trip of what is saved: export, parse, replace again, same archive.
      const restored = parseBackup(JSON.parse(makeBackup(snapshot)));
      await owner.store.importRecords(restored.expenses, restored.categories, 'replace');
      const after = await owner.store.exportSnapshot();
      assert.deepEqual(after.expenses.map((r) => [r.id, r.created_at, r.revision]), snapshot.expenses.map((r) => [r.id, r.created_at, r.revision]));
      // The old name is free again after the replacement.
      await owner.store.saveCategory(randomUUID(), `Gruppo ${suffix} 0`, null);
    });
    await t.test('elimina tutte le spese: solo le spese del proprietario, categorie conservate, ripetibile', async () => {
      await owner.store.createExpense(expense());
      await owner.store.createExpense(expense());
      const before = await owner.store.exportSnapshot();
      assert.ok(before.expenses.length >= 2);
      assert.equal(await owner.store.removeAllExpenses(), before.expenses.length);
      const after = await owner.store.exportSnapshot();
      assert.equal(after.expenses.length, 0);
      assert.deepEqual(after.categories.map((c) => c.id).sort(), before.categories.map((c) => c.id).sort());
      assert.equal(await owner.store.removeAllExpenses(), 0);
    });
    await t.test('logout revoca accesso ai dati del server', async () => {
      await signOut(second.auth);
      await denied(getDocsFromServer(collection(second.db, 'users', uid, 'expenses')));
    });
  } finally {
    for (const c of [owner, second, intruder, anonymous, otherProject]) { await terminate(c.db); await deleteApp(c.app); }
  }
});
