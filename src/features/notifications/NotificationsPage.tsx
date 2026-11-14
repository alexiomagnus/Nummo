import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import { useSnackbar } from '../../components/SnackbarHost';
import { notificationFrequencies, notificationFrequencyLabels, type NotificationFrequency } from '../../domain/notifications';
import { useI18n } from '../../i18n/I18nProvider';
import type { OpenedNotification } from '../../services/pushNotifications';
import { layout, spacing } from '../../theme/tokens';
import type { Notifications } from './useNotifications';
import type { PushState } from './usePushNotifications';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

// System notifications of this browser: one plain status line and only the actions that make sense in that state.
function SystemNotifications({ push }: { push: PushState }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const notify = useSnackbar();
  const [waiting, setWaiting] = useState(false);
  const muted = { color: colors.onSurfaceVariant };
  const { support, status, failure, busy } = push;
  const line = (text: string, error = false) => <Text variant="bodyMedium" style={error ? { color: colors.error } : muted}>{text}</Text>;
  const remote = async (delay: number) => {
    const result = await push.remoteTest(delay);
    if (result === 'ok' && delay > 0) setWaiting(true);
    else if (result === 'ok') notify(t("Notifica push inviata."));
    else notify(result === 'rate' ? t("Attendi qualche secondo prima di un'altra prova.")
      : result === 'gone' ? t("Questo dispositivo non è più iscritto: riattiva le notifiche di sistema.") : t("Il servizio delle notifiche non risponde. Riprova più tardi."));
  };
  let body;
  if (support === 'unsupported') body = line(t("Questo browser non supporta le notifiche di sistema. Restano gli avvisi dentro Nummo."));
  else if (support === 'needs-install') body = line(t("Su iPhone e iPad le notifiche arrivano solo se aggiungi Nummo alla schermata Home: tocca Condividi, poi «Aggiungi alla schermata Home», e apri Nummo da lì."));
  else if (support === 'unconfigured') body = line(t("Le notifiche di sistema non sono configurate in questa installazione di Nummo. Restano gli avvisi dentro Nummo."));
  else if (status === null) body = line(t("Controllo in corso…"));
  else if (status === 'denied') body = line(t("Le notifiche sono bloccate per questo sito. Per attivarle consenti le notifiche nelle impostazioni del browser, poi torna qui."));
  else if (status === 'off') body = <>
    {line(t("Spente su questo dispositivo. Attivale per ricevere promemoria e riepiloghi anche con Nummo chiusa."))}
    {failure === 'browser' && line(t("Il browser non è riuscito a iscriversi al proprio servizio di notifiche. Riprova più tardi o con un altro browser."), true)}
    {failure === 'service' && line(t("Il servizio delle notifiche non risponde. Riprova più tardi."), true)}
    <View style={styles.actions}>
      <Button mode="contained-tonal" icon={icon(iconShapes.bell)} loading={busy} disabled={busy} onPress={() => void push.enable()}>{t("Attiva notifiche di sistema")}</Button>
    </View>
  </>;
  else body = <>
    {line(t("Attive su questo dispositivo: arrivano anche con Nummo chiusa."))}
    {failure && line(t("Il servizio delle notifiche non risponde: gli orari dei promemoria verranno aggiornati più tardi."), true)}
    <View style={styles.actions}>
      <Button mode="contained-tonal" disabled={busy} onPress={() => void push.localTest().then((ok) => { if (!ok) notify(t("Impossibile mostrare la notifica di prova.")); })}>{t("Invia notifica di prova")}</Button>
      <Button mode="outlined" disabled={busy} onPress={() => void remote(30)}>{t("Prova con Nummo chiusa")}</Button>
      <Button mode="text" disabled={busy} loading={busy} onPress={() => { setWaiting(false); void push.disable(); }}>{t("Disattiva su questo dispositivo")}</Button>
    </View>
    {waiting && line(t("Chiudi Nummo ora: entro circa un minuto arriverà una notifica push dal servizio. Se arriva, le notifiche funzionano anche ad app chiusa."))}
  </>;
  return (
    <Card title={t("Notifiche di sistema")}>
      <View style={styles.block}>{body}</View>
    </Card>
  );
}

