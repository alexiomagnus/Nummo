import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { paymentsRemoved, type SubscriptionSummary } from '../../domain/history';
import { setStatus, type SubscriptionStatus } from '../../domain/subscription';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';

type Props = {
  summary: SubscriptionSummary;
  // The status being set: a pause or a cancellation (resuming always takes effect today).
  status: Extract<SubscriptionStatus, 'paused' | 'cancelled'>;
  today: string;
  // Writes the new schedule as of `from`; resolves true when the server confirmed it.
  onConfirm: (from: string) => Promise<boolean>;
  close: () => void;
};

type When = 'today' | 'date';
const previewLimit = 5;

// «From when?» for a pause or cancellation. Today is the normal case; a past date corrects a pause or cancellation that
// was forgotten: the payments dated after it stop being counted, and the dialog lists them before anything is saved.
// Earlier changes are never touched, so the date cannot precede the last one (nor the start of the subscription).
export function StatusDialog({ summary, status, today, onConfirm, close }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const { entry } = summary;
  const changes = entry.status_changes ?? [];
  const minDate = [entry.expense_date, changes[changes.length - 1]?.date ?? ''].reduce((a, b) => (b > a ? b : a));
  const [when, setWhen] = useState<When>('today');
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const from = when === 'today' ? today : date;
  const next = useMemo(() => setStatus(changes, status, from), [changes, status, from]);
  const removed = useMemo(() => next && when === 'date' ? paymentsRemoved(entry, next, today) : [], [next, when, entry, today]);
  const removedTotal = removed.reduce((sum, item) => sum + item.amount_minor, 0);
  const cancel = status === 'cancelled';
  const title = cancel ? t("Annulla abbonamento") : t("Metti in pausa");
  const submit = async () => {
    if (busy || !next) return;
    setBusy(true);
    try { if (await onConfirm(from)) close(); } finally { setBusy(false); }
  };
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{entry.description}</Text>
          <Text variant="bodyMedium">{cancel ? t("Da quando non rinnovi più questo abbonamento?") : t("Da quando è in pausa questo abbonamento?")}</Text>
          <SegmentedButtons label={t("Da quando")} value={when} onChange={setWhen}
            options={[{ value: 'today', label: t("Da oggi") }, { value: 'date', label: t("Da una data passata") , accessibilityLabel: t("Da una data passata") }]} />
          {when === 'date' && <>
            <DateField value={date} onChange={setDate} minDate={minDate} maxDate={today} disabled={busy}
              label={cancel ? t("Annullato il") : t("In pausa dal")} name={cancel ? t("Data dell’annullamento") : t("Data della pausa")} />
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("I pagamenti dopo questa data non vengono più contati.")}</Text>
            {next && (removed.length === 0
              ? <Text variant="bodyMedium">{t("Nessun pagamento già registrato verrà tolto.")}</Text>
              : <View style={styles.removed} accessibilityLiveRegion="polite">
                <Text variant="bodyMedium" style={styles.strong}>
                  {removed.length === 1 ? t("Verrà tolto 1 pagamento ({p0}):", { p0: formatAmount(removedTotal) })
                    : t("Verranno tolti {p0} pagamenti ({p1}):", { p0: removed.length, p1: formatAmount(removedTotal) })}
                </Text>
                {removed.slice(0, previewLimit).map((item) => (
                  <View key={item.key} style={styles.payment}>
                    <Text variant="bodyMedium">{formatDate(item.date)}</Text>
                    <Text variant="bodyMedium">{formatAmount(item.amount_minor)}</Text>
                  </View>
                ))}
                {removed.length > previewLimit && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("e altri {p0}", { p0: removed.length - previewLimit })}</Text>}
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Spariscono dallo storico, dalle spese e dai totali.")}</Text>
              </View>)}
          </>}
          {!next && <HelperText type="error" accessibilityRole="alert">{t("Troppe variazioni di stato per questo abbonamento: per continuare creane uno nuovo.")}</HelperText>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions style={dialogActionsRow}>
        <CancelButton disabled={busy} onPress={close}>{t("Indietro")}</CancelButton>
        <ConfirmButton disabled={busy || !next} loading={busy}
          buttonColor={cancel ? colors.error : undefined} textColor={cancel ? colors.onError : undefined} onPress={() => void submit()}>{title}</ConfirmButton>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  removed: { gap: spacing.xs },
  strong: { fontWeight: '600' },
  payment: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
