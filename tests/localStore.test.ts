import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { makeBackup, parseBackup } from '../src/domain/backup.ts';
import { emptyFund } from '../src/domain/funds.ts';
import { todayInRome } from '../src/domain/policy.ts';
import type { DataStore, SnapshotState } from '../src/services/dataStore.ts';
import { createMemoryDatabase, localMigrations, localSchemaVersion, localStoreNames, newerDatabase, pendingMigrations, type LocalDatabase } from '../src/services/localDatabase.ts';
import { createLocalStore, type ChangeChannel } from '../src/services/localStore.ts';

const today = todayInRome();
const expense = (extra: Record<string, unknown> = {}) => ({ expense_id: randomUUID(), amount_minor: 1250, currency: 'EUR' as const, description: 'Caffè', category_id: null,
  expense_date: today, recurrence: null, price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app' as const, schema_version: 1 as const, ...extra });
const open = (db: LocalDatabase = createMemoryDatabase()) => ({ db, store: createLocalStore(db, null) });
// Latest value of a listener, once it has answered.
function latest<T>(subscribe: (next: (value: T) => void, error: (reason: Error) => void) => () => void) {
  const state: { value?: T; error?: Error; calls: number } = { calls: 0 };
  const stop = subscribe((value) => { state.value = value; state.calls++; }, (error) => { state.error = error; });
  return { state, stop };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const restore = (store: DataStore, json: string, mode: 'merge' | 'replace') => {
  const data = parseBackup(JSON.parse(json));
  return store.importRecords(data.expenses, data.categories, mode, data.funds, data.movements, data.lists, data.budget);
};

test('schema locale: versione = numero di migrazioni, passi mancanti in ordine, versione futura rifiutata', () => {
  assert.equal(localSchemaVersion, localMigrations.length);
  assert.equal(pendingMigrations(0).length, localMigrations.length);
  assert.equal(pendingMigrations(localSchemaVersion).length, 0);
  const steps = [() => {}, () => {}, () => {}];
  assert.deepEqual(pendingMigrations(1, steps), steps.slice(1));
  assert.throws(() => pendingMigrations(steps.length + 1, steps), new RegExp(newerDatabase.slice(0, 20)));
  // The first step creates every object store, keyed by `id`.
  const created: [string, unknown][] = [];
  localMigrations[0]!({ createObjectStore: (name: string, options: unknown) => { created.push([name, options]); } } as unknown as IDBDatabase, {} as IDBTransaction);
  assert.deepEqual(created, localStoreNames.map((name) => [name, { keyPath: 'id' }]));
});

test('database: scritture atomiche, copie isolate, letture dentro la transazione', async () => {
  const db = createMemoryDatabase();
  await assert.rejects(db.write(async (tx) => { tx.put('expenses', { id: 'a' }); throw new Error('stop'); }), /stop/);
  assert.deepEqual(await db.read((tx) => tx.getAll('expenses')), []);
  const row = { id: 'a', nested: { n: 1 } };
  await db.write(async (tx) => { tx.put('expenses', row); assert.equal((await tx.get('expenses', 'a'))?.id, 'a'); });
  row.nested.n = 2;
  const saved = await db.read((tx) => tx.get('expenses', 'a'));
  assert.deepEqual(saved, { id: 'a', nested: { n: 1 } });
  (saved!.nested as { n: number }).n = 3;
  assert.deepEqual(await db.read((tx) => tx.get('expenses', 'a')), { id: 'a', nested: { n: 1 } });
});

test('spese locali: creazione idempotente, listener, modifica con revisione, conflitto ed eliminazione', async () => {
  const { store } = open();
  assert.equal(store.kind, 'local');
  const seen = latest<SnapshotState<{ id: string; amount_minor: number; revision: number }>>(store.watchExpenses);
  await tick();
  assert.deepEqual(seen.state.value, { records: [], fromCache: false, pending: false, pendingIds: [] });
  const request = expense();
  const receipt = await store.createExpense(request);
  assert.equal(receipt.expense_id, request.expense_id);
  // The listener already has the expense when the save resolves.
  assert.equal(seen.state.value!.records.length, 1);
  assert.deepEqual(await store.createExpense(request), receipt, 'stessa richiesta: nessun duplicato');
  await assert.rejects(store.createExpense({ ...request, amount_minor: 1 }), /altra scheda/);
  assert.deepEqual(await store.confirmExpense(request), receipt);
  await assert.rejects(store.confirmExpense(expense()), /non risulta salvata/);
  await assert.rejects(store.createExpense(expense({ amount_minor: 0 })), /Spesa non valida/);
  await assert.rejects(store.createExpense(expense({ expense_date: '2999-01-01' })), /Spesa non valida/);

  const saved = (await store.exportSnapshot()).expenses[0]!;
  const { expense_id, ...data } = request;
  await store.updateExpense(saved, { ...data, amount_minor: 2300 });
  await assert.rejects(store.updateExpense(saved, { ...data, amount_minor: 100 }), /altra scheda/);
  const updated = (await store.exportSnapshot()).expenses[0]!;
  assert.equal(updated.revision, 2);
  assert.equal(updated.amount_minor, 2300);
  assert.equal(updated.created_at, saved.created_at);
  await assert.rejects(store.removeExpense(saved), /altra scheda/);
  await store.removeExpense(updated);
  assert.equal(seen.state.value!.records.length, 0);
  seen.stop();
  await store.createExpense(expense());
  assert.equal(seen.state.value!.records.length, 0, 'listener rimosso');
  assert.equal(typeof await store.lastChange(), 'string');
});

test('persistenza: un nuovo store sullo stesso database rilegge tutto; database diversi restano separati', async () => {
  const { db, store } = open();
  await store.createExpense(expense());
  await store.saveCategory(randomUUID(), 'Casa', 'house');
  const reopened = createLocalStore(db, null);
  const snapshot = await reopened.exportSnapshot();
  assert.equal(snapshot.expenses.length, 1);
  assert.equal(snapshot.categories[0]!.label, 'Casa');
  const other = open().store;
  assert.deepEqual((await other.exportSnapshot()).expenses, []);
  assert.equal(await other.lastChange(), null);
});

test('categorie locali: nomi unici senza distinzione di maiuscole, revisioni, rinomina ed eliminazione', async () => {
  const { store } = open();
  const id = randomUUID();
  await store.saveCategory(id, '  Spesa   casa ', 'cart');
  await assert.rejects(store.saveCategory(randomUUID(), 'spesa CASA', null), /Esiste già una categoria/);
  await assert.rejects(store.saveCategory(id, 'Altro', null), /altra scheda/, 'creazione su ID esistente');
  await assert.rejects(store.saveCategory(randomUUID(), '', null), /Inserisci il nome/);
  const saved = (await store.exportSnapshot()).categories[0]!;
  assert.equal(saved.label, 'Spesa casa');
  await store.saveCategory(id, 'Casa', 'house', saved);
  await assert.rejects(store.saveCategory(id, 'Vecchia', null, saved), /altra scheda/);
  const renamed = (await store.exportSnapshot()).categories[0]!;
  assert.deepEqual([renamed.label, renamed.icon, renamed.revision], ['Casa', 'house', 2]);
  // The old name is free again.
  await store.saveCategory(randomUUID(), 'Spesa casa', null);
  await assert.rejects(store.removeCategory(saved), /altra scheda/);
  await store.removeCategory(renamed);
  assert.deepEqual((await store.exportSnapshot()).categories.map((c) => c.label), ['Spesa casa']);
});

test('fondi, movimenti e budget locali: revisioni, data di inizio fissa, movimento idempotente, assegnazione tutto o niente', async () => {
  const { store } = open();
  const fundId = randomUUID();
  const fund = emptyFund('Vacanze', today, 0);
  await store.saveFund(fundId, fund);
  await assert.rejects(store.saveFund(fundId, fund), /altra scheda/);
  const saved = (await store.exportSnapshot()).funds[0]!;
  await assert.rejects(store.saveFund(fundId, { ...fund, start_date: '2020-01-01' }, saved), /data di inizio/);
  await store.saveFund(fundId, { ...fund, name: 'Viaggi' }, saved);
  const renamed = (await store.exportSnapshot()).funds[0]!;
  assert.deepEqual([renamed.name, renamed.revision, renamed.created_at], ['Viaggi', 2, saved.created_at]);

  const movementId = randomUUID();
  const movement = { kind: 'income' as const, amount_minor: 5000, date: today, to_fund_id: fundId, from_fund_id: null, note: 'Regalo' };
  await store.createMovement(movementId, movement);
  await store.createMovement(movementId, movement);
  await assert.rejects(store.createMovement(movementId, { ...movement, amount_minor: 1 }), /altra scheda/);
  const movements = (await store.exportSnapshot()).movements;
  assert.equal(movements.length, 1);

  const budget = latest<{ budget: { budgets: unknown[]; revision: number } | null }>(store.watchBudget);
  await tick();
  assert.equal(budget.state.value!.budget, null);
  await store.saveBudget([{ month: today.slice(0, 7), amount_minor: 80000 }], null);
  await assert.rejects(store.saveBudget([], null), /altra scheda/);
  assert.equal(budget.state.value!.budget!.revision, 1);
  assert.deepEqual((await store.exportSnapshot()).budget, [{ month: today.slice(0, 7), amount_minor: 80000 }]);

  const [a, b] = [expense(), expense()];
  await store.createExpense(a); await store.createExpense(b);
  const records = (await store.exportSnapshot()).expenses;
  const stale = records;
  const { expense_id: _, ...bData } = b;
  await store.updateExpense(stale.find((r) => r.id === b.expense_id)!, { ...bData, amount_minor: 999 });
  // One of the two records is now stale: nothing is assigned.
  await assert.rejects(store.assignFund(stale, fundId), /altra scheda/);
  assert.ok((await store.exportSnapshot()).expenses.every((r) => r.fund_id === null));
  assert.equal(await store.assignFund((await store.exportSnapshot()).expenses, fundId), 2);
  assert.ok((await store.exportSnapshot()).expenses.every((r) => r.fund_id === fundId));

  await store.removeMovement(movements[0]!);
  await assert.rejects(store.removeMovement(movements[0]!), /altra scheda/);
  await store.removeFund((await store.exportSnapshot()).funds[0]!);
  assert.deepEqual((await store.exportSnapshot()).funds, []);
});

test('liste locali: modifiche in ordine, registrazione unica, eliminazione della spesa che riattiva la lista', async () => {
  const { store } = open();
  const errors: unknown[] = [];
  store.onQueuedWriteError((reason) => errors.push(reason));
  const lists = latest<SnapshotState<{ id: string; expense_id: string | null; name: string; total_minor: number | null }>>(store.watchLists);
  const items = latest<SnapshotState<{ id: string; list_id: string; name: string; checked: boolean; position: number }>>(store.watchListItems);
  const listId = randomUUID();
  store.createList(listId, { name: ' Sabato ', category_id: null }, [{ name: 'Latte', position: 0 }]);
  store.addListItem(listId, 'Pane', 1);
  assert.throws(() => store.addListItem(listId, '', 2), /Prodotto non valido/);
  assert.throws(() => store.createList(randomUUID(), { name: '', category_id: null }), /Lista non valida/);
  await tick();
  assert.equal(lists.state.value!.records[0]!.name, 'Sabato');
  assert.deepEqual(items.state.value!.records.map((i) => i.name).sort(), ['Latte', 'Pane']);
  const bread = items.state.value!.records.find((i) => i.name === 'Pane')!;
  // Two quick edits of the same product keep their order.
  store.updateListItem(bread, { checked: true });
  store.updateListItem({ ...bread, checked: true }, { name: 'Pane integrale' });
  store.updateList(lists.state.value!.records[0] as never, { total_minor: 730 });
  await tick();
  assert.deepEqual(items.state.value!.records.find((i) => i.id === bread.id), { ...bread, checked: true, name: 'Pane integrale' });
  assert.equal(lists.state.value!.records[0]!.total_minor, 730);

  const list = lists.state.value!.records[0] as never;
  const expenseId = randomUUID();
  const { expense_id: _, ...data } = expense({ amount_minor: 730, description: 'Sabato', list_id: listId, list_items: ['Pane integrale'] });
  await assert.rejects(store.registerList(list, expenseId, { ...data, list_id: randomUUID() }), /Spesa non valida/);
  await store.registerList(list, expenseId, data);
  await store.registerList(list, expenseId, data);
  await assert.rejects(store.registerList(list, randomUUID(), data), /già stata registrata/);
  let snapshot = await store.exportSnapshot();
  assert.equal(snapshot.expenses.length, 1);
  assert.deepEqual(snapshot.expenses[0]!.list_items, ['Pane integrale']);
  assert.equal(snapshot.lists[0]!.expense_id, expenseId);
  assert.equal(snapshot.lists[0]!.items.length, 2);
  assert.throws(() => store.updateList(lists.state.value!.records[0] as never, { name: 'Altro' }), /Lista non valida/, 'lista archiviata');

  await store.removeExpense(snapshot.expenses[0]!);
  snapshot = await store.exportSnapshot();
  assert.equal(snapshot.lists[0]!.expense_id, null);
  store.removeListItem(bread as never);
  store.removeList(lists.state.value!.records[0] as never, items.state.value!.records as never);
  await tick();
  assert.deepEqual([lists.state.value!.records.length, items.state.value!.records.length], [0, 0]);
  assert.deepEqual(errors, []);
});

test('backup locale: esportazione e ripristino completo su un dispositivo vuoto, identici e ripetibili', async () => {
  const { store } = open();
  const categoryId = randomUUID(), fundId = randomUUID(), listId = randomUUID();
  await store.saveCategory(categoryId, 'Alimentari', 'cart');
  await store.saveFund(fundId, emptyFund('Casa', today, 1));
  await store.createMovement(randomUUID(), { kind: 'income', amount_minor: 100, date: today, to_fund_id: fundId, from_fund_id: null, note: '' });
  await store.saveBudget([{ month: today.slice(0, 7), amount_minor: 50000 }], null);
  await store.createExpense(expense({ category_id: categoryId, fund_id: fundId }));
  await store.createExpense(expense({ description: 'Musica', recurrence: 'monthly', expense_date: '2026-01-15' }));
  store.createList(listId, { name: 'Lista', category_id: categoryId }, [{ name: 'Uova', position: 0 }]);
  await tick();
  const fixed = new Date('2026-11-12T10:00:00.000Z');
  const json = makeBackup(await store.exportSnapshot(), fixed);

  const fresh = open().store;
  const preview = await fresh.previewImport(parseBackup(JSON.parse(json)));
  assert.deepEqual([preview.merge.addExpenses.length, preview.merge.addCategories.length, preview.merge.addFunds.length, preview.merge.addLists.length, preview.merge.conflicts.length], [2, 1, 1, 1, 0]);
  assert.deepEqual((await fresh.exportSnapshot()).expenses, [], 'l’anteprima non scrive');
  await restore(fresh, json, 'replace');
  assert.equal(makeBackup(await fresh.exportSnapshot(), fixed), json, 'stesso backup dopo il ripristino');
  // Repeating either mode changes nothing: identical items are skipped, never rewritten.
  const before = await fresh.exportSnapshot();
  await restore(fresh, json, 'merge');
  await restore(fresh, json, 'replace');
  assert.deepEqual(await fresh.exportSnapshot(), before);
});

test('ripristino locale: unione bloccata dai conflitti senza modifiche, sostituzione che rende l’archivio uguale al file', async () => {
  const { store } = open();
  const categoryId = randomUUID();
  await store.saveCategory(categoryId, 'Alimentari', 'cart');
  const kept = expense({ category_id: categoryId });
  await store.createExpense(kept);
  const json = makeBackup(await store.exportSnapshot());

  // The device changes after the backup: one expense edited, one added, a category added, a list created.
  const saved = (await store.exportSnapshot()).expenses[0]!;
  const { expense_id: _, ...data } = kept;
  await store.updateExpense(saved, { ...data, amount_minor: 9999 });
  await store.createExpense(expense({ description: 'Nuova' }));
  await store.saveCategory(randomUUID(), 'Extra', null);
  store.createList(randomUUID(), { name: 'Lista', category_id: null }, [{ name: 'Sale', position: 0 }]);
  await tick();
  const changed = await store.exportSnapshot();

  await assert.rejects(restore(store, json, 'merge'), /Importazione bloccata: 1 elementi diversi/);
  assert.deepEqual(await store.exportSnapshot(), changed, 'unione bloccata: nessuna modifica');

  const preview = await store.previewImport(parseBackup(JSON.parse(json)));
  assert.deepEqual([preview.replace.removeExpenseIds.length, preview.replace.removeCategoryIds.length, preview.replace.removeListIds.length, preview.replace.addExpenses.length], [2, 1, 1, 1]);
  await restore(store, json, 'replace');
  const restored = await store.exportSnapshot();
  assert.deepEqual(restored.expenses.map((e) => [e.id, e.amount_minor]), [[kept.expense_id, 1250]]);
  assert.deepEqual(restored.categories.map((c) => c.label), ['Alimentari']);
  assert.deepEqual(restored.lists, []);
  // Invalid files are refused before anything is read or written.
  await assert.rejects(store.importRecords([{ ...restored.expenses[0]!, amount_minor: -1 }], []), /non valide/);
  assert.deepEqual(await store.exportSnapshot(), restored);
});

test('ripristino locale atomico: un errore di scrittura a metà lascia l’archivio com’era', async () => {
  const { db, store } = open();
  await store.createExpense(expense());
  await store.saveCategory(randomUUID(), 'Vecchia', null);
  const before = await store.exportSnapshot();
  const source = open().store;
  await source.saveCategory(randomUUID(), 'Nuova', null);
  for (let i = 0; i < 3; i++) await source.createExpense(expense({ description: `Spesa ${i}` }));
  const json = makeBackup(await source.exportSnapshot());
  // The device fails (e.g. no space left) after deletions and some additions have been made in the transaction.
  let puts = 0;
  const failing: LocalDatabase = { ...db, write: (work) => db.write((tx) => work({ ...tx, put: (name, row) => { if (name === 'expenses' && ++puts === 2) throw new Error('QuotaExceededError'); tx.put(name, row); } })) };
  await assert.rejects(restore(createLocalStore(failing, null), json, 'replace'), /QuotaExceededError/);
  assert.deepEqual(await store.exportSnapshot(), before);
  await restore(store, json, 'replace');
  assert.deepEqual((await store.exportSnapshot()).categories.map((c) => c.label), ['Nuova']);
});

test('archivio locale corrotto: righe non valide bloccano lettura ed esportazione invece di sparire', async () => {
  const { db, store } = open();
  await store.createExpense(expense());
  await db.write(async (tx) => { tx.put('expenses', { id: randomUUID(), amount_minor: 'molto' }); });
  const seen = latest(store.watchExpenses);
  await tick();
  assert.match(seen.state.error?.message ?? '', /Archivio non valido/);
  assert.equal(seen.state.value, undefined);
  await assert.rejects(store.exportSnapshot(), /Archivio non valido/);
  await assert.rejects(store.importRecords([], []), /Archivio non valido/);
});

test('più schede: una modifica avvisa le altre, che rileggono dal database condiviso', async () => {
  const db = createMemoryDatabase();
  const channels: ChangeChannel[] = [];
  const channel = (): ChangeChannel => {
    const self: ChangeChannel = { onmessage: null, close: () => {}, postMessage: (message) => { for (const other of channels) if (other !== self) other.onmessage?.({ data: message }); } };
    channels.push(self);
    return self;
  };
  const first = createLocalStore(db, channel());
  const second = createLocalStore(db, channel());
  const seen = latest<SnapshotState<{ id: string }>>(second.watchExpenses);
  let changes = 0;
  second.onChange(() => { changes++; });
  await tick();
  await first.createExpense(expense());
  await tick();
  assert.equal(seen.state.value!.records.length, 1);
  assert.equal(changes, 1);
  // The second tab edits on the revision it saw; the first tab's stale copy is then refused.
  const record = (await second.exportSnapshot()).expenses[0]!;
  const { id: _id, created_at: _c, revision: _r, updated_at: _u, ...data } = record;
  await second.updateExpense(record, { ...data, amount_minor: 1 });
  await assert.rejects(first.removeExpense(record), /altra scheda/);
});
