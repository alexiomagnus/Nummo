import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { AppShell, type Destination } from '../../components/AppShell';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { useSnackbar } from '../../components/SnackbarHost';
import { SyncChip } from '../../components/SyncChip';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { layout, radius, spacing } from '../../theme/tokens';
import { describeSync, hasUsableCategorySnapshot } from './syncStatus';
import { seededKey, shouldSeedDefaultCategories } from './seedDefaults';
import { HybridConnectionNotice } from './HybridConnectionNotice';
import { addDays, expandOccurrences, forecastOccurrences, subscriptionSummaries, upcomingRenewals } from '../../domain/history';
import { dataOf } from '../../domain/expense';
import { setStatus, type SubscriptionStatus } from '../../domain/subscription';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { todayInRome } from '../../domain/policy';
import type { ExpenseRecord } from '../../domain/contract';
import { defaultCategories } from '../../domain/category';
import { CategorySettings } from '../categories/CategorySettings';
import { useRemoteCategories } from '../categories/useRemoteCategories';
import type { DashboardPreferences } from '../settings/preferences';
import { Dashboard } from '../dashboard/Dashboard';
import { ExpenseForm } from '../expenses/ExpenseForm';
import { ExpenseEditor } from '../expenses/ExpenseEditor';
import { useRemoteExpenses } from '../expenses/useRemoteExpenses';
import { ExpenseList } from '../history/ExpenseList';
import { UpcomingRenewals } from '../history/UpcomingRenewals';
import { SubscriptionList } from '../history/SubscriptionList';
import { makeBackup } from '../../domain/backup';
import { backendMode, firestoreEmulator } from '../../services/backendConfig';
import { BackupActions, download } from '../backup/BackupActions';
import { getDatabase } from '../../services/firebase';
import { createFirestoreStore, type FirestoreStore } from '../../services/firestoreStore';
import type { ExpenseStore } from '../expenses/expenseStore';
import { FundsPage } from '../funds/FundsPage';
import { useRemoteFunds, type RemoteFunds } from '../funds/useRemoteFunds';
import { readDefaultFund, writeDefaultFund } from '../funds/defaultFund';
import type { FundChoice } from '../funds/FundField';
import { monthOf, monthOverview } from '../../domain/funds';
import { ListsPage } from '../lists/ListsPage';
import { useRemoteLists, type RemoteLists } from '../lists/useRemoteLists';

const forecastDays = 30;
type Section = 'expense' | 'list' | 'dashboard' | 'funds' | 'lists' | 'categories' | 'backup';
// «Nuova spesa» is the primary action (FAB), not a destination: one primary navigation only.
// Categories and import/export open from the account menu, outside the main destinations.
const destinations: readonly Destination<Section>[] = [
  { value: 'list', label: 'Spese', icon: iconShapes.list },
  { value: 'dashboard', label: 'Dashboard', icon: iconShapes.chart },
  { value: 'funds', label: 'Fondi', icon: iconShapes.wallet },
  { value: 'lists', label: 'Liste', icon: iconShapes.checklist },
];
// The Spese page has two views: one-off expenses and subscriptions (every recurring series), never both.
type ListView = 'expenses' | 'subscriptions';
const listViews = [{ value: 'expenses', label: 'Spese' }, { value: 'subscriptions', label: 'Pagamenti ricorrenti' }] as const;
const headings: Record<Section, string> = { expense: 'Nuova spesa', list: 'Spese', dashboard: 'Dashboard', funds: 'Fondi', lists: 'Liste della spesa', categories: 'Categorie', backup: 'Importa ed esporta' };

const startGateMs = 4000;

// Keyed by UID in App: every listener, draft and view is discarded on account change.
type DashboardSettingsProps = {
  dashboardPreferences: DashboardPreferences;
  onChangeDashboardPreferences: (change: Partial<DashboardPreferences>) => void;
};

