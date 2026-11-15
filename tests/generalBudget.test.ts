import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, makeBackup, parseBackup, planImport, validateBackupData } from '../src/domain/backup.ts';
import { parseSyncedBudget } from '../src/domain/firestore.ts';
import {
  budgetFor, decodeBudgets, emptyFund, encodeBudgets, fundFromForm, generalBudgetFor, generalBudgetMonth, hasBalanceData, monthOverview, rechargeCredits, parseBudgets, resolveFund, sameBudgets, setGeneralBudget,
  type Fund, type FundData,
} from '../src/domain/funds.ts';

const today = '2026-11-10';
const fund = (over: Partial<Fund> = {}): Fund => ({ id: '10000000-0000-4000-8000-000000000001', created_at: '2026-01-01T00:00:00.000Z',
  ...emptyFund('Vacanze', '2026-01-01', 2), ...over });

test('budget generale: assente = nessun budget, impostazione dal mese corrente, mesi chiusi invariati', () => {
  assert.equal(generalBudgetFor([], '2026-11'), null);
  const first = setGeneralBudget([], 30000, today)!;
  assert.deepEqual(first, [{ month: '2026-11', amount_minor: 30000 }]);
  assert.equal(generalBudgetFor(first, '2026-10'), null, 'il mese precedente non riceve il budget');
  assert.equal(generalBudgetFor(first, '2026-11'), 30000);
  assert.equal(generalBudgetFor(first, '2027-03'), 30000, 'ricorrente: vale anche per i mesi futuri');
  const changed = setGeneralBudget(first, 45000, '2026-12-03')!;
  assert.equal(generalBudgetFor(changed, '2026-11'), 30000, 'il mese chiuso conserva il budget che aveva');
  assert.equal(generalBudgetFor(changed, '2026-12'), 45000);
  const removed = setGeneralBudget(changed, null, '2027-01-02')!;
  assert.equal(generalBudgetFor(removed, '2026-12'), 45000);
  assert.equal(generalBudgetFor(removed, '2027-01'), null);
  assert.ok(sameBudgets(setGeneralBudget(first, 30000, today)!, first), 'stesso importo: nessuna variazione');
});

test('budget generale: speso totale del mese (fondi e senza fondo) contro il limite, previsione per i mesi futuri', () => {
  const budgets = setGeneralBudget([], 10000, today)!;
  const overview = { month: '2026-11', kind: 'current' as const, spent: 8500, forecastSpent: 2000 };
  assert.deepEqual(generalBudgetMonth(budgets, overview), { budget: 10000, spent: 8500, remaining: 1500, state: 'near' });
  assert.equal(generalBudgetMonth(budgets, { ...overview, spent: 12000 }).state, 'over');
  assert.deepEqual(generalBudgetMonth(budgets, { ...overview, month: '2026-12', kind: 'future' }), { budget: 10000, spent: 2000, remaining: 8000, state: 'ok' });
  assert.deepEqual(generalBudgetMonth([], overview), { budget: null, spent: 8500, remaining: null, state: 'none' });
});

test('budget generale: senza fondi la panoramica del mese conta comunque tutte le spese', () => {
  const sources = { funds: [], movements: [], expenses: [{ id: 'e1', amount_minor: 4000, description: 'x', category_id: null, expense_date: '2026-11-03', recurrence: null as null, created_at: '2026-11-03T08:00:00.000Z' }] };
  const overview = monthOverview(sources, '2026-11', today);
  assert.equal(overview.spent, 4000);
  assert.equal(generalBudgetMonth(setGeneralBudget([], 5000, today)!, overview).remaining, 1000);
});

test('budget generale: codec compatto e validazione dei documenti', () => {
  const budgets = [{ month: '2026-01', amount_minor: 20000 }, { month: '2026-11', amount_minor: 30000 }];
  assert.equal(encodeBudgets(budgets), '2026-01:20000;2026-11:30000');
  assert.deepEqual(decodeBudgets('2026-01:20000;2026-11:30000'), budgets);
  assert.deepEqual(decodeBudgets(''), []);
  for (const bad of ['2026-11:x', '2026-13:100', '2026-11:100;2026-10:100', '2026-11:100;']) assert.equal(decodeBudgets(bad), null);
  assert.deepEqual(parseSyncedBudget({ budgets, revision: 2, updated_at: '2026-11-10T10:00:00.000Z' })?.budgets, budgets);
  for (const bad of [null, { budgets, revision: 0, updated_at: '2026-11-10T10:00:00.000Z' }, { budgets: 'x', revision: 1, updated_at: '2026-11-10T10:00:00.000Z' }, { budgets, revision: 1, updated_at: 'ieri' }]) {
    assert.equal(parseSyncedBudget(bad), null);
  }
});

