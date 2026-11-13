import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { useSnackbar } from '../../components/SnackbarHost';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import { backupFrequencies, frequencyLabels, type BackupSummary, type DriveFile } from '../../domain/driveBackup';
import { useI18n } from '../../i18n/I18nProvider';
import { preloadDriveAuth } from '../../services/googleAuth';
import type { StorageMode } from '../../services/storageMode';
import { radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { DriveBackup } from './useDriveBackup';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

function useDateTime() {
  const { locale } = useI18n();
  return (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

// Label on the left, value on the right; wraps on narrow phones.
function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.info}>
      <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyLarge" style={styles.value} selectable>{value}</Text>
    </View>
  );
}

type Common = { onOpenFiles?: () => void; onChangeMode: (mode: StorageMode | null) => void; style?: object };

// «Archiviazione e backup» of the Standard mode: where the data is, Google Drive backups and the manual files.
export function StandardStorage({ drive, onOpenFiles, onChangeMode, style }: Common & { drive: DriveBackup }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const notify = useSnackbar();
  const dateTime = useDateTime();
  const [restoring, setRestoring] = useState(false);
  const [changing, setChanging] = useState(false);
  const { settings, busy, available } = drive;
  const connected = available && settings.connected;
  useEffect(() => { if (connected) preloadDriveAuth(); }, [connected]);
  const backup = async () => { if (await drive.backupNow()) notify("Backup salvato su Google Drive."); };
  const connect = async () => { if (await drive.connect()) notify("Google Drive collegato."); };
  return (
    <Card title={t("Archiviazione e backup")} style={style}>
      <View style={styles.rows}>
        <InfoRow label={t("Archiviazione")} value={t("Locale, su questo dispositivo")} />
        <InfoRow label="Google Drive" value={!available ? t("Non disponibile") : connected ? t("Collegato") : t("Non collegato")} />
        {connected && <InfoRow label={t("Ultimo backup")} value={settings.lastBackupAt ? dateTime(settings.lastBackupAt) : t("Mai")} />}
      </View>
      {!available && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("Questa installazione di Nummo non è configurata per Google Drive. Puoi comunque esportare e importare un file di backup.")}</Text>}
      {available && !connected && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("I dati esistono solo su questo dispositivo. Collega Google Drive per conservarne una copia di sicurezza.")}</Text>}
      {drive.autoWaiting && !drive.error && <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }}>
        {t("Backup automatico in attesa: tocca Esegui backup per autorizzare di nuovo Google Drive.")}</Text>}
      {drive.error && <Text variant="bodyMedium" accessibilityRole="alert" style={{ color: colors.error }}>{t(drive.error)}</Text>}
      {available && <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {connected ? <>
          <Button mode="contained-tonal" icon={icon(iconShapes.upload)} disabled={busy !== null} loading={busy === 'backup'} onPress={() => void backup()}>{t("Esegui backup")}</Button>
          <Button mode="outlined" icon={icon(iconShapes.download)} disabled={busy !== null} onPress={() => { drive.clearError(); setRestoring(true); }}>{t("Ripristina da Drive")}</Button>
          <Button mode="text" disabled={busy !== null} onPress={() => { drive.disconnect(); notify("Google Drive scollegato."); }}>{t("Scollega")}</Button>
        </> : <Button mode="contained-tonal" icon={icon(iconShapes.sync)} disabled={busy !== null} loading={busy === 'connect'} onPress={() => void connect()}>{t("Collega Google Drive")}</Button>}
      </View>}
      {connected && <View>
        <SwitchRow label={t("Backup automatico")} supporting={t("Mentre usi Nummo, se i dati sono cambiati.")} value={settings.auto} onChange={drive.setAuto} />
        {settings.auto && <View style={styles.frequency}>
          <ChoiceChips label={t("Frequenza del backup automatico")} value={settings.frequency} onChange={(value) => value && drive.setFrequency(value)}
            options={backupFrequencies.map((value) => ({ value, label: t(frequencyLabels[value]) }))} />
        </View>}
      </View>}
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {onOpenFiles && <Button mode="outlined" icon={icon(iconShapes.download)} onPress={onOpenFiles}>{t("Importa ed esporta file")}</Button>}
        <Button mode="text" icon={icon(iconShapes.swap)} onPress={() => setChanging(true)}>{t("Cambia modalità")}</Button>
      </View>
      <RestoreDialog visible={restoring} drive={drive} onDismiss={() => setRestoring(false)} onRestored={() => { setRestoring(false); notify("Ripristino completato."); }} />
      <ChangeModeDialog visible={changing} target="advanced" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('advanced')} />
    </Card>
  );
}

