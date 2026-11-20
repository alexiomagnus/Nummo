import { skipPayment } from '../../domain/skippedPayments';
import { useI18n } from '../../i18n/I18nProvider';
import { Activity, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { addDays, allFunds, effectiveFundFilter, expandOccurrences, filterByFund, forecastOccurrences, matchesFund, subscriptionSummaries, upcomingRenewals } from '../../domain/history';
import { dataOf } from '../../domain/expense';
import { setStatus, type SubscriptionStatus } from '../../domain/subscription';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { todayInRome } from '../../domain/policy';
import type { ExpenseRecord } from '../../domain/contract';
import type { Category } from '../../domain/category';
import { defaultCategories } from '../../domain/category';
import { CategorySettings } from '../categories/CategorySettings';
import { useRemoteCategories } from '../categories/useRemoteCategories';
import type { DashboardPreferences } from '../settings/preferences';
import { Dashboard } from '../dashboard/Dashboard';
import { ExpenseForm } from '../expenses/ExpenseForm';
import { ExpenseEditor } from '../expenses/ExpenseEditor';
import { useRemoteExpenses } from '../expenses/useRemoteExpenses';
import { useRemoteMerchants } from '../expenses/useRemoteMerchants';
import { rankMerchants, type RankedMerchant } from '../../domain/merchant';
import { ExpenseList } from '../history/ExpenseList';
import { UpcomingRenewals } from '../history/UpcomingRenewals';
import { SubscriptionList } from '../history/SubscriptionList';
import { makeBackup } from '../../domain/backup';
import { backendMode, firestoreEmulator } from '../../services/backendConfig';
import { BackupActions, download, downloadBackup } from '../backup/BackupActions';
import { message } from '../expenses/useRemoteExpenses';
import { NotificationsPage } from '../notifications/NotificationsPage';
import { useNotifications, type LocalArchive } from '../notifications/useNotifications';
import { onNotificationOpened, type OpenedNotification } from '../../services/pushNotifications';
import { getDatabase } from '../../services/firebase';
import { createFirestoreStore } from '../../services/firestoreStore';
import type { DataStore } from '../../services/dataStore';
import type { ExpenseStore } from '../expenses/expenseStore';
import { FundsPage } from '../funds/FundsPage';
import { FundFilter } from '../funds/FundFilter';
import { useRemoteFunds, type RemoteFunds } from '../funds/useRemoteFunds';
import { readDefaultFund, writeDefaultFund } from '../funds/defaultFund';
import { DoneButton } from '../../components/DoneButton';
import { PreferredCategoriesCard } from '../categories/PreferredCategoriesCard';
import { PreferredFundCard } from '../funds/PreferredFundCard';
import { readPreferredCategories, writePreferredCategories, type PreferredCategories } from '../categories/preferredCategories';
import type { FundChoice } from '../funds/FundField';
import { monthOf, monthOverview } from '../../domain/funds';
import { ListsPage } from '../lists/ListsPage';
import { useRemoteLists, type RemoteLists } from '../lists/useRemoteLists';

const forecastDays = 30;
type Section = 'expense' | 'list' | 'dashboard' | 'funds' | 'lists' | 'categories' | 'backup' | 'settings' | 'notifications';
// «Nuova spesa» is the primary action (FAB), not a destination: one primary navigation only.
// Categories and import/export open from the account menu, outside the main destinations.
const destinations: readonly Destination<Section>[] = [
  { value: 'list', label: 'Spese', icon: iconShapes.list },
  { value: 'dashboard', label: 'Analisi', icon: iconShapes.chart },
  { value: 'funds', label: 'Fondi', icon: iconShapes.wallet },
  { value: 'lists', label: 'Liste', icon: iconShapes.checklist },
];
// The Spese page has two views: one-off expenses and subscriptions (every recurring series), never both.
type ListView = 'expenses' | 'subscriptions';
// Short labels keep the segmented button on one line at every width; the accessible name of the second is the full one.
const listViews = [{ value: 'expenses', label: 'Spese', full: 'Spese' }, { value: 'subscriptions', label: 'Abbonamenti', full: 'Pagamenti ricorrenti' }] as const;
const headings: Record<Section, string> = { expense: 'Nuova spesa', list: 'Spese', dashboard: 'Analisi', funds: 'Fondi', lists: 'Liste della spesa', categories: 'Categorie', backup: 'Archiviazione e backup', settings: 'Impostazioni', notifications: 'Notifiche' };

// Pages of the account menu: outside the destinations, «Fatto» returns where they were opened from.
const accountPages: ReadonlySet<Section> = new Set(['categories', 'backup', 'settings', 'notifications']);

const startGateMs = 4000;

// Keyed by UID in App: every listener, draft and view is discarded on account change.
type DashboardSettingsProps = {
  dashboardPreferences: DashboardPreferences;
  onChangeDashboardPreferences: (change: Partial<DashboardPreferences>) => void;
};

// `renderSettings` draws the settings page (preferences live in App); `onDone` returns to the originating section.
type AccountPageProps = { categoriesRequest?: number; backupRequest?: number; settingsRequest?: number; notificationsRequest?: number; renderSettings?: (onDone: () => void, archiveSections?: ReactNode) => ReactNode;
  // Storage section of the backup page (where the data is, protection, mode change), drawn by the app for the current mode.
  storage?: ReactNode };

// `localArchive`: the device archive's change clock, given only in the Standard mode (backup reminder).
type WorkspaceProps = { storageNote: string; topActions?: ReactNode; onReleased?: () => void; localArchive?: LocalArchive } & AccountPageProps & DashboardSettingsProps;

// «Avanzata»: the archive of the signed-in owner in their Firebase project.
export function RemoteWorkspace({ uid, ...props }: { uid: string } & WorkspaceProps) {
  const backend = useMemo(() => createFirestoreStore(getDatabase(), uid), [uid]);
  return <DataWorkspace backend={backend} scope={uid} {...props} />;
}

// The workspace on any store (Firestore or this device). `scope` names the archive for the few browser-side
// identifiers kept per archive (default fund, one-time default categories): the UID, or `local`.
export function DataWorkspace({ backend, scope: uid, storageNote, topActions, onReleased, localArchive, dashboardPreferences, onChangeDashboardPreferences, categoriesRequest = 0, backupRequest = 0, settingsRequest = 0, notificationsRequest = 0, renderSettings, storage }: { backend: DataStore; scope: string } & WorkspaceProps) {
  const local = backend.kind === 'local';
  const store = useRemoteExpenses(backend, storageNote);
  const categoryState = useRemoteCategories(backend);
  const fundState = useRemoteFunds(backend);
  const listState = useRemoteLists(backend);
  const merchantState = useRemoteMerchants(backend);
  // The device archive needs no network: «online» only gates what waits for a server.
  const [browserOnline, setOnline] = useState(navigator.onLine);
  const online = local || browserOnline;
  const [today, setToday] = useState(todayInRome());
  useEffect(() => {
    const change = () => { setOnline(navigator.onLine); setToday(todayInRome()); };
    window.addEventListener('online', change); window.addEventListener('offline', change); window.addEventListener('focus', change);
    const timer = setInterval(() => setToday(todayInRome()), 60000);
    return () => { clearInterval(timer); window.removeEventListener('online', change); window.removeEventListener('offline', change); window.removeEventListener('focus', change); };
  }, []);
  const occurrences = useMemo(() => expandOccurrences(store.expenses, today), [store.expenses, today]);
  const subscriptions = useMemo(() => subscriptionSummaries(store.expenses, today), [store.expenses, today]);
  // Merchants ranked by how often and how recently the expenses use them (suggestions of «Esercente»).
  const merchants = useMemo(() => rankMerchants(merchantState.merchants, store.expenses, today), [merchantState.merchants, store.expenses, today]);
  // Lists and merchants count once loaded: a listener that fails (e.g. Rules not yet published) must not block expenses and funds.
  const pending = Boolean(store.sync?.pending || categoryState.sync.pending || fundState.sync.pending || listState.sync.pending || merchantState.sync.pending);
  const cached = Boolean(store.sync?.fromCache || categoryState.sync.fromCache || fundState.sync.fromCache || (listState.ready && listState.sync.fromCache)
    || (merchantState.ready && merchantState.sync.fromCache));
  // Funds are part of the archive: the form waits for them too, so the fund field never appears late.
  const ready = store.ready && categoryState.ready && fundState.ready;
  const synchronized = ready && !pending && !cached && online;
  const error = store.error || categoryState.error;
  const status = describeSync({ ready, online, pending, cached, error, local });
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
  return <WorkspaceNavigation dashboardPreferences={dashboardPreferences} onChangeDashboardPreferences={onChangeDashboardPreferences}
    uid={uid} backend={backend} store={store} localArchive={localArchive} categoryState={categoryState} starting={!released}
    listState={listState} occurrences={occurrences} subscriptions={subscriptions} merchants={merchants}
    online={online} synchronized={synchronized} error={error} fundState={fundState} today={today}
    renderSettings={renderSettings} storage={storage} settingsRequest={settingsRequest} notificationsRequest={notificationsRequest} categoriesRequest={categoriesRequest}
    backupRequest={backupRequest} topActions={topActions} status={status} />;
}

// Navigation is presentation state: switching pages does not rerun the remote hooks or recreate their store objects.
function WorkspaceNavigation({ categoriesRequest = 0, backupRequest = 0, settingsRequest = 0, notificationsRequest = 0, topActions, status, ...props }:
  Omit<SectionsProps, 'section' | 'onNavigate' | 'returnTo'> & AccountPageProps & {
    topActions?: ReactNode; status: ReturnType<typeof describeSync>;
  }) {
  const { t } = useI18n();
  const [{ section, returnTo }, setNavigation] = useState<{ section: Section; returnTo: Section }>({ section: 'expense', returnTo: 'list' });
  const navigate = useCallback((next: Section) => {
    // Let React yield during a first, expensive page render so touch feedback can keep running.
    startTransition(() => setNavigation((previous) => previous.section === next ? previous : { section: next,
      returnTo: accountPages.has(next) && !accountPages.has(previous.section) ? previous.section : previous.returnTo }));
  }, []);
  useRequest(categoriesRequest, () => navigate('categories'));
  useRequest(backupRequest, () => navigate('backup'));
  useRequest(settingsRequest, () => navigate('settings'));
  useRequest(notificationsRequest, () => navigate('notifications'));
  return <AppShell destinations={destinations.map((entry) => ({ ...entry, label: t(entry.label) }))} selected={section} onSelect={navigate}
    fab={{ label: t("Nuova spesa"), icon: iconShapes.plus, target: 'expense' }}
    actions={<><SyncChip status={status} />{topActions}</>}>
    <Sections {...props} section={section} onNavigate={navigate} returnTo={returnTo} />
  </AppShell>;
}

// A request from the account menu (a counter kept in App) is an event: only a change opens the page. The counter survives
// a remount of the UID-keyed workspace (sign-out and sign-in again without a reload), and an old request must not reopen
// its page then (it used to happen with Categories, which checked `> 0`).
function useRequest(request: number, open: () => void) {
  const last = useRef(request);
  useEffect(() => {
    if (request === last.current) return;
    last.current = request;
    open();
  }, [request]);
}

// The shell is available during Auth restoration; do not draw a second form with fake empty data.
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
      {/* Same structure as the real page (a growing form area with the spinner overlaid at its top): on phones the shell
          centres short pages vertically, so a bare spinner would put the title mid-screen and make it jump when the form
          replaces this placeholder (issue #5). */}
      <View style={styles.grow}>
        <View style={styles.startingOverlay}><ActivityIndicator accessibilityLabel={t("Caricamento dei dati")} /></View>
      </View>
    </AppShell>
  );
}

