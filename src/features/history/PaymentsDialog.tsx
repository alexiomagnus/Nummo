import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { DeleteAction } from '../../components/DeleteAction';
import { listRowStyles } from '../../components/ListRow';
import type { Occurrence } from '../../domain/history';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';

// Payment history of a subscription (paid occurrences up to today, newest first), opened from its details. A payment can be
// removed — e.g. a renewal charged because a pause or cancellation was forgotten — only that one: the others never move.
export function PaymentsDialog({ description, payments, total, canRemove, onRemove, onClose }: {
  description: string; payments: readonly Occurrence[]; total: number; canRemove: boolean;
  onRemove: (payment: Occurrence) => Promise<boolean>; onClose: () => void;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const count = payments.length === 1 ? t("1 pagamento") : t("{p0} pagamenti", { p0: payments.length });
  // The page's own colours, like every other screen (user's request, 24 November; the row's tonal colour from the 23rd).
  return <Portal><AppDialog visible onDismiss={onClose}>
    <AppDialog.Title>{t("Storico dei pagamenti")}</AppDialog.Title>
    <AppDialog.Content style={styles.intro}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{`${description} · ${count} · ${formatAmount(total)}`}</Text>
      {!canRemove && payments.length > 0 && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        {t("Per eliminare un pagamento serve la connessione con la sincronizzazione completata.")}</Text>}
    </AppDialog.Content>
    <AppDialog.ScrollArea style={styles.area}><ScrollView>
      {payments.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Nessun pagamento.")}</Text>}
      <View role="list" accessibilityLabel={t("Storico dei pagamenti")}>
        {payments.map((payment, index) => {
          const date = formatDate(payment.date);
          return (
            <View key={payment.key} role="listitem">
              {/* Hairline dividers between the payments. */}
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
              <View style={styles.row}>
              <Text variant="bodyLarge" style={styles.date}>{date}</Text>
              <Text variant="bodyLarge" style={listRowStyles.amount}>{formatAmount(payment.amount_minor)}</Text>
              <DeleteAction disabled={!canRemove} name={t("pagamento del {p0}", { p0: date })} title={t("Eliminare il pagamento del {p0}?", { p0: date })}
                description={t("Non verrà più contato in spese, totali, analisi ed esportazioni. Gli altri pagamenti non cambiano.")}
                onDelete={() => onRemove(payment)} />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView></AppDialog.ScrollArea>
    {/* No «Chiudi»: the screen's Back closes it (user's request, 23 November). */}
  </AppDialog></Portal>;
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  // Only the rows draw separators; the area's dividers appear only on an edge that hides rows (AppDialog.ScrollArea).
  area: { minHeight: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  date: { flex: 1, minWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth },
});
