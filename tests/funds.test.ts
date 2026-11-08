import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import type { ExpenseRecord } from '../src/domain/contract.ts';
import { applyPriceEdit, dataOf, newDraft, validateDraft } from '../src/domain/expense.ts';
import {
  balanceAt, budgetFor, budgetState, decodeBudgets, decodeRecharges, dueDate, encodeBudgets, encodeRecharges, fundInUse, fundMonth,
  fundNameError, monthOverview, nextFundColor, parseFund, parseMoneyMinor, parseMovement, rechargeCredits, setBudgetException,
  setRecharge, setRecurringBudget, unassignedExpenses, type Fund, type Movement,
} from '../src/domain/funds.ts';
import { parseSyncedFund } from '../src/domain/firestore.ts';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const fund = (n: number, patch: Partial<Fund> = {}): Fund => ({
  id: uuid(n), name: `Fondo ${n}`, icon: null, color: 0, initial_minor: 0, start_date: '2026-01-01',
  recharges: [], budgets: [], budget_exceptions: [], archived: false, created_at: '2026-01-01T10:00:00.000Z', ...patch,
});
const movement = (n: number, patch: Partial<Movement>): Movement => ({
  id: uuid(500 + n), kind: 'income', amount_minor: 1000, date: '2026-02-10', to_fund_id: uuid(1), from_fund_id: null, note: '',
  created_at: '2026-02-10T10:00:00.000Z', ...patch,
});
const expense = (n: number, patch: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: uuid(900 + n), amount_minor: 1000, currency: 'EUR', description: `Spesa ${n}`, category_id: null, expense_date: '2026-02-05',
  recurrence: null, price_changes: [], status_changes: [], fund_id: uuid(1), list_id: null, list_items: [], source: 'web_app', schema_version: 1,
  created_at: '2026-02-05T10:00:00.000Z', ...patch,
});
const university = fund(1, { name: 'Vita universitaria', initial_minor: 50000, recharges: [{ month: '2026-01', amount_minor: 30000, day: 1, active: true }],
  budgets: [{ month: '2026-01', amount_minor: 25000 }] });

