import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button, CancelButton, DangerButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { DeleteDialog } from '../../components/DeleteAction';
import { useSameWidth } from '../../components/SameWidth';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { radius, spacing } from '../../theme/tokens';
import { useReducedMotion, useSizeClass } from '../../theme/useSizeClass';
import { conflictPreview, exportCsv, makeBackup, parseBackup, type ImportData, type ImportPlan } from '../../domain/backup';
import { androidBridge } from '../../services/androidApp';
import type { DataStore } from '../../services/dataStore';
import { message } from '../expenses/useRemoteExpenses';
const maxFileBytes = 5_000_000;
const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

// What a merge would do, before any write: the kinds of data it adds, or what blocks it (at most three names). Shared by
// the backup file and the move between modes (ModeTransfer). `source`: the file name or the other archive; `replace`: an
// extra action beside the merge (the file's «Sostituisci tutti i dati»).
// `source` (a line under the title) and `emptyText` are optional: the move between modes (ModeTransfer) leaves out the line,
// says the direction in the title and lists only what is added; with nothing to add it shows `emptyText` and «Chiudi»
// alone, never a disabled button (user's request, 22 November: fewer words, clearer). The backup restore keeps all of it.
export function ImportPreview({ source, plan: merge, busy, enabled, onMerge, onCancel, replace, mergeLabel = "Unisci ai dati esistenti",
  title = "Riepilogo del ripristino", blockedTitle = "Impossibile unire il backup", emptyText, listOnly = false }: {
  source?: string; plan: ImportPlan; busy: boolean; enabled: boolean; onMerge: () => void; onCancel: () => void; replace?: ReactNode; mergeLabel?: string;
  title?: string; blockedTitle?: string; emptyText?: string; listOnly?: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const hint = { color: theme.colors.onSurfaceVariant };
  const mergeBlocked = merge.conflicts.length > 0;
  // One line: only the kinds of data the merge would add.
  const added = [
    [merge.addExpenses.length, "1 spesa", "{p0} spese"], [merge.addCategories.length, "1 categoria", "{p0} categorie"],
    [merge.addFunds.length, "1 fondo", "{p0} fondi"], [merge.addMovements.length, "1 movimento", "{p0} movimenti"],
    [merge.addLists.length, "1 lista", "{p0} liste"], [merge.addMerchants.length, "1 esercente", "{p0} esercenti"],
    [merge.addTemplates.length, "1 template", "{p0} template"],
  ].filter(([n]) => (n as number) > 0).map(([n, one, many]) => (n === 1 ? t(one as string) : t(many as string, { p0: n as number })));
  const mergeEmpty = added.length === 0;
  // A blocked merge names what differs (the source's own names), at most three, then how many more.
  const conflicts = conflictPreview(merge.conflicts);
  const conflictNames = [...conflicts.shown.map((c) => c.kind === 'budget' ? t("Budget mensile") : c.label || t("Movimento senza nota")),
    ...(conflicts.more > 0 ? [t("altri {p0}", { p0: conflicts.more })] : [])].join(' · ');
  const missing = merge.missingFundReferences + merge.missingCategoryReferences;
  if (emptyText && mergeEmpty && !mergeBlocked && !replace) return <View style={[styles.preview, { backgroundColor: theme.colors.elevation.level2 }]} accessibilityRole="alert">
    <Text variant="bodyLarge">{t(emptyText)}</Text>
    <View style={[styles.buttons, compact && styles.buttonsCompact]}>
      <CancelButton disabled={busy} onPress={onCancel}>{t("Chiudi")}</CancelButton>
    </View>
  </View>;
  return <View style={[styles.preview, { backgroundColor: theme.colors.elevation.level2 }]} accessibilityRole="alert">
    <View style={styles.lines}>
      <Text variant="titleSmall">{mergeBlocked ? t(blockedTitle) : t(title)}</Text>
      {source !== undefined && <Text variant="bodySmall" numberOfLines={1} style={hint}>{source}</Text>}
    </View>
    <Text variant="bodyLarge">
      {mergeBlocked ? (merge.conflicts.length === 1 ? t("1 elemento è diverso dai dati salvati.")
        : t("{p0} elementi sono diversi dai dati salvati.", { p0: merge.conflicts.length }))
        : mergeEmpty ? t("Niente da aggiungere: dati già presenti.")
        : listOnly ? added.join(' · ')
        : t("Da aggiungere: {p0}", { p0: added.join(' · ') })}</Text>
    {mergeBlocked && <Text variant="bodyMedium" numberOfLines={3}>{conflictNames}</Text>}
    {!mergeBlocked && missing > 0 && <Text variant="bodySmall" style={hint}>
      {missing === 1 ? t("1 riferimento a fondi o categorie mancanti.") : t("{p0} riferimenti a fondi o categorie mancanti.", { p0: missing })}</Text>}
    <View style={[styles.buttons, compact && styles.buttonsCompact]}>
      {!mergeBlocked && <Button disabled={busy || !enabled || mergeEmpty} mode="contained" icon={icon(iconShapes.upload)} onPress={onMerge}>{t(mergeLabel)}</Button>}
      {replace}
      <CancelButton disabled={busy} onPress={onCancel}>{t("Annulla")}</CancelButton>
    </View>
  </View>;
}
// In the Android app (no downloads in a WebView) the system's «save as» sheet picks where the file goes, Drive included.
export function download(name: string, content: string, type: string) {
  const bridge = androidBridge();
  if (bridge) { bridge.saveFile(name, type, content); return; }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// The full JSON backup, as a download. Returns the time of the copy: the browser only starts the download, so the
// caller cannot know the file was kept (the backup reminder asks the user to confirm it).
export async function downloadBackup(backend: DataStore): Promise<string> {
  const at = new Date();
  download('nummo-backup.json', makeBackup(await backend.exportSnapshot(), at), 'application/json');
  return at.toISOString();
}
type Preview = { file: string; data: ImportData; merge: ImportPlan; replace: ImportPlan };

// `onBackupDownloaded`: told when a full backup download has started (Standard mode: it resets the backup reminder).
export function BackupActions({ backend, enabled, onBackupDownloaded }: { backend: DataStore; enabled: boolean; onBackupDownloaded?: (at: string) => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const notify = useSnackbar();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  // A backup downloaded from the confirmation dialog now open (reset at every opening).
  const [savedBefore, setSavedBefore] = useState(false);
  const [saving, setSaving] = useState(false);
  // The file actions share one width with the other buttons of the page (`SameWidthGroup` in Workspace); phones stack them full width.
  const fileAction = useSameWidth();
  const sameWidth = fileAction.style ?? null;
  // The preview appears below the buttons, often out of sight on phones: bring it into view when a file has been read
  // (only as far as needed; no animation with reduced motion).
  const reduceMotion = useReducedMotion();
  const previewRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const node = previewRef.current as unknown;
    if (preview && typeof HTMLElement !== 'undefined' && node instanceof HTMLElement)
      node.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [preview, reduceMotion]);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setStatus('');
    try { await work(); } catch (e) { setStatus(message(e)); } finally { setBusy(false); }
  };
  const exportCsvFile = () => run(async () => {
    const data = await backend.exportSnapshot();
    download('nummo-transazioni.csv', exportCsv(data.expenses, data.categories, undefined, data.funds, data.merchants), 'text/csv;charset=utf-8');
    notify("CSV delle transazioni esportato.");
  });
  const exportBackup = () => run(async () => {
    const at = await downloadBackup(backend);
    notify("Backup completo esportato.");
    onBackupDownloaded?.(at);
  });
  // Before a deletion Nummo asks, it does not download on its own (user's request, 22 November): the dialog offers the full
  // backup, which counts as any other backup download.
  const backupFirst = async () => {
    if (saving) return;
    setSaving(true); setStatus('');
    try { const at = await downloadBackup(backend); setSavedBefore(true); onBackupDownloaded?.(at); }
    catch (e) { setStatus(message(e)); } finally { setSaving(false); }
  };
  const offerBackup = <View style={styles.offer}>
    <Text variant="bodyMedium">{t("Vuoi prima scaricare un backup dei dati attuali?")}</Text>
    <Button mode="contained-tonal" loading={saving} disabled={saving || savedBefore}
      icon={icon(savedBefore ? iconShapes.check : iconShapes.download)} onPress={() => void backupFirst()}>
      {savedBefore ? t("Backup scaricato") : t("Scarica backup (JSON)")}</Button>
  </View>;
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
  const replace = preview?.replace;
  // Replace: what goes and what is written (new or different items, merchants included).
  const removed = replace ? replace.removeExpenseIds.length + replace.removeCategoryIds.length + replace.removeFundIds.length
    + replace.removeMovementIds.length + replace.removeListIds.length + replace.removeMerchantIds.length + replace.removeTemplateIds.length : 0;
  const written = replace ? replace.addExpenses.length + replace.addCategories.length + replace.addFunds.length
    + replace.addMovements.length + replace.addLists.length + replace.addMerchants.length + replace.addTemplates.length : 0;
  const finish = () => { setPreview(null); notify("Importazione completata."); };
  return <Card style={styles.card}>
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Consulta le spese")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button {...fileAction} mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportCsvFile()}>{t("Esporta transazioni (CSV)")}</Button>
      </View>
    </View>
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Backup completo")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button {...fileAction} mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy} onPress={() => void exportBackup()}>{t("Scarica backup (JSON)")}</Button>
        <Button {...fileAction} mode="outlined" icon={icon(iconShapes.upload)} disabled={!enabled || busy} onPress={pick}>{t("Importa backup (JSON)")}</Button>
      </View>
    </View>
    {/* Only the expenses (user's request, 22 November): categories, funds, lists, templates and merchants stay. */}
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Elimina le spese")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <DangerButton {...fileAction} icon={icon(iconShapes.trash)} style={sameWidth}
          disabled={!enabled || busy} onPress={() => { setSavedBefore(false); setConfirmWipe(true); }}>{t("Elimina tutte le spese")}</DangerButton>
      </View>
    </View>
    {preview && <View ref={previewRef}>
      <ImportPreview source={preview.file} plan={preview.merge} busy={busy} enabled={enabled} onCancel={() => setPreview(null)}
        onMerge={() => void run(async () => {
          await backend.importRecords(preview.data.expenses, preview.data.categories, 'merge', preview.data.funds, preview.data.movements, preview.data.lists, preview.data.budget, preview.data.merchants, preview.data.templates); finish();
        })}
        replace={<Button disabled={busy || !enabled} mode="outlined" icon={icon(iconShapes.upload)} onPress={() => { setSavedBefore(false); setConfirmReplace(true); }}>{t("Sostituisci tutti i dati")}</Button>} />
    </View>}
    <DeleteDialog visible={confirmReplace} name={t("i dati esistenti")} title={t("Sostituire tutti i dati?")} confirmLabel={t("Sostituisci")}
      description={replace && t("Elementi da eliminare: {p0}. Da scrivere: {p1}.", { p0: removed, p1: written })}
      onDismiss={() => setConfirmReplace(false)}
      onConfirm={async () => {
        if (!preview || busy) return false;
        setBusy(true); setStatus('');
        try {
          await backend.importRecords(preview.data.expenses, preview.data.categories, 'replace', preview.data.funds, preview.data.movements, preview.data.lists, preview.data.budget, preview.data.merchants, preview.data.templates);
          finish(); return true;
        } catch (e) { setStatus(message(e)); return true; } finally { setBusy(false); }
      }}>{offerBackup}</DeleteDialog>
    <DeleteDialog visible={confirmWipe} name={t("tutte le spese")} title={t("Eliminare tutte le spese?")} confirmLabel={t("Elimina tutte")}
      description={t("Si eliminano tutte le spese e gli abbonamenti.")}
      onDismiss={() => setConfirmWipe(false)}
      onConfirm={async () => {
        if (busy) return false;
        setBusy(true); setStatus('');
        try {
          const removed = await backend.removeAllExpenses();
          notify(removed === 1 ? t("1 spesa eliminata.") : t("{p0} spese eliminate.", { p0: removed }));
          return true;
        } catch (e) { setStatus(message(e)); return true; } finally { setBusy(false); }
      }}>{offerBackup}</DeleteDialog>
    {status !== '' && <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{t(status)}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.xxxl },
  group: { gap: spacing.sm },
  // Note under the buttons, a little further from them than the buttons are from each other (user's request, 21 November).
  offer: { gap: spacing.md },
  lines: { gap: 2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  preview: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
});
