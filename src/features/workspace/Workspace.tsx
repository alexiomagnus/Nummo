import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { AppShell, type Destination } from '../../components/AppShell';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { useSnackbar } from '../../components/SnackbarHost';
import { SyncChip } from '../../components/SyncChip';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { layout, radius, spacing } from '../../theme/tokens';
import { describeSync, hasUsableCategorySnapshot } from './syncStatus';
import { addDays, expandOccurrences, forecastOccurrences, upcomingRenewals } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import type { ExpenseRecord } from '../../domain/contract';
import { defaultCategories } from '../../domain/category';
import { CategorySettings } from '../categories/CategorySettings';
import { useRemoteCategories } from '../categories/useRemoteCategories';
import { Dashboard } from '../dashboard/Dashboard';
import { ExpenseForm } from '../expenses/ExpenseForm';
import { ExpenseEditor } from '../expenses/ExpenseEditor';
import { useRemoteExpenses } from '../expenses/useRemoteExpenses';
import { ExpenseList } from '../history/ExpenseList';
import { UpcomingRenewals } from '../history/UpcomingRenewals';
import { makeBackup } from '../../domain/backup';
import { firebaseWebConfig } from '../../services/backendConfig';
import { BackupActions, download } from '../backup/BackupActions';
import { getDatabase } from '../../services/firebase';
import { createFirestoreStore, type FirestoreStore } from '../../services/firestoreStore';
import type { ExpenseStore } from '../expenses/expenseStore';

const forecastDays = 30;
type Section = 'expense' | 'list' | 'dashboard' | 'categories';
// «Nuova spesa» is the primary action (FAB), not a destination: one primary navigation only.
const destinations: readonly Destination<Section>[] = [
  { value: 'list', label: 'Spese', icon: iconShapes.list },
  { value: 'dashboard', label: 'Dashboard', icon: iconShapes.chart },
  { value: 'categories', label: 'Categorie', icon: iconShapes.tag },
];
const headings: Record<Section, string> = { expense: 'Nuova spesa', list: 'Spese', dashboard: 'Dashboard', categories: 'Categorie' };

// Keyed by UID in App: every listener, draft and view is discarded on account change.
export function RemoteWorkspace({ uid, storageNote, topActions }: { uid: string; storageNote: string; topActions?: ReactNode }) {
  const backend = useMemo(() => createFirestoreStore(getDatabase(), uid), [uid]);
  const store = useRemoteExpenses(backend, storageNote);
  const categoryState = useRemoteCategories(backend);
  const [section, setSection] = useState<Section>('expense');
  const [online, setOnline] = useState(navigator.onLine);
  const [today, setToday] = useState(todayInRome());
  useEffect(() => {
    const change = () => { setOnline(navigator.onLine); setToday(todayInRome()); };
    window.addEventListener('online', change); window.addEventListener('offline', change); window.addEventListener('focus', change);
    const timer = setInterval(() => setToday(todayInRome()), 60000);
    return () => { clearInterval(timer); window.removeEventListener('online', change); window.removeEventListener('offline', change); window.removeEventListener('focus', change); };
  }, []);
  const occurrences = useMemo(() => expandOccurrences(store.expenses, today), [store.expenses, today]);
  const renewals = useMemo(() => upcomingRenewals(store.expenses, today), [store.expenses, today]);
  const soon = useMemo(() => forecastOccurrences(store.expenses, today, addDays(today, forecastDays)).reduce((sum, item) => sum + item.amount_minor, 0), [store.expenses, today]);
  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const record of store.expenses) if (record.category_id) counts[record.category_id] = (counts[record.category_id] ?? 0) + 1;
    return counts;
  }, [store.expenses]);
  const pending = Boolean(store.sync?.pending || categoryState.sync.pending);
  const cached = Boolean(store.sync?.fromCache || categoryState.sync.fromCache);
  const ready = store.ready && categoryState.ready;
  const synchronized = ready && !pending && !cached && online;
  const error = store.error || categoryState.error;
  const status = describeSync({ ready, online, pending, cached, error });
  return (
    <AppShell destinations={destinations} selected={section} onSelect={setSection}
      fab={{ label: 'Nuova spesa', icon: iconShapes.plus, target: 'expense' }}
      actions={<><SyncChip status={status} />{topActions}</>}>
      <Sections section={section} onNavigate={setSection} backend={backend} uid={uid} store={store} categoryState={categoryState}
        occurrences={occurrences} renewals={renewals} soon={soon} usage={usage} online={online} synchronized={synchronized} error={error} />
    </AppShell>
  );
}

