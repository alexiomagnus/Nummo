import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { SpendingSummary } from '../../domain/notifications';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { Notifications } from './useNotifications';

const icon = (shape: string) => ({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape} size={size} color={color} />;

// One discreet notice: tonal surface, icon, a few lines and its actions. Part of the page flow (never a modal); the
// polite live region announces it without taking the focus.
function Notice({ shape, title, children, actions }: { shape: string; title: string; children: ReactNode; actions: ReactNode }) {
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  return (
    <View style={[styles.notice, { backgroundColor: colors.elevation.level2 }]} role="status" aria-live="polite">
      <View style={styles.body}>
        <SvgIcon shape={shape} size={24} color={colors.primary} />
        <View style={styles.text}>
          <Text variant="titleSmall" accessibilityRole="header" aria-level={2}>{title}</Text>
          {children}
        </View>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>{actions}</View>
    </View>
  );
}

function SummaryNotice({ summary, onClose }: { summary: SpendingSummary; onClose: () => void }) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const { period, total, count, top } = summary;
  return (
    <Notice shape={iconShapes.chart} title={t("Riepilogo spese")} actions={
      <Button mode="text" onPress={onClose}>{t("Chiudi")}</Button>}>
      <Text variant="bodyMedium" style={muted}>{t("Dal {p0} al {p1}", { p0: formatDate(period.from), p1: formatDate(period.to) })}</Text>
      <Text variant="bodyLarge">{count === 1 ? t("{p0} in 1 spesa", { p0: formatAmount(total) }) : t("{p0} in {p1} spese", { p0: formatAmount(total), p1: count })}</Text>
      {top && <Text variant="bodyMedium">{t("Categoria principale: {p0} ({p1})", { p0: top.label, p1: formatAmount(top.amount) })}</Text>}
      <Text variant="bodySmall" style={muted}>{t("Abbonamenti esclusi.")}</Text>
    </Notice>
  );
}

// The notices due now, above the page content. `onExport` starts the existing manual JSON export.
export function NotificationCards({ notifications, exporting, onExport }: { notifications: Notifications; exporting: boolean; onExport: () => void }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const dateTime = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
  const { due, exportedAt, lastBackupAt } = notifications;
  if (!exportedAt && due.length === 0) return null;
  const muted = { color: colors.onSurfaceVariant };
  return (
    <View style={styles.list}>
      {exportedAt && (
        <Notice shape={iconShapes.download} title={t("Hai salvato il backup?")} actions={<>
          <Button mode="contained-tonal" onPress={notifications.confirmBackup}>{t("Sì, è salvato")}</Button>
          <Button mode="text" onPress={notifications.notConfirmed}>{t("Non ancora")}</Button>
        </>}>
          <Text variant="bodyMedium" style={muted}>{t("Il download è stato avviato. Conferma solo dopo aver controllato che il file sia stato salvato.")}</Text>
        </Notice>
      )}
      {due.map((item) => item.kind === 'backup' ? (
        <Notice key="backup" shape={iconShapes.bell} title={t("Promemoria backup")} actions={<>
          <Button mode="contained-tonal" icon={icon(iconShapes.download)} loading={exporting} disabled={exporting} onPress={onExport}>{t("Esporta backup")}</Button>
          <Button mode="text" disabled={exporting} onPress={notifications.snoozeBackup}>{t("Ricordamelo dopo")}</Button>
        </>}>
          <Text variant="bodyMedium" style={muted}>{lastBackupAt
            ? t("I dati sono cambiati dall’ultimo backup confermato, del {p0}. Esporta una copia in un file.", { p0: dateTime(lastBackupAt) })
            : t("I dati esistono solo su questo dispositivo. Esporta una copia in un file.")}</Text>
        </Notice>
      ) : (
        <SummaryNotice key={`summary:${item.summary.period.to}`} summary={item.summary} onClose={() => notifications.closeSummary(item.summary.period)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  notice: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  body: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
  actionsCompact: { justifyContent: 'flex-start' },
});
