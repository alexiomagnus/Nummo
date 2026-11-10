// Funds and budgets (pure, no SDK). Four distinct quantities, never mixed:
// - balance: money actually in a fund = initial + recharges already due + income + transfers in − transfers out − paid expenses;
// - recharge: money added to a fund every month (computed from its schedule, never stored as a document);
// - budget: the spending limit chosen for a month (a number to compare with, it adds or removes no money);
// - monthly spending: paid expense occurrences of the fund in that month.
// Unspent budget stays in the balance and never becomes next month's budget.
//
// Recharges are derived, like the occurrences of a recurring expense: for every month at most one credit, dated on the
// configured day (clamped to shorter months), counted only once its date is ≤ today. Being a pure function of the saved
// schedule, a credit can never be duplicated by restarts, several devices or sync, and a planned credit is never counted
// as received. No automatic writes.
import { isCategoryIcon, normalizeCategoryName, type CategoryIcon } from './category.ts';
import { isUuid } from './contract.ts';
import { isValidDate, normalizeDescription } from './expense.ts';
import { forecastOccurrences, expandOccurrences, type ExpenseEntry, type Occurrence } from './history.ts';
import { expensePolicy } from './policy.ts';

export const fundPolicy = {
  maxNameLength: 40,
  // Balances and movements may exceed a single expense (savings): up to 9.999.999,99 €.
  maxMoneyMinor: 999_999_999,
  // Recharges and budgets: same ceiling as an expense (99.999,99 €).
  maxMonthlyMinor: expensePolicy.maxAmountMinor,
  maxNoteLength: 100,
  // Schedule entries per fund (Rules check them with one regex each).
  maxChanges: 24,
  colorSlots: 12,
} as const;

export type Month = string; // YYYY-MM

// Recharge settings valid from `month` on (until a later entry). amount 0 is never stored: `active: false` pauses.
export type RechargeChange = Readonly<{ month: Month; amount_minor: number; day: number; active: boolean }>;
// Monthly budget from `month` on (recurring) or for that month only (exception); 0 = no budget.
export type BudgetChange = Readonly<{ month: Month; amount_minor: number }>;

export type FundData = Readonly<{
  name: string;
  icon: CategoryIcon | null;
  color: number;
  initial_minor: number;
  // Day the initial balance refers to; recharges are due from this day on. Fixed after creation.
  start_date: string;
  recharges: readonly RechargeChange[];
  budgets: readonly BudgetChange[];
  budget_exceptions: readonly BudgetChange[];
  archived: boolean;
}>;
export type Fund = Readonly<FundData & { id: string; created_at: string }>;

export const movementKinds = ['income', 'transfer'] as const;
export type MovementKind = (typeof movementKinds)[number];
// Income: money added by hand to `to_fund_id`. Transfer: one document moving money between two funds, so it is atomic
// by construction and is neither income nor spending in the totals.
export type MovementData = Readonly<{
  kind: MovementKind; amount_minor: number; date: string; to_fund_id: string; from_fund_id: string | null; note: string;
}>;
export type Movement = Readonly<MovementData & { id: string; created_at: string }>;

// ---- Dates ----