// Expenses the server never confirmed, as a backup to import later. A merchant that was lost with them (created in the same
// write) is left out of the expense, so the file stays importable.
function recoveryBackup(expenses: readonly ExpenseRecord[], categories: readonly Category[], merchants: readonly RankedMerchant[]) {
  const known = new Set(merchants.map((m) => m.id));
  const records = expenses.map((e) => (e.merchant_id && !known.has(e.merchant_id) ? { ...e, merchant_id: null } : e));
  return makeBackup({ expenses: records, categories, merchants: merchants.filter((m) => records.some((e) => e.merchant_id === m.id)) });
}

type SectionsProps = DashboardSettingsProps & {
  uid: string; section: Section; onNavigate: (section: Section) => void; returnTo: Section; backend: DataStore; store: ExpenseStore;
  listState: RemoteLists;
  categoryState: ReturnType<typeof useRemoteCategories>; occurrences: ReturnType<typeof expandOccurrences>;
  subscriptions: ReturnType<typeof subscriptionSummaries>; merchants: readonly RankedMerchant[];
  online: boolean; synchronized: boolean; error: string | null; starting: boolean;
  fundState: RemoteFunds; today: string; renderSettings?: (onDone: () => void, archiveSections?: ReactNode) => ReactNode; storage?: ReactNode; localArchive?: LocalArchive;
};

