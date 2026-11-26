import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton } from '../../components/Button';
import { ActionRow, ListGroup, RowDivider, StatusRow } from '../../components/ActionList';
import { iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProtectionState } from '../../services/storageProtection';
import type { StorageMode } from '../../services/storageMode';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { appOnlyStandard, appWithoutAdvanced } from './ModeChoice';

type Common = { onChangeMode: (mode: StorageMode | null) => void };

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

// Storage tile of the «Archiviazione e backup» page, Standard mode: where the data is, how the browser keeps it, and the way to
// the Advanced mode. A tile of the page's grid (`ListGroup`, 27 November: before, a card of loose lines and a filled button).
export function StandardStorage({ protection, onChangeMode }: Common & { protection: ProtectionState | null }) {
  const { t } = useI18n();
  const [changing, setChanging] = useState(false);
  const kept = protection ? protectionText[protection] : null;
  return (
    <>
      <ListGroup label={t("Archiviazione")}>
        <StatusRow icon={iconShapes.database} title={t("Su questo dispositivo")} subtitle={t("I dati restano in questo browser.")} />
        {kept && <>
          <RowDivider />
          <StatusRow icon={kept.shape} tone={protection === 'protected' ? 'primary' : 'secondary'} title={t(kept.title)} subtitle={t(kept.text)} />
        </>}
        <RowDivider />
        {/* Android app without Advanced (ModeChoice): a line instead of the action. */}
        {appWithoutAdvanced()
          ? <StatusRow icon={iconShapes.swap} tone="secondary" title={t(appOnlyStandard)} />
          : <ActionRow icon={iconShapes.swap} tone="tertiary" title={t("Cambia modalità")} subtitle={t("Passa alla modalità Avanzata, con Firebase.")}
            onPress={() => setChanging(true)} />}
      </ListGroup>
      <ChangeModeDialog visible={changing} target="advanced" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('advanced')} />
    </>
  );
}

// Storage tile of the «Archiviazione e backup» page, Advanced mode: the Firebase project this build is connected to, the way
// back to the Standard mode and «Esci» (27 November, on request: it left the account menu and is here).
// `connected`: the project was connected from this browser (not the site's); `onDisconnect` goes back to the site's one.
// `onSignOut` is absent when there is no account.
export function AdvancedStorage({ project, cache, onChangeMode, connected = false, onDisconnect, onSignOut, signingOut = false }: Common & {
  project: string; cache: string; connected?: boolean; onDisconnect?: () => Promise<string | null>; onSignOut?: () => void; signingOut?: boolean;
}) {
  const { t } = useI18n();
  const [changing, setChanging] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  return (
    <>
      <ListGroup label={t("Archiviazione")}>
        <StatusRow icon={iconShapes.database} title={t("Archiviazione")} value="Firebase" />
        {project !== '' && <>
          <RowDivider />
          <StatusRow icon={iconShapes.cloud} title={connected ? t("Progetto collegato da te") : t("Nome progetto")} value={project} />
        </>}
        <RowDivider />
        <StatusRow icon={iconShapes.cloudOff} tone="secondary" title={t("Cache offline")} value={t(cache)} />
        {connected && onDisconnect && <>
          <RowDivider />
          <ActionRow icon={iconShapes.close} tone="secondary" title={t("Scollega progetto")} subtitle={t("Torna al progetto Firebase del sito.")}
            onPress={() => setDisconnecting(true)} />
        </>}
        <RowDivider />
        <ActionRow icon={iconShapes.swap} tone="tertiary" title={t("Cambia modalità")} subtitle={t("Passa alla modalità Standard, sul dispositivo.")}
          onPress={() => setChanging(true)} />
        {onSignOut && <>
          <RowDivider />
          <ActionRow icon={iconShapes.logout} tone="secondary" title={t("Esci")} subtitle={signingOut ? t("Uscita in corso…") : t("Esci da questo account Google.")}
            busy={signingOut} busyLabel={t("Uscita in corso…")} onPress={onSignOut} />
        </>}
      </ListGroup>
      <ChangeModeDialog visible={changing} target="standard" onDismiss={() => setChanging(false)} onConfirm={() => onChangeMode('standard')} />
      {onDisconnect && <DisconnectDialog visible={disconnecting} project={project} onDismiss={() => setDisconnecting(false)} onConfirm={onDisconnect} />}
    </>
  );
}

function DialogFrame({ visible, title, label, onDismiss, children, actions }: { visible: boolean; title: string; label: string; onDismiss: () => void; children: ReactNode; actions: ReactNode }) {
  const compact = useSizeClass() === 'compact';
  return (
    <Portal>
      <Dialog variant="alert" visible={visible} onDismiss={onDismiss} style={{ maxWidth: 440 }}>
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
      {/* The app's primary colour (user's request, 22 November): nothing is deleted, only the archive opened changes. */}
      <ConfirmButton onPress={() => { onDismiss(); onConfirm(); }}>{t("Cambia modalità")}</ConfirmButton>
    </>}>
      <Text variant="bodyMedium" style={muted}>{target === 'advanced'
        ? t("I dati di questo dispositivo restano qui. Dopo l’accesso puoi portarli nel tuo Firebase: Archiviazione e backup → «Dal dispositivo a Firebase».")
        : t("I dati del progetto Firebase restano lì. Per averli anche su questo dispositivo, prima di cambiare usa «Da Firebase al dispositivo» in questa pagina.")}</Text>
      <Text variant="bodyMedium" style={muted}>{t("Consiglio: prima scarica un backup (JSON) e salvalo su Google Drive o in un altro posto sicuro.")}</Text>
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0 },
  dialogBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
});