const pad = (value: number) => String(value).padStart(2, '0');
export const monthOf = (date: string): Month => date.slice(0, 7);
export function addMonths(month: Month, count: number): Month {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const total = year * 12 + (m - 1) + count;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}
export function monthBounds(month: Month): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}
export const isMonth = (value: unknown): value is Month => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '2000-01';
// Due date of a monthly credit: the configured day, clamped to the month length (31 → 30/28, 29 → 28).
export function dueDate(month: Month, day: number): string {
  const { to } = monthBounds(month);
  return `${month}-${pad(Math.min(day, Number(to.slice(8))))}`;
}
function previousDay(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

// ---- Schedules ----

// The entry in force in `month`: the latest one starting on or before it.
function inForce<T extends { month: Month }>(changes: readonly T[], month: Month): T | undefined {
  let found: T | undefined;
  for (const change of changes) if (change.month <= month) found = change;
  return found;
}

export type Credit = Readonly<{ fundId: string; date: string; amount_minor: number }>;
// Every recharge credit of a fund with a date in [from, until]. At most one per month; never before the fund's start.
export function rechargeCredits(fund: Pick<Fund, 'id' | 'start_date' | 'recharges'>, from: string, until: string): Credit[] {
  const credits: Credit[] = [];
  if (fund.recharges.length === 0 || until < fund.start_date) return credits;
  const first = monthOf(from > fund.start_date ? from : fund.start_date);
  for (let month = first; month <= monthOf(until); month = addMonths(month, 1)) {
    const change = inForce(fund.recharges, month);
    if (!change || !change.active) continue;
    const date = dueDate(month, change.day);
    if (date >= fund.start_date && date >= from && date <= until) credits.push({ fundId: fund.id, date, amount_minor: change.amount_minor });
  }
  return credits;
}

// Recharge settings currently shown in the editor (the last entry), or null when the fund has never had one.
export function currentRecharge(fund: Pick<Fund, 'recharges'>): RechargeChange | null {
  return fund.recharges[fund.recharges.length - 1] ?? null;
}

// New schedule after editing the recharge on `today`. Credits already due stay untouched: when this month's credit has
// already been received, the new settings apply from next month; otherwise already from this month's due date.
// Past entries are never rewritten; an entry for the same month is replaced (several edits in one month).
export function setRecharge(fund: Pick<Fund, 'start_date' | 'recharges'>, next: { amount_minor: number; day: number; active: boolean } | null, today: string): RechargeChange[] | null {
  const current = monthOf(today);
  const startMonth = monthOf(fund.start_date);
  const base = current < startMonth ? startMonth : current;
  const inForceNow = inForce(fund.recharges, base);
  const credited = Boolean(inForceNow?.active && base === current && dueDate(current, inForceNow.day) <= today && dueDate(current, inForceNow.day) >= fund.start_date);
  const month = credited ? addMonths(current, 1) : base;
  // A fund that never had a recharge and keeps none.
  if (!next && fund.recharges.length === 0) return [];
  const entry: RechargeChange = next ? { month, ...next } : { month, amount_minor: inForceNow?.amount_minor ?? 1, day: inForceNow?.day ?? 1, active: false };
  const kept = fund.recharges.filter((change) => change.month < month);
  const result = [...kept, entry];
  // Dropping a no-op entry keeps the schedule short (same settings as the entry before).
  const before = kept[kept.length - 1];
  const trimmed = before && sameRecharge(before, entry) ? kept : result;
  return trimmed.length > fundPolicy.maxChanges ? null : trimmed;
}
const sameRecharge = (a: RechargeChange, b: RechargeChange) => a.amount_minor === b.amount_minor && a.day === b.day && a.active === b.active;

// Budget of a month: its exception if any, otherwise the recurring amount in force; null = no budget.
export function budgetFor(fund: Pick<Fund, 'start_date' | 'budgets' | 'budget_exceptions'>, month: Month): number | null {
  if (month < monthOf(fund.start_date)) return null;
  const exception = fund.budget_exceptions.find((change) => change.month === month);
  const amount = exception ? exception.amount_minor : inForce(fund.budgets, month)?.amount_minor ?? 0;
  return amount > 0 ? amount : null;
}
// Recurring budget from the current month on (a limit, not money: changing this month's limit alters no balance).
// Months already closed keep the budget they had.
export function setRecurringBudget(fund: Pick<Fund, 'start_date' | 'budgets'>, amount: number | null, today: string): BudgetChange[] | null {
  const month = monthOf(today) < monthOf(fund.start_date) ? monthOf(fund.start_date) : monthOf(today);
  const kept = fund.budgets.filter((change) => change.month < month);
  const previous = kept[kept.length - 1];
  const value = amount ?? 0;
  const result = (previous ? previous.amount_minor === value : value === 0) ? kept : [...kept, { month, amount_minor: value }];
  return result.length > fundPolicy.maxChanges ? null : result;
}
// Exception for one month (current or future): `amount` null removes it, 0 means "no budget that month".
export function setBudgetException(fund: Pick<Fund, 'budget_exceptions'>, month: Month, amount: number | null, today: string): BudgetChange[] | null {
  if (!isMonth(month) || month < monthOf(today)) return null;
  const others = fund.budget_exceptions.filter((change) => change.month !== month);
  const result = amount === null ? others : [...others, { month, amount_minor: amount }].sort((a, b) => a.month.localeCompare(b.month));
  return result.length > fundPolicy.maxChanges ? null : result;
}

// ---- Compact Firestore encoding (one string per schedule keeps the Rules within their expression budget) ----

export function encodeRecharges(changes: readonly RechargeChange[]): string {
  return changes.map((c) => `${c.month}:${c.amount_minor}:${c.day}:${c.active ? 'a' : 'p'}`).join(';');
}
export function encodeBudgets(changes: readonly BudgetChange[]): string {
  return changes.map((c) => `${c.month}:${c.amount_minor}`).join(';');
}
export function decodeRecharges(value: unknown): RechargeChange[] | null {
  if (typeof value !== 'string') return null;
  if (value === '') return [];
  const result: RechargeChange[] = [];
  for (const part of value.split(';')) {
    const match = /^(\d{4}-\d{2}):(\d{1,7}):(\d{1,2}):([ap])$/.exec(part);
    if (!match) return null;
    result.push({ month: match[1]!, amount_minor: Number(match[2]), day: Number(match[3]), active: match[4] === 'a' });
  }
  return parseRecharges(result);
}
export function decodeBudgets(value: unknown): BudgetChange[] | null {
  if (typeof value !== 'string') return null;
  if (value === '') return [];
  const result: BudgetChange[] = [];
  for (const part of value.split(';')) {
    const match = /^(\d{4}-\d{2}):(\d{1,7})$/.exec(part);
    if (!match) return null;
    result.push({ month: match[1]!, amount_minor: Number(match[2]) });
  }
  return parseBudgets(result);
}

// ---- Runtime validation (Firestore, backups) ----

const monthly = (value: unknown, allowZero: boolean) => typeof value === 'number' && Number.isSafeInteger(value)
  && value >= (allowZero ? 0 : 1) && value <= fundPolicy.maxMonthlyMinor;
const increasing = (changes: readonly { month: Month }[]) => changes.every((c, i) => i === 0 || changes[i - 1]!.month < c.month);

export function parseRecharges(value: unknown): RechargeChange[] | null {
  if (!Array.isArray(value) || value.length > fundPolicy.maxChanges) return null;
  const result: RechargeChange[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Object.keys(item).length !== 4 || !isMonth(item.month) || !monthly(item.amount_minor, false)
      || !Number.isSafeInteger(item.day) || item.day < 1 || item.day > 31 || typeof item.active !== 'boolean') return null;
    result.push({ month: item.month, amount_minor: item.amount_minor, day: item.day, active: item.active });
  }
  return increasing(result) ? result : null;
}
// Recurring budgets and exceptions alike: one entry per month, in increasing order.
export function parseBudgets(value: unknown): BudgetChange[] | null {
  if (!Array.isArray(value) || value.length > fundPolicy.maxChanges) return null;
  const result: BudgetChange[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Object.keys(item).length !== 2 || !isMonth(item.month) || !monthly(item.amount_minor, true)) return null;
    result.push({ month: item.month, amount_minor: item.amount_minor });
  }
  return increasing(result) ? result : null;
}

