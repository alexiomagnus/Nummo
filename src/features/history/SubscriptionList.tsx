import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button, compactIconPadding, regularIconPadding } from '../../components/Button';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { usePresence, useOverlayMotion } from '../../components/Overlay';
import { fadeTransition } from '../../theme/motion';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import { clipToLength, searchPolicy } from '../../domain/policy';
import type { Fund } from '../../domain/funds';
import { FundAvatar, NoFundAvatar } from '../funds/FundAvatar';
import { searchSubscriptions, type SubscriptionSummary } from '../../domain/history';
import { StatusDialog } from './StatusDialog';
import { PaymentsDialog } from './PaymentsDialog';
import { recurrenceLabels } from '../../domain/recurrence';
import { statusLabels, type SubscriptionStatus } from '../../domain/subscription';
import { inputOutline, motion, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

type Props = {
  subscriptions: readonly SubscriptionSummary[];
  categories: readonly Category[];
  // Funds (archived included): with at least one, the details show the series' fund with its avatar, or «Nessun fondo»
  // (as in the expense details); with none, no field.
  funds?: readonly Fund[];
  // Merchant name by expense ID (as in the expense list), shown in the details when the series has one.
  merchantNames?: ReadonlyMap<string, string>;
  error: string | null;
  // Status changes need the server (transaction on the revision seen here).
  canChange: boolean;
  // Shown instead of «Nessun abbonamento.» when the list is empty because of the fund filter (source text, translated here).
  emptyLabel?: string;
  onEdit: (expenseId: string) => void;
  // `from`: the day a pause or cancellation takes effect (today unless the user corrects a forgotten one).
  onSetStatus: (expenseId: string, status: SubscriptionStatus, from?: string) => Promise<boolean>;
  // Removes one payment from the history (occurrence number of the series); the server must be reachable, like status changes.
  onRemovePayment: (expenseId: string, index: number) => Promise<boolean>;
  today: string;
};

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

export function SubscriptionList({ subscriptions: allSeries, categories, funds, merchantNames, error, canChange, emptyLabel, onEdit, onSetStatus, onRemovePayment, today }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const dates = useMemo(() => dateFormat(locale), [locale]);
  const formatDate = (date: string) => dates.format(new Date(`${date}T00:00:00Z`));
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const fundById = useMemo(() => new Map((funds ?? []).map((fund) => [fund.id, fund])), [funds]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  // Subscription whose payment history is open (a dialog: the list can be long and payments can be removed there).
  const [history, setHistory] = useState<string | null>(null);
  const historySummary = history ? allSeries.find((item) => item.entry.id === history) : undefined;
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const subscriptions = useMemo(() => searchSubscriptions(allSeries, query), [allSeries, query]);
  const toggle = (set: typeof setExpanded, id: string) => set((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Pause and cancellation ask «from when?» first (a forgotten one can be dated in the past); resuming acts at once.
  const [asking, setAsking] = useState<{ id: string; status: 'paused' | 'cancelled' } | null>(null);
  const askingSummary = asking ? allSeries.find((item) => item.entry.id === asking.id) : undefined;
  const change = async (id: string, status: SubscriptionStatus) => {
    if (busy) return;
    if (status !== 'active') { setAsking({ id, status }); return; }
    setBusy(id);
    try { await onSetStatus(id, status); } finally { setBusy(null); }
  };
  if (allSeries.length === 0) {
    return <View style={styles.root}>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t(emptyLabel ?? "Nessun abbonamento.")}</Text>
    </View>;
  }
  return (
    <View style={styles.root}>
      <TextInput outlineStyle={inputOutline} label={t("Cerca per nome")} accessibilityLabel={t("Cerca per nome")} mode="outlined" value={query}
        onChangeText={(value) => setQuery(clipToLength(value, searchPolicy.maxQueryLength))} autoCorrect={false} left={leadingIcon(iconShapes.search)}
        right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setQuery('')}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {subscriptions.length === 0 && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessun abbonamento corrisponde alla ricerca.")}</Text>}
      <View role="list">
        {subscriptions.map((summary) => (
          <SubscriptionRow key={summary.entry.id} summary={summary} category={categoryById.get(summary.entry.category_id ?? '')}
            fund={fundById.size > 0 ? fundById.get(summary.entry.fund_id ?? '') ?? null : undefined}
            merchant={merchantNames?.get(summary.entry.id)}
            open={expanded.has(summary.entry.id)} compact={compact} canChange={canChange}
            working={busy === summary.entry.id} formatDate={formatDate}
            onToggle={() => toggle(setExpanded, summary.entry.id)} onHistory={() => setHistory(summary.entry.id)}
            onEdit={() => onEdit(summary.entry.id)} onChange={(status) => void change(summary.entry.id, status)} />
        ))}
      </View>
      {asking && askingSummary && <StatusDialog summary={askingSummary} status={asking.status} today={today}
        onConfirm={(from) => onSetStatus(asking.id, asking.status, from)} close={() => setAsking(null)} />}
      {historySummary && <PaymentsDialog description={historySummary.entry.description} payments={historySummary.payments} total={historySummary.total}
        canRemove={canChange} onRemove={(payment) => onRemovePayment(historySummary.entry.id, payment.index)} onClose={() => setHistory(null)} />}
    </View>
  );
}

// Same card as the expense list (issue #6): the whole card toggles its details, no chevron or edit button when closed,
// amount right-aligned, status badge under the name; edit and status actions live in the expanded details.
function SubscriptionRow({ summary, category, fund, merchant, open, compact, canChange, working, formatDate, onToggle, onHistory, onEdit, onChange }: {
  // undefined: no funds at all (no field); null: the series has no fund (or a fund no longer listed).
  summary: SubscriptionSummary; category?: Category; fund?: Fund | null; merchant?: string; open: boolean; compact: boolean; canChange: boolean; working: boolean;
  formatDate: (date: string) => string; onToggle: () => void; onHistory: () => void; onEdit: () => void; onChange: (status: SubscriptionStatus) => void;
}) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  // Below 360 dp omit decorative icons on cancel/edit to keep room for the wider status action.
  const { width } = useWindowDimensions();
  const narrow = compact && width < 360;
  // Phones: balanced padding (see `compactIconPadding`), roomier from 380 dp where the three actions still fit one row;
  // below that the same total width as Paper's compact buttons.
  const roomy = width >= 380;
  const iconPad = !compact ? regularIconPadding.balanced : roomy ? compactIconPadding.roomy : compactIconPadding.snug;
  const pausePad = !compact ? regularIconPadding.balancedNarrow : roomy ? compactIconPadding.roomyNarrow : compactIconPadding.snugNarrow;
  const textPad = compact ? styles.textOnlyLabel : undefined;
  const animate = useOverlayMotion();
  const { mounted, shown: visible } = usePresence(open, motion.fade, animate);
  const { entry, status, inTrial, amount_minor, frequency: inForce, next, payments, total } = summary;
  const detailsId = `subscription-details-${entry.id}`;
  const since = entry.status_changes?.[entry.status_changes.length - 1]?.date;
  const frequency = inForce ? t(recurrenceLabels[inForce]) : '';
  const when = status === 'active' ? (next ? t(inTrial ? 'Primo pagamento {p0}' : 'Prossimo rinnovo {p0}', { p0: formatDate(next.date) }) : '')
    : since ? t(status === 'paused' ? "In pausa dal {p0}" : "Annullato dal {p0}", { p0: formatDate(since) }) : '';
  // The payment history opens in a dialog (it can be long, and a payment can be removed there).
  // Phones: on its own row below the actions, on the right; from medium: far left of the actions row.
  // Phones: exactly as wide as two actions (user's request, 22 November). On one row, the last two (status + Modifica),
  // aligned with them: measured, because the three actions grow from different label widths. When the actions wrap onto
  // two rows (long labels, narrow screens: Modifica alone below), the first row holds two actions across the whole width,
  // so the history takes the whole width too. Until measured, its own width.
  const [statusBox, setStatusBox] = useState<LayoutRectangle | null>(null);
  const [editBox, setEditBox] = useState<LayoutRectangle | null>(null);
  const measure = (set: (box: LayoutRectangle) => void) => (event: LayoutChangeEvent) => set(event.nativeEvent.layout);
  const measured = compact && statusBox && editBox;
  const oneRow = measured && Math.abs(statusBox.y - editBox.y) < 1;
  const historyStyle = !measured ? undefined : oneRow ? { width: editBox.x + editBox.width - statusBox.x } : styles.historyWide;
  const history = (
    <Button mode="contained-tonal" aria-haspopup="dialog" onPress={onHistory} style={historyStyle}
      accessibilityLabel={t("Storico dei pagamenti di {p0}, {p1}", { p0: entry.description, p1: payments.length })}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.list} size={size} color={color} />}>
      {t("Storico dei pagamenti ({p0})", { p0: payments.length })}
    </Button>
  );
  return (
    <View>
      <ListRow outlined dense icon={category?.icon ?? null} title={entry.description}
        // « | » with an en space on each side (about twice a normal space): a little more room between the two facts (22 November).
        subtitle={[frequency, when].filter(Boolean).join('\u2002|\u2002')}
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
            {merchant && <Field label={t("Esercente")} value={merchant}
              icon={<SvgIcon shape={iconShapes.store} size={20} color={colors.primary} />} />}
            {fund !== undefined && <Field label={t("Fondo")} value={fund ? fund.name : t("Nessun fondo")}
              icon={fund ? <FundAvatar fund={fund} size={20} /> : <NoFundAvatar size={20} />} />}
            <Field label={t("Inizio")} value={formatDate(entry.expense_date)} />
            <Field label={t(inTrial ? "Primo pagamento" : "Prossimo rinnovo")} value={next ? formatDate(next.date) : t("Nessuno")} />
          </View>
          <View style={[styles.actions, compact && styles.compactActions]}>
            {/* Desktop: the history sits at the far left of the actions row (auto margin), apart from the status actions. */}
            {!compact && <View style={styles.historySlot}>{history}</View>}
            {status !== 'cancelled' && <Button compact={compact} mode="outlined" textColor={colors.error} style={compact && styles.fill} disabled={!canChange || working}
              contentStyle={narrow ? undefined : iconPad?.content} labelStyle={narrow ? textPad : iconPad?.label}
              accessibilityLabel={t("Annulla abbonamento")}
              icon={narrow ? undefined : ({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />}
              onPress={() => onChange('cancelled')}>{compact ? t("Annulla") : t("Annulla abbonamento")}</Button>}
            {/* Pause/resume in the middle, between cancel and edit. Phones: short visible labels so the three actions fit one row; the accessible name stays the full action. */}
            {status === 'active' && <Button onLayout={compact ? measure(setStatusBox) : undefined} compact={compact} mode="outlined" style={compact && [styles.statusAction, styles.fill]} contentStyle={pausePad?.content} labelStyle={pausePad?.label} disabled={!canChange || working} loading={working}
              accessibilityLabel={t("Metti in pausa")}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.pause} size={size} color={color} />}
              onPress={() => onChange('paused')}>{compact ? t("Pausa") : t("Metti in pausa")}</Button>}
            {status !== 'active' && <Button onLayout={compact ? measure(setStatusBox) : undefined} compact={compact} mode="contained-tonal" style={compact && [styles.statusAction, styles.fill]} contentStyle={iconPad?.content} labelStyle={iconPad?.label} disabled={!canChange || working} loading={working}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.play} size={size} color={color} />}
              onPress={() => onChange('active')}>{t("Riattiva")}</Button>}
            <Button onLayout={compact ? measure(setEditBox) : undefined} compact={compact} mode="outlined" style={compact && [narrow && styles.narrowEdit, styles.fill]}
              contentStyle={narrow ? undefined : iconPad?.content} labelStyle={narrow ? textPad : iconPad?.label} accessibilityLabel={t("Modifica {p0}", { p0: entry.description })}
              icon={narrow ? undefined : ({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} onPress={onEdit}>{t("Modifica")}</Button>
          </View>
          {!canChange && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {t("Per cambiare stato serve la connessione con la sincronizzazione completata.")}
          </Text>}
          {compact && <View style={[styles.end, measured && !oneRow && styles.stretch]}>{history}</View>}
        </View>}
      </ListRow>
    </View>
  );
}

// `icon`: shown before the value (the fund's avatar, the merchant's shop); a long value wraps beside it.
function Field({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  const { colors } = useTheme();
  const text = <Text variant="bodyMedium" style={[listRowStyles.amount, icon ? styles.iconText : undefined]}>{value}</Text>;
  return (
    <View style={styles.field}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      {icon ? <View style={styles.iconValue}>{icon}{text}</View> : text}
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
  iconValue: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  iconText: { flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  // Phones: compact buttons with short labels on one row (still 48 dp tall); they wrap only on very narrow screens.
  compactActions: { gap: spacing.xs },
  // Phones: the actions share the whole width of the row (user's request, 21 November), each from its natural width.
  fill: { flexGrow: 1 },
  narrowEdit: { minWidth: 50 },
  statusAction: { minWidth: 98 },
  textOnlyLabel: { marginHorizontal: spacing.md },
  end: { alignSelf: 'flex-end' },
  historyWide: { width: '100%' },
  stretch: { alignSelf: 'stretch' },
  historySlot: { marginRight: 'auto' },
});
