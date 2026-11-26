import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import { clipToLength, searchPolicy } from '../../domain/policy';
import { searchSubscriptions, type SubscriptionSummary } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { statusLabels, type SubscriptionStatus } from '../../domain/subscription';
import { inputOutline, radius, spacing } from '../../theme/tokens';

type Props = {
  subscriptions: readonly SubscriptionSummary[];
  categories: readonly Category[];
  error: string | null;
  // Shown instead of «Nessun abbonamento.» when the list is empty because of the fund filter (source text, translated here).
  emptyLabel?: string;
  // Opens the subscription's detail screen (SubscriptionDetail, drawn by the workspace above the list), where its actions are.
  onOpen: (expenseId: string) => void;
};

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// DOM id of the element around each card: the origin and the destination of the detail's transform.
export const subscriptionCardId = (id: string) => `subscription-card-${id}`;

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

export function SubscriptionList({ subscriptions: allSeries, categories, error, emptyLabel, onOpen }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const dates = useMemo(() => dateFormat(locale), [locale]);
  const formatDate = (date: string) => dates.format(new Date(`${date}T00:00:00Z`));
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const [query, setQuery] = useState('');
  const subscriptions = useMemo(() => searchSubscriptions(allSeries, query), [allSeries, query]);
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
            formatDate={formatDate} onOpen={onOpen} />
        ))}
      </View>
    </View>
  );
}

// Same card as the expense list (issue #6): amount right-aligned, status badge under the name, a chevron pointing right. A tap
// opens the detail screen (23 November, on request: it replaced the details opened inside the card, with the actions).
function SubscriptionRow({ summary, category, formatDate, onOpen }: {
  summary: SubscriptionSummary; category?: Category; formatDate: (date: string) => string; onOpen: (expenseId: string) => void;
}) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const { entry, status, inTrial, amount_minor, frequency: inForce, next } = summary;
  const since = entry.status_changes?.[entry.status_changes.length - 1]?.date;
  const frequency = inForce ? t(recurrenceLabels[inForce]) : '';
  const when = status === 'active' ? (next ? t(inTrial ? 'Primo pagamento {p0}' : 'Prossimo rinnovo {p0}', { p0: formatDate(next.date) }) : '')
    : since ? t(status === 'paused' ? "In pausa dal {p0}" : "Annullato dal {p0}", { p0: formatDate(since) }) : '';
  // « | » with an en space on each side (about twice a normal space): a little more room between the two facts (22 November).
  const subtitle = [frequency, when].filter(Boolean).join('\u2002|\u2002');
  return (
      <ListRow nativeID={subscriptionCardId(entry.id)} outlined dense opens icon={category?.icon ?? null} title={entry.description} subtitle={subtitle}
        meta={<View style={styles.meta}><StatusBadge status={status} inTrial={inTrial} /></View>}
        pressLabel={t("Apri i dettagli di {p0}, {p1}", { p0: entry.description, p1: [inTrial ? t('In prova gratuita') : t(statusLabels[status]), frequency, when].filter(Boolean).join(', ') })}
        onPress={() => onOpen(entry.id)}
        trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount, status !== 'active' && { color: colors.onSurfaceVariant }]}>{formatAmount(amount_minor)}</Text>} />
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rowAmount: { minWidth: 80, textAlign: 'right' },
});