export function fundNameError(name: string, funds: readonly Pick<Fund, 'id' | 'name'>[], selfId?: string): string | null {
  const label = normalizeCategoryName(name);
  if (!label) return 'Inserisci il nome del fondo.';
  if (Array.from(label).length > fundPolicy.maxNameLength) return `Usa al massimo ${fundPolicy.maxNameLength} caratteri.`;
  if (funds.some((fund) => fund.id !== selfId && fund.name.toLocaleLowerCase('it') === label.toLocaleLowerCase('it'))) return 'Esiste già un fondo con questo nome.';
  return null;
}

export function parseFundData(v: Record<string, unknown>): FundData | null {
  const recharges = parseRecharges(v.recharges);
  const budgets = parseBudgets(v.budgets);
  const exceptions = parseBudgets(v.budget_exceptions);
  const name = v.name;
  const ok = typeof name === 'string' && normalizeCategoryName(name) === name && name !== ''
    && Array.from(name).length <= fundPolicy.maxNameLength
    && (v.icon === null || isCategoryIcon(v.icon))
    && typeof v.color === 'number' && Number.isSafeInteger(v.color) && v.color >= 0 && v.color < fundPolicy.colorSlots
    && typeof v.initial_minor === 'number' && Number.isSafeInteger(v.initial_minor) && v.initial_minor >= 0 && v.initial_minor <= fundPolicy.maxMoneyMinor
    && typeof v.start_date === 'string' && isValidDate(v.start_date) && v.start_date >= expensePolicy.minDate
    && typeof v.archived === 'boolean';
  if (!ok || !recharges || !budgets || !exceptions) return null;
  // Schedules never start before the fund.
  const start = monthOf(v.start_date as string);
  if ([...recharges, ...budgets, ...exceptions].some((c) => c.month < start)) return null;
  return {
    name: name as string, icon: v.icon as CategoryIcon | null, color: v.color as number, initial_minor: v.initial_minor as number,
    start_date: v.start_date as string, recharges, budgets, budget_exceptions: exceptions, archived: v.archived as boolean,
  };
}
export function parseFund(value: unknown): Fund | null {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!v || !isUuid(v.id) || typeof v.created_at !== 'string' || !Number.isFinite(Date.parse(v.created_at))) return null;
  const data = parseFundData(v);
  return data && { ...data, id: v.id, created_at: v.created_at };
}