// «Archiviazione e backup» of the Advanced mode: the Firebase project this build is connected to.
export function AdvancedStorage({ project, email, cache, onOpenFiles, onChangeMode, style }: Common & { project: string; email?: string | null; cache: string }) {
  const { t } = useI18n();
  const compact = useSizeClass() === 'compact';
  const [changing, setChanging] = useState(false);
  return (
    <Card title={t("Archiviazione e backup")} style={style}>
      <View style={styles.rows}>
        <InfoRow label={t("Archiviazione")} value={t("Firebase, Cloud Firestore")} />
        {project !== '' && <InfoRow label={t("Progetto Firebase")} value={project} />}
        {email !== undefined && <InfoRow label={t("Account Google")} value={email ?? t("Account senza e-mail")} />}
        <InfoRow label={t("Cache offline")} value={t(cache)} />
      </View>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {onOpenFiles && <Button mode="outlined" icon={icon(iconShapes.download)} onPress={onOpenFiles}>{t("Importa ed esporta file")}</Button>}
        <Button mode="text" icon={icon(iconShapes.swap)} onPress={() => setChanging(true)}>{t("Cambia modalità")}</Button>
      </View>
      <ChangeModeDialog visible={changing} target="standard" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('standard')} />
    </Card>
  );
}

function DialogFrame({ visible, title, label, busy, onDismiss, children, actions }: { visible: boolean; title: string; label: string; busy?: boolean; onDismiss: () => void; children: ReactNode; actions: ReactNode }) {
  const compact = useSizeClass() === 'compact';
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => { if (!busy) onDismiss(); }} style={{ maxWidth: 440 }}>
        <View role="alertdialog" aria-label={label} style={styles.container}>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogBody}>
              <Text variant="titleLarge" accessibilityRole="header">{title}</Text>
              {children}
            </ScrollView>
          </Dialog.ScrollArea>
          <View style={[styles.actions, compact && styles.actionsCompact]}>{actions}</View>
        </View>
      </Dialog>
    </Portal>
  );
}