test('ricariche: una per mese al giorno scelto, giorni 29–31 riportati all’ultimo del mese, mai prima dell’inizio', () => {
  assert.equal(dueDate('2026-02', 31), '2026-02-28');
  assert.equal(dueDate('2028-02', 30), '2028-02-29');
  assert.equal(dueDate('2026-04', 31), '2026-04-30');
  const salary = fund(2, { start_date: '2026-01-15', recharges: [{ month: '2026-01', amount_minor: 150000, day: 31, active: true }] });
  assert.deepEqual(rechargeCredits(salary, '2026-01-01', '2026-04-30').map((c) => c.date), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  // Started after this month's due day: the first credit is next month.
  const late = fund(3, { start_date: '2026-01-20', recharges: [{ month: '2026-01', amount_minor: 100, day: 10, active: true }] });
  assert.deepEqual(rechargeCredits(late, '2000-01-01', '2026-03-31').map((c) => c.date), ['2026-02-10', '2026-03-10']);
  assert.deepEqual(rechargeCredits(fund(4), '2026-01-01', '2026-12-31'), []);
});

test('saldo: solo ricariche già maturate, mai quelle previste; deterministico a ogni lettura e dopo mancati accessi', () => {
  const sources = { funds: [university], movements: [], expenses: [] };
  // Five months without opening the app: five credits, computed, never stored, never duplicated.
  assert.equal(balanceAt(sources, university.id, '2026-05-20', '2026-05-20'), 50000 + 5 * 30000);
  assert.equal(balanceAt(sources, university.id, '2026-05-20', '2026-05-20'), balanceAt(sources, university.id, '2026-05-20', '2026-05-20'));
  // On the last day of April, May's credit is only planned.
  assert.equal(balanceAt(sources, university.id, '2026-04-30', '2026-04-30'), 50000 + 4 * 30000);
  const may = fundMonth(sources, university.id, '2026-05', '2026-04-30')!;
  assert.equal(may.kind, 'future');
  assert.equal(may.recharges, 0);
  assert.equal(may.forecastRecharges, 30000);
  assert.equal(may.balance, 50000 + 4 * 30000);
  assert.equal(may.closing, 50000 + 5 * 30000);
});

test('saldo, ricarica, budget e spese mensili restano grandezze distinte (500 € · 300 €/mese · budget 250 €)', () => {
  const f = fund(1, { start_date: '2026-03-01', initial_minor: 50000, recharges: [{ month: '2026-03', amount_minor: 30000, day: 1, active: true }],
    budgets: [{ month: '2026-03', amount_minor: 25000 }] });
  const sources = { funds: [f], movements: [], expenses: [expense(1, { expense_date: '2026-03-10', amount_minor: 12000 })] };
  const march = fundMonth(sources, f.id, '2026-03', '2026-03-20')!;
  assert.equal(march.balance, 50000 + 30000 - 12000);
  assert.equal(march.budget, 25000);
  assert.equal(march.spent, 12000);
  assert.equal(march.remaining, 13000);
  assert.equal(march.state, 'ok');
  // Unspent budget stays in the balance; April's budget is again 250 €, not 250 + 130.
  const april = fundMonth(sources, f.id, '2026-04', '2026-04-02')!;
  assert.equal(april.budget, 25000);
  assert.equal(april.remaining, 25000);
  assert.equal(april.balance, 50000 + 2 * 30000 - 12000);
});

test('budget: soglie, superamento senza blocco, eccezioni mensili e ricorrente modificato solo da questo mese', () => {
  assert.equal(budgetState(100, null), 'none');
  assert.equal(budgetState(7999, 10000), 'ok');
  assert.equal(budgetState(8000, 10000), 'near');
  assert.equal(budgetState(10000, 10000), 'reached');
  assert.equal(budgetState(10001, 10000), 'over');
  const f = fund(1, { budgets: [{ month: '2026-01', amount_minor: 20000 }], budget_exceptions: [{ month: '2026-08', amount_minor: 0 }, { month: '2026-12', amount_minor: 40000 }] });
  assert.equal(budgetFor(f, '2025-12'), null); // before the fund
  assert.equal(budgetFor(f, '2026-07'), 20000);
  assert.equal(budgetFor(f, '2026-08'), null);
  assert.equal(budgetFor(f, '2026-12'), 40000);
  const budgets = setRecurringBudget(f, 30000, '2026-05-14')!;
  assert.deepEqual(budgets, [{ month: '2026-01', amount_minor: 20000 }, { month: '2026-05', amount_minor: 30000 }]);
  assert.equal(budgetFor({ ...f, budgets }, '2026-04'), 20000);
  assert.equal(budgetFor({ ...f, budgets }, '2026-05'), 30000);
  assert.deepEqual(setRecurringBudget({ ...f, budgets }, null, '2026-06-01'), [...budgets, { month: '2026-06', amount_minor: 0 }]);
  assert.equal(setBudgetException(f, '2026-04', 100, '2026-05-14'), null); // past month
  assert.deepEqual(setBudgetException(f, '2026-12', null, '2026-05-14'), [{ month: '2026-08', amount_minor: 0 }]);
  // Over budget: still a valid state, spending is never refused.
  const sources = { funds: [{ ...f, budgets }], movements: [], expenses: [expense(1, { expense_date: '2026-05-02', amount_minor: 35000 })] };
  const may = fundMonth(sources, f.id, '2026-05', '2026-05-14')!;
  assert.equal(may.state, 'over');
  assert.equal(may.remaining, -5000);
});

test('modifica della ricarica: vale per le scadenze future, gli accrediti ricevuti restano invariati', () => {
  // On 14 May the 1 May credit was already received: the new amount starts in June.
  const changed = setRecharge(university, { amount_minor: 35000, day: 1, active: true }, '2026-05-14')!;
  assert.deepEqual(changed.at(-1), { month: '2026-06', amount_minor: 35000, day: 1, active: true });
  const before = rechargeCredits(university, '2026-01-01', '2026-05-31');
  assert.deepEqual(rechargeCredits({ ...university, recharges: changed }, '2026-01-01', '2026-05-31'), before);
  assert.equal(rechargeCredits({ ...university, recharges: changed }, '2026-06-01', '2026-06-30')[0]!.amount_minor, 35000);
  // Not yet received this month (due on the 20th): the change already applies to this month.
  const late = fund(5, { recharges: [{ month: '2026-01', amount_minor: 10000, day: 20, active: true }] });
  assert.deepEqual(setRecharge(late, { amount_minor: 12000, day: 25, active: true }, '2026-05-14')!.at(-1), { month: '2026-05', amount_minor: 12000, day: 25, active: true });
  // Pausing: next due dates are not credited; reactivating keeps the history.
  const paused = setRecharge(university, null, '2026-05-14')!;
  assert.deepEqual(paused.at(-1), { month: '2026-06', amount_minor: 30000, day: 1, active: false });
  const pausedFund = { ...university, recharges: paused };
  assert.equal(rechargeCredits(pausedFund, '2026-06-01', '2026-12-31').length, 0);
  assert.equal(rechargeCredits(pausedFund, '2026-01-01', '2026-05-31').length, 5);
  // Several edits in the same month replace each other instead of piling up.
  const twice = setRecharge({ ...university, recharges: changed }, { amount_minor: 36000, day: 1, active: true }, '2026-05-20')!;
  assert.equal(twice.length, changed.length);
  // Same settings as before: nothing new is stored.
  assert.deepEqual(setRecharge(university, { amount_minor: 30000, day: 1, active: true }, '2026-05-14'), university.recharges);
});

test('movimenti: entrate aumentano il saldo; i trasferimenti spostano denaro senza contare come entrate o spese', () => {
  const savings = fund(2, { name: 'Risparmi', initial_minor: 100000 });
  const movements = [movement(1, { amount_minor: 5000 }), movement(2, { kind: 'transfer', amount_minor: 20000, from_fund_id: savings.id, to_fund_id: university.id, date: '2026-02-12' })];
  const withMovements = { funds: [university, savings], movements, expenses: [] };
  const without = { funds: [university, savings], movements: [movements[0]!], expenses: [] };
  const today = '2026-02-20';
  assert.equal(balanceAt(withMovements, university.id, today, today), balanceAt(without, university.id, today, today) + 20000);
  assert.equal(balanceAt(withMovements, savings.id, today, today), 100000 - 20000);
  const a = monthOverview(withMovements, '2026-02', today);
  const b = monthOverview(without, '2026-02', today);
  assert.equal(a.available, b.available); // a transfer creates no money
  assert.equal(a.income, b.income);
  assert.equal(a.spent, b.spent);
  assert.equal(a.income, 30000 + 5000); // February recharge + income
  const feb = a.funds.find((item) => item.fund.id === university.id)!;
  assert.equal(feb.transfersIn, 20000);
  assert.equal(feb.closing, feb.opening + feb.recharges + feb.income + feb.transfersIn - feb.spent);
});

test('spese: ogni occorrenza pagata scala dal fondo; modifica di fondo e importo ricalcolano; pause rispettate', () => {
  const series = expense(1, { recurrence: 'monthly', expense_date: '2026-01-10', amount_minor: 999, status_changes: [{ date: '2026-03-01', status: 'paused' }] });
  const today = '2026-05-31';
  const sources = (expenses: ExpenseRecord[]) => ({ funds: [university, fund(2)], movements: [], expenses });
  // Paid: Jan and Feb only (paused from March).
  assert.equal(balanceAt(sources([series]), university.id, today, today), 50000 + 5 * 30000 - 2 * 999);
  // Moving the series to another fund moves its whole history (the fund is a property of the series).
  const moved = { ...series, fund_id: uuid(2) };
  assert.equal(balanceAt(sources([moved]), university.id, today, today), 50000 + 5 * 30000);
  assert.equal(balanceAt(sources([moved]), uuid(2), today, today), -2 * 999);
  // Deleting the expense restores the balance.
  assert.equal(balanceAt(sources([]), university.id, today, today), 50000 + 5 * 30000);
  // Future renewals of an active series are forecasts of the month, not spending.
  const active = expense(2, { recurrence: 'monthly', expense_date: '2026-01-25', amount_minor: 500 });
  const may = fundMonth(sources([active]), university.id, '2026-05', '2026-05-14')!;
  assert.equal(may.spent, 0);
  assert.equal(may.forecastSpent, 500);
});

test('spese senza fondo: nessun saldo cambia, sono conteggiate nello speso totale e offerte per l’assegnazione', () => {
  const orphan = expense(1, { fund_id: null, amount_minor: 4200 });
  const unknown = expense(2, { fund_id: uuid(77), amount_minor: 800 });
  const sources = { funds: [university], movements: [], expenses: [orphan, unknown, expense(3)] };
  const overview = monthOverview(sources, '2026-02', '2026-02-28');
  assert.equal(overview.unassigned.count, 2);
  assert.equal(overview.unassigned.spent, 5000);
  assert.equal(overview.spent, 5000 + 1000);
  assert.equal(balanceAt(sources, university.id, '2026-02-28', '2026-02-28'), 50000 + 2 * 30000 - 1000);
  assert.deepEqual(unassignedExpenses(sources.expenses, sources.funds).map((e) => e.id), [orphan.id, unknown.id]);
  assert.equal(fundInUse(university.id, sources), true);
  assert.equal(fundInUse(uuid(9), sources), false);
});

test('codifica Firestore e validazione: stringhe compatte, valori invalidi rifiutati', () => {
  const recharges = [{ month: '2026-01', amount_minor: 30000, day: 1, active: true }, { month: '2026-06', amount_minor: 30000, day: 1, active: false }];
  assert.equal(encodeRecharges(recharges), '2026-01:30000:1:a;2026-06:30000:1:p');
  assert.deepEqual(decodeRecharges(encodeRecharges(recharges)), recharges);
  assert.deepEqual(decodeRecharges(''), []);
  assert.deepEqual(decodeBudgets(encodeBudgets([{ month: '2026-01', amount_minor: 0 }])), [{ month: '2026-01', amount_minor: 0 }]);
  for (const bad of ['2026-13:1:1:a', '2026-01:0:1:a', '2026-01:1:32:a', '2026-02:1:1:a;2026-01:1:1:a', 'x', 3]) assert.equal(decodeRecharges(bad), null, String(bad));
  assert.equal(decodeBudgets('2026-01:1;2026-01:2'), null);
  assert.ok(parseFund(university));
  for (const patch of [{ name: '' }, { name: ' x' }, { color: 12 }, { initial_minor: -1 }, { start_date: '2026-02-30' }, { icon: 'nope' },
    { recharges: [{ month: '2025-12', amount_minor: 1, day: 1, active: true }] }, { archived: 'no' }, { id: 'x' }]) {
    assert.equal(parseFund({ ...university, ...patch }), null, JSON.stringify(patch));
  }
  assert.ok(parseMovement(movement(1, {})));
  assert.equal(parseMovement(movement(1, { kind: 'transfer', from_fund_id: uuid(1) })), null); // same fund
  assert.equal(parseMovement(movement(1, { from_fund_id: uuid(2) })), null); // income has no source
  assert.equal(parseMovement(movement(1, { amount_minor: 0 })), null);
  assert.equal(parseSyncedFund({ ...university, revision: 0, updated_at: university.created_at }), null);
  assert.equal(parseMoneyMinor('1.234,50'), 123450);
  assert.equal(parseMoneyMinor('0', true), 0);
  assert.equal(parseMoneyMinor('0'), null);
  assert.equal(fundNameError('vita UNIVERSITARIA', [university]), 'Esiste già un fondo con questo nome.');
  assert.equal(fundNameError('Vita universitaria', [university], university.id), null);
  assert.equal(nextFundColor([university, fund(2, { color: 1 })]), 2);
});

test('modulo spesa: fondo facoltativo, fondo scomparso segnalato, conservato nelle modifiche delle serie', () => {
  const now = new Date('2026-03-10T10:00:00Z');
  const draft = { ...newDraft(), amount: '5', description: 'Pane', date: '2026-03-10' };
  const none = validateDraft(draft, [], now, [university]);
  assert.ok(none.ok && none.data.fund_id === null);
  const chosen = validateDraft({ ...draft, fundId: university.id }, [], now, [university]);
  assert.ok(chosen.ok && chosen.data.fund_id === university.id);
  const gone = validateDraft({ ...draft, fundId: uuid(5) }, [], now, [university]);
  assert.ok(!gone.ok && gone.errors.fundId === 'Il fondo scelto non esiste più.');
  const series = expense(1, { recurrence: 'monthly', expense_date: '2026-01-10' });
  const edited = validateDraft({ ...draft, fundId: uuid(2), repeat: true, recurrence: 'monthly', date: '2026-01-10' }, [], now, [fund(2)]);
  assert.ok(edited.ok);
  if (edited.ok) {
    const applied = applyPriceEdit(series, edited.data, { shownAmount: 500, scope: 'future', changes: [] }, '2026-03-10');
    assert.ok(applied.ok && applied.data.fund_id === uuid(2));
  }
  // Records read before funds existed.
  const { fund_id: _, ...legacy } = series;
  assert.equal(dataOf(legacy as ExpenseRecord).fund_id, null);
});

test('backup v3: fondi, movimenti e fund_id ricostruiti; v2 letto senza fondi; conflitti e nomi duplicati bloccano l’unione', () => {
  const savings = fund(2, { name: 'Risparmi', color: 3, icon: 'piggy', archived: true, budget_exceptions: [{ month: '2026-02', amount_minor: 0 }] });
  const movements = [movement(1, { note: 'Regalo' }), movement(2, { kind: 'transfer', from_fund_id: savings.id, to_fund_id: university.id })];
  const expenses = [expense(1), expense(2, { fund_id: null })];
  const file = JSON.parse(makeBackup({ expenses, categories: [], funds: [savings, university], movements }));
  assert.equal(file.version, backupVersion);
  assert.deepEqual(Object.keys(file.funds[0]).sort(), ['archived', 'budget_exceptions', 'budgets', 'color', 'created_at', 'icon', 'id', 'initial_minor', 'name', 'recharges', 'start_date']);
  const restored = parseBackup(file);
  const byId = <T extends { id: string }>(items: readonly T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(restored.funds), byId([savings, university]));
  assert.deepEqual(byId(restored.movements), byId(movements));
  assert.deepEqual(byId(restored.expenses), byId(expenses));
  // v2 file: no funds, every expense «Senza fondo».
  const v2 = { ...file, version: 2, funds: undefined, movements: undefined, expenses: file.expenses.map(({ fund_id: _, ...e }: Record<string, unknown>) => e) };
  const old = parseBackup(v2);
  assert.deepEqual([old.funds, old.movements], [[], []]);
  assert.ok(old.expenses.every((e) => e.fund_id === null));
  // Identical items skipped; a different saved fund with the same ID or name blocks the merge.
  const current = { expenses, categories: [], funds: [savings, university], movements };
  const same = planImport(restored, current, 'merge');
  assert.deepEqual([same.addFunds.length, same.sameFunds, same.sameMovements, same.conflicts.length], [0, 2, 2, 0]);
  assert.equal(planImport(restored, { ...current, funds: [{ ...savings, initial_minor: 1 }, university] }, 'merge').conflicts[0]!.kind, 'fund');
  const twin = { ...university, id: uuid(40) };
  assert.equal(planImport({ ...restored, funds: [twin] }, current, 'merge').conflicts.length, 1);
  const replace = planImport({ ...restored, funds: [university], movements: [] }, current, 'replace');
  assert.deepEqual([replace.removeFundIds, replace.removeMovementIds.length], [[savings.id], 2]);
  assert.equal(replace.missingFundReferences, 0);
  // Invalid funds or movements reject the whole file.
  assert.throws(() => parseBackup({ ...file, funds: [{ ...file.funds[0], color: 99 }] }), /Fondi nel backup/);
  assert.throws(() => parseBackup({ ...file, movements: [{ ...file.movements[0], date: '2999-01-01' }] }), /Movimenti nel backup/);
});

test('fondi: testi di stato e tipi di movimento tradotti in inglese', async () => {
  const { translate } = await import('../src/i18n/translate.ts');
  for (const [it, en] of [['Fondi e budget', 'Funds and budgets'], ['Trasferimento inviato', 'Transfer sent'], ['Trasferimento ricevuto', 'Transfer received'],
    ['Ricarica mensile', 'Monthly recharge'], ['Previsione', 'Forecast'], ['Mese in corso', 'Current month'], ['Mese concluso', 'Past month'],
    ['Esiste già un fondo con questo nome.', 'A fund with this name already exists.'], ['Il fondo scelto non esiste più.', 'The chosen fund no longer exists.']] as const) {
    assert.equal(translate('en', it), en);
    assert.equal(translate('it', it), it);
  }
});