export function parseMovementData(v: Record<string, unknown>): MovementData | null {
  const note = v.note;
  const ok = (movementKinds as readonly unknown[]).includes(v.kind)
    && typeof v.amount_minor === 'number' && Number.isSafeInteger(v.amount_minor) && v.amount_minor > 0 && v.amount_minor <= fundPolicy.maxMoneyMinor
    && typeof v.date === 'string' && isValidDate(v.date) && v.date >= expensePolicy.minDate
    && isUuid(v.to_fund_id)
    && (v.kind === 'income' ? v.from_fund_id === null : isUuid(v.from_fund_id) && v.from_fund_id !== v.to_fund_id)
    && typeof note === 'string' && normalizeDescription(note) === note && Array.from(note).length <= fundPolicy.maxNoteLength;
  return ok ? { kind: v.kind as MovementKind, amount_minor: v.amount_minor as number, date: v.date as string,
    to_fund_id: v.to_fund_id as string, from_fund_id: v.from_fund_id as string | null, note: note as string } : null;
}
export function parseMovement(value: unknown): Movement | null {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!v || !isUuid(v.id) || typeof v.created_at !== 'string' || !Number.isFinite(Date.parse(v.created_at))) return null;
  const data = parseMovementData(v);
  return data && { ...data, id: v.id, created_at: v.created_at };
}

// Amounts typed by the user for balances and movements (0 allowed only where stated), digits only (no float maths).
export function parseMoneyMinor(input: string, allowZero = false): number | null {
  const match = /^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(input.trim().replace(/[.\s](?=\d{3}(\D|$))/g, ''));
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return (allowZero ? amount >= 0 : amount > 0) && amount <= fundPolicy.maxMoneyMinor ? amount : null;
}

// ---- Ledger and summaries ----

export type FundEntryKind = 'initial' | 'recharge' | 'income' | 'transfer-in' | 'transfer-out' | 'expense';
export type FundEntry = Readonly<{
  key: string; fundId: string; date: string; kind: FundEntryKind;
  // Signed: money in > 0, money out < 0.
  amount_minor: number;
  label: string; otherFundId?: string; movementId?: string; expenseId?: string; forecast: boolean;
}>;

type Sources = Readonly<{
  funds: readonly Fund[]; movements: readonly Movement[]; expenses: readonly (ExpenseEntry & { fund_id?: string | null })[];
}>;

// Which fund pays each expense series; unknown or missing funds = «Senza fondo».
function fundOfExpense(sources: Sources): Map<string, string> {
  const known = new Set(sources.funds.map((fund) => fund.id));
  const map = new Map<string, string>();
  for (const expense of sources.expenses) if (expense.fund_id && known.has(expense.fund_id)) map.set(expense.id, expense.fund_id);
  return map;
}

