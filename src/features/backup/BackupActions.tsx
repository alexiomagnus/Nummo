import { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { exportCsv, makeBackup, parseImport, type ImportData } from '../../domain/backup';
import { readExpenses } from '../../services/expenseStorage';
import { readCategories } from '../../services/categoryStorage';
import { firebaseWebConfig } from '../../services/backendConfig';
import type { FirestoreStore } from '../../services/firestoreStore';
import { message } from '../expenses/useRemoteExpenses';
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BackupActions({ backend, uid, enabled }: { backend: FirestoreStore; uid: string; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<ImportData | null>(null);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setStatus('');
    try { await work(); } catch (e) { setStatus(message(e)); } finally { setBusy(false); }
  };
  const exportData = (csv: boolean) => run(async () => {
    const data = await backend.exportSnapshot();
    download(csv ? 'nummo-transazioni.csv' : 'nummo-backup.json', csv ? exportCsv(data.expenses, data.categories)
      : makeBackup(data, { project_id: firebaseWebConfig.projectId, uid }), csv ? 'text/csv;charset=utf-8' : 'application/json');
    setStatus(csv ? 'CSV delle occorrenze fino a oggi esportato.' : 'Backup completo esportato.');
  });
  const previewLocal = () => run(async () => {
    // Back up exact raw storage first, including obsolete records with no start date.
    setPreview(null);
    const storage = window.localStorage;
    const raw = Object.fromEntries(['nummo.expenses.v1', 'nummo.categories.v1', 'nummus.categories.v1', 'nummo.recurring.v1'].map((key) => [key, storage.getItem(key)]));
    download('nummo-archivio-browser-originale.json', JSON.stringify(raw, null, 2), 'application/json');
    const data = { expenses: readExpenses(storage), categories: readCategories(storage) };
    setPreview(parseImport(JSON.parse(makeBackup(data, { project_id: 'legacy-browser', uid: 'unassigned' }))));
    setStatus(raw['nummo.recurring.v1'] ? 'Archivio originale scaricato. Le vecchie ricorrenze senza data iniziale sono conservate nel file, ma escluse dall’importazione.' : 'Archivio originale scaricato. Nessun dato del browser verrà cancellato.');
  });
  const pick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = () => { void run(async () => {
      setPreview(null);
      const file = input.files?.[0]; if (!file) return;
      if (file.size > 5_000_000) throw new Error('File troppo grande (massimo 5 MB).');
      setPreview(parseImport(JSON.parse(await file.text())));
    }); }; input.click();
  };
  return <View style={{ gap: 8 }}>
    <Text variant="titleMedium">Esportazione e migrazione</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <Button disabled={!enabled || busy} onPress={() => void exportData(true)}>Esporta CSV</Button>
      <Button disabled={!enabled || busy} onPress={() => void exportData(false)}>Backup JSON</Button>
      <Button disabled={busy} onPress={() => void previewLocal()}>Esamina dati del browser</Button>
      <Button disabled={busy} onPress={pick}>Importa backup JSON</Button>
    </View>
    {preview && <View style={{ gap: 8 }}>
      <Text>{preview.expenses.length} spese/serie e {preview.categories.length} categorie. Destinazione: {firebaseWebConfig.projectId}, UID {uid}. Controllo dei conflitti prima dell’importazione. Il trasferimento avviene in gruppi: se interrotto, ripeti lo stesso backup; gli ID identici non vengono duplicati.</Text>
      <Button disabled={busy || !enabled} mode="contained-tonal" onPress={() => void run(async () => {
        await backend.importRecords(preview.expenses, preview.categories); setPreview(null); setStatus('Importazione confermata da Firestore. Originali conservati.');
      })}>Conferma importazione in questo account</Button>
      <Button disabled={busy} onPress={() => setPreview(null)}>Annulla</Button>
    </View>}
    {status !== '' && <Text accessibilityLiveRegion="polite">{status}</Text>}
    <Text variant="bodySmall">Le esportazioni richiedono connessione e sincronizzazione completata. CSV: occorrenze; JSON: spese originali, serie e categorie.</Text>
  </View>;
}
