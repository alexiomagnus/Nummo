import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Fund } from '../../domain/funds';
import type { SubscriptionSummary } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import type { SubscriptionStatus } from '../../domain/subscription';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { FundAvatar, NoFundAvatar } from '../funds/FundAvatar';
import { DetailHero, DetailMarks, DetailMerchant, DetailScreen, InfoGrid, PrimaryAction, type GridCell } from './DetailScreen';
import { PaymentsDialog } from './PaymentsDialog';
import { StatusDialog } from './StatusDialog';
import { StatusBadge, subscriptionCardId } from './SubscriptionList';

// Detail screen of one subscription (recurring series) of the Spese page, «Abbonamenti» view (23 November, on request:
// the same screen as the expenses, in place of the details opened inside the card). Shell, transform and Back in
// DetailScreen.tsx. The actions of the old details live here: payment history (a dialog, a payment can be removed there),
// Modifica, cancel and pause/resume (pause and cancellation ask «from when?» first, resuming acts at once).

export type SubscriptionDetailValue = {
  summary: SubscriptionSummary; category?: Category;
  // undefined: no funds at all (no row); null: the series has no fund (or a fund no longer listed).
  fund?: Fund | null;
  merchant?: string;
};

type Actions = {
  // Status changes and payment removals need the server (transaction on the revision seen here).
  canChange: boolean;
  today: string;
  onEdit: (expenseId: string) => void;
  onSetStatus: (expenseId: string, status: SubscriptionStatus, from?: string) => Promise<boolean>;
  onRemovePayment: (expenseId: string, index: number) => Promise<boolean>;
};

export function SubscriptionDetail({ value, onClose, ...actions }: { value: SubscriptionDetailValue | null; onClose: () => void } & Actions) {
  const { t } = useI18n();
  return <DetailScreen value={value} cardId={(shown) => subscriptionCardId(shown.summary.entry.id)}
    label={(shown) => t("Dettagli di {p0}", { p0: shown.summary.entry.description })} backLabel={t("Torna agli abbonamenti")} onClose={onClose}>
    {(shown) => <SubscriptionContent {...shown} {...actions} />}
  </DetailScreen>;
}