test('fondo semplificato: nuovo fondo vuoto con budget facoltativo, nessun saldo né ricarica', () => {
  const created = fundFromForm(undefined, { name: '  Vacanze ', icon: null, color: 3, budget: null }, today) as FundData;
  assert.deepEqual(created, { name: 'Vacanze', icon: null, color: 3, initial_minor: 0, start_date: today, recharges: [], budgets: [], budget_exceptions: [], archived: false });
  const withBudget = fundFromForm(undefined, { name: 'Casa', icon: 'house', color: 1, budget: 25000 }, today) as FundData;
  assert.deepEqual(withBudget.budgets, [{ month: '2026-11', amount_minor: 25000 }]);
  assert.equal(withBudget.initial_minor, 0);
});

test('fondo semplificato: modificare un fondo con dati di una versione precedente non sovrascrive i campi nascosti', () => {
  const legacy: FundData = { name: 'Vita universitaria', icon: 'bank', color: 5, initial_minor: 123456, start_date: '2026-02-03',
    recharges: [{ month: '2026-02', amount_minor: 40000, day: 5, active: true }], budgets: [{ month: '2026-02', amount_minor: 30000 }],
    budget_exceptions: [{ month: '2026-09', amount_minor: 10000 }, { month: '2026-12', amount_minor: 0 }], archived: true };
  const renamed = fundFromForm(legacy, { name: 'Università', icon: 'bank', color: 5, budget: 30000 }, today)!;
  assert.equal(renamed.name, 'Università');
  assert.equal(renamed.initial_minor, 123456);
  assert.equal(renamed.start_date, '2026-02-03');
  assert.deepEqual(renamed.recharges, legacy.recharges);
  assert.deepEqual(renamed.budget_exceptions, legacy.budget_exceptions, 'anche le eccezioni passate e future');
  assert.deepEqual(renamed.budgets, legacy.budgets, 'stesso budget: nessuna nuova variazione');
  assert.equal(renamed.archived, true);
  const changed = fundFromForm(legacy, { name: 'Università', icon: 'bank', color: 5, budget: 35000 }, today)!;
  assert.deepEqual(changed.budgets, [...legacy.budgets, { month: '2026-11', amount_minor: 35000 }]);
  const noBudget = fundFromForm(legacy, { name: 'Università', icon: 'bank', color: 5, budget: null }, today)!;
  assert.equal(noBudget.budgets.at(-1)?.amount_minor, 0);
  assert.equal(parseBudgets(noBudget.budgets)?.length, 2);
});

test('fondo con budget nascosto: conserva piano futuro ed eccezioni modificando gli altri dati', () => {
  const saved: FundData = { ...emptyFund('Casa', '2026-01-01', 0),
    budgets: [{ month: '2026-01', amount_minor: 20000 }, { month: '2026-12', amount_minor: 35000 }],
    budget_exceptions: [{ month: '2026-12', amount_minor: 50000 }] };
  const edited = fundFromForm(saved, { name: 'Vacanze', icon: 'house', color: 2 }, today)!;
  assert.deepEqual(edited, { ...saved, name: 'Vacanze', icon: 'house', color: 2 });
  assert.equal(budgetFor(edited, '2026-11'), 20000);
  assert.equal(budgetFor(edited, '2026-12'), 50000);
  assert.equal(budgetFor(edited, '2027-01'), 35000);
  const created = fundFromForm(undefined, { name: 'Nuovo', icon: null, color: 0 }, today)!;
  assert.deepEqual(created.budgets, []);
});

