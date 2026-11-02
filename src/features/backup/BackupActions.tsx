import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { Card } from '../../components/Card';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { spacing } from '../../theme/tokens';
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
export function BackupActions({ backend, uid, enabled, onClose }: { backend: FirestoreStore; uid: string; enabled: boolean; onClose?: () => void }) {
  const theme = useTheme();
  const notify = useSnackbar();
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
    notify(csv ? 'CSV delle occorrenze fino a oggi esportato.' : 'Backup completo esportato.');
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
  const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;
  return <Card title="Esporta e importa" description="I dati restano tuoi: scarica una copia o importa un backup."
    actions={onClose && <IconButton icon={icon(iconShapes.close)} style={styles.close} accessibilityLabel="Chiudi esporta e importa" onPress={onClose} />}>
    <View style={styles.group}>
      <Text variant="titleSmall">Esporta</Text>
      <View style={styles.buttons}>
        <Button mode="contained-tonal" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportData(true)}>Esporta CSV</Button>
        <Button mode="contained-tonal" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportData(false)}>Backup JSON</Button>
      </View>
    </View>
    <View style={styles.group}>
      <Text variant="titleSmall">Importa</Text>
      <View style={styles.buttons}>
        <Button mode="outlined" icon={icon(iconShapes.upload)} disabled={busy} onPress={pick}>Importa backup JSON</Button>
        <Button mode="outlined" disabled={busy} onPress={() => void previewLocal()}>Esamina dati del browser</Button>
      </View>
    </View>
    {preview && <View style={[styles.preview, { backgroundColor: theme.colors.elevation.level2 }]} accessibilityRole="alert">
      <Text variant="bodyLarge">{preview.expenses.length} spese e {preview.categories.length} categorie pronte da importare.</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Verranno aggiunte ai dati esistenti: nessuna spesa o categoria già presente viene eliminata o sovrascritta. I dati identici a quelli presenti sono saltati; dati in conflitto bloccano l’importazione.</Text>
      <Button disabled={busy || !enabled} mode="contained" icon={icon(iconShapes.upload)} onPress={() => void run(async () => {
        await backend.importRecords(preview.expenses, preview.categories); setPreview(null); setStatus('Importazione confermata da Firestore. Originali conservati.');
      })}>Conferma importazione</Button>
      <Button disabled={busy} onPress={() => setPreview(null)}>Annulla</Button>
    </View>}
    {status !== '' && <Text accessibilityLiveRegion="polite">{status}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  close: { margin: 0, width: 48, height: 48 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { borderRadius: 12, padding: spacing.lg, gap: spacing.md },
});
