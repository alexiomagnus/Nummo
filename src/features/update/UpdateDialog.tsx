import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { Button, ConfirmButton } from '../../components/Button';
import { screenActionStyles } from '../../components/screenActions';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { downloadProgress, type AppRelease } from '../../domain/appUpdate';
import { useI18n } from '../../i18n/I18nProvider';
import { dateTimeFormat, numberFormat } from '../../i18n/translate';
import { allowUpdateInstallsOnDevice, androidUpdater, downloadUpdateOnDevice, installUpdateOnDevice, type UpdateFailure } from '../../services/androidApp';
import { radius, spacing } from '../../theme/tokens';
import { ReleaseNotes } from './ReleaseNotes';
import { openExternal } from '../session/firebaseConnection';

type Phase =
  | { kind: 'offer' }
  | { kind: 'downloading'; received: number; total: number }
  | { kind: 'permission' }
  | { kind: 'ready' }
  | { kind: 'installing' }
  | { kind: 'failed'; reason: UpdateFailure | 'install' | 'permission' };

// «Aggiornamento disponibile» (27 November, on request): a screen with the installed and the new version in a tonal hero (a short «Novità»: three items at most; all the notes are in «Note di rilascio»), «Più tardi» and «Aggiorna». In an app with the updater (0.3.6+) «Aggiorna» downloads the APK inside the app
// with a progress bar, the app verifies it (SHA-256 when the release has one, package, newer version, same signing key) and
// Android's installer asks the user to confirm; the «install unknown apps» permission is asked first if missing. In an older
// app (0.3.5) «Aggiorna» opens the release on GitHub, outside the app. Back, «Più tardi» or «Annulla download» stop it.
export function UpdateDialog({ release, installed, onClose }: { release: AppRelease | null; installed: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>({ kind: 'offer' });
  const download = useRef<AbortController | null>(null);
  const updater = androidUpdater();
  const shown = useRef<AppRelease | null>(null);
  if (release) shown.current = release;
  const current = release ?? shown.current;
  useEffect(() => { if (release) setPhase({ kind: 'offer' }); }, [release]);
  // Leaving the screen stops a download in progress (the app deletes the partial file).
  useEffect(() => () => download.current?.abort(), []);
  if (!current) return null;

  const close = () => { download.current?.abort(); download.current = null; onClose(); };

  const install = async () => {
    if (!updater) return;
    if (!updater.canInstallUpdates()) { setPhase({ kind: 'permission' }); return; }
    setPhase({ kind: 'installing' });
    const outcome = await installUpdateOnDevice(updater);
    // A confirmed update replaces the app: nothing comes back. Declined → the verified file stays, «Installa» again.
    if (outcome === 'cancelled') setPhase({ kind: 'ready' });
    else if (outcome === 'unavailable') setPhase(updater.canInstallUpdates() ? { kind: 'failed', reason: 'install' } : { kind: 'permission' });
    else if (outcome === 'error') setPhase({ kind: 'failed', reason: 'install' });
  };

  const allow = async () => {
    if (!updater) return;
    const outcome = await allowUpdateInstallsOnDevice(updater);
    if (outcome === 'ok') await install();
    else setPhase({ kind: 'failed', reason: 'permission' });
  };

  const start = async () => {
    if (!updater) { openExternal(current.pageUrl); onClose(); return; }
    const controller = new AbortController();
    download.current = controller;
    setPhase({ kind: 'downloading', received: 0, total: current.apk.size });
    let last = 0;
    const result = await downloadUpdateOnDevice(updater, current.apk, (received, total) => {
      // At most a few renders a second: the app reports often.
      const now = Date.now();
      if (now - last < 100 && received < total) return;
      last = now;
      setPhase({ kind: 'downloading', received, total: total > 0 ? total : current.apk.size });
    }, controller.signal);
    if (download.current === controller) download.current = null;
    if (result.outcome === 'cancelled') { if (!controller.signal.aborted) setPhase({ kind: 'offer' }); return; }
    if (result.outcome === 'error') { setPhase({ kind: 'failed', reason: result.reason }); return; }
    await install();
  };

  const megabytes = (bytes: number) => numberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(bytes / (1024 * 1024));
  const published = current.publishedAt ? dateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date(current.publishedAt)) : null;
  const busy = phase.kind === 'downloading' || phase.kind === 'installing';
  const failure = phase.kind === 'failed' ? failureText(t, phase.reason) : null;
  const pill = [screenActionStyles.button];

  return (
    <Portal>
    <AppDialog visible={release !== null} onDismiss={close} dismissable={phase.kind !== 'installing'}>
      <AppDialog.Title>{t("Aggiornamento disponibile")}</AppDialog.Title>
      <AppDialog.ScrollArea style={styles.area}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}
            {...({ role: 'region', 'aria-label': t("Da {p0} a {p1}", { p0: installed, p1: current.version }) } as object)}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <SvgIcon shape={iconShapes.download} size={28} color={colors.onPrimary} />
            </View>
            <Text variant="labelLarge" style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}>{t("Nuova versione")}</Text>
            <Text style={[styles.version, { color: colors.onPrimaryContainer }]} numberOfLines={1} adjustsFontSizeToFit>{current.version}</Text>
            <Text variant="bodyMedium" style={[styles.center, { color: colors.onPrimaryContainer, opacity: 0.8 }]}>{t("Installata: {p0}", { p0: installed })}</Text>
            <Text variant="bodySmall" style={[styles.center, { color: colors.onPrimaryContainer, opacity: 0.8 }]}>
              {[published, t("{p0} MB", { p0: megabytes(current.apk.size) })].filter(Boolean).join(' · ')}</Text>
          </View>
          {phase.kind === 'downloading' && <Progress received={phase.received} total={phase.total} megabytes={megabytes} />}
          {phase.kind === 'installing' && <Note icon={iconShapes.info} text={t("Conferma l'installazione nella finestra di Android. Nummo si chiuderà e si riaprirà aggiornato: i tuoi dati restano.")} />}
          {phase.kind === 'permission' && <Note icon={iconShapes.info} text={t("Per installare l'aggiornamento, Android chiede di consentire a Nummo di installare app. Apri le impostazioni, attiva «Consenti da questa fonte» e torna qui.")} />}
          {phase.kind === 'ready' && <Note icon={iconShapes.info} text={t("Aggiornamento scaricato e verificato. Installalo quando vuoi.")} />}
          {failure && <Note icon={iconShapes.info} text={failure} error />}
          {!updater && <Note icon={iconShapes.externalLink} text={t("Questa versione dell'app non può scaricare gli aggiornamenti da sola: «Aggiorna» apre la pagina della release su GitHub, da cui scaricare il file APK.")} />}
          {current.notes.trim() !== '' && <View style={styles.notes}>
            <Text variant="titleMedium" accessibilityRole="header" aria-level={2}>{t("Novità")}</Text>
            <ReleaseNotes notes={current.notes} summary />
          </View>}
        </ScrollView>
      </AppDialog.ScrollArea>
      <AppDialog.Actions>
        {phase.kind === 'downloading'
          ? <Button mode="outlined" style={pill} contentStyle={screenActionStyles.content} labelStyle={screenActionStyles.label}
              onPress={() => { download.current?.abort(); download.current = null; setPhase({ kind: 'offer' }); }}>{t("Annulla download")}</Button>
          : <Button mode="outlined" style={pill} contentStyle={screenActionStyles.content} labelStyle={screenActionStyles.label}
              disabled={phase.kind === 'installing'} onPress={close}>{t("Più tardi")}</Button>}
        {phase.kind === 'permission'
          ? <ConfirmButton onPress={() => { void allow(); }}>{t("Apri le impostazioni")}</ConfirmButton>
          : phase.kind === 'ready'
            ? <ConfirmButton onPress={() => { void install(); }}>{t("Installa")}</ConfirmButton>
            : <ConfirmButton disabled={busy} loading={busy}
                onPress={() => { void start(); }}>{phase.kind === 'failed' ? t("Riprova") : t("Aggiorna")}</ConfirmButton>}
      </AppDialog.Actions>
    </AppDialog>
    </Portal>
  );
}