// Changing mode only changes which archive is opened: nothing is copied, moved or deleted.
function ChangeModeDialog({ visible, target, onDismiss, onConfirm }: { visible: boolean; target: StorageMode; onDismiss: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const title = target === 'advanced' ? t("Passare alla modalità Avanzata?") : t("Passare alla modalità Standard?");
  return (
    <DialogFrame visible={visible} title={title} label={title} onDismiss={onDismiss} actions={<>
      <Button mode="outlined" contentStyle={styles.button} onPress={onDismiss}>{t("Annulla")}</Button>
      <Button mode="contained" contentStyle={styles.button} onPress={() => { onDismiss(); onConfirm(); }}>{t("Cambia modalità")}</Button>
    </>}>
      <Text variant="bodyMedium" style={muted}>{target === 'advanced'
        ? t("I dati salvati su questo dispositivo restano qui e non vengono copiati nel progetto Firebase: li ritrovi tornando alla modalità Standard.")
        : t("I dati del progetto Firebase restano lì e non vengono copiati su questo dispositivo: li ritrovi tornando alla modalità Avanzata.")}</Text>
      <Text variant="bodyMedium" style={muted}>{t("Le due modalità hanno archivi separati. Per portare i dati dall’una all’altra esporta un backup JSON e importalo dopo il cambio.")}</Text>
    </DialogFrame>
  );
}

// Restore from Google Drive: choose a backup, read what it contains, confirm. The file is downloaded and validated
// in full before the confirmation is enabled; the device archive is replaced in one transaction or not at all.
function RestoreDialog({ visible, drive, onDismiss, onRestored }: { visible: boolean; drive: DriveBackup; onDismiss: () => void; onRestored: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const dateTime = useDateTime();
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const muted = { color: colors.onSurfaceVariant };
  const choose = async (file: DriveFile) => {
    setSelected(file); setSummary(null);
    setSummary(await drive.openBackup(file));
  };
  useEffect(() => {
    if (!visible) return;
    setFiles(null); setSelected(null); setSummary(null);
    let stale = false;
    void drive.listBackups().then((list) => {
      if (stale || !list) return;
      setFiles(list);
      if (list[0]) void choose(list[0]);
    });
    return () => { stale = true; };
  }, [visible]);
  const busy = drive.busy === 'restore';
  const counts = summary ? [
    [summary.expenses, "1 spesa", "{p0} spese"], [summary.categories, "1 categoria", "{p0} categorie"], [summary.funds, "1 fondo", "{p0} fondi"],
    [summary.movements, "1 movimento", "{p0} movimenti"], [summary.lists, "1 lista", "{p0} liste"],
  ].filter(([n]) => (n as number) > 0).map(([n, one, many]) => (n === 1 ? t(one as string) : t(many as string, { p0: n as number }))) : [];
  const title = t("Ripristinare da Google Drive?");
  return (
    <DialogFrame visible={visible} title={title} label={title} busy={busy} onDismiss={onDismiss} actions={<>
      <Button mode="outlined" disabled={busy} contentStyle={styles.button} onPress={onDismiss}>{t("Annulla")}</Button>
      <Button mode="contained" buttonColor={colors.error} textColor={colors.onError} disabled={busy || !summary} contentStyle={styles.button}
        onPress={async () => { if (summary && await drive.restore(summary)) onRestored(); }}>{t("Ripristina")}</Button>
    </>}>
      {files && files.length > 1 && <View role="radiogroup" aria-label={t("Backup disponibili")} style={styles.files}>
        {files.map((file) => {
          const active = file.id === selected?.id;
          return (
            <StateLayerPressable key={file.id} layerColor={colors.onSurface} radius={radius.tile} accessibilityRole="radio" aria-checked={active} disabled={busy}
              accessibilityLabel={dateTime(file.createdTime)} onPress={() => void choose(file)}
              style={[styles.file, active && { backgroundColor: colors.secondaryContainer }]}>
              <Text variant="bodyLarge" style={[styles.fileLabel, active && { color: colors.onSecondaryContainer }]}>{dateTime(file.createdTime)}</Text>
              {active && <SvgIcon shape={iconShapes.check} size={20} color={colors.onSecondaryContainer} />}
            </StateLayerPressable>
          );
        })}
      </View>}
      {files?.length === 0 && <Text variant="bodyLarge">{t("Nessun backup su Google Drive.")}</Text>}
      {busy && !summary && <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("Lettura del backup")} /></View>}
      {summary && selected && <View style={styles.summary}>
        <Text variant="bodyLarge">{t("Backup del {p0}", { p0: dateTime(summary.exportedAt ?? selected.createdTime) })}</Text>
        <Text variant="bodyMedium" style={muted}>{counts.length ? counts.join(' · ') : t("Il backup non contiene dati.")}</Text>
      </View>}
      {summary && <Text variant="bodyMedium" style={muted}>
        {t("Tutti i dati su questo dispositivo verranno sostituiti da quelli del backup. Prima viene scaricata una copia dei dati attuali.")}</Text>}
      {drive.error && <Text variant="bodyMedium" accessibilityRole="alert" style={{ color: colors.error }}>{t(drive.error)}</Text>}
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  info: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.lg, rowGap: 2 },
  value: { flexShrink: 1, fontWeight: '500' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  frequency: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0, borderTopWidth: 0, borderBottomWidth: 0 },
  dialogBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  button: { paddingHorizontal: spacing.xs, minHeight: 40 },
  files: { gap: spacing.xs },
  file: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md },
  fileLabel: { flex: 1 },
  loading: { alignItems: 'center', padding: spacing.lg },
  summary: { gap: 2 },
});