export function RemoteWorkspace({ uid, storageNote, topActions, onReleased, dashboardPreferences, onChangeDashboardPreferences, categoriesRequest = 0, backupRequest = 0 }: { uid: string; storageNote: string; topActions?: ReactNode; onReleased?: () => void; categoriesRequest?: number; backupRequest?: number } & DashboardSettingsProps) {
  const { t } = useI18n();
  const backend = useMemo(() => createFirestoreStore(getDatabase(), uid), [uid]);
  const store = useRemoteExpenses(backend, storageNote);
  const categoryState = useRemoteCategories(backend);
  const fundState = useRemoteFunds(backend);
  const listState = useRemoteLists(backend);
  const [section, setSection] = useState<Section>('expense');
  // Account pages return to the originating main section (they are not navigation destinations).
  const [returnTo, setReturnTo] = useState<Section>('list');
  const navigate = (next: Section) => {
    if ((next === 'categories' || next === 'backup') && section !== 'categories' && section !== 'backup') setReturnTo(section);
    setSection(next);
  };
  useEffect(() => { if (categoriesRequest > 0) navigate('categories'); }, [categoriesRequest]);
  // Requests are events: an old request must not reopen the page when the UID workspace remounts.
  const lastBackupRequest = useRef(backupRequest);
  useEffect(() => {
    if (backupRequest === lastBackupRequest.current) return;
    lastBackupRequest.current = backupRequest;
    navigate('backup');
  }, [backupRequest]);
  const [online, setOnline] = useState(navigator.onLine);
  const [today, setToday] = useState(todayInRome());
  useEffect(() => {
    const change = () => { setOnline(navigator.onLine); setToday(todayInRome()); };
    window.addEventListener('online', change); window.addEventListener('offline', change); window.addEventListener('focus', change);
    const timer = setInterval(() => setToday(todayInRome()), 60000);
    return () => { clearInterval(timer); window.removeEventListener('online', change); window.removeEventListener('offline', change); window.removeEventListener('focus', change); };
  }, []);
  const occurrences = useMemo(() => expandOccurrences(store.expenses, today), [store.expenses, today]);
  const subscriptions = useMemo(() => subscriptionSummaries(store.expenses, today), [store.expenses, today]);
  const renewals = useMemo(() => upcomingRenewals(store.expenses, today), [store.expenses, today]);
  const soon = useMemo(() => forecastOccurrences(store.expenses, today, addDays(today, forecastDays)).reduce((sum, item) => sum + item.amount_minor, 0), [store.expenses, today]);
  // Lists count once loaded: a list listener that fails (e.g. Rules not yet published) must not block expenses and funds.
  const pending = Boolean(store.sync?.pending || categoryState.sync.pending || fundState.sync.pending || listState.sync.pending);
  const cached = Boolean(store.sync?.fromCache || categoryState.sync.fromCache || fundState.sync.fromCache || (listState.ready && listState.sync.fromCache));
  // Funds are part of the archive: the form waits for them too, so the fund field never appears late.
  const ready = store.ready && categoryState.ready && fundState.ready;
  const synchronized = ready && !pending && !cached && online;
  const error = store.error || categoryState.error;
  const status = describeSync({ ready, online, pending, cached, error });
  // The first screen waits for what it needs (both first snapshots, usable categories) so it does not appear
  // piece by piece. Released for good by an error or after a few seconds: never a permanent block (offline, slow link).
  const [released, setReleased] = useState(false);
  const dataReady = ready && hasUsableCategorySnapshot(categoryState);
  useEffect(() => {
    if (released) return;
    if (dataReady || error) { setReleased(true); return; }
    const timer = setTimeout(() => setReleased(true), startGateMs);
    return () => clearTimeout(timer);
  }, [released, dataReady, error]);
  // Tells the app that the real screen is ready to replace the startup placeholder (App.tsx).
  useEffect(() => { if (released) onReleased?.(); }, [released]);
  return (
    <AppShell destinations={destinations.map((entry) => ({ ...entry, label: t(entry.label) }))} selected={section} onSelect={navigate}
      fab={{ label: t("Nuova spesa"), icon: iconShapes.plus, target: 'expense' }}
      actions={<><SyncChip status={status} />{topActions}</>}>
      <Sections dashboardPreferences={dashboardPreferences} onChangeDashboardPreferences={onChangeDashboardPreferences} uid={uid} section={section} onNavigate={navigate} returnTo={returnTo} backend={backend} store={store} categoryState={categoryState} starting={!released}
        listState={listState}
        occurrences={occurrences} subscriptions={subscriptions} renewals={renewals} soon={soon} online={online} synchronized={synchronized} error={error}
        fundState={fundState} today={today} />
    </AppShell>
  );
}

