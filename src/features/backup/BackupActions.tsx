import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DeleteDialog } from '../../components/DeleteAction';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { exportCsv, makeBackup, parseCsvImport, parseImport, type ImportData } from '../../domain/backup';
import { firebaseWebConfig } from '../../services/backendConfig';
import type { FirestoreStore } from '../../services/firestoreStore';
import { message } from '../expenses/useRemoteExpenses';
const importedMessage = 'Importazione completata con successo';
// Success messages are shown in bold.
const headlines = [importedMessage];
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BackupActions({ backend, uid, enabled, onClose }: { backend: FirestoreStore; uid: string; enabled: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const notify = useSnackbar();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<ImportData | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setStatus('');
    try { await work(); } catch (e) { setStatus(message(e)); } finally { setBusy(false); }
  };
  const exportData = (csv: boolean) => run(async () => {
    const data = await backend.exportSnapshot();
    download(csv ? 'nummo-transazioni.csv' : 'nummo-backup.json', csv ? exportCsv(data.expenses, data.categories)
      : makeBackup(data, { project_id: firebaseWebConfig.projectId, uid }), csv ? 'text/csv;charset=utf-8' : 'application/json');
    notify(csv ? "CSV delle occorrenze fino a oggi esportato." : "Backup completo esportato.");
  });
  const pick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.csv,application/json,text/csv';
    input.onchange = () => { void run(async () => {
      setPreview(null);
      const file = input.files?.[0]; if (!file) return;
      if (file.size > 5_000_000) throw new Error("File troppo grande (massimo 5 MB).");
      const text = await file.text();
      setPreview(file.name.toLowerCase().endsWith('.csv') ? parseCsvImport(text) : parseImport(JSON.parse(text)));
    }); }; input.click();
  };
  const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;
  return <Card title={t("Dati")}
    actions={onClose && <IconButton icon={icon(iconShapes.close)} style={styles.close} accessibilityLabel={t("Chiudi")} onPress={onClose} />}>
    <View style={styles.group}>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportData(true)}>CSV</Button>
        <Button mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportData(false)}>JSON</Button>
        <Button mode="outlined" icon={icon(iconShapes.upload)} disabled={busy} onPress={pick}>{t("Importa CSV o JSON")}</Button>
      </View>
    </View>
    {preview && <View style={[styles.preview, { backgroundColor: theme.colors.elevation.level2 }]} accessibilityRole="alert">
      <Text variant="bodyLarge" style={styles.bold}>{t("Nuovi elementi")}</Text>
      <Text variant="bodyLarge" style={styles.counts}><Text style={styles.bold}>{preview.expenses.length}</Text> {t(" spese · ")}<Text style={styles.bold}>{preview.categories.length}</Text> {t(" categorie")}</Text>
      <Button disabled={busy || !enabled} mode="contained" icon={icon(iconShapes.upload)} onPress={() => void run(async () => {
        await backend.importRecords(preview.expenses, preview.categories); setPreview(null); setStatus(importedMessage);
      })}>{t("Importa e mantieni i dati esistenti")}</Button>
      <Button disabled={busy || !enabled} mode="outlined" icon={icon(iconShapes.upload)} onPress={() => setConfirmReplace(true)}>{t("Importa e sostituisci i dati esistenti")}</Button>
      <Button disabled={busy} onPress={() => setPreview(null)}>{t("Annulla")}</Button>
    </View>}
    <DeleteDialog visible={confirmReplace} name={t("i dati esistenti")} title={t("Sostituire i dati esistenti?")}
      description={t("Tutte le spese e le categorie attuali verranno eliminate e sostituite con quelle del file. L’operazione non può essere annullata: esporta prima un backup JSON.")}
      onDismiss={() => setConfirmReplace(false)}
      onConfirm={async () => {
        if (!preview || busy) return false;
        setBusy(true); setStatus('');
        try {
          await backend.importRecords(preview.expenses, preview.categories, 'replace');
          setPreview(null); setStatus(importedMessage); return true;
        } catch (e) { setStatus(message(e)); return true; } finally { setBusy(false); }
      }} />
    {status !== '' && <Text accessibilityLiveRegion="polite" style={headlines.some((item) => status.startsWith(item)) ? styles.bold : undefined}>{t(status)}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  counts: { marginBottom: spacing.lg },
  group: { gap: spacing.sm },
  close: { margin: 0, width: layout.minTouch, height: layout.minTouch },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  preview: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, marginTop: spacing.md },
});