function failureText(t: ReturnType<typeof useI18n>['t'], reason: UpdateFailure | 'install' | 'permission'): string {
  switch (reason) {
    case 'network': return t("Download non riuscito: controlla la connessione e riprova.");
    case 'integrity': return t("Il file scaricato non corrisponde a quello pubblicato (SHA-256 diverso): non è stato installato.");
    case 'signature': return t("Il file scaricato non è firmato con la chiave di Nummo: non è stato installato.");
    case 'package': return t("Il file scaricato non è l'app Nummo installata: non è stato installato.");
    case 'version': return t("Il file scaricato non è più recente dell'app installata.");
    case 'storage': return t("Spazio insufficiente sul telefono per scaricare l'aggiornamento.");
    case 'permission': return t("Senza il permesso di installare app, Nummo non può avviare l'aggiornamento.");
    case 'install': return t("Android non ha installato l'aggiornamento. Riprova.");
    default: return t("Aggiornamento non riuscito. Riprova.");
  }
}

// Expressive linear progress: a thick rounded track, the filled part in the main colour, percentage and megabytes.
function Progress({ received, total, megabytes }: { received: number; total: number; megabytes: (bytes: number) => string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const share = downloadProgress(received, total) ?? 0;
  const percent = Math.round(share * 100);
  return (
    <View style={styles.progress}>
      <View style={styles.progressText}>
        <Text variant="titleSmall">{t("Download in corso")}</Text>
        <Text variant="titleSmall" style={{ color: colors.primary }}>{t("{p0}%", { p0: percent })}</Text>
      </View>
      <View role="progressbar" aria-label={t("Download dell'aggiornamento")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        style={[styles.track, { backgroundColor: colors.secondaryContainer }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max(share * 100, 2)}%` } as ViewStyle]} />
      </View>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        {t("{p0} di {p1} MB", { p0: megabytes(received), p1: megabytes(total) })}</Text>
    </View>
  );
}

function Note({ icon, text, error = false }: { icon: string; text: string; error?: boolean }) {
  const { colors } = useTheme();
  const fill = error ? colors.errorContainer : colors.secondaryContainer;
  const ink = error ? colors.onErrorContainer : colors.onSecondaryContainer;
  return (
    <View style={[styles.note, { backgroundColor: fill }]} role={error ? 'alert' : 'status'}>
      <SvgIcon shape={icon} size={20} color={ink} />
      <Text variant="bodyMedium" style={[styles.noteText, { color: ink }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { paddingHorizontal: 0 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  hero: { borderRadius: radius.dialog, overflow: 'hidden', alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.xs },
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  version: { fontSize: 56, lineHeight: 64, fontWeight: '800', letterSpacing: -1.5, textAlign: 'center' },
  center: { textAlign: 'center' },
  notes: { gap: spacing.md },
  progress: { gap: spacing.sm },
  progressText: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg },
  noteText: { flex: 1, minWidth: 0 },
});