function Sections({ dashboardPreferences, onChangeDashboardPreferences, uid, section, onNavigate, returnTo, listState, backend, store, categoryState, occurrences, subscriptions, merchants, online, synchronized, error, starting, fundState, today, renderSettings, storage, localArchive }: SectionsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const notify = useSnackbar();
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [listView, setListView] = useState<ListView>('expenses');
  const [defaultFundId, setDefaultFundId] = useState(() => readDefaultFund(uid));
  const changeDefaultFund = useCallback((id: string) => { setDefaultFundId(id); writeDefaultFund(uid, id); }, [uid]);
  const [preferred, setPreferred] = useState(() => readPreferredCategories(uid));
  const changePreferred = useCallback((value: PreferredCategories) => { setPreferred(value); writePreferredCategories(uid, value); }, [uid]);
  // Remaining budget of this month, for the fund field of the forms (same figures as the Funds page).
  const fundSummary = useMemo(() => monthOverview({ funds: fundState.funds, movements: fundState.movements, expenses: store.expenses }, monthOf(today), today),
    [fundState.funds, fundState.movements, store.expenses, today]);
  const choiceOf = (item: (typeof fundSummary.funds)[number]): FundChoice => ({ fund: item.fund, remaining: item.remaining });
  const fundChoices = useMemo(() => fundSummary.funds.filter((item) => !item.fund.archived).map(choiceOf), [fundSummary]);
  const editorFundChoices = editing ? fundSummary.funds.filter((item) => !item.fund.archived || item.fund.id === editing.fund_id).map(choiceOf) : [];
  const fundsError = fundState.ready ? null : fundState.error;
  // Releasing the startup cover after 4 seconds enables navigation, not incomplete form controls.
  const formLoading = starting || (!store.error && !categoryState.error && !fundsError &&
    !(store.ready && hasUsableCategorySnapshot(categoryState) && fundState.ready));
  const usableCategories = hasUsableCategorySnapshot(categoryState);
  const formStore = useMemo(() => ({ ...store, ready: store.ready && usableCategories && fundState.ready,
    error: store.error || categoryState.error || fundsError }), [store, usableCategories, fundState.ready, categoryState.error, fundsError]);
  // Dashboard, CSV and backups keep every paid occurrence; only the Spese list leaves the subscriptions to their own view.
  const oneOff = useMemo(() => occurrences.filter((item) => item.recurrence === null), [occurrences]);
  const edit = useCallback((id: string) => setEditing(store.expenses.find((r) => r.id === id) ?? null), [store.expenses]);
  // Only the change itself is written (see subscription.ts). Confirmed by the server transaction.
  // Fund filter of the Spese page (both views, the renewals card included): presentation only, the setting can turn it off.
  const [fundChoice, setFundChoice] = useState(allFunds);
  const fundFilterShown = fundState.funds.length > 0;
  const fundFilter = fundFilterShown ? effectiveFundFilter(fundChoice, fundState.funds.map((fund) => fund.id)) : allFunds;
  const shownOneOff = useMemo(() => filterByFund(oneOff, fundFilter), [oneOff, fundFilter]);
  const shownSubscriptions = useMemo(() => subscriptions.filter((item) => matchesFund(item.entry, fundFilter)), [subscriptions, fundFilter]);
  // Same window for the card's total and its list: it lists only the renewals its total counts (the next 30 days).
  const shownEntries = useMemo(() => filterByFund(store.expenses, fundFilter), [store.expenses, fundFilter]);
  const renewals = useMemo(() => upcomingRenewals(shownEntries, today, addDays(today, forecastDays)), [shownEntries, today]);
  const soon = useMemo(() => forecastOccurrences(shownEntries, today, addDays(today, forecastDays)).reduce((sum, item) => sum + item.amount_minor, 0), [shownEntries, today]);
  // `from`: today, or an earlier day chosen in the dialog to correct a pause/cancellation that was forgotten (never before
  // the last change, never in the future). The payments after it stop being counted; the dialog listed them first.
  const changeStatus = async (id: string, status: SubscriptionStatus, from: string = todayInRome()) => {
    const record = store.expenses.find((r) => r.id === id);
    if (!record || !store.update || from > todayInRome()) return false;
    const changes = setStatus(record.status_changes, status, from);
    if (!changes) { notify("Troppe variazioni di stato per questo abbonamento: per continuare creane uno nuovo."); return false; }
    const saved = await store.update(record, { ...dataOf(record), status_changes: changes });
    if (saved) notify(status === 'paused' ? "Abbonamento messo in pausa." : status === 'cancelled' ? "Abbonamento annullato." : "Abbonamento riattivato.");
    return saved;
  };
  // Removes one payment from a subscription's history (e.g. charged because a pause/cancellation was forgotten): only that
  // occurrence stops counting, the others keep their dates and prices.
  const removePayment = async (id: string, index: number) => {
    const record = store.expenses.find((r) => r.id === id);
    if (!record || !store.update || !record.recurrence) return false;
    const skipped = skipPayment(record.skipped_payments ?? [], index);
    if (!skipped) { notify("Troppi pagamenti eliminati per questo abbonamento: per continuare creane uno nuovo."); return false; }
    const saved = await store.update(record, { ...dataOf(record), skipped_payments: skipped });
    if (saved) notify("Pagamento eliminato.");
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
  const merchantNames = useMemo(() => {
    const names = new Map(merchants.map((m) => [m.id, m.name]));
    return new Map(store.expenses.flatMap((e) => { const name = e.merchant_id ? names.get(e.merchant_id) : undefined; return name ? [[e.id, name] as const] : []; }));
  }, [merchants, store.expenses]);
  // System notifications (backup reminder in the Standard mode, spending summary in both) and the Notifications page.
  const notifications = useNotifications({ scope: uid, expenses: store.expenses, categories: categoryState.categories,
    ready: !starting && store.ready && categoryState.ready, archive: localArchive, timeZone: dashboardPreferences.timeZone });
  const [exporting, setExporting] = useState(false);
  const exportFromReminder = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const at = await downloadBackup(backend);
      notify("Backup completo esportato.");
      notifications.backupDownloaded(at);
    } catch (reason) { notify(message(reason)); } finally { setExporting(false); }
  };
  // A system notification tapped: its page opens.
  const [opened, setOpened] = useState<OpenedNotification | null>(null);
  // A renewal reminder leads to the subscriptions themselves (Spese, Abbonamenti); the other kinds to the Notifications page.
  useEffect(() => onNotificationOpened((next) => {
    if (next.kind === 'renewal') { setListView('subscriptions'); onNavigate('list'); return; }
    setOpened(next); onNavigate('notifications');
  }), [onNavigate]);
  const listNote = editing?.list_id ? (listState.lists.some((l) => l.id === editing.list_id && l.expense_id === editing.id) ? 'linked' : 'unlinked') : undefined;
  return <>
    {/* The Lists page draws its own header (the open list's name is the title), as does Settings. */}
    {section !== 'lists' && section !== 'settings' && <PageHeader title={heading}
      action={section === 'categories' || section === 'backup' || section === 'notifications' ? (
        <DoneButton onPress={() => onNavigate(returnTo)} />
      ) : undefined} />}
    {!!store.recovery?.length && (
      <Card style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
        <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{store.recovery.length === 1 ? t("Una spesa in attesa non risulta confermata") : t("{p0} spese in attesa non risultano confermate", { p0: store.recovery.length })} {t(" sul server. Scaricane una copia prima di chiudere o uscire.")}</Text>
        <View style={styles.start}>
          <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} onPress={() => download('nummo-spese-da-recuperare.json', recoveryBackup(store.recovery!, categoryState.categories, merchants), 'application/json')}>{t("Scarica spese da recuperare")}</Button>
        </View>
      </Card>
    )}
    {backend.kind === 'firestore' && backendMode === 'hybrid' && firestoreEmulator && (
      <HybridConnectionNotice waiting={!synchronized && !error} endpoint={firestoreEmulator} />
    )}
    {starting && section !== 'expense' && <View style={styles.starting}><ActivityIndicator accessibilityLabel={t("Caricamento dei dati")} /></View>}
    {/* The form stays mounted at full size (labels measured, draft kept, title in place) while the first data arrives; it is only invisible. */}
    <View style={section === 'expense' ? styles.grow : styles.hidden}>
      {formLoading && section === 'expense' && <View style={styles.startingOverlay}><ActivityIndicator accessibilityLabel={t("Caricamento dei dati")} /></View>}
      <div inert={formLoading || section !== 'expense'} aria-hidden={formLoading || section !== 'expense' || undefined} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, visibility: formLoading ? 'hidden' : 'visible' }}>
        <ExpenseForm categories={categoryState.categories} fundChoices={fundChoices} defaultFundId={defaultFundId}
          defaultCategoryId={preferred.expense} store={formStore} merchants={merchants} />
      </div>
    </View>
    <VisitedSection active={section === 'list' && !starting}>
      <View style={styles.list}>
        <SegmentedButtons label={t("Vista della pagina Spese")} value={listView} onChange={setListView}
          options={listViews.map((view) => ({ value: view.value, label: t(view.label), accessibilityLabel: t(view.full) }))} />
        {/* Page-wide fund filter: under the two views, over the whole width of the section. */}
        {fundFilterShown && <FundFilter funds={fundState.funds} value={fundFilter} onChange={setFundChoice} style={styles.fundFilter} />}
        {listView === 'expenses' && <ExpenseList occurrences={shownOneOff} categories={categoryState.categories} error={error} onEdit={edit} listItems={listItems} merchantNames={merchantNames}
          emptyLabel={fundFilter === allFunds ? undefined : "Nessuna spesa per questo fondo."} />}
        {listView === 'subscriptions' && <>
          <UpcomingRenewals renewals={renewals} categories={categoryState.categories} soon={soon} days={forecastDays} />
          <SubscriptionList subscriptions={shownSubscriptions} emptyLabel={fundFilter === allFunds ? undefined : "Nessun abbonamento per questo fondo."} categories={categoryState.categories} error={error}
            canChange={synchronized && Boolean(store.update)} onEdit={edit} onSetStatus={changeStatus} onRemovePayment={removePayment} today={today} />
        </>}
      </View>
    </VisitedSection>
    {/* Preserve import previews and in-flight actions when leaving this page; no reads until an explicit action. */}
    <View style={section === 'backup' && !starting ? styles.backupPage : styles.hidden}>
      {storage}
      <BackupActions backend={backend} enabled={synchronized} onBackupDownloaded={notifications.backupDownloaded} />
    </View>
    {editing && <ExpenseEditor record={editing} categories={categoryState.categories} store={store} close={() => setEditing(null)} fundChoices={editorFundChoices} listNote={listNote} merchants={merchants} />}
    <VisitedSection active={section === 'lists' && !starting}><ListsPage remote={listState} categories={categoryState.categories} defaultCategoryId={preferred.list} expenses={store.expenses}
      fundChoices={fundChoices} defaultFundId={defaultFundId} canRegister={synchronized && listState.ready} notify={notify}
      showArchivedLists={dashboardPreferences.showArchivedLists} /></VisitedSection>
    <VisitedSection active={section === 'funds' && !starting}><FundsPage remote={fundState} expenses={store.expenses} today={today} canWrite={synchronized}
      defaultFundId={defaultFundId} onSetDefault={changeDefaultFund} notify={notify}
      showArchivedFunds={dashboardPreferences.showArchivedFunds} /></VisitedSection>
    <VisitedSection active={section === 'dashboard' && !starting}><Dashboard occurrences={occurrences} categories={categoryState.categories} funds={fundState.funds}
      preferences={dashboardPreferences} onChangePreferences={onChangeDashboardPreferences} /></VisitedSection>
    {section === 'settings' && !starting && renderSettings?.(() => onNavigate(returnTo),
      <>
        <PreferredCategoriesCard categories={categoryState.categories} value={preferred} onChange={changePreferred} />
        {fundState.funds.some((fund) => !fund.archived) && <PreferredFundCard funds={fundState.funds.filter((fund) => !fund.archived)}
          value={defaultFundId} onChange={changeDefaultFund} />}
      </>)}
    {section === 'notifications' && !starting && <NotificationsPage notifications={notifications} opened={opened} onCloseOpened={() => setOpened(null)} timeFormat={dashboardPreferences.timeFormat} timeZone={dashboardPreferences.timeZone}
      exporting={exporting} onExport={() => void exportFromReminder()} />}
    {section === 'categories' && !starting && <>
      <CategorySettings categories={categoryState.categories} error={categoryState.error} ready={categoryState.ready && online}
        onCreate={categoryState.createCategory} onDelete={categoryState.deleteCategory} onUpdate={categoryState.updateCategory}
        notify={notify}
        onAddDefaults={categoryState.categories.length === 0 ? () => { void addDefaults(); } : undefined} canAddDefaults={synchronized} />
    </>}
  </>;
}

// Mount on the first visit only. Hidden activities preserve the page's state/DOM while suspending effects and portals;
// the UID-keyed workspace still discards everything on account change. No background preloading during startup.
function VisitedSection({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => { if (active) setVisited(true); }, [active]);
  return active || visited ? <Activity mode={active ? 'visible' : 'hidden'}>{children}</Activity> : null;
}

const styles = StyleSheet.create({
  // Pages fill the main area; the shell does not cap their width.
  list: { width: '100%', gap: layout.sectionGap },
  hidden: { display: 'none' },
  fundFilter: { alignSelf: 'stretch' },
  backupPage: { gap: layout.sectionGap },
  starting: { alignItems: 'center', padding: spacing.xxl },
  startingOverlay: { position: 'absolute', top: spacing.xxl, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  grow: { flexGrow: 1 },
  avatarSlot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatarDot: { width: 36, height: 36, borderRadius: 18 },
  alert: { padding: spacing.lg, borderRadius: radius.card },
  start: { alignSelf: 'flex-start' },
});
