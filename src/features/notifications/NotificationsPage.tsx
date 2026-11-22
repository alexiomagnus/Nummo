import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button, CancelButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import { useSnackbar } from '../../components/SnackbarHost';
import { notificationFrequencies, notificationFrequencyLabels, reminderHourRange, reminderPresets, type NotificationFrequency } from '../../domain/notifications';
import { MenuSelect } from '../../components/MenuSelect';
import { useI18n } from '../../i18n/I18nProvider';
import { formatHour, type TimeFormat } from '../../domain/timeFormat';
import { autoTimeZone, timeZoneCity } from '../../domain/timeZones';
import { deviceTimeZone } from '../../domain/pushSchedule';
import { androidNotifications } from '../../services/androidApp';
import type { OpenedNotification } from '../../services/pushNotifications';
import { layout, spacing } from '../../theme/tokens';
import type { Notifications } from './useNotifications';
import type { PushState } from './usePushNotifications';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

// Test buttons («Invia notifica di prova», «Prova con Nummo chiusa»): hidden since 21 November on request, kept for
// debugging. Set to true to show them again; the hook (localTest/remoteTest), the service API /v1/test and the
// translations are unchanged.
const pushTests: boolean = false;

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
  if (support === 'unsupported') body = line(t("Questo browser non supporta le notifiche di sistema."));
  else if (support === 'needs-install') body = line(t("Su iPhone e iPad le notifiche arrivano solo se aggiungi Nummo alla schermata Home: tocca Condividi, poi «Aggiungi alla schermata Home», e apri Nummo da lì."));
  else if (support === 'unconfigured') body = line(t("Le notifiche di sistema non sono configurate in questa installazione di Nummo."));
  else if (status === null) body = line(t("Controllo in corso…"));
  else if (status === 'denied') {
    // Android app: blocked in Android's settings, which the app can open (services/androidApp.ts).
    const android = androidNotifications();
    body = android ? <>
      {line(t("Le notifiche di Nummo sono bloccate nelle impostazioni di Android. Consentile lì, poi torna qui."))}
      <View style={styles.actions}>
        <Button mode="contained-tonal" icon={icon(iconShapes.bell)} onPress={() => android.openNotificationSettings()}>{t("Apri le impostazioni")}</Button>
      </View>
    </> : line(t("Le notifiche sono bloccate per questo sito. Per attivarle consenti le notifiche nelle impostazioni del browser, poi torna qui."));
  }
  else if (status === 'off') body = <>
    {line(t("Spente su questo dispositivo. Attivale per ricevere promemoria e riepiloghi."))}
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
      {pushTests && <>
        <Button mode="contained-tonal" disabled={busy} onPress={() => void push.localTest().then((ok) => { if (!ok) notify(t("Impossibile mostrare la notifica di prova.")); })}>{t("Invia notifica di prova")}</Button>
        <Button mode="outlined" disabled={busy} onPress={() => void remote(30)}>{t("Prova con Nummo chiusa")}</Button>
      </>}
      <Button mode="text" disabled={busy} loading={busy} onPress={() => { setWaiting(false); void push.disable(); }}>{t("Disattiva su questo dispositivo")}</Button>
    </View>
    {pushTests && waiting && line(t("Chiudi Nummo ora: entro circa un minuto arriverà una notifica push dal servizio. Se arriva, le notifiche funzionano anche ad app chiusa."))}
  </>;
  return (
    <Card title={t("Notifiche di sistema")}>
      <View style={styles.block}>{body}</View>
    </Card>
  );
}

// Italian elides the article before a day read with a vowel (uno, otto, undici): «Dall’8 nov… all’1 dic…», as public/sw.js.
const elided = (date: string) => [1, 8, 11].includes(Number(date.slice(8, 10)));

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
        <Text variant="bodyMedium" style={muted}>{(() => {
          const dates = { p0: formatDate(from), p1: formatDate(to) };
          if (elided(from)) return elided(to) ? t("Dall’{p0} all’{p1}", dates) : t("Dall’{p0} al {p1}", dates);
          return elided(to) ? t("Dal {p0} all’{p1}", dates) : t("Dal {p0} al {p1}", dates);
        })()}</Text>
        {count === 0 ? <Text variant="bodyLarge">{t("Nessuna spesa in questo periodo.")}</Text>
          : <Text variant="bodyLarge">{count === 1 ? t("{p0} in 1 spesa", { p0: formatAmount(total) }) : t("{p0} in {p1} spese", { p0: formatAmount(total), p1: count })}</Text>}
        {top && <Text variant="bodyMedium">{t("Categoria principale: {p0} ({p1})", { p0: top.label, p1: formatAmount(top.amount) })}</Text>}
        <Text variant="bodySmall" style={muted}>{t("Abbonamenti esclusi.")}</Text>
        <View style={styles.actions}><CancelButton onPress={onClose}>{t("Chiudi")}</CancelButton></View>
      </View>
    </Card>
  );
}

