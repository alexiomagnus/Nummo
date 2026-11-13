import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { usePresence, useOverlayMotion } from '../../components/Overlay';
import { fadeTransition } from '../../theme/motion';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import { searchSubscriptions, type SubscriptionSummary } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { statusLabels, type SubscriptionStatus } from '../../domain/subscription';
import { inputOutline, motion, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

type Props = {
  subscriptions: readonly SubscriptionSummary[];
  categories: readonly Category[];
  error: string | null;
  // Status changes need the server (transaction on the revision seen here).
  canChange: boolean;
  onEdit: (expenseId: string) => void;
  onSetStatus: (expenseId: string, status: SubscriptionStatus) => Promise<boolean>;
};

// Latest payments shown at first in the history; the rest on request (a weekly series grows quickly).
const historyPreview = 12;
const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function StatusBadge({ status, inTrial = false }: { status: SubscriptionStatus; inTrial?: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  // Three distinct tones, always with the text label (colour is never the only cue).
  const tone = status === 'active' ? { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer }
    : status === 'paused' ? { backgroundColor: colors.tertiaryContainer, color: colors.onTertiaryContainer }
      : { backgroundColor: colors.surfaceVariant, color: colors.onSurfaceVariant };
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <SvgIcon shape={status === 'active' ? iconShapes.check : status === 'paused' ? iconShapes.pause : iconShapes.close} size={14} color={tone.color} />
      <Text variant="labelMedium" style={{ color: tone.color }}>{inTrial ? t('In prova gratuita') : t(statusLabels[status])}</Text>
    </View>
  );
}

export function SubscriptionList({ subscriptions: allSeries, categories, error, canChange, onEdit, onSetStatus }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const dates = useMemo(() => dateFormat(locale), [locale]);
  const formatDate = (date: string) => dates.format(new Date(`${date}T00:00:00Z`));
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [complete, setComplete] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const subscriptions = useMemo(() => searchSubscriptions(allSeries, query), [allSeries, query]);
  const toggle = (set: typeof setExpanded, id: string) => set((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const change = async (id: string, status: SubscriptionStatus) => {
    if (busy) return;
    setBusy(id);
    try { await onSetStatus(id, status); } finally { setBusy(null); }
  };
  if (allSeries.length === 0) {
    return <View style={styles.root}>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessun abbonamento. Per aggiungerne uno, crea una spesa che si ripete.")}</Text>
    </View>;
  }
  return (
    <View style={styles.root}>
      <TextInput outlineStyle={inputOutline} label={t("Cerca per nome")} accessibilityLabel={t("Cerca per nome")} mode="outlined" value={query}
        onChangeText={setQuery} autoCorrect={false} left={leadingIcon(iconShapes.search)}
        right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setQuery('')}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {subscriptions.length === 0 && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessun abbonamento corrisponde alla ricerca.")}</Text>}
      <View role="list">
        {subscriptions.map((summary) => (
          <SubscriptionRow key={summary.entry.id} summary={summary} category={categoryById.get(summary.entry.category_id ?? '')}
            open={expanded.has(summary.entry.id)} all={complete.has(summary.entry.id)} compact={compact} canChange={canChange}
            working={busy === summary.entry.id} formatDate={formatDate}
            onToggle={() => toggle(setExpanded, summary.entry.id)} onToggleAll={() => toggle(setComplete, summary.entry.id)}
            onEdit={() => onEdit(summary.entry.id)} onChange={(status) => void change(summary.entry.id, status)} />
        ))}
      </View>
    </View>
  );
}

// Same card as the expense list (issue #6): the whole card toggles its details, no chevron or edit button when closed,
// amount right-aligned, status badge under the name; edit and status actions live in the expanded details.
function SubscriptionRow({ summary, category, open, all, compact, canChange, working, formatDate, onToggle, onToggleAll, onEdit, onChange }: {
  summary: SubscriptionSummary; category?: Category; open: boolean; all: boolean; compact: boolean; canChange: boolean; working: boolean;
  formatDate: (date: string) => string; onToggle: () => void; onToggleAll: () => void; onEdit: () => void; onChange: (status: SubscriptionStatus) => void;
}) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  // Below 360 dp omit decorative icons on cancel/edit to keep room for the wider status action.
  const { width } = useWindowDimensions();
  const narrow = compact && width < 360;
  const animate = useOverlayMotion();
  const { mounted, shown: visible } = usePresence(open, motion.fade, animate);
  const { entry, status, inTrial, amount_minor, frequency: inForce, next, payments, total } = summary;
  const detailsId = `subscription-details-${entry.id}`;
  const since = entry.status_changes?.[entry.status_changes.length - 1]?.date;
  const frequency = inForce ? t(recurrenceLabels[inForce]) : '';
  const when = status === 'active' ? (next ? t(inTrial ? 'Primo pagamento {p0}' : 'Prossimo rinnovo {p0}', { p0: formatDate(next.date) }) : '')
    : since ? t(status === 'paused' ? "In pausa dal {p0}" : "Annullato dal {p0}", { p0: formatDate(since) }) : '';
  const shown = all ? payments : payments.slice(0, historyPreview);
  return (
    <View>
      <ListRow outlined dense icon={category?.icon ?? null} title={entry.description}
        subtitle={[frequency, when].filter(Boolean).join(' · ')}
        meta={<View style={styles.meta}><StatusBadge status={status} inTrial={inTrial} /></View>}
        expanded={open} controls={open ? detailsId : undefined}
        pressLabel={t("{p0} dettagli di {p1}", { p0: open ? t("Nascondi") : t("Mostra"), p1: entry.description })}
        onPress={onToggle}
        trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount, status !== 'active' && { color: colors.onSurfaceVariant }]}>{formatAmount(amount_minor)}</Text>}>
        {mounted && <View nativeID={detailsId} role="group" accessibilityLabel={t("Dettagli di {p0}", { p0: entry.description })}
          style={[styles.details, { borderColor: colors.outlineVariant, opacity: visible ? 1 : 0 }, animate && fadeTransition]}>
          <View style={styles.fields}>
            <Field label={t("Pagamenti effettuati")} value={String(payments.length)} />
            <Field label={t("Totale speso")} value={formatAmount(total)} />
            <Field label={t("Categoria")} value={category?.label ?? t("Senza categoria")} />
            <Field label={t("Inizio")} value={formatDate(entry.expense_date)} />
            <Field label={t(inTrial ? "Primo pagamento" : "Prossimo rinnovo")} value={next ? formatDate(next.date) : t("Nessuno")} />
          </View>
          <View style={[styles.actions, compact && styles.compactActions]}>
            {status !== 'cancelled' && <Button compact={compact} mode="outlined" textColor={colors.error} disabled={!canChange || working}
              accessibilityLabel={t("Annulla abbonamento")}
              icon={narrow ? undefined : ({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />}
              onPress={() => onChange('cancelled')}>{compact ? t("Annulla") : t("Annulla abbonamento")}</Button>}
            <Button compact={compact} mode="outlined" style={narrow && styles.narrowEdit} accessibilityLabel={t("Modifica {p0}", { p0: entry.description })}
              icon={narrow ? undefined : ({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} onPress={onEdit}>{t("Modifica")}</Button>
            {/* Phones: short visible labels so the three actions fit one row; the accessible name stays the full action. */}
            {status === 'active' && <Button compact={compact} mode="outlined" style={compact && styles.statusAction} contentStyle={compact && styles.statusActionContent} disabled={!canChange || working} loading={working}
              accessibilityLabel={t("Metti in pausa")}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.pause} size={size} color={color} />}
              onPress={() => onChange('paused')}>{compact ? t("Pausa") : t("Metti in pausa")}</Button>}
            {status !== 'active' && <Button compact={compact} mode="contained-tonal" style={compact && styles.statusAction} contentStyle={compact && styles.statusActionContent} disabled={!canChange || working} loading={working}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.play} size={size} color={color} />}
              onPress={() => onChange('active')}>{t("Riattiva")}</Button>}
          </View>
          {!canChange && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {t("Per cambiare stato serve la connessione con la sincronizzazione completata.")}
          </Text>}
          <View style={styles.history}>
            <Text variant="titleSmall" accessibilityRole="header" style={styles.historyTitle}>{t("Storico dei pagamenti")}</Text>
            {payments.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Nessun pagamento.")}</Text>}
            <View role="list">
              {shown.map((payment, index) => (
                <View key={payment.key} role="listitem" style={[styles.payment, index < shown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.outlineVariant }]}>
                  <Text variant="bodyMedium">{formatDate(payment.date)}</Text>
                  <Text variant="bodyMedium" style={listRowStyles.amount}>{formatAmount(payment.amount_minor)}</Text>
                </View>
              ))}
            </View>
            {payments.length > historyPreview && <View style={styles.start}>
              <Button mode="text" aria-expanded={all} onPress={onToggleAll}>
                {all ? t("Mostra solo i più recenti") : t("Mostra tutti i pagamenti ({p0})", { p0: payments.length })}
              </Button>
            </View>}
          </View>
        </View>}
      </ListRow>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyMedium" style={listRowStyles.amount}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rowAmount: { minWidth: 80, textAlign: 'right' },
  details: { gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  field: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  // Phones: compact buttons with short labels on one row (still 48 dp tall); they wrap only on very narrow screens.
  compactActions: { gap: spacing.xs },
  narrowEdit: { minWidth: 50 },
  statusAction: { minWidth: 98 },
  statusActionContent: { paddingHorizontal: spacing.xs },
  // A little more than the details gap (lg): the history is a separate block from the actions above.
  history: { marginTop: spacing.sm },
  historyTitle: { marginBottom: spacing.xs },
  payment: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, minHeight: 40, alignItems: 'center' },
  start: { alignSelf: 'flex-start' },
});
