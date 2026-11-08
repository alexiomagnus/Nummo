import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { MenuSelect } from '../../components/MenuSelect';
import { iconShapes } from '../../components/SvgIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { Category } from '../../domain/category';
import { breakdown, periodLabels, periods, type Occurrence, type Period } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import { BlockChart } from './BlockChart';
import { DonutChart, seriesColor, type ChartColors } from './charts';
import { DailyBreakdown } from './DailyBreakdown';
import { donutLegendWidth, donutMaxSize } from './donutLayout';

const chartTypes = ['donut', 'blocks'] as const;
type ChartType = (typeof chartTypes)[number];
const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', blocks: 'Blocchi' };
const chartTitles: Record<ChartType, string> = { donut: 'Spese per categoria', blocks: 'Spese per categoria' };

// Categorical palette: the 8 reference slots of the dataviz skill plus 4 more (cyan, olive, purple, rust).
// All 12 validated with its script (adjacent pairs) in both modes, light/dark surfaces. Order is fixed, never cycled;
// the legend/table carry identity beyond colour. Past 12 categories the rest fold into «Altre categorie».
const palette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#0e9fb8', '#7a9400', '#a846b3', '#a85a1c'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767', '#1fa0bd', '#7f9d00', '#b85bc2', '#b86a2a'],
};

// Whole percentages, but a non-zero share never shows as 0%.
const percent = (part: number, total: number): string => {
  const value = (part / total) * 100;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
};

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[] };

export function Dashboard({ occurrences, categories }: Props) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const [chartWidth, setChartWidth] = useState(0);
  const chartSideBySide = chartWidth >= donutMaxSize + donutLegendWidth + spacing.lg;
  const [chart, setChart] = useState<ChartType>('donut');
  const [period, setPeriod] = useState<Period>('month');
  const [active, setActive] = useState<number | null>(null);
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
  // Category breakdown: colour, name, amount and share. Tapping a row highlights it on the donut.
  const legend = (
    <View style={styles.legend} role="list" accessibilityLabel={t("Legenda: categorie, importi e percentuali")}>
      {data.series.map((series, index) => {
        const content = (
          <>
            <View style={[styles.swatch, { backgroundColor: seriesColor(series, colors) }]} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.legendLabel}>{seriesLabel(series, t)}</Text>
            <Text variant="bodyMedium" style={styles.number}>{formatAmount(series.total)}</Text>
            <Text variant="bodyMedium" style={[styles.number, styles.share, muted]}>{percent(series.total, data.total)}</Text>
          </>
        );
        return (
          <StateLayerPressable key={series.key} layerColor={theme.colors.onSurface} radius={radius.card} role="listitem"
            onPress={() => setActive(active === index ? null : index)} aria-pressed={active === index}
            accessibilityLabel={`${seriesLabel(series, t)}: ${formatAmount(series.total)}, ${percent(series.total, data.total)}`}
            style={[styles.legendRow, active === index && { backgroundColor: theme.colors.secondaryContainer }]}>{content}</StateLayerPressable>
        );
      })}
    </View>
  );

  const changePeriod = (value: Period | '') => { if (value) { setPeriod(value); setActive(null); } };
  const changeChart = (value: ChartType | '') => { if (value) { setChart(value); setActive(null); } };

  const todayDate = todayInRome();

  return (
    <View style={styles.layout}>
      <View style={styles.toolbar}>
        {sideBySide ? (
          <>
            <ChoiceChips label={t("Periodo")} value={period} onChange={changePeriod}
              options={periods.map((value) => ({ value, label: t(periodLabels[value]) }))} />
            <ChoiceChips label={t("Tipo di grafico")} value={chart} onChange={changeChart}
              options={chartTypes.map((value) => ({ value, label: t(chartLabels[value]) }))} />
          </>
        ) : (
          // Chips would not fit on a phone: two compact selectors share one row.
          <>
            <MenuSelect label={t("Periodo")} icon={iconShapes.calendar} value={period} style={styles.select}
              onChange={(value) => changePeriod(value)} options={periods.map((value) => ({ value, label: t(periodLabels[value]) }))} />
            <MenuSelect label={t("Grafico")} icon={iconShapes.chart} value={chart} style={styles.select}
              onChange={(value) => changeChart(value)} options={chartTypes.map((value) => ({ value, label: t(chartLabels[value]) }))} />
          </>
        )}
      </View>

      {data.total === 0 ? (
        <Text variant="bodyMedium" style={muted}>{t("Nessuna spesa in questo periodo.")}</Text>
      ) : (
        <>
          <Card title={t(chartTitles[chart])}>
            {chart === 'blocks' ? (
              <BlockChart data={data} categories={categories} colors={colors} active={active} onActive={setActive} percent={percent} />
            ) : (
              <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
                style={[styles.chartRow, chartSideBySide && styles.row]}>
                <View style={styles.chartCol}><DonutChart {...chartProps} /></View>
                <View style={chartSideBySide ? styles.legendCol : undefined}>{legend}</View>
              </View>
            )}
          </Card>

          <Card style={styles.detailCard}>
            <DailyBreakdown key={`${period}:${data.buckets[0]?.key}`} data={data} occurrences={occurrences} categories={categories} today={todayDate} />
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
  chartRow: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: donutLegendWidth, flexShrink: 0 },
  legend: { gap: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  legendLabel: { flex: 1, minWidth: 0 },
  number: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  share: { width: 44 },
  detailCard: { width: '100%', gap: spacing.sm },
});
