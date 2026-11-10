import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DeleteDialog } from '../../components/DeleteAction';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { exportCsv, makeBackup, parseBackup, type ImportData, type ImportPlan } from '../../domain/backup';
import type { FirestoreStore } from '../../services/firestoreStore';
import { message } from '../expenses/useRemoteExpenses';
const maxFileBytes = 5_000_000;
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Preview = { file: string; data: ImportData; merge: ImportPlan; replace: ImportPlan };

export function BackupActions({ backend, enabled }: { backend: FirestoreStore; enabled: boolean }) {
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
    download('nummo-transazioni.csv', exportCsv(data.expenses, data.categories, undefined, data.funds), 'text/csv;charset=utf-8');
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
  const hint = { color: theme.colors.onSurfaceVariant };
  const merge = preview?.merge;
  const replace = preview?.replace;
  const mergeBlocked = !!merge && merge.conflicts.length > 0;
  // One line: only the kinds of data the file would add.
  const added = merge ? [
    [merge.addExpenses.length, "1 spesa", "{p0} spese"], [merge.addCategories.length, "1 categoria", "{p0} categorie"],
    [merge.addFunds.length, "1 fondo", "{p0} fondi"], [merge.addMovements.length, "1 movimento", "{p0} movimenti"],
    [merge.addLists.length, "1 lista", "{p0} liste"],
  ].filter(([n]) => (n as number) > 0).map(([n, one, many]) => (n === 1 ? t(one as string) : t(many as string, { p0: n as number }))) : [];
  const mergeEmpty = !!merge && added.length === 0;
  const missing = merge ? merge.missingFundReferences + merge.missingCategoryReferences : 0;
  const finish = () => { setPreview(null); notify("Importazione completata."); };
  return <Card>
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
      <View style={styles.lines}>
        <Text variant="titleSmall">{mergeBlocked ? t("Impossibile unire il backup") : t("Riepilogo del ripristino")}</Text>
        <Text variant="bodySmall" numberOfLines={1} style={hint}>{preview.file}</Text>
      </View>
      <Text variant="bodyLarge">
        {mergeBlocked ? t("{p0} elementi sono diversi dai dati salvati.", { p0: merge.conflicts.length })
          : mergeEmpty ? t("Niente da aggiungere: dati già presenti.")
          : t("Da aggiungere: {p0}", { p0: added.join(' · ') })}</Text>
      {!mergeBlocked && missing > 0 && <Text variant="bodySmall" style={hint}>
        {missing === 1 ? t("1 riferimento a fondi o categorie mancanti.") : t("{p0} riferimenti a fondi o categorie mancanti.", { p0: missing })}</Text>}
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {!mergeBlocked && <Button disabled={busy || !enabled || mergeEmpty} mode="contained" icon={icon(iconShapes.upload)} onPress={() => void run(async () => {
          await backend.importRecords(preview.data.expenses, preview.data.categories, 'merge', preview.data.funds, preview.data.movements, preview.data.lists, preview.data.budget); finish();
        })}>{t("Unisci ai dati esistenti")}</Button>}
        <Button disabled={busy || !enabled} mode="outlined" icon={icon(iconShapes.upload)} onPress={() => setConfirmReplace(true)}>{t("Sostituisci tutti i dati")}</Button>
        <Button disabled={busy} onPress={() => setPreview(null)}>{t("Annulla")}</Button>
      </View>
    </View>}
    <DeleteDialog visible={confirmReplace} name={t("i dati esistenti")} title={t("Sostituire tutti i dati?")} confirmLabel={t("Sostituisci")}
      description={replace && t("Verranno eliminati {p0} elementi e aggiunti {p1}. Prima viene scaricata una copia dei dati attuali.", {
        p0: replace.removeExpenseIds.length + replace.removeCategoryIds.length + replace.removeFundIds.length + replace.removeMovementIds.length + replace.removeListIds.length,
        p1: replace.addExpenses.length + replace.addCategories.length + replace.addFunds.length + replace.addMovements.length + replace.addLists.length })}
      onDismiss={() => setConfirmReplace(false)}
      onConfirm={async () => {
        if (!preview || busy) return false;
        setBusy(true); setStatus('');
        try {
          // Safety copy before the first deletion: the current data stays on disk if anything goes wrong.
          download('nummo-backup-prima-del-ripristino.json', makeBackup(await backend.exportSnapshot()), 'application/json');
          await backend.importRecords(preview.data.expenses, preview.data.categories, 'replace', preview.data.funds, preview.data.movements, preview.data.lists, preview.data.budget);
          finish(); return true;
        } catch (e) { setStatus(message(e)); return true; } finally { setBusy(false); }
      }} />
    {status !== '' && <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{t(status)}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  lines: { gap: 2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  preview: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
});