test('fondo semplificato: troppe variazioni programmate → null, mai troncate', () => {
  const months = Array.from({ length: 24 }, (_, i) => ({ month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, amount_minor: 100 + i }));
  const full: FundData = { ...emptyFund('Pieno', '2024-01-01', 0), budgets: months };
  assert.equal(fundFromForm(full, { name: 'Pieno', icon: null, color: 0, budget: 999 }, today), null);
});

test('fondi con dati di saldo: riconosciuti solo se hanno saldo iniziale, ricariche o movimenti', () => {
  assert.equal(hasBalanceData(fund(), []), false);
  assert.equal(hasBalanceData(fund({ initial_minor: 100 }), []), true);
  assert.equal(hasBalanceData(fund({ recharges: [{ month: '2026-01', amount_minor: 100, day: 1, active: true }] }), []), true);
  assert.equal(hasBalanceData(fund(), [{ to_fund_id: fund().id, from_fund_id: null }]), true);
  assert.equal(hasBalanceData(fund(), [{ to_fund_id: 'altro', from_fund_id: null }]), false);
});

test('saldo del fondo dal modulo: nuovo fondo con saldo iniziale e ricarica, mai accrediti prima di oggi', () => {
  const created = fundFromForm(undefined, { name: 'Famiglia', icon: null, color: 0,
    balance: { initial_minor: 50000, recharge: { amount_minor: 120000, day: 1 } } }, today)!;
  assert.equal(created.initial_minor, 50000);
  assert.deepEqual(created.recharges, [{ month: '2026-11', amount_minor: 120000, day: 1, active: true }]);
  const credits = rechargeCredits({ ...created, id: 'f' }, '2026-01-01', '2026-12-31');
  assert.deepEqual(credits.map((c) => c.date), ['2026-12-01'], 'il 1° novembre è prima della creazione: si parte da dicembre');
  assert.ok(hasBalanceData({ ...created, id: 'f' }, []));
  const plain = fundFromForm(undefined, { name: 'Casa', icon: null, color: 0, balance: null }, today)!;
  assert.equal(hasBalanceData({ ...plain, id: 'f' }, []), false);
});

test('saldo del fondo dal modulo: su un fondo esistente, ricarica dalla prossima scadenza, saldo iniziale svuotato', () => {
  const old: FundData = emptyFund('Risparmi', '2026-03-01', 1);
  const on = fundFromForm(old, { name: 'Risparmi', icon: null, color: 1, balance: { initial_minor: 0, recharge: { amount_minor: 10000, day: 5 } } }, today)!;
  assert.deepEqual(on.recharges, [{ month: '2026-12', amount_minor: 10000, day: 5, active: true }], 'il 5 novembre è già passato: nessun accredito retroattivo');
  assert.equal(on.start_date, '2026-03-01');
  const later = fundFromForm(old, { name: 'Risparmi', icon: null, color: 1, balance: { initial_minor: 0, recharge: { amount_minor: 10000, day: 20 } } }, today)!;
  assert.deepEqual(later.recharges, [{ month: '2026-11', amount_minor: 10000, day: 20, active: true }], 'scadenza ancora futura: vale già questo mese');
  const initialOnly = fundFromForm(old, { name: 'Risparmi', icon: null, color: 1, balance: { initial_minor: 2500, recharge: null } }, today)!;
  assert.equal(initialOnly.initial_minor, 2500);
  assert.deepEqual(initialOnly.recharges, []);
  // The form has no balance switch: an emptied initial balance with no recharge is a plain fund again.
  const off = fundFromForm(initialOnly, { name: 'Risparmi', icon: null, color: 1, balance: { initial_minor: 0, recharge: null } }, today)!;
  assert.equal(off.initial_minor, 0);
  assert.equal(hasBalanceData({ ...off, id: 'f' }, []), false);
  // With a recharge or a movement the balance stays: switching the recharge off pauses it, the history remains.
  assert.ok(hasBalanceData({ ...off, id: 'f' }, [{ to_fund_id: 'f', from_fund_id: null }]));
  const paused = fundFromForm({ ...later, recharges: [{ month: '2026-06', amount_minor: 10000, day: 20, active: true }] },
    { name: 'Risparmi', icon: null, color: 1, balance: { initial_minor: 0, recharge: null } }, today)!;
  assert.equal(paused.recharges.at(-1)?.active, false);
  assert.ok(hasBalanceData({ ...paused, id: 'f' }, []));
  // Balance omitted (no change asked): saved data untouched.
  assert.deepEqual(fundFromForm(paused, { name: 'Risparmi', icon: null, color: 1 }, today)!.recharges, paused.recharges);
});

