import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, exportCsv, makeBackup, parseBackup, planImport, validateBackupData } from '../src/domain/backup.ts';
import { parseExpenseRecord, parseExpenseRequest, type ExpenseRecord } from '../src/domain/contract.ts';
import { dataOf, newDraft, validateDraft } from '../src/domain/expense.ts';
import { parseSyncedExpense, parseSyncedList } from '../src/domain/firestore.ts';
import { monthOverview, type Fund } from '../src/domain/funds.ts';
import {
  copyItems, decodeListItems, encodeListItems, itemNameError, itemsOf, listNameError, listState, nextPosition, parseListItem,
  parseListRecord, parseShoppingList, progress, purchasedNames, sameListRecord, type ListItem, type ShoppingListRecord,
} from '../src/domain/shoppingList.ts';
import { translate } from '../src/i18n/translate.ts';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = (n: number, patch: Partial<ListItem> = {}): ListItem => ({ id: uuid(100 + n), list_id: uuid(1), name: `Prodotto ${n}`, checked: false, position: n, ...patch });
const list = (patch: Partial<ShoppingListRecord> = {}): ShoppingListRecord => ({
  id: uuid(1), name: 'Supermercato', category_id: null, total_minor: null, expense_id: null, created_at: '2026-11-01T10:00:00.000Z',
  items: [], ...patch,
});
const expense = (patch: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: uuid(900), amount_minor: 4250, currency: 'EUR', description: 'Supermercato', category_id: uuid(50), expense_date: '2026-11-02',
  recurrence: null, price_changes: [], status_changes: [], fund_id: uuid(70), list_id: uuid(1), list_items: ['Pane', 'Latte'],
  source: 'web_app', schema_version: 1, created_at: '2026-11-02T10:00:00.000Z', ...patch,
});

test('liste: nomi validati, prodotti ordinati, avanzamento, posizioni e prodotti acquistati', () => {
  assert.equal(listNameError('  '), 'Inserisci il nome della lista.');
  assert.match(listNameError('x'.repeat(41))!, /40 caratteri/);
  assert.equal(listNameError(' Spesa  sabato '), null);
  assert.equal(itemNameError(''), 'Inserisci il nome del prodotto.');
  assert.match(itemNameError('x'.repeat(61))!, /60 caratteri/);
  assert.match(itemNameError('Pane', 100)!, /100 prodotti/);
  const items = [item(3, { checked: true, name: 'Latte' }), item(1, { name: 'Pane', checked: true }), item(2), { ...item(4), list_id: uuid(2) }];
  assert.deepEqual(itemsOf(uuid(1), items).map((i) => i.position), [1, 2, 3]);
  assert.deepEqual(progress(itemsOf(uuid(1), items)), { done: 2, total: 3 });
  assert.deepEqual(purchasedNames(itemsOf(uuid(1), items)), ['Pane', 'Latte']);
  assert.equal(nextPosition([]), 0);
  assert.equal(nextPosition(items), 5);
  // Copies are unticked and renumbered; «not bought» keeps only the unticked products.
  assert.deepEqual(copyItems(itemsOf(uuid(1), items), false), [{ name: 'Pane', position: 0 }, { name: 'Prodotto 2', position: 1 }, { name: 'Latte', position: 2 }]);
  assert.deepEqual(copyItems(itemsOf(uuid(1), items), true), [{ name: 'Prodotto 2', position: 0 }]);
});

test('liste: stato attiva, registrata o staccata dalla spesa; record e prodotti non validi rifiutati', () => {
  assert.equal(listState({ expense_id: null }, new Set()), 'active');
  assert.equal(listState({ expense_id: uuid(900) }, new Set([uuid(900)])), 'registered');
  assert.equal(listState({ expense_id: uuid(900) }, new Set()), 'detached');
  assert.ok(parseShoppingList(list()));
  for (const patch of [{ name: '' }, { name: ' x' }, { total_minor: 0 }, { total_minor: 1.5 }, { category_id: 'x' }, { expense_id: 'x' }, { id: 'x' }]) {
    assert.equal(parseShoppingList(list(patch as Partial<ShoppingListRecord>)), null, JSON.stringify(patch));
  }
  for (const patch of [{ name: 'a\nb' }, { name: '' }, { checked: 1 }, { position: -1 }, { list_id: 'x' }]) {
    assert.equal(parseListItem(item(1, patch as Partial<ListItem>)), null, JSON.stringify(patch));
  }
  assert.equal(parseSyncedList({ ...list(), updated_at: 'x' }), null);
  assert.ok(parseSyncedList({ ...list(), updated_at: '2026-11-01T10:00:00.000Z' }));
});

test('spesa da lista: campi facoltativi, solo singola, prodotti codificati in una stringa; spese esistenti invariate', () => {
  assert.deepEqual(decodeListItems(encodeListItems(['Pane', 'Latte intero'])), ['Pane', 'Latte intero']);
  assert.deepEqual(decodeListItems(''), []);
  assert.equal(decodeListItems(3), null);
  const record = expense();
  assert.deepEqual(parseExpenseRecord(record)?.list_items, ['Pane', 'Latte']);
  // Records saved before lists existed have neither field: not from a list.
  const { list_id: _, list_items: __, ...legacy } = record;
  const old = parseExpenseRecord(legacy)!;
  assert.deepEqual([old.list_id, old.list_items], [null, []]);
  assert.deepEqual([dataOf(legacy as ExpenseRecord).list_id, dataOf(legacy as ExpenseRecord).list_items], [null, []]);
  for (const patch of [{ recurrence: 'monthly' }, { list_id: null }, { list_items: ['ok', ''] }, { list_items: ['a\nb'] }, { list_items: 'Pane' },
    { list_items: Array.from({ length: 101 }, (_, i) => `P${i}`) }]) {
    assert.equal(parseExpenseRecord({ ...record, ...patch }), null, JSON.stringify(patch).slice(0, 60));
  }
  assert.ok(parseExpenseRecord({ ...record, list_items: [] }), 'a list registered with nothing ticked');
  assert.equal(parseSyncedExpense({ ...record, list_id: 'not-a-uuid', revision: 1, updated_at: record.created_at }), null);
  const { id, created_at: _c, ...data } = record;
  assert.ok(parseExpenseRequest({ ...data, expense_id: id }, new Date('2026-11-05T10:00:00Z')));
  // The form never creates list expenses.
  const draft = validateDraft({ ...newDraft(), amount: '3', description: 'Caffè' }, []);
  assert.ok(draft.ok && draft.data.list_id === null && draft.data.list_items.length === 0);
});