// Every entry of one fund between `from` and `until` (inclusive). Entries after `today` are forecasts: recharges still to
// come and renewals of recurring expenses. One-off expenses and movements are never in the future.
export function fundEntries(sources: Sources, fundId: string, from: string, until: string, today: string): FundEntry[] {
  const fund = sources.funds.find((item) => item.id === fundId);
  if (!fund) return [];
  const owner = fundOfExpense(sources);
  const own = sources.expenses.filter((expense) => owner.get(expense.id) === fundId);
  const entries: FundEntry[] = [];
  if (fund.start_date >= from && fund.start_date <= until) {
    entries.push({ key: `${fundId}:initial`, fundId, date: fund.start_date, kind: 'initial', amount_minor: fund.initial_minor, label: '', forecast: false });
  }
  for (const credit of rechargeCredits(fund, from, until)) {
    entries.push({ key: `${fundId}:recharge:${credit.date}`, fundId, date: credit.date, kind: 'recharge', amount_minor: credit.amount_minor, label: '', forecast: credit.date > today });
  }
  for (const movement of sources.movements) {
    if (movement.date < from || movement.date > until) continue;
    if (movement.to_fund_id === fundId) {
      entries.push({ key: `${movement.id}:in`, fundId, date: movement.date, kind: movement.kind === 'income' ? 'income' : 'transfer-in', amount_minor: movement.amount_minor,
        label: movement.note, otherFundId: movement.from_fund_id ?? undefined, movementId: movement.id, forecast: false });
    } else if (movement.from_fund_id === fundId) {
      entries.push({ key: `${movement.id}:out`, fundId, date: movement.date, kind: 'transfer-out', amount_minor: -movement.amount_minor,
        label: movement.note, otherFundId: movement.to_fund_id, movementId: movement.id, forecast: false });
    }
  }
  const actual = expandOccurrences(own, until < today ? until : today);
  const planned = until > today ? forecastOccurrences(own, today, until) : [];
  for (const occurrence of [...actual, ...planned]) {
    if (occurrence.date < from || occurrence.date > until) continue;
    entries.push({ key: occurrence.key, fundId, date: occurrence.date, kind: 'expense', amount_minor: -occurrence.amount_minor,
      label: occurrence.description, expenseId: occurrence.expenseId, forecast: occurrence.date > today });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.key.localeCompare(b.key));
}
const order: Record<FundEntryKind, number> = { initial: 0, recharge: 1, income: 2, 'transfer-in': 3, 'transfer-out': 4, expense: 5 };

const sum = (entries: readonly FundEntry[]) => entries.reduce((total, entry) => total + entry.amount_minor, 0);

// Balance actually available at the end of `date` (≤ today: only received credits, paid expenses and recorded movements).
export function balanceAt(sources: Sources, fundId: string, date: string, today: string): number {
  const until = date < today ? date : today;
  return sum(fundEntries(sources, fundId, expensePolicy.minDate, until, today));
}

export type MonthKind = 'past' | 'current' | 'future';
export type BudgetState = 'none' | 'ok' | 'near' | 'reached' | 'over';
export type FundMonth = Readonly<{
  fund: Fund; month: Month; kind: MonthKind;
  // Balance at the start of the month (actual for past/current months, projected for future ones).
  opening: number;
  // Received (actual) and still expected (forecast) amounts of the month; `initial` only in the fund's first month.
  initial: number; recharges: number; income: number; transfersIn: number; transfersOut: number; spent: number;
  forecastRecharges: number; forecastSpent: number;
  // End of month: actual for past months; projected (actual so far + forecasts) for the current and future ones.
  closing: number;
  // Balance today (same for every month shown: the money in the fund now).
  balance: number;
  budget: number | null;
  // budget − actual spending; for future months budget − forecast spending. null without a budget.
  remaining: number | null;
  state: BudgetState;
  entries: FundEntry[];
}>;

export function monthKind(month: Month, today: string): MonthKind {
  const current = monthOf(today);
  return month < current ? 'past' : month === current ? 'current' : 'future';
}

// Budget thresholds: near from 80 %, reached at exactly 100 %, over above. Spending is never blocked.
export function budgetState(spent: number, budget: number | null): BudgetState {
  if (budget === null) return 'none';
  if (spent > budget) return 'over';
  if (spent === budget) return 'reached';
  return spent >= budget * 0.8 ? 'near' : 'ok';
}