function SubscriptionContent({ summary, category, fund, merchant, canChange, today, onEdit, onSetStatus, onRemovePayment }: SubscriptionDetailValue & Actions) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const muted = colors.onSurfaceVariant;
  // Phones: short visible labels so the two status actions never cut theirs; the accessible name stays the full action.
  const compact = useSizeClass() === 'compact';
  const { entry, status, inTrial, amount_minor, frequency: inForce, next, payments, total } = summary;
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<'paused' | 'cancelled' | null>(null);
  const [history, setHistory] = useState(false);
  const change = async (to: SubscriptionStatus) => {
    if (busy) return;
    if (to !== 'active') { setAsking(to); return; }
    setBusy(true);
    try { await onSetStatus(entry.id, to); } finally { setBusy(false); }
  };
  const since = entry.status_changes?.[entry.status_changes.length - 1]?.date;
  const frequency = inForce ? t(recurrenceLabels[inForce]) : '';
  // Under the badge only since when it is paused or cancelled: the next renewal already has its row in the details.
  const when = status !== 'active' && since ? t(status === 'paused' ? "In pausa dal {p0}" : "Annullato dal {p0}", { p0: formatDate(since) }) : '';
  const icon = (shape: string) => <SvgIcon shape={shape} size={22} color={muted} />;
  const paid = payments.length === 1 ? t("1 pagamento") : t("{p0} pagamenti", { p0: payments.length });
  // Two columns so that the whole detail fits one phone screen (user's request, 23 November); the payments and their total
  // are one row that opens the history (it replaces the separate «Storico dei pagamenti» button).
  const cells: GridCell[] = [
    // In the palette's colour (user's request, 23 November), like the history screen it opens.
    { key: 'payments', wide: true, accent: true, icon: <SvgIcon shape={iconShapes.receipt} size={22} color={colors.onSecondaryContainer} />, label: t("Storico dei pagamenti"), value: `${paid} · ${formatAmount(total)}`,
      onPress: () => setHistory(true), accessibilityLabel: t("Storico dei pagamenti di {p0}, {p1}", { p0: entry.description, p1: payments.length }) },
    { key: 'category', icon: category?.icon ? <CategoryGlyph icon={category.icon} size={22} color={muted} /> : icon(iconShapes.tag),
      label: t("Categoria"), value: category?.label ?? t("Senza categoria") },
  ];
  if (fund !== undefined) cells.push({ key: 'fund', icon: fund ? <FundAvatar fund={fund} size={24} /> : <NoFundAvatar size={24} />,
    label: t("Fondo"), value: fund ? fund.name : t("Nessun fondo") });
  if (frequency) cells.push({ key: 'frequency', icon: icon(iconShapes.rotateCcw), label: t("Frequenza"), value: frequency });
  cells.push({ key: 'start', icon: icon(iconShapes.calendar), label: t("Inizio"), value: formatDate(entry.expense_date) });
  cells.push({ key: 'next', icon: icon(iconShapes.calendar), label: t(inTrial ? "Primo pagamento" : "Prossimo rinnovo"), value: next ? formatDate(next.date) : t("Nessuno") });
  return <>
    <DetailHero dense icon={category?.icon ?? null} title={entry.description} amount={formatAmount(amount_minor)} muted={status !== 'active'}>
      {merchant && <DetailMerchant name={merchant} label={t("Esercente")} />}
      <DetailMarks><StatusBadge status={status} inTrial={inTrial} /></DetailMarks>
      {when ? <Text variant="bodyMedium" style={[styles.center, { color: muted }]}>{when}</Text> : null}
    </DetailHero>
    <InfoGrid cells={cells} />
    <View style={styles.actions}>
      <PrimaryAction label={t("Modifica")} accessibilityLabel={t("Modifica {p0}", { p0: entry.description })} icon={iconShapes.pencil} onPress={() => onEdit(entry.id)} />
      {/* Status actions side by side, equal halves (one when cancelled: only resuming is left). Both hidden while the «from when?»
          sheet opened from one of them is up (user's request, 23 November); they keep their place. */}
      <View style={[styles.statusRow, asking !== null && styles.hidden]} aria-hidden={asking !== null || undefined}>
        {status !== 'cancelled' && <Button mode="outlined" textColor={colors.error} style={styles.half} disabled={!canChange || busy}
          accessibilityLabel={t("Annulla abbonamento")} icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />}
          onPress={() => void change('cancelled')}>{compact ? t("Annulla") : t("Annulla abbonamento")}</Button>}
        {status === 'active' ? <Button mode="outlined" style={styles.half} disabled={!canChange || busy} loading={busy}
          accessibilityLabel={t("Metti in pausa")} icon={({ size, color }) => <SvgIcon shape={iconShapes.pause} size={size} color={color} />}
          onPress={() => void change('paused')}>{compact ? t("Pausa") : t("Metti in pausa")}</Button>
          : <Button mode="contained-tonal" style={styles.half} disabled={!canChange || busy} loading={busy}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.play} size={size} color={color} />}
            onPress={() => void change('active')}>{t("Riattiva")}</Button>}
      </View>
      {!canChange && <Text variant="bodySmall" style={[styles.center, { color: muted }]}>
        {t("Per cambiare stato serve la connessione con la sincronizzazione completata.")}</Text>}
    </View>
    {asking && <StatusDialog summary={summary} status={asking} today={today}
      onConfirm={(from) => onSetStatus(entry.id, asking, from)} close={() => setAsking(null)} />}
    {history && <PaymentsDialog description={entry.description} payments={payments} total={total}
      canRemove={canChange} onRemove={(payment) => onRemovePayment(entry.id, payment.index)} onClose={() => setHistory(false)} />}
  </>;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  actions: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexBasis: 140 },
  hidden: { opacity: 0 },
});