test('fondi: la spesa registrata da una lista conta una volta sola, come ogni altra spesa', () => {
  const wallet: Fund = { id: uuid(70), name: 'Portafoglio', icon: null, color: 0, initial_minor: 10000, start_date: '2026-11-01', recharges: [],
    budgets: [{ month: '2026-11', amount_minor: 20000 }], budget_exceptions: [], archived: false, created_at: '2026-11-01T10:00:00.000Z' };
  const overview = monthOverview({ funds: [wallet], movements: [], expenses: [expense()] }, '2026-11', '2026-11-05');
  assert.equal(overview.funds[0]!.balance, 10000 - 4250);
  assert.equal(overview.funds[0]!.spent, 4250);
});

test('backup corrente: liste con prodotti e collegamento della spesa ricostruiti; v3 letto senza liste; unione ripetibile', () => {
  const registered = list({ expense_id: uuid(900), total_minor: 4250, category_id: uuid(50),
    items: [{ id: uuid(101), name: 'Pane', checked: true, position: 0 }, { id: uuid(102), name: 'Uova', checked: false, position: 1 }] });
  const active = list({ id: uuid(2), name: 'Casa', created_at: '2026-11-03T10:00:00.000Z', items: [{ id: uuid(103), name: 'Detersivo', checked: false, position: 0 }] });
  const file = JSON.parse(makeBackup({ expenses: [expense()], categories: [], lists: [active, registered] }));
  assert.equal(file.version, backupVersion);
  assert.equal(backupVersion, 6);
  assert.deepEqual(file.lists.map((l: { id: string }) => l.id), [uuid(1), uuid(2)]);
  assert.deepEqual(Object.keys(file.lists[0]).sort(), ['category_id', 'created_at', 'expense_id', 'id', 'items', 'name', 'total_minor']);
  assert.deepEqual(file.expenses[0].list_items, ['Pane', 'Latte']);
  const restored = parseBackup(file);
  assert.ok(sameListRecord(restored.lists.find((l) => l.id === uuid(1))!, registered));
  assert.deepEqual(restored.expenses[0]!.list_id, uuid(1));
  // v3 file: no lists, expenses without list fields.
  const v3 = { ...file, version: 3, lists: undefined, expenses: file.expenses.map(({ list_id: _, list_items: __, ...e }: Record<string, unknown>) => e) };
  const old = parseBackup(v3);
  assert.deepEqual(old.lists, []);
  assert.ok(old.expenses.every((e) => e.list_id === null && e.list_items.length === 0));
  // Repeating the same file adds nothing; a changed item makes the list a conflict (merge) or a replacement (replace).
  const current = { expenses: restored.expenses, categories: [], lists: restored.lists };
  const same = planImport(restored, current, 'merge');
  assert.deepEqual([same.addLists.length, same.sameLists, same.conflicts.length], [0, 2, 0]);
  const ticked = { ...restored, lists: restored.lists.map((l) => l.id === uuid(2) ? { ...l, items: l.items.map((i) => ({ ...i, checked: true })) } : l) };
  assert.equal(planImport(ticked, current, 'merge').conflicts[0]?.kind, 'list');
  const replace = planImport(ticked, current, 'replace');
  assert.deepEqual([replace.removeListIds, replace.addLists.map((l) => l.id)], [[uuid(2)], [uuid(2)]]);
  // Strict validation: duplicate list or item IDs, invalid items, too many items.
  assert.throws(() => validateBackupData([], [], [], [], [active, active]), /Liste nel backup/);
  assert.throws(() => validateBackupData([], [], [], [], [active, { ...registered, items: active.items }]), /Liste nel backup/);
  assert.throws(() => validateBackupData([], [], [], [], [{ ...active, items: [{ id: uuid(5), name: '', checked: false, position: 0 }] }]), /Liste nel backup/);
  assert.ok(parseListRecord(registered));
  // The CSV keeps its columns: a list expense is one row like any other.
  const csv = exportCsv([expense()], [], '2026-11-05');
  assert.equal(csv.split('\r\n').filter(Boolean).length, 2);
});

test('liste: testi tradotti in inglese, nomi utente mai tradotti', () => {
  for (const [it, en] of [['Liste', 'Lists'], ['Liste della spesa', 'Shopping lists'], ['Registra spesa', 'Register expense'], ['Totale spesa', 'Shopping total'],
    ['Lista spesa', 'Shopping list'], ['Categorie', 'Categories'], ['Prodotti acquistati', 'Products bought']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
  assert.equal(translate('en', '{p0} di {p1} acquistati', { p0: 3, p1: 10 }), '3 of 10 bought');
  assert.equal(translate('en', 'Supermercato'), 'Supermercato');
});