type TimeChoice = 'morning' | 'lunch' | 'evening' | 'custom';
const timeChoiceOf = (hour: number): TimeChoice => (Object.entries(reminderPresets).find(([, value]) => value === hour)?.[0] as TimeChoice | undefined) ?? 'custom';
const hours = Array.from({ length: reminderHourRange.max - reminderHourRange.min + 1 }, (_, index) => reminderHourRange.min + index);

// The hour at which every notification is delivered (clock of the device's time zone, written in 24 or 12 hours as chosen in the settings): three quick choices or any hour of the day.
function ReminderTime({ hour, timeFormat, timeZone, onChange }: { hour: number; timeFormat: TimeFormat; timeZone: string; onChange: (hour: number) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  // «Altra» stays selected while the chosen hour happens to equal a preset.
  const [custom, setCustom] = useState(() => timeChoiceOf(hour) === 'custom');
  const choice: TimeChoice = custom ? 'custom' : timeChoiceOf(hour);
  const labels: Record<TimeChoice, string> = { morning: t("Mattina"), lunch: t("Pranzo"), evening: t("Sera"), custom: t("Altra") };
  const pick = (next: TimeChoice) => {
    if (next === 'custom') { setCustom(true); return; }
    setCustom(false); onChange(reminderPresets[next]);
  };
  const time = (value: number) => formatHour(value, timeFormat);
  // The zone is named only when it is not the device's own (a chosen one): the usual case stays a plain «alle 9:00».
  const zoneNote = timeZone !== autoTimeZone && timeZone !== deviceTimeZone() ? timeZoneCity(timeZone) : null;
  return (
    <Card title={t("Orario delle notifiche")}>
      <View style={styles.hourBlock}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("A che ora vuoi riceverle? Vale per promemoria backup, riepiloghi e rinnovi.")}</Text>
        <SegmentedButtons label={t("Orario delle notifiche")} value={choice} onChange={pick}
          options={(['morning', 'lunch', 'evening', 'custom'] as const).map((value) => ({ value, label: labels[value] }))} />
        {custom && <MenuSelect label={t("Ora")} icon={iconShapes.bell} value={String(hour)} onChange={(value) => onChange(Number(value))}
          options={hours.map((value) => ({ value: String(value), label: time(value) }))} />}
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{zoneNote ? t("Arrivano alle {p0} ({p1}).", { p0: time(hour), p1: zoneNote }) : t("Arrivano alle {p0}.", { p0: time(hour) })}</Text>
      </View>
    </Card>
  );
}

