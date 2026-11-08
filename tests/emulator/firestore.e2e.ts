import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, getDocFromServer, getDocsFromServer, collection,
  updateDoc, deleteDoc, serverTimestamp, Timestamp, disableNetwork, enableNetwork, onSnapshot, terminate } from 'firebase/firestore';
import { createFirestoreStore } from '../../src/services/firestoreStore.ts';
import { exportCsv, parseCsvImport } from '../../src/domain/backup.ts';
import { todayInRome } from '../../src/domain/policy.ts';
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
  expense_date: todayInRome(), recurrence: null, price_changes: [], source: 'web_app' as const, schema_version: 1 as const });
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
      const { expense_id, ...data } = expense();
      const valid = { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      for (const patch of [{ amount_minor: 1.5 }, { amount_minor: 0 }, { amount_minor: 10000000 }, { currency: 'USD' },
        { expense_date: '2025-02-30' }, { expense_date: '2099-01-01' }, { category_id: 'invalid' }, { recurrence: 'daily' },
        { description: '' }, { admin: true }, { revision: 2 }, { created_at: 'date' }, { updated_at: Timestamp.fromMillis(1) }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      await setDoc(ref(expense_id), valid);
      await denied(updateDoc(ref(expense_id), { amount_minor: 1, updated_at: serverTimestamp() }));
      await denied(updateDoc(ref(expense_id), { revision: 2, created_at: Timestamp.fromMillis(1), updated_at: serverTimestamp() }));
      await denied(setDoc(ref(expense_id), valid));
    });
    await t.test('piano prezzi: variazioni validate dalle regole, storico stabile dopo la modifica', async () => {
      const { expense_id, ...data } = expense();
      const series = { ...data, recurrence: 'yearly' as const, expense_date: '2025-03-12', amount_minor: 600, price_changes: [{ index: 1, amount_minor: 1200, once: false }] };
      const valid = { ...series, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      const change = { index: 2, amount_minor: 1500, once: true };
      const { price_changes: _, ...withoutField } = valid;
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
    await t.test('categorie uniche, rinomina, icone, conflitti ed eliminazione atomica', async () => {
      const id = randomUUID();
      await denied(setDoc(doc(owner.db, 'users', uid, 'categories', id), { label: 'Senza indice', icon: null, name_key: 'n-senza indice', revision: 1, updated_at: serverTimestamp() }));
      await owner.store.saveCategory(id, `Caffè / tè % ${suffix}`, 'coffee');
      let c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
      await assert.rejects(second.store.saveCategory(randomUUID(), `CAFFÈ / TÈ % ${suffix}`, null), /già/);
      await denied(setDoc(doc(owner.db, 'users', uid, 'categoryNames', c.name_key), { category_id: randomUUID() }));
      await owner.store.saveCategory(id, `Bevande ${suffix}`, 'cart', c);
      await assert.rejects(second.store.saveCategory(id, 'Vecchio', null, c), /altra sessione/);
      c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
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
      const csv = parseCsvImport(exportCsv(records, cats));
      await owner.store.importRecords(csv.expenses, csv.categories);
      await owner.store.importRecords(csv.expenses, csv.categories);
      await owner.store.importRecords(records, cats);
      await assert.rejects(owner.store.importRecords([{ ...records[0]!, amount_minor: 1 }], cats));
      const all = (await owner.store.exportSnapshot()).expenses;
      assert.equal(all.find((r) => r.id === expense_id)?.created_at, records[0]!.created_at);
      assert.equal(all.find((r) => r.id === expense_id)?.amount_minor, 1250);
      assert.equal(all.filter((r) => r.id === expense_id).length, 1);
      assert.deepEqual(all.find((r) => r.id === expense_id)?.price_changes, records[0]!.price_changes);
    });
    await t.test('migrazione oltre il limite di accessi Rules: gruppi di categorie e spese ripetibili', async () => {
      const categories = Array.from({ length: 9 }, (_, i) => ({ id: randomUUID(), label: `Gruppo ${suffix} ${i}`, icon: null }));
      const records = Array.from({ length: 205 }, () => { const { expense_id, ...data } = expense(); return { ...data, id: expense_id, created_at: '2025-01-01T00:00:00.000Z' }; });
      // Replace first: the archive already holds other categories and the limit is 10.
      await owner.store.importRecords(records, categories, 'replace');
      await owner.store.importRecords(records, categories);
      const snapshot = await owner.store.exportSnapshot();
      assert.equal(snapshot.expenses.filter((r) => records.some((e) => e.id === r.id)).length, 205);
      assert.equal(snapshot.categories.filter((r) => categories.some((c) => c.id === r.id)).length, 9);
      // Over the 10-category limit the whole file is refused before any write.
      await assert.rejects(owner.store.importRecords([], Array.from({ length: 2 }, (_, i) => ({ id: randomUUID(), label: `Oltre ${suffix} ${i}`, icon: null }))), /al massimo 10 categorie/);
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
      // The old name is free again after the replacement.
      await owner.store.saveCategory(randomUUID(), `Gruppo ${suffix} 0`, null);
    });
    await t.test('logout revoca accesso ai dati del server', async () => {
      await signOut(second.auth);
      await denied(getDocsFromServer(collection(second.db, 'users', uid, 'expenses')));
    });
  } finally {
    for (const c of [owner, second, intruder, anonymous, otherProject]) { await terminate(c.db); await deleteApp(c.app); }
  }
});
