import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { Reveal } from '../../components/Reveal';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Breakdown, Occurrence } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { shape, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { dailySpendingRows, initialDayCount } from './dailySpending';

const weekdayFormat = (locale: string) => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const yearDateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fullDateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateValue = (date: string) => new Date(`${date}T00:00:00Z`);

type Props = { data: Pick<Breakdown, 'buckets'>; occurrences: readonly Occurrence[]; categories: readonly Category[]; today: string };

export function DailyBreakdown({ data, occurrences, categories, today }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => dailySpendingRows(data, occurrences, today), [data, occurrences, today]);
  const shown = showAll ? rows : rows.slice(0, initialDayCount);
  // Today goes last in the list; every other day keeps the most-recent-first order.
  const visible = [...shown.filter((row) => row.date !== today), ...shown.filter((row) => row.date === today)];
  const first = data.buckets[0];
  if (!first) return null;
  const crossesYear = first.from.slice(0, 4) !== data.buckets[data.buckets.length - 1]!.to.slice(0, 4);
  const dateFormat = crossesYear ? yearDateFormat(locale) : weekdayFormat(locale);
  return <>
    <View role="list" accessibilityLabel={t("Spese per giorno, dalle più recenti")}>
      {visible.map((row, index) => {
        const current = row.date === today;
        const open = expanded === row.date;
        const hasExpenses = row.items.length > 0;
        const color = hasExpenses ? colors.onSurface : colors.onSurfaceVariant;
        const count = `${row.items.length} ${row.items.length === 1 ? t("spesa") : t("spese")}`;
        const label = `${fullDateFormat(locale).format(dateValue(row.date))}${current ? t(", oggi") : ''}, ${formatAmount(row.total)}, ${count}`;
        const summary = <>
          <View style={styles.date}>
            <Text variant="titleMedium" style={{ color }}>{current ? t("Oggi · ") : ''}{dateFormat.format(dateValue(row.date))}</Text>
            <Text variant="bodyMedium" style={{ color }}>{hasExpenses ? count : t("Nessuna spesa")}</Text>
          </View>
          <Text variant={compact ? 'titleMedium' : 'titleLarge'} style={[styles.amount, { color }]}>{formatAmount(row.total)}</Text>
          <View style={styles.chevron}>{hasExpenses && <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={24} color={color} />}</View>
        </>;
        const summaryStyle = styles.summary;
        return <View key={row.date} role="listitem" style={index < visible.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.outlineVariant } : undefined}>
          {hasExpenses ? <StateLayerPressable accessibilityRole="button" aria-expanded={open}
            aria-controls={open ? `dashboard-day-${row.date}` : undefined} accessibilityLabel={label}
            layerColor={color} radius={shape.xs} onPress={() => setExpanded(open ? null : row.date)}
            style={summaryStyle}>{summary}</StateLayerPressable>
            : <View style={[summaryStyle, { borderRadius: shape.xs }]} accessibilityLabel={label}>{summary}</View>}
          {open && hasExpenses && <Reveal nativeID={`dashboard-day-${row.date}`} role="list"
            accessibilityLabel={t("Spese del {p0}", { p0: fullDateFormat(locale).format(dateValue(row.date)) })} style={styles.details}>
            {row.items.map((item, itemIndex) => {
              const category = categories.find((entry) => entry.id === item.category_id);
              const subtitle = [category?.label ?? t("Senza categoria"), item.recurrence && t(recurrenceLabels[item.recurrence])].filter(Boolean).join(' · ');
              const amount = <Text variant="bodyLarge" style={listRowStyles.amount}>{formatAmount(item.amount_minor)}</Text>;
              return <ListRow key={item.key} icon={category?.icon ?? null} title={item.description} subtitle={subtitle}
                divider={itemIndex < row.items.length - 1} meta={compact ? amount : undefined} trailing={compact ? undefined : amount} />;
            })}
          </Reveal>}
        </View>;
      })}
    </View>
    <View style={styles.actions}>
      {rows.length > initialDayCount && <Button mode="text" compact aria-expanded={showAll}
        onPress={() => { setShowAll(!showAll); setExpanded(null); }}>{showAll ? t("Mostra meno") : t("Mostra tutti")}</Button>}
    </View>
  </>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  date: { flex: 1, minWidth: 0, gap: spacing.xs },
  amount: { flexShrink: 0, textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
  chevron: { width: 24, alignItems: 'center' },
  details: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
});
