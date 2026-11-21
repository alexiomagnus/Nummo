import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button, CancelButton, ConfirmButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProtectionState } from '../../services/storageProtection';
import type { StorageMode } from '../../services/storageMode';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

// Icon and label on the left, value on the right; wraps on narrow phones.
function InfoRow({ shape, label, value }: { shape: string; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.info}>
      <View style={styles.label}>
        <SvgIcon shape={shape} size={24} color={colors.onSurfaceVariant} />
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      </View>
      <Text variant="bodyLarge" style={styles.value} selectable>{value}</Text>
    </View>
  );
}

type Common = { onChangeMode: (mode: StorageMode | null) => void; style?: object };

// What the browser answered about keeping this site's data. Plain words only: no API or storage names, and never a
// promise that nothing can be lost.
const protectionText: Record<ProtectionState, { title: string; text: string; shape: string }> = {
  protected: { title: 'Archivio locale protetto', shape: iconShapes.shieldCheck,
    text: 'Il browser si impegna a non eliminare i dati quando lo spazio scarseggia. Non sostituisce un backup.' },
  unprotected: { title: 'Protezione aggiuntiva non attiva', shape: iconShapes.shield,
    text: 'Il browser potrebbe eliminare i dati se lo spazio scarseggia.' },
  unavailable: { title: 'Protezione non disponibile', shape: iconShapes.shieldOff,
    text: 'Questo browser non offre una protezione aggiuntiva dei dati.' },
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

// Storage section of the «Archiviazione e backup» page, Standard mode: where the data is, its protection and the manual backup files.
export function StandardStorage({ protection, onChangeMode, style }: Common & { protection: ProtectionState | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [changing, setChanging] = useState(false);
  return (
    <Card style={style}>
      {/* Same icon + text layout as the protection status below, so the two lines align. */}
      <View style={[styles.protection, styles.deviceRow]}>
        <SvgIcon shape={iconShapes.database} size={24} color={colors.onSurfaceVariant} />
        <View style={styles.protectionText}><Text variant="bodyLarge">{t("Su questo dispositivo")}</Text></View>
      </View>
      {protection && <ProtectionStatus state={protection} />}
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        <Button mode="text" icon={icon(iconShapes.swap)} onPress={() => setChanging(true)}>{t("Cambia modalità")}</Button>
      </View>
      <ChangeModeDialog visible={changing} target="advanced" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('advanced')} />
    </Card>
  );
}

// Storage section of the «Archiviazione e backup» page, Advanced mode: the Firebase project this build is connected to.
// `connected`: the project was connected from this browser (not the site's); `onDisconnect` goes back to the site's one.
export function AdvancedStorage({ project, cache, onChangeMode, style, connected = false, onDisconnect }: Common & {
  project: string; cache: string; connected?: boolean; onDisconnect?: () => Promise<string | null>;
}) {
  const { t } = useI18n();
  const compact = useSizeClass() === 'compact';
  const [changing, setChanging] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  return (
    <Card style={style}>
      <View style={styles.rows}>
        <InfoRow shape={iconShapes.database} label={t("Archiviazione")} value="Firebase" />
        {project !== '' && <InfoRow shape={iconShapes.cloud} label={connected ? t("Progetto collegato da te") : t("Nome progetto")} value={project} />}
        <InfoRow shape={iconShapes.cloudOff} label={t("Cache offline")} value={t(cache)} />
      </View>
      <View style={[styles.buttons, compact && styles.buttonsCompact]}>
        {connected && onDisconnect && <Button mode="text" icon={icon(iconShapes.logout)} onPress={() => setDisconnecting(true)}>{t("Scollega progetto")}</Button>}
        <Button mode="text" icon={icon(iconShapes.swap)} onPress={() => setChanging(true)}>{t("Cambia modalità")}</Button>
      </View>
      <ChangeModeDialog visible={changing} target="standard" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('standard')} />
      {onDisconnect && <DisconnectDialog visible={disconnecting} project={project} onDismiss={() => setDisconnecting(false)} onConfirm={onDisconnect} />}
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

// Back to the site's project: signs out and reloads; the data stay in the user's project, to be connected again later.
function DisconnectDialog({ visible, project, onDismiss, onConfirm }: { visible: boolean; project: string; onDismiss: () => void; onConfirm: () => Promise<string | null> }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = t("Scollegare il progetto?");
  return (
    <DialogFrame visible={visible} title={title} label={title} onDismiss={() => { if (!busy) { setError(null); onDismiss(); } }} actions={<>
      <CancelButton disabled={busy} onPress={() => { setError(null); onDismiss(); }}>{t("Annulla")}</CancelButton>
      <ConfirmButton disabled={busy} loading={busy} onPress={() => {
        setBusy(true); setError(null);
        void onConfirm().then((failure) => { if (failure) { setError(failure); setBusy(false); } });
      }}>{t("Scollega")}</ConfirmButton>
    </>}>
      <Text variant="bodyMedium">{t("Esci e questo browser torna al progetto Firebase del sito. I dati restano nel tuo progetto {p0}: puoi ricollegarlo quando vuoi.", { p0: project })}</Text>
      {error && <Text variant="bodySmall" accessibilityRole="alert" style={{ color: colors.error }}>{t(error)}</Text>}
    </DialogFrame>
  );
}

// Changing mode only changes which archive is opened: nothing is copied, moved or deleted. Moving the data is a separate,
// explicit step in the Advanced mode's «Archiviazione e backup» (ModeTransfer); the dialog says where.
function ChangeModeDialog({ visible, target, onDismiss, onConfirm }: { visible: boolean; target: StorageMode; onDismiss: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const title = target === 'advanced' ? t("Passare alla modalità Avanzata?") : t("Passare alla modalità Standard?");
  return (
    <DialogFrame visible={visible} title={title} label={title} onDismiss={onDismiss} actions={<>
      <CancelButton onPress={onDismiss}>{t("Annulla")}</CancelButton>
      {/* Same warning colours as a deletion: switching archive is not something to do lightly. */}
      <ConfirmButton buttonColor={colors.error} textColor={colors.onError} onPress={() => { onDismiss(); onConfirm(); }}>{t("Cambia modalità")}</ConfirmButton>
    </>}>
      <Text variant="bodyMedium" style={muted}>{target === 'advanced'
        ? t("I dati di questo dispositivo restano qui. Dopo l’accesso puoi portarli nel tuo Firebase: Archiviazione e backup → «Porta qui i dati della Standard».")
        : t("I dati del progetto Firebase restano lì. Per averli anche su questo dispositivo, prima di cambiare usa «Copia questi dati sul dispositivo» in questa pagina.")}</Text>
      <Text variant="bodyMedium" style={muted}>{t("Consiglio: prima scarica un backup (JSON) e salvalo su Google Drive o in un altro posto sicuro.")}</Text>
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  info: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.lg, rowGap: 2 },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  value: { flexShrink: 1, fontWeight: '500' },
  protection: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  protectionText: { flex: 1, gap: 2 },
  // A little more room before the protection status (the card's own gap is 16).
  deviceRow: { marginBottom: spacing.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0 },
  dialogBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
});
