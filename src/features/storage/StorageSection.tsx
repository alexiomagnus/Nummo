import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProtectionState } from '../../services/storageProtection';
import type { StorageMode } from '../../services/storageMode';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

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

// What the browser answered about keeping this site's data. Plain words only: no API or storage names, and never a
// promise that nothing can be lost.
const protectionText: Record<ProtectionState, { title: string; text: string; shape: string }> = {
  protected: { title: 'Archivio locale protetto', shape: iconShapes.shieldCheck,
    text: 'Il browser si impegna a non eliminare i dati quando lo spazio scarseggia. Non sostituisce un backup.' },
  unprotected: { title: 'Protezione aggiuntiva non attiva', shape: iconShapes.shield,
    text: 'Il browser potrebbe eliminare i dati se lo spazio scarseggia. Esporta un backup di tanto in tanto.' },
  unavailable: { title: 'Protezione non disponibile', shape: iconShapes.shieldOff,
    text: 'Questo browser non offre una protezione aggiuntiva dei dati. Esporta un backup di tanto in tanto.' },
};

function ProtectionStatus({ state }: { state: ProtectionState }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { title, text, shape } = protectionText[state];
  return (
    <View style={styles.protection} role="status">
      <SvgIcon shape={shape} size={24} color={state === 'protected' ? colors.primary : colors.onSurfaceVariant} />
      <View style={styles.protectionText}>
        <Text variant="bodyLarge">{t(title)}</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t(text)}</Text>
      </View>
    </View>
  );
}

// «Archiviazione e backup» of the Standard mode: where the data is, its protection and the manual backup files.
export function StandardStorage({ protection, onOpenFiles, onChangeMode, style }: Common & { protection: ProtectionState | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [changing, setChanging] = useState(false);
  return (
    <Card title={t("Archiviazione e backup")} style={style}>
      <View style={styles.rows}>
        <InfoRow label={t("Archiviazione")} value={t("Locale, su questo dispositivo")} />
      </View>
      {protection && <ProtectionStatus state={protection} />}
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {t("I dati esistono solo su questo dispositivo. Esporta un backup JSON per conservarne una copia.")}</Text>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {onOpenFiles && <Button mode="outlined" icon={icon(iconShapes.download)} onPress={onOpenFiles}>{t("Importa ed esporta file")}</Button>}
        <Button mode="text" icon={icon(iconShapes.swap)} onPress={() => setChanging(true)}>{t("Cambia modalità")}</Button>
      </View>
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

function DialogFrame({ visible, title, label, onDismiss, children, actions }: { visible: boolean; title: string; label: string; onDismiss: () => void; children: ReactNode; actions: ReactNode }) {
  const compact = useSizeClass() === 'compact';
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxWidth: 440 }}>
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

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  info: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.lg, rowGap: 2 },
  value: { flexShrink: 1, fontWeight: '500' },
  protection: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  protectionText: { flex: 1, gap: 2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0, borderTopWidth: 0, borderBottomWidth: 0 },
  dialogBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  button: { paddingHorizontal: spacing.xs, minHeight: 40 },
});
