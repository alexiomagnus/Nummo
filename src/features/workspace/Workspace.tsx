import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, SegmentedButtons, Text } from 'react-native-paper';
import { expandOccurrences } from '../../domain/history';
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
import { makeBackup } from '../../domain/backup';
import { firebaseWebConfig } from '../../services/backendConfig';
import { BackupActions, download } from '../backup/BackupActions';
import { getDatabase } from '../../services/firebase';
import { createFirestoreStore } from '../../services/firestoreStore';

// Keyed by UID in App: every listener, draft and view is discarded on account change.
export function RemoteWorkspace({ uid, storageNote }: { uid: string; storageNote: string }) {
  const backend = useMemo(() => createFirestoreStore(getDatabase(), uid), [uid]);
  const store = useRemoteExpenses(backend, storageNote);
  const categoryState = useRemoteCategories(backend);
  const [section, setSection] = useState('expense');
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [today, setToday] = useState(todayInRome());
  const [defaultsStatus, setDefaultsStatus] = useState('');
  useEffect(() => {
    const change = () => { setOnline(navigator.onLine); setToday(todayInRome()); };
    window.addEventListener('online', change); window.addEventListener('offline', change); window.addEventListener('focus', change);
    const timer = setInterval(() => setToday(todayInRome()), 60000);
    return () => { clearInterval(timer); window.removeEventListener('online', change); window.removeEventListener('offline', change); window.removeEventListener('focus', change); };
  }, []);
  const occurrences = useMemo(() => expandOccurrences(store.expenses, today), [store.expenses, today]);
  const pending = store.sync?.pending || categoryState.sync.pending;
  const cached = store.sync?.fromCache || categoryState.sync.fromCache;
  const synchronized = store.ready && categoryState.ready && !pending && !cached && online;
  const error = store.error || categoryState.error;
  return <>
    <Text accessibilityLiveRegion="polite">{error ?? (pending ? 'Scritture in attesa di conferma da Firestore.' : !online ? 'Offline: dati disponibili dalla cache.' : cached ? 'Dati dalla cache: connessione al server da verificare.' : 'Sincronizzato con Firestore.')}</Text>
    {!!store.recovery?.length && <View style={{ gap: 8 }}>
      <Text accessibilityRole="alert">{store.recovery.length === 1 ? 'Una spesa in attesa non risulta confermata' : `${store.recovery.length} spese in attesa non risultano confermate`} sul server. Scaricane una copia prima di chiudere o uscire; nessun reinvio automatico.</Text>
      <Button onPress={() => download('nummo-spese-da-recuperare.json', makeBackup({ expenses: store.recovery!, categories: categoryState.categories }, { project_id: firebaseWebConfig.projectId, uid }), 'application/json')}>Scarica spese da recuperare</Button>
    </View>}
    <SegmentedButtons value={section} onValueChange={setSection} buttons={[
      { value: 'expense', label: 'Nuova' }, { value: 'list', label: 'Spese' },
      { value: 'dashboard', label: 'Dashboard' }, { value: 'categories', label: 'Categorie' },
    ]} />
    <View style={{ display: section === 'expense' ? 'flex' : 'none' }}>
      <ExpenseForm categories={categoryState.categories} store={{ ...store, ready: store.ready && categoryState.ready }} />
    </View>
    {section === 'list' && <>
      <ExpenseList occurrences={occurrences} categories={categoryState.categories} error={error} onDelete={store.remove}
        onEdit={(id) => setEditing(store.expenses.find((r) => r.id === id) ?? null)} />
      <BackupActions backend={backend} uid={uid} enabled={synchronized} />
    </>}
    {editing && <ExpenseEditor record={editing} categories={categoryState.categories} store={store} close={() => setEditing(null)} />}
    {section === 'dashboard' && <Dashboard occurrences={occurrences} categories={categoryState.categories} />}
    {section === 'categories' && <>
      <CategorySettings categories={categoryState.categories} error={categoryState.error} ready={categoryState.ready && online}
        onCreate={categoryState.createCategory} onDelete={categoryState.deleteCategory} onChangeIcon={categoryState.changeIcon} onRename={categoryState.rename} />
      {categoryState.categories.length === 0 && <Button disabled={!synchronized} onPress={() => {
        void backend.importRecords([], defaultCategories.map((c) => ({ ...c, id: crypto.randomUUID() })))
          .then(() => setDefaultsStatus('Categorie predefinite aggiunte.')).catch(() => setDefaultsStatus('Categorie non aggiunte: verifica connessione o duplicati.'));
      }}>Aggiungi categorie predefinite</Button>}
      {defaultsStatus !== '' && <Text accessibilityLiveRegion="polite">{defaultsStatus}</Text>}
    </>}
  </>;
}
