import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { MenuSelect } from '../../components/MenuSelect';
import { iconShapes } from '../../components/SvgIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { Category } from '../../domain/category';
import { formatAmountMinor } from '../../domain/expense';
import { breakdown, isDailyPeriod, otherCategoriesKey, periodLabels, periods, uncategorizedKey, type Bucket, type Occurrence, type Period } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import { AreaChart, DonutChart, StackedBarChart, seriesColor, type ChartColors } from './charts';

const chartTypes = ['donut', 'area', 'bars'] as const;
type ChartType = (typeof chartTypes)[number];
const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', area: 'Andamento', bars: 'Barre' };
const chartTitles: Record<ChartType, string> = { donut: 'Spese per categoria', area: 'Andamento delle spese', bars: 'Spese per periodo e categoria' };

// Categorical palette: the 8 reference slots of the dataviz skill plus 4 more (cyan, olive, purple, rust).
// All 12 validated with its script (adjacent pairs) in both modes, light/dark surfaces. Order is fixed, never cycled;
// the legend/table carry identity beyond colour. Past 12 categories the rest fold into «Altre categorie».
const palette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e9fb8', '#7a9400', '#a846b3', '#a85a1c'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767', '#1fa0bd', '#7f9d00', '#b85bc2', '#b86a2a'],
};

const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });
function bucketTitle(bucket: Bucket, period: Period): string {
  return isDailyPeriod(period) ? dayFormat.format(new Date(`${bucket.from}T00:00:00Z`)) : `${bucket.label} ${bucket.from.slice(0, 4)}`;
}
// Whole percentages, but a non-zero share never shows as 0%.
const percent = (part: number, total: number): string => {
  const value = (part / total) * 100;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
};

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[] };

// Plain label + value pair (no container): hierarchy comes from size and weight only.
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleLarge" numberOfLines={1} style={styles.statValue}>{value}</Text>
      {hint !== undefined && <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>{hint}</Text>}
    </View>
  );
}

const monthFormat = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekdayFormat = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

