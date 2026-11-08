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
import { exportCsv, makeBackup, parseBackup, type ImportData, type ImportPlan } from '../../domain/backup';
import type { FirestoreStore } from '../../services/firestoreStore';
import { message } from '../expenses/useRemoteExpenses';
const importedMessage = 'Importazione completata con successo';
// Success messages are shown in bold.
const headlines = [importedMessage];
const maxFileBytes = 5_000_000;
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Preview = { file: string; data: ImportData; merge: ImportPlan; replace: ImportPlan };

export function BackupActions({ backend, enabled, onClose }: { backend: FirestoreStore; enabled: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const notify = useSnackbar();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setStatus('');
    try { await work(); } catch (e) { setStatus(message(e)); } finally { setBusy(false); }
  };
  const exportCsvFile = () => run(async () => {
    const data = await backend.exportSnapshot();
    download('nummo-transazioni.csv', exportCsv(data.expenses, data.categories), 'text/csv;charset=utf-8');
    notify("CSV delle transazioni esportato.");
  });
  const exportBackup = () => run(async () => {
    download('nummo-backup.json', makeBackup(await backend.exportSnapshot()), 'application/json');
    notify("Backup completo esportato.");
  });
  const pick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = () => { void run(async () => {
      setPreview(null);
      const file = input.files?.[0]; if (!file) return;
      if (file.name.toLowerCase().endsWith('.csv')) throw new Error("Il CSV serve solo a consultare le spese e non si può importare: usa un backup JSON.");
      if (file.size > maxFileBytes) throw new Error("File troppo grande (massimo 5 MB).");
      let json: unknown;
      try { json = JSON.parse(await file.text()); } catch { throw new Error("Il file non è un backup JSON valido."); }
      const data = parseBackup(json);
      setPreview({ file: file.name, data, ...await backend.previewImport(data) });
    }); }; input.click();
  };
  const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;
  const counts = (expenses: number, categories: number) => t("{p0} spese · {p1} categorie", { p0: expenses, p1: categories });
  const hint = { color: theme.colors.onSurfaceVariant };
  const merge = preview?.merge;
  const replace = preview?.replace;
  const mergeBlocked = !!merge && merge.conflicts.length > 0;
  const mergeEmpty = !!merge && merge.addExpenses.length === 0 && merge.addCategories.length === 0;
  const finish = () => { setPreview(null); setStatus(importedMessage); };
  return <Card title={t("Dati")}
    actions={onClose && <IconButton icon={icon(iconShapes.close)} style={styles.close} accessibilityLabel={t("Chiudi")} onPress={onClose} />}>
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Consulta le spese")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportCsvFile()}>{t("Esporta transazioni (CSV)")}</Button>
      </View>
    </View>
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Backup completo")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportBackup()}>{t("Scarica backup (JSON)")}</Button>
        <Button mode="outlined" icon={icon(iconShapes.upload)} disabled={!enabled || busy} onPress={pick}>{t("Importa backup (JSON)")}</Button>
      </View>
    </View>
    {preview && merge && replace && <View style={[styles.preview, { backgroundColor: theme.colors.elevation.level2 }]} accessibilityRole="alert">
      <Text variant="titleSmall">{t("Riepilogo del ripristino")}</Text>
      <Text variant="bodyMedium" style={hint}>{t("File: {p0}", { p0: preview.file })}</Text>
      <View style={styles.lines}>
        <Text variant="bodyLarge">{t("Nel backup: {p0}", { p0: counts(preview.data.expenses.length, preview.data.categories.length) })}</Text>
        <Text variant="bodyLarge">{t("Da aggiungere: {p0}", { p0: counts(merge.addExpenses.length, merge.addCategories.length) })}</Text>
        <Text variant="bodyLarge">{t("Già presenti e identici: {p0}", { p0: counts(merge.sameExpenses, merge.sameCategories) })}</Text>
        {merge.missingCategoryReferences > 0 && <Text variant="bodyMedium" style={hint}>{t("{p0} spese fanno riferimento a categorie che non saranno presenti.", { p0: merge.missingCategoryReferences })}</Text>}
      </View>
      {merge.conflicts.length > 0 && <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
        {t("{p0} elementi del backup sono in conflitto con i dati esistenti. Non si possono unire.", { p0: merge.conflicts.length })}</Text>}
      {mergeEmpty && !mergeBlocked && <Text variant="bodyMedium" style={hint}>{t("Non c’è nulla da aggiungere: i dati del backup sono già presenti.")}</Text>}
      <Button disabled={busy || !enabled || mergeBlocked || mergeEmpty} mode="contained" icon={icon(iconShapes.upload)} onPress={() => void run(async () => {
        await backend.importRecords(preview.data.expenses, preview.data.categories, 'merge'); finish();
      })}>{t("Unisci ai dati esistenti")}</Button>
      <Button disabled={busy || !enabled} mode="outlined" icon={icon(iconShapes.upload)} onPress={() => setConfirmReplace(true)}>{t("Sostituisci tutti i dati")}</Button>
      <Button disabled={busy} onPress={() => setPreview(null)}>{t("Annulla")}</Button>
    </View>}
    <DeleteDialog visible={confirmReplace} name={t("i dati esistenti")} title={t("Sostituire tutti i dati?")} confirmLabel={t("Sostituisci")}
      description={replace && t("Verranno eliminate {p0} spese e {p1} categorie attuali diverse dal backup e aggiunte {p2} spese e {p3} categorie. Prima di procedere viene scaricata una copia dei dati attuali (JSON). L’operazione non può essere annullata.",
        { p0: replace.removeExpenseIds.length, p1: replace.removeCategoryIds.length, p2: replace.addExpenses.length, p3: replace.addCategories.length })}
      onDismiss={() => setConfirmReplace(false)}
      onConfirm={async () => {
        if (!preview || busy) return false;
        setBusy(true); setStatus('');
        try {
          // Safety copy before the first deletion: the current data stays on disk if anything goes wrong.
          download('nummo-backup-prima-del-ripristino.json', makeBackup(await backend.exportSnapshot()), 'application/json');
          await backend.importRecords(preview.data.expenses, preview.data.categories, 'replace');
          finish(); return true;
        } catch (e) { setStatus(message(e)); return true; } finally { setBusy(false); }
      }} />
    {status !== '' && <Text accessibilityLiveRegion="polite" style={headlines.some((item) => status.startsWith(item)) ? styles.bold : undefined}>{t(status)}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  group: { gap: spacing.sm },
  lines: { gap: spacing.xs },
  close: { margin: 0, width: layout.minTouch, height: layout.minTouch },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  preview: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, marginTop: spacing.md },
});
