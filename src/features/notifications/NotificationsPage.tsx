import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SwitchRow } from '../../components/SwitchRow';
import { notificationFrequencies, notificationFrequencyLabels, type NotificationFrequency } from '../../domain/notifications';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, spacing } from '../../theme/tokens';
import type { Notifications } from './useNotifications';

// Page of the account menu (below Settings): the main switch, the backup reminder (Standard mode only: in the Advanced
// mode the data is in Firebase, and a JSON backup is a separate, manual choice) and the spending summary.
// Every change applies at once and is kept in this browser. Turning the main switch off keeps the individual choices.
export function NotificationsPage({ notifications }: { notifications: Notifications }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const { preferences: p, changePreferences: change, backupReminders, lastBackupAt } = notifications;
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
      <Card title={t("Notifiche generali")}>
        <SwitchRow label={t("Attiva notifiche")} value={p.enabled} onChange={(enabled) => change({ enabled })}
          supporting={t("Avvisi discreti all’interno di Nummo, controllati quando apri l’app o torni a usarla. Non arrivano ad app chiusa.")} />
      </Card>
      {backupReminders && <Card title={t("Promemoria backup")}>
        <Text variant="bodyMedium" style={muted}>{t("Ricevi un promemoria per esportare una copia dei tuoi dati.")}</Text>
        <SwitchRow label={t("Attiva promemoria backup")} value={p.backupEnabled} disabled={!p.enabled} onChange={(backupEnabled) => change({ backupEnabled })}
          supporting={t("Solo se i dati sono cambiati dall’ultimo backup confermato.")} />
        {frequency(t("Frequenza del promemoria"), p.backupFrequency, (backupFrequency) => change({ backupFrequency }), !p.enabled || !p.backupEnabled)}
        <Text variant="bodyMedium" style={muted}>{lastBackupAt
          ? t("Ultimo backup confermato: {p0}", { p0: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastBackupAt)) })
          : t("Nessun backup confermato finora.")}</Text>
      </Card>}
      <Card title={t("Riepilogo spese")}>
        <Text variant="bodyMedium" style={muted}>{t("Ricevi un riepilogo periodico delle tue spese.")}</Text>
        <SwitchRow label={t("Attiva riepilogo spese")} value={p.summaryEnabled} disabled={!p.enabled} onChange={(summaryEnabled) => change({ summaryEnabled })}
          supporting={t("Totale, numero di spese e categoria principale del periodo concluso. Abbonamenti esclusi.")} />
        {frequency(t("Frequenza del riepilogo"), p.summaryFrequency, (summaryFrequency) => change({ summaryFrequency }), !p.enabled || !p.summaryEnabled)}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  frequency: { gap: spacing.sm, paddingHorizontal: spacing.lg },
});
