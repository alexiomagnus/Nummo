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
import { breakdown, otherCategoriesKey, periodLabels, periods, uncategorizedKey, type Bucket, type Occurrence, type Period } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import { AreaChart, DonutChart, StackedBarChart, seriesColor, type ChartColors } from './charts';

const chartTypes = ['donut', 'area', 'bars'] as const;
type ChartType = (typeof chartTypes)[number];
const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', area: 'Andamento', bars: 'Barre' };
const chartTitles: Record<ChartType, string> = { donut: 'Spese per categoria', area: 'Andamento delle spese', bars: 'Spese per periodo e categoria' };

// Reference categorical palette from the dataviz skill, validated with its script against
// this app's light and dark card surfaces (surface container low). Order is fixed, never cycled.
const palette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });
function bucketTitle(bucket: Bucket, period: Period): string {
  return period === 'month' ? dayFormat.format(new Date(`${bucket.from}T00:00:00Z`)) : `${bucket.label} ${bucket.from.slice(0, 4)}`;
}
// Whole percentages, but a non-zero share never shows as 0%.
const percent = (part: number, total: number): string => {
  const value = (part / total) * 100;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
};

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[] };

function Kpi({ label, value, hint, primary }: { label: string; value: string; hint?: string; primary?: boolean }) {
  const { colors } = useTheme();
  const text = primary ? colors.onPrimaryContainer : colors.onSurface;
  return (
    <View style={[styles.kpi, { backgroundColor: primary ? colors.primaryContainer : colors.elevation.level1 }]}>
      <Text variant="labelLarge" style={{ color: primary ? colors.onPrimaryContainer : colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="headlineSmall" numberOfLines={1} style={[styles.kpiValue, { color: text }]}>{value}</Text>
      {hint !== undefined && <Text variant="bodySmall" numberOfLines={1} style={{ color: primary ? colors.onPrimaryContainer : colors.onSurfaceVariant }}>{hint}</Text>}
    </View>
  );
}

export function Dashboard({ occurrences, categories }: Props) {
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const [chart, setChart] = useState<ChartType>('donut');
  const [period, setPeriod] = useState<Period>('month');
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(true);
  const [withEmpty, setWithEmpty] = useState(false);
  const data = useMemo(() => breakdown(occurrences, categories, period, todayInRome()), [occurrences, categories, period]);
  const colors: ChartColors = {
    series: theme.dark ? palette.dark : palette.light,
    neutral: theme.dark ? '#898781' : '#a3a29c',
    surface: theme.colors.elevation.level1,
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

  const rows = data.buckets.map((item, index) => ({ item, total: data.totals[index]! })).filter((row) => withEmpty || row.total > 0);
  const hidden = data.buckets.length - data.totals.filter((total) => total > 0).length;

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
        <Card>
          <Text variant="titleMedium">Nessuna spesa in questo periodo</Text>
          <Text variant="bodyLarge" style={muted}>Cambia periodo oppure registra una spesa con «Nuova spesa»: totali e grafici compaiono qui.</Text>
        </Card>
      ) : (
        <>
          <View style={styles.kpis} role="group" aria-label={`Riepilogo: ${periodLabels[period].toLowerCase()}`}>
            <Kpi primary label={`Totale · ${periodLabels[period].toLowerCase()}`} value={formatAmountMinor(data.total)} />
            <Kpi label="Spese" value={String(data.count)} hint={data.count === 1 ? 'registrata' : 'registrate'} />
            <Kpi label="Media per spesa" value={formatAmountMinor(Math.round(data.total / data.count))} />
            {top && <Kpi label="Categoria principale" value={top.label} hint={`${formatAmountMinor(top.total)} · ${percent(top.total, data.total)}`} />}
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
                    <Text variant="bodySmall" style={muted}>
                      {chart === 'donut' ? 'Tocca una categoria per evidenziarla.' : 'Passa sopra o tocca il grafico per i dettagli.'}
                    </Text>
                  )}
                </View>
              </View>
              {chart !== 'area' && <View style={sideBySide ? styles.legendCol : undefined}>{legend}</View>}
            </View>
          </Card>

          <Card title="Dettaglio per periodo" description={withEmpty ? undefined : hidden > 0 ? `Solo i periodi con spese (${hidden} senza movimenti nascosti).` : undefined}
            actions={<Button mode="text" aria-expanded={showTable} onPress={() => setShowTable(!showTable)}>{showTable ? 'Nascondi' : 'Mostra'}</Button>}>
            {showTable && (
              <View role="table" accessibilityLabel="Spese per periodo" style={[styles.table, { borderColor: theme.colors.outlineVariant }]}>
                {rows.map(({ item, total }, index) => (
                  <View key={item.key} role="row" style={[styles.tableRow, index > 0 && { borderTopWidth: 1, borderColor: theme.colors.outlineVariant }]}>
                    <Text variant="bodyMedium" role="cell" style={styles.legendLabel}>{bucketTitle(item, period)}</Text>
                    <Text variant="bodyMedium" role="cell" style={[styles.number, total === 0 && muted]}>{formatAmountMinor(total)}</Text>
                  </View>
                ))}
              </View>
            )}
            {showTable && hidden > 0 && (
              <Button mode="text" onPress={() => setWithEmpty(!withEmpty)} style={styles.start}>
                {withEmpty ? 'Nascondi periodi senza spese' : `Mostra tutto il periodo (${data.buckets.length})`}
              </Button>
            )}
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
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: { flexGrow: 1, flexBasis: 150, minWidth: 0, borderRadius: radius.card, padding: spacing.lg, gap: 2 },
  kpiValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartRow: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: 320, flexShrink: 0 },
  detail: { minHeight: 24, gap: 4 },
  legend: { gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1, minWidth: 0 },
  number: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  share: { width: 40 },
  start: { alignSelf: 'flex-start' },
  table: { borderWidth: 1, borderRadius: radius.control, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 40, alignItems: 'center' },
});