test('modulo spesa: con fondi esistenti nessuna scelta obbligatoria, «Nessun fondo» di base', () => {
  const choices = [{ fund: fund(), balance: 0, remaining: null }];
  assert.equal(resolveFund('', choices, ''), 'none');
  assert.equal(resolveFund('', choices, fund().id), fund().id, 'il fondo predefinito resta rispettato');
  assert.equal(resolveFund('', choices, 'non-esiste'), 'none');
  assert.equal(resolveFund(fund().id, choices, ''), fund().id);
});

test('backup: budget generale esportato solo se presente, round trip, lettori e rifiuto dei file precedenti', () => {
  const budget = [{ month: '2026-01', amount_minor: 20000 }, { month: '2026-11', amount_minor: 30000 }];
  const file = JSON.parse(makeBackup({ expenses: [], categories: [], budget }));
  assert.equal(file.version, backupVersion);
  assert.deepEqual(file.general_budget, budget);
  assert.deepEqual(parseBackup(file).budget, budget);
  assert.equal('general_budget' in JSON.parse(makeBackup({ expenses: [], categories: [], budget: [] })), false);
  assert.equal(parseBackup(JSON.parse(makeBackup({ expenses: [], categories: [] }))).budget, undefined);
  for (const version of [1, 2, 3, 4, 5]) assert.throws(() => parseBackup({ ...file, version }), /versione 6/);
  for (const bad of ['x', [{ month: '2026-13', amount_minor: 1 }], [{ month: '2026-11', amount_minor: 1 }, { month: '2026-10', amount_minor: 1 }], [{ month: '2026-11' }]]) {
    assert.throws(() => parseBackup({ ...file, general_budget: bad }), /Budget mensile/);
  }
  assert.throws(() => validateBackupData([], [], [], [], [], [{ month: '2026-11', amount_minor: 0.5 }]));
});

test('importazione: il budget generale riempie solo un budget vuoto, non sovrascrive mai in unione, la sostituzione lo uguaglia', () => {
  const file = [{ month: '2026-11', amount_minor: 30000 }];
  const other = [{ month: '2026-11', amount_minor: 99900 }];
  const base = { expenses: [], categories: [] };
  assert.deepEqual(planImport({ ...base, budget: file }, { ...base }, 'merge').setBudget, file);
  assert.equal(planImport({ ...base, budget: file }, { ...base, budget: file }, 'merge').setBudget, null, 'identico: saltato');
  const blocked = planImport({ ...base, budget: file }, { ...base, budget: other }, 'merge');
  assert.equal(blocked.setBudget, null);
  assert.deepEqual(blocked.conflicts.map((c) => c.kind), ['budget']);
  assert.equal(planImport({ ...base }, { ...base, budget: other }, 'merge').conflicts.length, 0, 'un file senza budget non tocca quello salvato');
  assert.deepEqual(planImport({ ...base, budget: file }, { ...base, budget: other }, 'replace').setBudget, file);
  assert.deepEqual(planImport({ ...base }, { ...base, budget: other }, 'replace').setBudget, [], 'sostituzione con file senza budget: nessun budget');
  assert.equal(planImport({ ...base }, { ...base }, 'replace').setBudget, null);
});

test('panoramica Fondi: i mesi con spese restano raggiungibili anche con fondi creati dopo o senza fondi', async () => {
  const { firstOverviewMonth } = await import('../src/domain/funds.ts');
  assert.equal(firstOverviewMonth([], [], today), '2026-11');
  assert.equal(firstOverviewMonth([], [{ expense_date: '2026-03-14' }], today), '2026-03');
  assert.equal(firstOverviewMonth([fund({ start_date: '2026-11-10' })], [{ expense_date: '2025-12-01' }], today), '2025-12');
  assert.equal(firstOverviewMonth([fund({ start_date: '2025-06-01' })], [{ expense_date: '2026-01-01' }], today), '2025-06');
});
