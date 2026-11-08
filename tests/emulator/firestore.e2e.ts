import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, getDocFromServer, getDocsFromServer, collection,
  updateDoc, deleteDoc, serverTimestamp, Timestamp, disableNetwork, enableNetwork, onSnapshot, terminate } from 'firebase/firestore';
import { createFirestoreStore } from '../../src/services/firestoreStore.ts';
import { makeBackup, parseBackup } from '../../src/domain/backup.ts';
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
  expense_date: todayInRome(), recurrence: null, price_changes: [], status_changes: [], fund_id: null, source: 'web_app' as const, schema_version: 1 as const });
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
      // Raw documents in the stored shape: no `status_changes` unless a series has one (see firestoreStore).
      const { expense_id, status_changes: _, fund_id: _fund, ...data } = expense();
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
      const { status_changes: _status, fund_id: _fund, ...storedSeries } = series;
      const valid = { ...storedSeries, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
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
    await t.test('abbonamenti: stati validati dalle regole, campo assente compatibile, storico invariato', async () => {
      const { expense_id, ...data } = expense();
      const series = { ...data, recurrence: 'monthly' as const, expense_date: '2026-01-05', amount_minor: 999, status_changes: [] };
      const { fund_id: _fund, ...storedSeries } = series;
      const valid = { ...storedSeries, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      // Stored form: one string "date:status;…" (see subscription.ts / firestore.rules).
      const eight = Array.from({ length: 8 }, (_, i) => `2026-0${i + 1}-15:${i % 2 ? 'active' : 'paused'}`).join(';');
      for (const patch of [{ status_changes: '2026-03-10:stopped' }, { status_changes: '10/03/2026:paused' }, { status_changes: '' },
        { status_changes: '2026-03-10:paused;' }, { status_changes: [{ date: '2026-03-10', status: 'paused' }] }, { status_changes: `${eight};2026-09-15:cancelled` },
        { recurrence: null, price_changes: [], status_changes: '2026-03-10:paused' }]) {
        await denied(setDoc(ref(randomUUID()), { ...valid, ...patch }));
      }
      // Worst case for the expression budget: eight statuses together with eight price changes.
      const { status_changes: _, ...legacy } = valid;
      await setDoc(ref(randomUUID()), { ...legacy, status_changes: eight, price_changes: Array.from({ length: 8 }, (_, i) => ({ index: i + 1, amount_minor: 100, once: false })) });
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
    await t.test('categorie uniche, rinomina, icone, conflitti ed eliminazione atomica', async () => {
      const id = randomUUID();
      await denied(setDoc(doc(owner.db, 'users', uid, 'categories', id), { label: 'Senza indice', icon: null, name_key: 'n-senza indice', revision: 1, updated_at: serverTimestamp() }));
      await owner.store.saveCategory(id, `Caffè / tè % ${suffix}`, 'coffee');
      let c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
      await assert.rejects(second.store.saveCategory(randomUUID(), `CAFFÈ / TÈ % ${suffix}`, null), /già/);
      await denied(setDoc(doc(owner.db, 'users', uid, 'categoryNames', c.name_key), { category_id: randomUUID() }));
      await owner.store.saveCategory(id, `Bevande ${suffix}`, 'cart', c);
      await assert.rejects(second.store.saveCategory(id, 'Vecchio', null, c), /altra sessione/);
      const openedRevision = c.revision;
      c = (await owner.store.exportSnapshot()).categories.find((c) => c.id === id)!;
      assert.equal(c.label, `Bevande ${suffix}`);
      assert.equal(c.icon, 'cart');
      assert.equal(c.revision, openedRevision + 1);
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
      const data = { name: `Vita ${suffix}`, icon: 'graduation' as const, color: 2, initial_minor: 50000, start_date: today,
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
      // Expenses: fund_id optional (absent = no fund), uuid when present; worst case 8 prices + 8 statuses + fund_id fits the Rules budget.
      const { expense_id: _e, status_changes: _s, fund_id: _f, ...base } = expense();
      const valid = { ...base, created_at: serverTimestamp(), updated_at: serverTimestamp(), revision: 1 };
      await denied(setDoc(ref(randomUUID()), { ...valid, fund_id: 'x' }));
      await denied(setDoc(ref(randomUUID()), { ...valid, fund_id: null }));
      const eight = Array.from({ length: 8 }, (_, i) => `2026-0${i + 1}-15:${i % 2 ? 'active' : 'paused'}`).join(';');
      await setDoc(ref(randomUUID()), { ...valid, recurrence: 'monthly', expense_date: '2026-01-05', fund_id: id, status_changes: eight,
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
    await t.test('logout revoca accesso ai dati del server', async () => {
      await signOut(second.auth);
      await denied(getDocsFromServer(collection(second.db, 'users', uid, 'expenses')));
    });
  } finally {
    for (const c of [owner, second, intruder, anonymous, otherProject]) { await terminate(c.db); await deleteApp(c.app); }
  }
});