// The «Nuova spesa» screen as the real workspace shows it before its data arrives (same shell, same form with
// its fields disabled, same header slots), drawn while Firebase Auth restores the session and the first
// snapshots load, so the layout stays put and only the data appears. It reads nothing and writes nothing.
const idleStore: ExpenseStore = {
  expenses: [], ready: false, error: null, submission: { status: 'draft' }, submit: () => {}, retry: () => {}, startNew: () => {}, storageNote: '',
};
const loadingSync = describeSync({ ready: false, online: true, pending: false, cached: false, error: null });

export function StartupWorkspace({ topActions }: { topActions?: ReactNode }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <AppShell destinations={destinations.map((entry) => ({ ...entry, label: t(entry.label) }))} selected="expense" onSelect={() => {}}
      fab={{ label: t("Nuova spesa"), icon: iconShapes.plus, target: 'expense' }}
      actions={<><SyncChip status={loadingSync} />{topActions}
        {/* Where the account avatar will appear: the buttons beside it do not move. */}
        <View style={styles.avatarSlot}><View style={[styles.avatarDot, { backgroundColor: colors.primaryContainer }]} /></View></>}>
      <PageHeader title={t(headings.expense)} />
      <View style={styles.grow}><View style={styles.grow}><ExpenseForm categories={[]} store={idleStore} /></View></View>
    </AppShell>
  );
}

type SectionsProps = DashboardSettingsProps & {
  uid: string; section: Section; onNavigate: (section: Section) => void; returnTo: Section; backend: FirestoreStore; store: ExpenseStore;
  listState: RemoteLists;
  categoryState: ReturnType<typeof useRemoteCategories>; occurrences: ReturnType<typeof expandOccurrences>;
  subscriptions: ReturnType<typeof subscriptionSummaries>;
  renewals: ReturnType<typeof upcomingRenewals>; soon: number;
  online: boolean; synchronized: boolean; error: string | null; starting: boolean;
  fundState: RemoteFunds; today: string;
};