function DailyBreakdown({ buckets, totals, today }: { buckets: readonly Bucket[]; totals: readonly number[]; today: string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  // Use the actual card width: amounts need room even on narrow phones and beside a drawer.
  const columns = Math.max(1, Math.min(7, Math.floor((width + spacing.sm) / (144 + spacing.sm))));
  const cellWidth = width > 0 ? (width - spacing.sm * (columns - 1)) / columns : '100%';
  return <>
    <Text variant="titleMedium">{monthFormat.format(new Date(`${buckets[0]!.from}T00:00:00Z`))}</Text>
    <View role="list" accessibilityLabel="Spese per giorno" style={styles.dayGrid}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {buckets.map((day, index) => {
        const current = day.from === today;
        const future = day.from > today;
        const total = totals[index]!;
        const amount = future ? '—' : formatAmountMinor(total);
        const color = current ? colors.onPrimaryContainer : total > 0 ? colors.onSurface : colors.onSurfaceVariant;
        return <View key={day.key} role="listitem"
          accessibilityLabel={`${bucketTitle(day, 'month')}${current ? ', oggi' : ''}: ${future ? 'giorno futuro' : amount}`}
          style={[styles.dayCell, { width: cellWidth, backgroundColor: current ? colors.primaryContainer : colors.elevation.level1 }]}>
          <View style={styles.dayHeading}>
            <Text variant="labelMedium" style={{ color }}>{weekdayFormat.format(new Date(`${day.from}T00:00:00Z`))}</Text>
            {current && <Text variant="labelSmall" style={{ color }}>Oggi</Text>}
          </View>
          <Text variant="bodyLarge" style={[styles.dayAmount, { color, fontWeight: total > 0 ? '600' : '400' }]}>{amount}</Text>
        </View>;
      })}
    </View>
  </>;
}

export function Dashboard({ occurrences, categories }: Props) {
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const [chart, setChart] = useState<ChartType>('donut');
  const [period, setPeriod] = useState<Period>('month');
  const [active, setActive] = useState<number | null>(null);
  const [withEmpty, setWithEmpty] = useState(false);
  const data = useMemo(() => breakdown(occurrences, categories, period, todayInRome()), [occurrences, categories, period]);
  const colors: ChartColors = {
    series: theme.dark ? palette.dark : palette.light,
    neutral: theme.dark ? '#898781' : '#a3a29c',
    surface: theme.colors.background,
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    grid: theme.colors.outlineVariant,
    baseline: theme.colors.outline,
  };
  const chartProps = { data, colors, active, onActive: setActive };
  const muted = { color: theme.colors.onSurfaceVariant };
  // Only real, individual categories can be «principale»: the aggregates («Altre», «Senza categoria») cannot.
  const top = data.series.filter((item) => item.key !== otherCategoriesKey && item.key !== uncategorizedKey)
    .reduce<(typeof data.series)[number] | undefined>((best, item) => (!best || item.total > best.total ? item : best), undefined);

  // Hover/tap detail: one bucket (area, bars) or one category (donut).
  const bucket = chart !== 'donut' && active !== null ? data.buckets[active] : undefined;
  const bucketParts = bucket ? data.series.filter((series) => series.values[active!]! > 0) : [];

  // Category breakdown: colour, name, amount and share. Tapping a row highlights it on the donut.
  const legend = (
    <View style={styles.legend} role="list" accessibilityLabel="Legenda: categorie, importi e percentuali">
      {data.series.map((series, index) => {
        const content = (
          <>
            <View style={[styles.swatch, { backgroundColor: seriesColor(series, colors) }]} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.legendLabel}>{series.label}</Text>
            <Text variant="bodyMedium" style={styles.number}>{formatAmountMinor(series.total)}</Text>
            <Text variant="bodyMedium" style={[styles.number, styles.share, muted]}>{percent(series.total, data.total)}</Text>
          </>
        );
        // Only the donut reacts to a row: the other charts show the legend as plain information.
        return chart === 'donut' ? (
          <StateLayerPressable key={series.key} layerColor={theme.colors.onSurface} radius={radius.control} role="listitem"
            onPress={() => setActive(active === index ? null : index)} aria-pressed={active === index}
            accessibilityLabel={`${series.label}: ${formatAmountMinor(series.total)}, ${percent(series.total, data.total)}`}
            style={[styles.legendRow, active === index && { backgroundColor: theme.colors.secondaryContainer }]}>{content}</StateLayerPressable>
        ) : <View key={series.key} role="listitem" style={styles.legendRow}>{content}</View>;
      })}
    </View>
  );

  const changePeriod = (value: Period | '') => { if (value) { setPeriod(value); setActive(null); setWithEmpty(false); } };
  const changeChart = (value: ChartType | '') => { if (value) { setChart(value); setActive(null); } };

  // Multi-month detail starts with the current month; daily detail always includes every day.
  const todayDate = todayInRome();
  const lastIndex = data.buckets.findIndex((bucket) => todayDate >= bucket.from && todayDate <= bucket.to);
  const rows = data.buckets.map((item, index) => ({ item, total: data.totals[index]!, current: index === lastIndex })).filter((row) => withEmpty || row.current);
  const hidden = data.buckets.length - 1;

  return (
    <View style={styles.layout}>
      <View style={styles.toolbar}>
        {sideBySide ? (
          <>
            <ChoiceChips label="Periodo" value={period} onChange={changePeriod}
              options={periods.map((value) => ({ value, label: periodLabels[value] }))} />
            <ChoiceChips label="Tipo di grafico" value={chart} onChange={changeChart}
              options={chartTypes.map((value) => ({ value, label: chartLabels[value] }))} />
          </>
        ) : (
          // Chips would not fit on a phone: two compact selectors share one row.
          <>
            <MenuSelect label="Periodo" icon={iconShapes.calendar} value={period} style={styles.select}
              onChange={(value) => changePeriod(value)} options={periods.map((value) => ({ value, label: periodLabels[value] }))} />
            <MenuSelect label="Grafico" icon={iconShapes.chart} value={chart} style={styles.select}
              onChange={(value) => changeChart(value)} options={chartTypes.map((value) => ({ value, label: chartLabels[value] }))} />
          </>
        )}
      </View>

      {data.total === 0 ? (
        <Text variant="bodyLarge" style={muted}>Nessuna spesa in questo periodo.</Text>
      ) : (
        <>
          <View role="group" aria-label={`Riepilogo: ${periodLabels[period].toLowerCase()}`} style={styles.summary}>
            <View>
              <Text variant="labelLarge" style={muted}>Totale · {periodLabels[period].toLowerCase()}</Text>
              <Text variant="displaySmall" numberOfLines={1} style={[styles.total, { color: theme.colors.primary }]}>{formatAmountMinor(data.total)}</Text>
            </View>
            <View style={styles.stats}>
              <Stat label="Spese" value={String(data.count)} />
              {top && <Stat label="Principale" value={top.label} hint={`${formatAmountMinor(top.total)} · ${percent(top.total, data.total)}`} />}
            </View>
          </View>

          <Card title={chartTitles[chart]}>
            <View style={[styles.chartRow, sideBySide && chart !== 'area' && styles.row]}>
              <View style={styles.chartCol}>
                {chart === 'donut' && <DonutChart {...chartProps} />}
                {chart === 'area' && <AreaChart {...chartProps} />}
                {chart === 'bars' && <StackedBarChart {...chartProps} />}
                <View style={styles.detail} accessibilityLiveRegion="polite">
                  {bucket ? (
                    <>
                      <Text variant="titleSmall">{bucketTitle(bucket, period)} · {formatAmountMinor(data.totals[active!]!)}</Text>
                      {chart === 'bars' && bucketParts.map((series) => (
                        <View key={series.key} style={styles.legendRow}>
                          <View style={[styles.swatch, { backgroundColor: seriesColor(series, colors) }]} />
                          <Text variant="bodySmall" style={styles.legendLabel}>{series.label}</Text>
                          <Text variant="bodySmall" style={styles.number}>{formatAmountMinor(series.values[active!]!)}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text variant="bodySmall" style={muted}>Tocca il grafico per i dettagli.</Text>
                  )}
                </View>
              </View>
              {chart !== 'area' && <View style={sideBySide ? styles.legendCol : undefined}>{legend}</View>}
            </View>
          </Card>

          <Card title={isDailyPeriod(period) ? 'Dettaglio giornaliero' : 'Dettaglio per periodo'} style={styles.detailCard}>
            {isDailyPeriod(period) ? (
              <DailyBreakdown buckets={data.buckets} totals={data.totals} today={todayDate} />
            ) : <>
            <View role="table" accessibilityLabel="Spese per periodo" style={[styles.table, { borderColor: theme.colors.outline }]}>
              {rows.map(({ item, total }, index) => (
                <View key={item.key} role="row" style={[styles.tableRow, index > 0 && { borderTopWidth: 1, borderColor: theme.colors.outline }]}>
                  <Text variant="bodyMedium" role="cell" style={[styles.legendLabel, total === 0 && muted]}>{bucketTitle(item, period)}</Text>
                  <Text variant="bodyMedium" role="cell" style={[styles.number, styles.rowAmount, total === 0 && muted]}>{formatAmountMinor(total)}</Text>
                </View>
              ))}
            </View>
            {hidden > 0 && (
              <Button compact mode="text" onPress={() => setWithEmpty(!withEmpty)} style={styles.start}>
                {withEmpty ? 'Solo il mese corrente' : 'Mostra tutti i periodi'}
              </Button>
            )}
            </>}
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: layout.sectionGap },
  // Period on the left, chart type on the right; they wrap on narrow windows.
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  select: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xl },
  total: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxl },
  stat: { gap: 2, minWidth: 0 },
  statValue: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  chartRow: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: 360, flexShrink: 0 },
  detail: { minHeight: 24, gap: 4 },
  legend: { gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1, minWidth: 0 },
  number: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  share: { width: 40 },
  start: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  // Full-width table with a bold outline, sized by its content (rows without minimum height).
  detailCard: { width: '100%', gap: spacing.sm },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
  dayCell: { minWidth: 0, borderRadius: radius.tile, padding: spacing.md, gap: spacing.sm },
  dayHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  dayAmount: { fontVariant: ['tabular-nums'] },
  table: { width: '100%', borderWidth: 2, borderRadius: radius.control, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.lg },
  rowAmount: { fontWeight: '600' },
});