export function fundMonth(sources: Sources, fundId: string, month: Month, today: string): FundMonth | null {
  const fund = sources.funds.find((item) => item.id === fundId);
  if (!fund) return null;
  const { from, to } = monthBounds(month);
  const kind = monthKind(month, today);
  const before = previousDay(from);
  // Opening balance: actual up to the day before the month; a future month also adds everything forecast before it.
  const opening = sum(fundEntries(sources, fundId, expensePolicy.minDate, before, today));
  const entries = fundEntries(sources, fundId, from, to, today);
  const pick = (k: FundEntryKind, forecast: boolean) => sum(entries.filter((e) => e.kind === k && e.forecast === forecast));
  const spent = 0 - pick('expense', false);
  const forecastSpent = 0 - pick('expense', true);
  const budget = budgetFor(fund, month);
  const measured = kind === 'future' ? forecastSpent : spent;
  return {
    fund, month, kind, opening, entries,
    initial: pick('initial', false), recharges: pick('recharge', false), income: pick('income', false),
    transfersIn: pick('transfer-in', false), transfersOut: 0 - pick('transfer-out', false), spent,
    forecastRecharges: pick('recharge', true), forecastSpent,
    closing: opening + sum(entries),
    balance: balanceAt(sources, fundId, today, today),
    budget, remaining: budget === null ? null : budget - measured, state: budgetState(measured, budget),
  };
}

export type MonthOverview = Readonly<{
  month: Month; kind: MonthKind;
  funds: FundMonth[];
  // Money in every fund today (archived ones included: archiving hides a fund, it does not remove money).
  available: number;
  // Sum of the closing balances of the month (actual for past months, projected otherwise).
  closing: number;
  // Budgets of the month (non-archived funds that have one) and what those funds spent against them.
  budget: number | null; budgetSpent: number; remaining: number | null; state: BudgetState;
  // All paid spending of the month (every fund and «Senza fondo»), and forecast renewals for the rest of it.
  spent: number; forecastSpent: number;
  // Income of the month: recharges received + money added by hand (transfers excluded).
  income: number; forecastIncome: number;
  unassigned: { count: number; spent: number };
}>;

export function monthOverview(sources: Sources, month: Month, today: string): MonthOverview {
  const kind = monthKind(month, today);
  const funds = sources.funds.map((fund) => fundMonth(sources, fund.id, month, today)!);
  const active = funds.filter((item) => !item.fund.archived);
  const budgeted = active.filter((item) => item.budget !== null);
  const budget = budgeted.length ? budgeted.reduce((total, item) => total + item.budget!, 0) : null;
  const budgetSpent = budgeted.reduce((total, item) => total + (kind === 'future' ? item.forecastSpent : item.spent), 0);
  const owner = fundOfExpense(sources);
  const orphan = sources.expenses.filter((expense) => !owner.has(expense.id));
  const { from, to } = monthBounds(month);
  const orphanPaid = expandOccurrences(orphan, to < today ? to : today).filter((o) => o.date >= from && o.date <= to);
  const orphanPlanned = to > today ? forecastOccurrences(orphan, today, to).filter((o) => o.date >= from) : [];
  const total = (items: readonly Occurrence[]) => items.reduce((value, item) => value + item.amount_minor, 0);
  return {
    month, kind, funds,
    available: funds.reduce((value, item) => value + item.balance, 0),
    closing: funds.reduce((value, item) => value + item.closing, 0),
    budget, budgetSpent, remaining: budget === null ? null : budget - budgetSpent, state: budgetState(budgetSpent, budget),
    spent: funds.reduce((value, item) => value + item.spent, 0) + total(orphanPaid),
    forecastSpent: funds.reduce((value, item) => value + item.forecastSpent, 0) + total(orphanPlanned),
    income: funds.reduce((value, item) => value + item.recharges + item.income, 0),
    forecastIncome: funds.reduce((value, item) => value + item.forecastRecharges, 0),
    unassigned: { count: orphan.length, spent: total(orphanPaid) },
  };
}

// A fund can be deleted only while nothing refers to it; otherwise it is archived (history and balances stay).
export function fundInUse(fundId: string, sources: Pick<Sources, 'movements' | 'expenses'>): boolean {
  return sources.movements.some((m) => m.to_fund_id === fundId || m.from_fund_id === fundId)
    || sources.expenses.some((e) => e.fund_id === fundId);
}

// Expenses without a (known) fund: the migration offers to assign them explicitly, never automatically.
export function unassignedExpenses<T extends { id: string; fund_id?: string | null }>(expenses: readonly T[], funds: readonly Pick<Fund, 'id'>[]): T[] {
  const known = new Set(funds.map((fund) => fund.id));
  return expenses.filter((expense) => !expense.fund_id || !known.has(expense.fund_id));
}