// The summary of the period of a tapped notification, computed now from the data on screen.
function OpenedSummary({ notifications, from, to, onClose }: { notifications: Notifications; from: string; to: string; onClose: () => void }) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const { total, count, top } = notifications.summaryOf({ from, to });
  // Seen: not offered again as an in-app notice.
  useEffect(() => { notifications.closeSummary({ from, to }); }, [from, to]);
  return (
    <Card title={t("Riepilogo spese")}>
      <View style={styles.block}>
        <Text variant="bodyMedium" style={muted}>{t("Dal {p0} al {p1}", { p0: formatDate(from), p1: formatDate(to) })}</Text>
        {count === 0 ? <Text variant="bodyLarge">{t("Nessuna spesa in questo periodo.")}</Text>
          : <Text variant="bodyLarge">{count === 1 ? t("{p0} in 1 spesa", { p0: formatAmount(total) }) : t("{p0} in {p1} spese", { p0: formatAmount(total), p1: count })}</Text>}
        {top && <Text variant="bodyMedium">{t("Categoria principale: {p0} ({p1})", { p0: top.label, p1: formatAmount(top.amount) })}</Text>}
        <Text variant="bodySmall" style={muted}>{t("Abbonamenti esclusi.")}</Text>
        <View style={styles.actions}><Button mode="text" onPress={onClose}>{t("Chiudi")}</Button></View>
      </View>
    </Card>
  );
}

// Page of the account menu (below Settings): system notifications of this browser, the backup reminder (Standard mode
// only: in the Advanced mode the data is in Firebase, and a JSON backup is a separate, manual choice) and the spending
// summary, each with its own switch. Every change applies at once and is kept in this browser. A tapped notification
// leads here.
export function NotificationsPage({ notifications, opened, onCloseOpened, exporting, onExport }: { notifications: Notifications;
  opened: OpenedNotification | null; onCloseOpened: () => void; exporting: boolean; onExport: () => void }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const { preferences: p, changePreferences: change, backupReminders, lastBackupAt, backupDue, exportedAt } = notifications;
  const muted = { color: colors.onSurfaceVariant };
  const frequencyOptions = notificationFrequencies.map((value) => ({ value, label: t(notificationFrequencyLabels[value]) }));
  const frequency = (label: string, value: NotificationFrequency, onChange: (value: NotificationFrequency) => void, disabled: boolean) => (
    <View style={styles.frequency}>
      <Text variant="labelLarge" style={disabled ? muted : undefined}>{label}</Text>
      <ChoiceChips label={label} options={frequencyOptions} value={value} disabled={disabled} onChange={(next) => next && onChange(next)} />
    </View>
  );
  return (
    <View style={styles.root}>
      {opened?.kind === 'summary' && opened.from && opened.to &&
        <OpenedSummary notifications={notifications} from={opened.from} to={opened.to} onClose={onCloseOpened} />}
      <SystemNotifications push={notifications.push} />
      {backupReminders && <Card title={t("Promemoria backup")}>
        <Text variant="bodyMedium" style={muted}>{t("Ricevi un promemoria per esportare una copia dei tuoi dati.")}</Text>
        <SwitchRow label={t("Attiva promemoria backup")} value={p.backupEnabled} onChange={(backupEnabled) => change({ backupEnabled })}
          supporting={t("Solo se i dati sono cambiati dall’ultimo backup confermato.")} />
        {frequency(t("Frequenza del promemoria"), p.backupFrequency, (backupFrequency) => change({ backupFrequency }), !p.backupEnabled)}
        <Text variant="bodyMedium" style={muted}>{lastBackupAt
          ? t("Ultimo backup confermato: {p0}", { p0: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastBackupAt)) })
          : t("Nessun backup confermato finora.")}</Text>
        {exportedAt ? <View style={styles.block}>
          <Text variant="titleSmall">{t("Hai salvato il backup?")}</Text>
          <Text variant="bodyMedium" style={muted}>{t("Il download è stato avviato. Conferma solo dopo aver controllato che il file sia stato salvato.")}</Text>
          <View style={styles.actions}>
            <Button mode="contained-tonal" onPress={notifications.confirmBackup}>{t("Sì, è salvato")}</Button>
            <Button mode="text" onPress={notifications.notConfirmed}>{t("Non ancora")}</Button>
          </View>
        </View> : backupDue && <View style={styles.block}>
          <Text variant="bodyMedium">{t("I dati sono cambiati dall’ultimo backup confermato: è il momento di esportarne una copia.")}</Text>
          <View style={styles.actions}>
            <Button mode="contained-tonal" icon={icon(iconShapes.download)} loading={exporting} disabled={exporting} onPress={onExport}>{t("Esporta backup")}</Button>
            <Button mode="text" disabled={exporting} onPress={notifications.snoozeBackup}>{t("Ricordamelo tra 3 giorni")}</Button>
          </View>
        </View>}
      </Card>}
      <Card title={t("Riepilogo spese")}>
        <Text variant="bodyMedium" style={muted}>{t("Ricevi un riepilogo periodico delle tue spese.")}</Text>
        <SwitchRow label={t("Attiva riepilogo spese")} value={p.summaryEnabled} onChange={(summaryEnabled) => change({ summaryEnabled })}
          supporting={t("Totale, numero di spese e categoria principale del periodo concluso. Abbonamenti esclusi.")} />
        {frequency(t("Frequenza del riepilogo"), p.summaryFrequency, (summaryFrequency) => change({ summaryFrequency }), !p.summaryEnabled)}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  frequency: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  block: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
