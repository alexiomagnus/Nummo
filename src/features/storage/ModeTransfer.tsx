import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { alignCategoriesByName, archiveAsImport as asImport, type ImportData, type ImportPlan } from '../../domain/backup';
import { useI18n } from '../../i18n/I18nProvider';
import type { DataStore } from '../../services/dataStore';
import { localDatabaseName, openLocalDatabase } from '../../services/localDatabase';
import { createLocalStore, type LocalStore } from '../../services/localStore';
import type { StorageMode } from '../../services/storageMode';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { ImportPreview } from '../backup/BackupActions';
import { message } from '../expenses/useRemoteExpenses';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;


// The Standard archive of this browser, if it was ever created: opening it would create an empty one otherwise. Browsers
// that cannot list their databases open it anyway (at worst an empty archive, which the Standard mode would create too).
async function localArchiveExists(): Promise<boolean> {
  const factory = globalThis.indexedDB as (IDBFactory & { databases?: () => Promise<{ name?: string }[]> }) | undefined;
  if (!factory) return false;
  if (typeof factory.databases !== 'function') return true;
  try { return (await factory.databases()).some((db) => db.name === localDatabaseName); } catch { return true; }
}

type Local = { state: 'loading' } | { state: 'absent' } | { state: 'error'; message: string } | { state: 'ready' };
type Preview = { direction: 'in' | 'out'; data: ImportData; plan: ImportPlan };

// «Archiviazione e backup», Advanced mode only: moves data between this Firebase project and the Standard archive of this
// browser, in either direction, on request. Never automatic, never a replacement: only what is missing is added
// (user's request, 21 November). The Standard mode never starts Firebase, so both directions live here.
// `shown`: the page is on screen. The device archive is looked at only from its first showing (the page is kept mounted).
export function ModeTransfer({ backend, enabled, shown, onChangeMode, style }: { backend: DataStore; enabled: boolean; shown: boolean; onChangeMode: (mode: StorageMode) => void; style?: object }) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const notify = useSnackbar();
  const [local, setLocal] = useState<Local>({ state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const store = useRef<LocalStore | null>(null);
  const live = useRef(true);

  const openStore = async (): Promise<LocalStore> => {
    store.current ??= createLocalStore(await openLocalDatabase());
    return store.current;
  };
  const count = async () => {
    if (!store.current && !(await localArchiveExists())) { if (live.current) setLocal({ state: 'absent' }); return; }
    const snapshot = await (await openStore()).exportSnapshot();
    if (!live.current) return;
    setLocal(snapshot.expenses.length + snapshot.categories.length + snapshot.funds.length + snapshot.lists.length + snapshot.templates.length === 0
      ? { state: 'absent' } : { state: 'ready' });
  };
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; store.current?.close(); store.current = null; };
  }, []);
  const looked = useRef(false);
  useEffect(() => {
    if (!shown || looked.current) return;
    looked.current = true;
    void count().catch((reason: unknown) => { if (live.current) setLocal({ state: 'error', message: message(reason) }); });
  }, [shown]);

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setStatus('');
    try { await work(); } catch (e) { if (live.current) setStatus(message(e)); } finally { if (live.current) setBusy(false); }
  };
  // Standard → here: the device archive merged into this project.
  const bringIn = () => run(async () => {
    setPreview(null); setCopied(false);
    const source = asImport(await (await openStore()).exportSnapshot());
    const { data } = alignCategoriesByName(source, (await backend.exportSnapshot()).categories);
    const plan = (await backend.previewImport(data)).merge;
    if (live.current) setPreview({ direction: 'in', data, plan });
  });
  // Here → Standard: this project merged into the device archive (created if it never was).
  const copyOut = () => run(async () => {
    setPreview(null); setCopied(false);
    const source = asImport(await backend.exportSnapshot());
    const target = await openStore();
    const { data } = alignCategoriesByName(source, (await target.exportSnapshot()).categories);
    const plan = (await target.previewImport(data)).merge;
    if (live.current) setPreview({ direction: 'out', data, plan });
  });
  const merge = (current: Preview) => run(async () => {
    const target = current.direction === 'in' ? backend : await openStore();
    const { data } = current;
    await target.importRecords(data.expenses, data.categories, 'merge', data.funds, data.movements, data.lists, data.budget, data.merchants, data.templates);
    if (!live.current) return;
    setPreview(null);
    if (current.direction === 'out') setCopied(true);
    notify(current.direction === 'in' ? "Dati della modalità Standard aggiunti a questo progetto." : "Dati copiati su questo dispositivo.");
    await count();
  });

  const muted = { color: theme.colors.onSurfaceVariant };
  // No counts when the device has data (user's request, 22 November): only what keeps a button disabled is said.
  const summary = local.state === 'absent' ? t("Nessun dato sul dispositivo.")
    : local.state === 'error' ? t(local.message) : null;
  return (
    <Card title={t("Dati della modalità Standard")} style={style}>
      <View style={styles.body}>
        {summary !== null && <Text variant="bodyMedium" accessibilityLiveRegion="polite">{summary}</Text>}
        <View style={[styles.buttons, compact && styles.buttonsCompact]}>
          <Button mode="outlined" icon={icon(iconShapes.upload)} disabled={!enabled || busy || local.state !== 'ready'} onPress={() => void bringIn()}>
            {t("Dal dispositivo a Firebase")}</Button>
          <Button mode="outlined" icon={icon(iconShapes.download)} disabled={!enabled || busy || local.state === 'loading'} onPress={() => void copyOut()}>
            {t("Da Firebase al dispositivo")}</Button>
        </View>
        {/* Short note under the buttons, as under «Backup completo» (user's request, 21 November: fewer words, clearer). */}
        <Text variant="bodySmall" style={muted}>{t("* Si aggiunge solo ciò che manca: nulla viene sovrascritto o eliminato.")}</Text>
        {/* Few words (user's request, 22 November): the direction in the title, then only what is added; nothing to add →
            one sentence and «Chiudi». */}
        {preview && <ImportPreview plan={preview.plan} busy={busy} enabled={enabled} onCancel={() => setPreview(null)} onMerge={() => void merge(preview)}
          mergeLabel="Aggiungi" listOnly
          title={preview.direction === 'in' ? "Da aggiungere a Firebase" : "Da aggiungere al dispositivo"}
          emptyText={preview.direction === 'in' ? "Firebase ha già tutti i dati del dispositivo." : "Il dispositivo ha già tutti i dati di Firebase."}
          blockedTitle="Impossibile unire i dati" />}
        {copied && <View style={styles.done}>
          <Text variant="bodyMedium">{t("I dati sono anche sul dispositivo: nella modalità Standard li trovi senza account.")}</Text>
          <View style={styles.start}>
            <Button mode="contained" icon={icon(iconShapes.swap)} onPress={() => onChangeMode('standard')}>{t("Passa alla modalità Standard")}</Button>
          </View>
        </View>}
        {status !== '' && <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{t(status)}</Text>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  done: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
});