function Sections({ dashboardPreferences, onChangeDashboardPreferences, uid, section, onNavigate, returnTo, listState, backend, store, categoryState, occurrences, subscriptions, renewals, soon, online, synchronized, error, starting, fundState, today }: SectionsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const notify = useSnackbar();
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [listView, setListView] = useState<ListView>('expenses');
  const [defaultFundId, setDefaultFundId] = useState(() => readDefaultFund(uid));
  const changeDefaultFund = (id: string) => { setDefaultFundId(id); writeDefaultFund(uid, id); };
  // Balance now and remaining budget of this month, for the fund field of the forms (same figures as the Funds page).
  const fundSummary = useMemo(() => monthOverview({ funds: fundState.funds, movements: fundState.movements, expenses: store.expenses }, monthOf(today), today),
    [fundState.funds, fundState.movements, store.expenses, today]);
  const choiceOf = (item: (typeof fundSummary.funds)[number]): FundChoice => ({ fund: item.fund, balance: item.balance, remaining: item.remaining });
  const fundChoices = useMemo(() => fundSummary.funds.filter((item) => !item.fund.archived).map(choiceOf), [fundSummary]);
  const editorFundChoices = editing ? fundSummary.funds.filter((item) => !item.fund.archived || item.fund.id === editing.fund_id).map(choiceOf) : [];
  const fundsError = fundState.ready ? null : fundState.error;
  // Dashboard, CSV and backups keep every paid occurrence; only the Spese list leaves the subscriptions to their own view.
  const oneOff = useMemo(() => occurrences.filter((item) => item.recurrence === null), [occurrences]);
  const edit = (id: string) => setEditing(store.expenses.find((r) => r.id === id) ?? null);
  // Only today's change is written: past occurrences never change (see subscription.ts). Confirmed by the server transaction.
  const changeStatus = async (id: string, status: SubscriptionStatus) => {
    const record = store.expenses.find((r) => r.id === id);
    if (!record || !store.update) return false;
    const changes = setStatus(record.status_changes, status, todayInRome());
    if (!changes) { notify("Troppe variazioni di stato per questo abbonamento: per continuare creane uno nuovo."); return false; }
    const saved = await store.update(record, { ...dataOf(record), status_changes: changes });
    if (saved) notify(status === 'paused' ? "Abbonamento messo in pausa." : status === 'cancelled' ? "Abbonamento annullato." : "Abbonamento riattivato.");
    return saved;
  };
  const heading = t(headings[section]);
  const addDefaults = () => backend.importRecords([], defaultCategories.map((c) => ({ ...c, label: t(c.label), id: crypto.randomUUID() })))
    .then(() => notify("Categorie predefinite aggiunte.")).catch(() => notify("Categorie non aggiunte: verifica connessione o duplicati."));
  // A new account (empty archive confirmed by the server) starts with the default categories, once per browser.
  const seedAttempted = useRef(false);
  const seedable = shouldSeedDefaultCategories({ online, error,
    categories: { ready: categoryState.ready, count: categoryState.categories.length, ...categoryState.sync },
    expenses: { ready: store.ready, count: store.expenses.length, fromCache: Boolean(store.sync?.fromCache), pending: Boolean(store.sync?.pending) } });
  useEffect(() => {
    if (!seedable || seedAttempted.current) return;
    seedAttempted.current = true;
    try {
      if (localStorage.getItem(seededKey(uid))) return;
      localStorage.setItem(seededKey(uid), new Date().toISOString());
    } catch { /* Storage unavailable: the in-memory guard still prevents repeats; the explicit button remains. */ }
    void addDefaults();
  }, [seedable]);
  // Products bought, for the expenses that registered a shopping list (shown in their details).
  const listItems = useMemo(() => new Map(store.expenses.filter((e) => e.list_id).map((e) => [e.id, e.list_items])), [store.expenses]);
  const listNote = editing?.list_id ? (listState.lists.some((l) => l.id === editing.list_id && l.expense_id === editing.id) ? 'linked' : 'unlinked') : undefined;
  return <>
    {/* The Lists page draws its own header (the open list's name is the title). */}
    {section !== 'lists' && <PageHeader title={heading}
      action={section === 'categories' || section === 'backup' ? (
        <Button mode="text" icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />}
          onPress={() => onNavigate(returnTo)}>{t("Fatto")}</Button>
      ) : undefined} />}
    {!!store.recovery?.length && (
      <Card style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
        <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{store.recovery.length === 1 ? t("Una spesa in attesa non risulta confermata") : t("{p0} spese in attesa non risultano confermate", { p0: store.recovery.length })} {t(" sul server. Scaricane una copia prima di chiudere o uscire.")}</Text>
        <View style={styles.start}>
          <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} onPress={() => download('nummo-spese-da-recuperare.json', makeBackup({ expenses: store.recovery!, categories: categoryState.categories }), 'application/json')}>{t("Scarica spese da recuperare")}</Button>
        </View>
      </Card>
    )}
    {backendMode === 'hybrid' && firestoreEmulator && (
      <HybridConnectionNotice waiting={!synchronized && !error} endpoint={firestoreEmulator} />
    )}
    {starting && section !== 'expense' && <View style={styles.starting}><ActivityIndicator accessibilityLabel={t("Caricamento dei dati")} /></View>}
    {/* The form stays mounted at full size (labels measured, draft kept, title in place) while the first data arrives; it is only invisible. */}
    <View style={section === 'expense' ? styles.grow : styles.hidden}>
      {starting && section === 'expense' && <View style={styles.startingOverlay}><ActivityIndicator accessibilityLabel={t("Caricamento dei dati")} /></View>}
      <View style={[styles.grow, starting && styles.invisible]} aria-hidden={starting || undefined} pointerEvents={starting ? 'none' : 'auto'}>
        <ExpenseForm categories={categoryState.categories} onCreateCategory={() => onNavigate('categories')} fundChoices={fundChoices} defaultFundId={defaultFundId}
          store={{ ...store, ready: store.ready && hasUsableCategorySnapshot(categoryState) && fundState.ready, error: store.error || categoryState.error || fundsError }} />
      </View>
    </View>
    {section === 'list' && !starting && (
      <View style={styles.list}>
        <SegmentedButtons label={t("Vista della pagina Spese")} value={listView} onChange={setListView}
          options={listViews.map((view) => ({ ...view, label: t(view.label) }))} />
        {listView === 'expenses' && <ExpenseList occurrences={oneOff} categories={categoryState.categories} error={error} onEdit={edit} listItems={listItems} />}
        {listView === 'subscriptions' && <>
          <UpcomingRenewals renewals={renewals} categories={categoryState.categories} soon={soon} days={forecastDays} />
          <SubscriptionList subscriptions={subscriptions} categories={categoryState.categories} error={error}
            canChange={synchronized && Boolean(store.update)} onEdit={edit} onSetStatus={changeStatus} />
        </>}
      </View>
    )}
    {/* Preserve import previews and in-flight actions when leaving this page; no reads until an explicit action. */}
    <View style={section === 'backup' && !starting ? undefined : styles.hidden}>
      <BackupActions backend={backend} enabled={synchronized} />
    </View>
    {editing && <ExpenseEditor record={editing} categories={categoryState.categories} store={store} close={() => setEditing(null)} fundChoices={editorFundChoices} listNote={listNote} />}
    {section === 'lists' && !starting && <ListsPage remote={listState} categories={categoryState.categories} expenses={store.expenses}
      fundChoices={fundChoices} defaultFundId={defaultFundId} canRegister={synchronized && listState.ready} notify={notify} onCreateCategory={() => onNavigate('categories')} />}
    {section === 'funds' && !starting && <FundsPage remote={fundState} expenses={store.expenses} today={today} canWrite={synchronized}
      defaultFundId={defaultFundId} onSetDefault={changeDefaultFund} notify={notify} />}
    {section === 'dashboard' && !starting && <Dashboard occurrences={occurrences} categories={categoryState.categories}
      preferences={dashboardPreferences} onChangePreferences={onChangeDashboardPreferences} />}
    {section === 'categories' && !starting && <>
      <CategorySettings categories={categoryState.categories} error={categoryState.error} ready={categoryState.ready && online}
        onCreate={categoryState.createCategory} onDelete={categoryState.deleteCategory} onUpdate={categoryState.updateCategory}
        notify={notify}
        onAddDefaults={categoryState.categories.length === 0 ? () => { void addDefaults(); } : undefined} canAddDefaults={synchronized} />
    </>}
  </>;
}

const styles = StyleSheet.create({
  // Pages fill the main area (the shell already caps the width); only the form is a narrow column.
  list: { width: '100%', gap: layout.sectionGap },
  hidden: { display: 'none' },
  invisible: { opacity: 0 },
  starting: { alignItems: 'center', padding: spacing.xxl },
  startingOverlay: { position: 'absolute', top: spacing.xxl, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  grow: { flexGrow: 1 },
  avatarSlot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatarDot: { width: 36, height: 36, borderRadius: 18 },
  alert: { padding: spacing.lg, borderRadius: radius.card },
  start: { alignSelf: 'flex-start' },
});