type SectionsProps = {
  section: Section; onNavigate: (section: Section) => void; backend: FirestoreStore; uid: string; store: ExpenseStore;
  categoryState: ReturnType<typeof useRemoteCategories>; occurrences: ReturnType<typeof expandOccurrences>;
  renewals: ReturnType<typeof upcomingRenewals>; soon: number;
  usage: Record<string, number>; online: boolean; synchronized: boolean; error: string | null;
};

function Sections({ section, onNavigate, backend, uid, store, categoryState, occurrences, renewals, soon, usage, online, synchronized, error }: SectionsProps) {
  const theme = useTheme();
  const notify = useSnackbar();
  const [showBackup, setShowBackup] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const heading = headings[section];
  return <>
    <PageHeader title={heading}
      action={section === 'list' ? (
        <Button mode="text" icon={({ size, color }) => <SvgIcon shape={iconShapes.download} size={size} color={color} />}
          aria-expanded={showBackup} onPress={() => setShowBackup(!showBackup)}>Dati</Button>
      ) : undefined} />
    {!!store.recovery?.length && (
      <Card style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
        <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{store.recovery.length === 1 ? 'Una spesa in attesa non risulta confermata' : `${store.recovery.length} spese in attesa non risultano confermate`} sul server. Scaricane una copia prima di chiudere o uscire.</Text>
        <View style={styles.start}>
          <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} onPress={() => download('nummo-spese-da-recuperare.json', makeBackup({ expenses: store.recovery!, categories: categoryState.categories }, { project_id: firebaseWebConfig.projectId, uid }), 'application/json')}>Scarica spese da recuperare</Button>
        </View>
      </Card>
    )}
    <View style={section === 'expense' ? styles.grow : styles.hidden}>
      <ExpenseForm categories={categoryState.categories} onCreateCategory={() => onNavigate('categories')}
        store={{ ...store, ready: store.ready && hasUsableCategorySnapshot(categoryState), error: store.error || categoryState.error }} />
    </View>
    {section === 'list' && (
      <View style={styles.list}>
        {/* Kept mounted while hidden so a pending import preview is not lost on close. */}
        <View style={showBackup ? undefined : styles.hidden}>
          <BackupActions backend={backend} uid={uid} enabled={synchronized} onClose={() => setShowBackup(false)} />
        </View>
        <UpcomingRenewals renewals={renewals} categories={categoryState.categories} soon={soon} days={forecastDays} />
        <ExpenseList occurrences={occurrences} categories={categoryState.categories} error={error} onDelete={store.remove}
          onEdit={(id) => setEditing(store.expenses.find((r) => r.id === id) ?? null)} />
      </View>
    )}
    {editing && <ExpenseEditor record={editing} categories={categoryState.categories} store={store} close={() => setEditing(null)} />}
    {section === 'dashboard' && <Dashboard occurrences={occurrences} categories={categoryState.categories} />}
    {section === 'categories' && <>
      <CategorySettings categories={categoryState.categories} usage={usage} error={categoryState.error} ready={categoryState.ready && online}
        onCreate={categoryState.createCategory} onDelete={categoryState.deleteCategory} onChangeIcon={categoryState.changeIcon} onRename={categoryState.rename}
        notify={notify}
        onAddDefaults={categoryState.categories.length === 0 ? () => {
          void backend.importRecords([], defaultCategories.map((c) => ({ ...c, id: crypto.randomUUID() })))
            .then(() => notify('Categorie predefinite aggiunte.')).catch(() => notify('Categorie non aggiunte: verifica connessione o duplicati.'));
        } : undefined} canAddDefaults={synchronized} />
    </>}
  </>;
}

const styles = StyleSheet.create({
  // Pages fill the main area (the shell already caps the width); only the form is a narrow column.
  list: { width: '100%', gap: layout.sectionGap },
  hidden: { display: 'none' },
  grow: { flexGrow: 1 },
  alert: { padding: spacing.lg, borderRadius: radius.card },
  start: { alignSelf: 'flex-start' },
});