// Deterministic colour slot for a new fund: the first slot not used by another fund, cycling afterwards.
export function nextFundColor(funds: readonly Pick<Fund, 'color'>[]): number {
  const used = new Set(funds.map((fund) => fund.color));
  for (let slot = 0; slot < fundPolicy.colorSlots; slot++) if (!used.has(slot)) return slot;
  return funds.length % fundPolicy.colorSlots;
}

export function emptyFund(name: string, start_date: string, color: number): FundData {
  return { name, icon: null, color, initial_minor: 0, start_date, recharges: [], budgets: [], budget_exceptions: [], archived: false };
}

// ---- General monthly budget (issue #7) ----
// An optional spending reference for the whole month, independent of the funds: one recurring schedule (month, amount;
// 0 = none), like a fund's recurring budget and with the same rule: a change applies from the current month on, closed
// months keep what they had. It is a number to compare with: nothing is blocked and no money is added or removed.
export const generalBudgetStart = '2000-01-01';
export const generalBudgetFor = (budgets: readonly BudgetChange[], month: Month): number | null =>
  budgetFor({ start_date: generalBudgetStart, budgets, budget_exceptions: [] }, month);
export const setGeneralBudget = (budgets: readonly BudgetChange[], amount: number | null, today: string): BudgetChange[] | null =>
  setRecurringBudget({ start_date: generalBudgetStart, budgets }, amount, today);
export const sameBudgets = (a: readonly BudgetChange[], b: readonly BudgetChange[]): boolean =>
  a.length === b.length && a.every((change, i) => change.month === b[i]!.month && change.amount_minor === b[i]!.amount_minor);

export type GeneralBudgetMonth = Readonly<{ budget: number | null; spent: number; remaining: number | null; state: BudgetState }>;
// All spending of the month (every fund and «Senza fondo») against the general budget; future months use the forecast.
export function generalBudgetMonth(budgets: readonly BudgetChange[], overview: Pick<MonthOverview, 'month' | 'kind' | 'spent' | 'forecastSpent'>): GeneralBudgetMonth {
  const budget = generalBudgetFor(budgets, overview.month);
  const spent = overview.kind === 'future' ? overview.forecastSpent : overview.spent;
  return { budget, spent, remaining: budget === null ? null : budget - spent, state: budgetState(spent, budget) };
}

// A fund that still carries balance accounting from the earlier version (initial balance, recharges or movements). New funds
// never get any: the page keeps showing balances, recharges and movements only for those, read-only plus the old entries.
export function hasBalanceData(fund: Pick<Fund, 'id' | 'initial_minor' | 'recharges'>, movements: readonly Pick<Movement, 'to_fund_id' | 'from_fund_id'>[]): boolean {
  return fund.initial_minor > 0 || fund.recharges.length > 0 || movements.some((m) => m.to_fund_id === fund.id || m.from_fund_id === fund.id);
}

// Data to save from the simplified fund form (name, icon, colour, optional monthly budget). A new fund starts empty today; an
// existing one is written back with everything the form does not show exactly as saved (initial balance, start date, recharges,
// per-month budget exceptions, archived flag), and only its recurring budget changes, from the current month on.
// null = too many scheduled budget changes.
export function fundFromForm(record: FundData | undefined, form: { name: string; icon: CategoryIcon | null; color: number; budget: number | null }, today: string): FundData | null {
  const name = normalizeCategoryName(form.name);
  if (!record) {
    const base = emptyFund(name, today, form.color);
    return { ...base, icon: form.icon, budgets: form.budget === null ? [] : [{ month: monthOf(today), amount_minor: form.budget }] };
  }
  const budgets = setRecurringBudget(record, form.budget, today);
  if (!budgets) return null;
  return { name, icon: form.icon, color: form.color, initial_minor: record.initial_minor, start_date: record.start_date, recharges: record.recharges,
    budgets, budget_exceptions: record.budget_exceptions, archived: record.archived };
}

// Explicit «no fund» choice of the expense form, and the fund it starts with: the one chosen, else the default fund if it is
// still available, else «no fund». Funds are optional (issue #7), so having funds never forces an extra choice.
export const noFund = 'none';
export function resolveFund(chosen: string, choices: readonly { fund: { id: string } }[], defaultFundId = ''): string {
  if (chosen) return chosen;
  return choices.some((choice) => choice.fund.id === defaultFundId) ? defaultFundId : noFund;
}