// Page of the account menu (below Settings): system notifications of this browser, the backup reminder (Standard mode
// only: in the Advanced mode the data is in Firebase, and a JSON backup is a separate, manual choice), the spending
// summary and the subscription renewals, each with its own switch. Every change applies at once and is kept in this browser. A tapped notification
// leads here.
export function NotificationsPage({ notifications, opened, onCloseOpened, exporting, onExport, timeFormat, timeZone }: { notifications: Notifications;
  opened: OpenedNotification | null; onCloseOpened: () => void; exporting: boolean; onExport: () => void; timeFormat: TimeFormat; timeZone: string }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const { preferences: p, changePreferences: change, backupReminders, lastBackupAt, backupDue } = notifications;
  const muted = { color: colors.onSurfaceVariant };
  // Narrow page (phones, narrow windows, any zoom): short labels so the three choices fit one line under the label; the
  // accessible name stays the full one. Decided on the page's measured width, not the window class.
  const [pageWidth, setPageWidth] = useState(0);
  const compact = pageWidth > 0 && pageWidth < 640;
  const shortLabels: Record<NotificationFrequency, string> = { weekly: 'Settimana', biweekly: '14 giorni', monthly: 'Mese' };
  const frequencyOptions = notificationFrequencies.map((value) => ({ value, label: t(compact ? shortLabels[value] : notificationFrequencyLabels[value]),
    accessibilityLabel: t(notificationFrequencyLabels[value]) }));
  // `showLabel` off: the choices alone, over the whole width (the switch above already says what they are for); the name stays accessible.
  const frequency = (label: string, value: NotificationFrequency, onChange: (value: NotificationFrequency) => void, disabled: boolean, showLabel = true) => (
    // Laid out like the switch row above it: same text style and padding, the choices on the right (below when narrow).
    <View style={[styles.frequency, compact && styles.frequencyNarrow, !showLabel && styles.frequencyFull]}>
      {showLabel && <Text variant="bodyLarge" style={[styles.frequencyLabel, disabled && muted]}>{label}</Text>}
      {/* Segmented buttons: always one line, full width under the label on narrow pages, beside it on wide ones. */}
      <View style={[styles.frequencyChoices, (compact || !showLabel) && styles.frequencyChoicesNarrow]}>
        <SegmentedButtons label={label} options={frequencyOptions} value={value} disabled={disabled} onChange={onChange} />
      </View>
    </View>
  );
  return (
    <View style={styles.root} onLayout={({ nativeEvent }) => setPageWidth(nativeEvent.layout.width)}>
      {opened?.kind === 'summary' && opened.from && opened.to &&
        <OpenedSummary notifications={notifications} from={opened.from} to={opened.to} onClose={onCloseOpened} />}
      <SystemNotifications push={notifications.push} />
      <ReminderTime hour={p.reminderHour} timeFormat={timeFormat} timeZone={timeZone} onChange={(reminderHour) => change({ reminderHour })} />
      {backupReminders && <Card title={t("Promemoria backup")}>
        <Text variant="bodyMedium" style={muted}>{t("Ricevi un promemoria per esportare una copia dei tuoi dati.")}</Text>
        <SwitchRow label={t("Attiva promemoria backup")} value={p.backupEnabled} onChange={(backupEnabled) => change({ backupEnabled })}
          supporting={t("Solo se i dati sono cambiati dall’ultimo backup.")} />
        {frequency(t("Frequenza del promemoria"), p.backupFrequency, (backupFrequency) => change({ backupFrequency }), !p.backupEnabled)}
        <Text variant="bodyMedium" style={muted}>{lastBackupAt
          ? t("Ultimo backup: {p0}", { p0: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastBackupAt)) })
          : t("Nessun backup finora.")}</Text>
        {backupDue && <View style={styles.block}>
          <Text variant="bodyMedium">{t("I dati sono cambiati dall’ultimo backup: è il momento di esportarne una copia.")}</Text>
          <View style={styles.actions}>
            <Button mode="contained-tonal" icon={icon(iconShapes.download)} loading={exporting} disabled={exporting} onPress={onExport}>{t("Esporta backup")}</Button>
            <Button mode="text" disabled={exporting} onPress={notifications.snoozeBackup}>{t("Ricordamelo tra 3 giorni")}</Button>
          </View>
        </View>}
      </Card>}
      <Card title={t("Riepilogo spese")}>
        <SwitchRow label={t("Attiva riepilogo spese")} value={p.summaryEnabled} onChange={(summaryEnabled) => change({ summaryEnabled })}
          supporting={t("Un riepilogo delle tue spese del periodo appena concluso.")} />
        {frequency(t("Frequenza del riepilogo"), p.summaryFrequency, (summaryFrequency) => change({ summaryFrequency }), !p.summaryEnabled, false)}
      </Card>
      <Card title={t("Rinnovi degli abbonamenti")}>
        <SwitchRow label={t("Avvisa prima dei rinnovi")} value={p.renewalEnabled} onChange={(renewalEnabled) => change({ renewalEnabled })}
          supporting={t("Una notifica il giorno prima del rinnovo di un abbonamento attivo.")} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  frequency: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.lg,
    rowGap: spacing.md, minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  // Phones: the choices sit a little lower under the label (20 instead of 12).
  frequencyNarrow: { rowGap: spacing.lg + spacing.xs },
  frequencyFull: { justifyContent: 'flex-start' },
  frequencyLabel: { flexShrink: 1 },
  frequencyChoices: { width: 420, maxWidth: '100%' },
  frequencyChoicesNarrow: { width: '100%' },
  block: { gap: spacing.sm },
  // Orario: room (16) around the choices, between the question above and the note below.
  hourBlock: { gap: spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
