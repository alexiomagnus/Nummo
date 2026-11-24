import { useI18n } from '../../i18n/I18nProvider';
import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { chartTypes, type ChartType, type DashboardPreferences } from '../settings/preferences';
import { Card } from '../../components/Card';
import { MenuSelect } from '../../components/MenuSelect';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { layout, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { Category } from '../../domain/category';
import { breakdown, effectiveFundFilter, filterByFund, allFunds, periodLabels, periods, type Breakdown, type Occurrence, type Period, type Series } from '../../domain/history';
import type { Fund } from '../../domain/funds';
import { FundFilter } from '../funds/FundFilter';
import { todayInRome } from '../../domain/policy';
import { BarChart } from './BarChart';
import { dashboardInsights } from './insights';
import { TransactionDetails } from './TransactionDetails';
import { TimeChart } from './TimeChart';
import { seriesLabel } from './seriesLabel';
import { otherCategoriesKey } from '../../domain/history';
import { BlockChart } from './BlockChart';
import { DonutChart, type ChartColors } from './charts';
import { categoryPresentation, categoryPercent as percent } from './categoryPresentation';
import { chartPalette } from '../../theme/chartPalette';
import { CategoryLegend } from './CategoryLegend';
import { donutLegendWidth, donutMaxSize } from './donutLayout';

const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', blocks: 'Blocchi', bars: 'Barre' };
// An icon for each choice of Periodo and Grafico (user's request, 24 November).
const chartIcons: Record<ChartType, string> = { donut: iconShapes.donut, blocks: iconShapes.blocks, bars: iconShapes.bars };
const periodIcons: Record<Period, string> = { month: iconShapes.calendarToday, 'previous-month': iconShapes.calendarPrevious, quarter: iconShapes.calendarQuarter, year: iconShapes.calendarYear };

// Existing validated 12-colour palette (shared with the funds); slots come from `categoryColorSlots` (distinct up to 12 used categories); labels disambiguate repeats beyond that.
const palette = chartPalette;

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[]; funds: readonly Fund[];
  preferences: DashboardPreferences; onChangePreferences: (change: Partial<DashboardPreferences>) => void;
};

export const Dashboard = memo(DashboardView);

function DashboardView({ occurrences: all, categories, funds, preferences, onChangePreferences }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const { dashboardChart: chart, dashboardPeriod: period } = preferences;
  // The «Fondo» filter (when the setting is on and there are funds): every figure of the page follows the chosen fund.
  const [fundChoice, setFundChoice] = useState(allFunds);
  const fundFilterShown = funds.length > 0;
  const fundFilter = fundFilterShown ? effectiveFundFilter(fundChoice, funds.map((fund) => fund.id)) : allFunds;
  const occurrences = useMemo(() => filterByFund(all, fundFilter), [all, fundFilter]);
  const [detail, setDetail] = useState<{ title: string; items: readonly Occurrence[] } | null>(null);
  const source = useMemo(() => breakdown(occurrences, categories, period, todayInRome()), [occurrences, categories, period]);
  const { data, others } = useMemo(() => categoryPresentation(source), [source]);
  const insights = useMemo(() => dashboardInsights(source, occurrences, categories, todayInRome()), [source, occurrences, categories]);
  // Stable while the data does not change: the chart and legend below are memoised and must not re-render with the page.
  const openCategory = useCallback((key: string) => {
    const series = data.series.find(item => item.key === key) ?? source.series.find(item => item.key === key);
    const keys = key === otherCategoriesKey ? new Set(others.map(item => item.key)) : new Set([key]);
    setDetail({ title: series ? seriesLabel(series, t) : t('Senza categoria'),
      items: insights.current.filter(item => keys.has(insights.keyOf(item))) });
  }, [data, source, others, insights, t]);
  const colors: ChartColors = useMemo(() => ({
    series: theme.dark ? palette.dark : palette.light,
    neutral: theme.colors.outline,
    surface: theme.colors.background,
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    grid: theme.colors.outlineVariant,
    baseline: theme.colors.outline,
  }), [theme]);
  const muted = { color: theme.colors.onSurfaceVariant };

  // A new period or fund starts without a selected category: the chart section is keyed on both (below).
  const changePeriod = (value: Period | '') => { if (value) onChangePreferences({ dashboardPeriod: value }); };
  const changeChart = (value: ChartType | '') => { if (value) { onChangePreferences({ dashboardChart: value }); } };
  const changeFund = (value: string) => { setFundChoice(value); };

  const fundSelect = fundFilterShown && <FundFilter funds={funds} value={fundFilter} onChange={changeFund} large={false}
    style={styles.fundSelectWide} />;
  // A screen of their own at every size (MenuSelect `panel`, ChoiceScreen), each choice with its icon.
  const choiceIcon = (shape: string) => <SvgIcon shape={shape} size={24} color={theme.colors.onSurfaceVariant} />;
  const periodSelect = <MenuSelect panel label={t("Periodo")} icon={iconShapes.calendar} value={period} style={styles.half}
    onChange={(value) => changePeriod(value)} options={periods.map((value) => ({ value, label: t(periodLabels[value]), icon: choiceIcon(periodIcons[value]) }))} />;
  const chartTypeSelect = <MenuSelect panel label={t("Grafico")} icon={iconShapes.chart} value={chart} style={styles.half}
    onChange={(value) => changeChart(value)} options={chartTypes.map((value) => ({ value, label: t(chartLabels[value]), icon: choiceIcon(chartIcons[value]) }))} />;

  return (
    <View style={styles.layout}>
      {/* Every width: Fondo across the whole first row, then Periodo and Grafico (two menus) sharing the second. */}
      <View style={styles.toolbar}>
        {fundSelect}
        <View style={styles.filters}>
          {periodSelect}
          {chartTypeSelect}
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.metric}>
          <Text variant="labelMedium" style={muted}>{t('Totale nel periodo')}</Text>
          <Text variant="headlineSmall" style={styles.total}>{formatAmount(source.total)}</Text>
          <Text variant="bodySmall" style={muted}>{formatDate(insights.from)} – {formatDate(insights.to)}</Text>
        </View>
        <View style={styles.metric}>
          <Text variant="labelMedium" style={muted}>{t('Transazioni')}</Text>
          <Text variant="titleLarge">{source.count}</Text>
        </View>
      </View>


      {source.count === 0 ? <Text variant="bodyMedium" style={muted}>{t('Nessuna spesa in questo periodo.')}</Text> :
        <Card>
          {chart === 'bars' ? <BarChart rows={insights.rows} total={source.total} categories={categories} colors={colors} onOpen={openCategory} /> :
            <CategoryChart key={`${period}|${fundFilter}`} chart={chart} data={data} others={others} categories={categories} colors={colors}
              sideBySide={sideBySide} onOpen={openCategory} />}
        </Card>}
      {preferences.dashboardTrend && <Card><TimeChart key={period} days={insights.days} /></Card>}
      {detail && <TransactionDetails {...detail} categories={categories} funds={funds} onClose={() => setDetail(null)} />}

    </View>
  );
}

type CategoryChartProps = { chart: 'donut' | 'blocks'; data: Breakdown; others: readonly Series[]; categories: readonly Category[];
  colors: ChartColors; sideBySide: boolean; onOpen: (key: string) => void };

// Donut or blocks with their legend. The selected category lives here, not in the page: a tap re-renders only the chart and
// the legend, not the filters, the summary and the daily trend (a whole-page render per tap made quick switching lag).
const CategoryChart = memo(function CategoryChart({ chart, data, others, categories, colors, sideBySide, onOpen }: CategoryChartProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const chartSideBySide = chartWidth >= donutMaxSize + donutLegendWidth + spacing.lg;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeIndex = data.series.findIndex((series) => series.key === activeKey);
  const active = activeIndex < 0 ? null : activeIndex;
  const setActive = useCallback((index: number | null) => setActiveKey(index === null ? null : data.series[index]?.key ?? null), [data]);
  const muted = { color: theme.colors.onSurfaceVariant };
  const donutHint = t('Tocca una sezione per vedere i dettagli della categoria.');
  if (chart === 'blocks') return <View style={styles.chartRow}>
    <BlockChart data={data} colors={colors} active={active} onActive={setActive} percent={percent} onOpen={onOpen} />
    {/* Every category, by amount, identified by colour; «Altre» expands to the categories it groups. */}
    <CategoryLegend series={data.series} others={others} categories={categories} total={data.total}
      colors={colors} active={active} onActive={setActive} onOpen={onOpen} compact />
  </View>;
  return <View style={styles.chartRow}>
    <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
      style={[styles.chartRow, chartSideBySide && styles.row]}>
      <View style={styles.chartCol}><View style={!sideBySide ? { width: '100%', maxWidth: 280, alignSelf: 'center' } : undefined}>
        <DonutChart data={data} colors={colors} active={active} onActive={setActive} />
      </View>
      {active !== null && <Button mode="text" onPress={() => onOpen(data.series[active]!.key)}>{t('Mostra transazioni')}</Button>}
      {/* Legend below the chart (phones): the hint sits right under the donut, before the legend. */}
      {active === null && !chartSideBySide && <Text variant="bodyMedium" style={[muted, styles.donutHintBelow]}>{donutHint}</Text>}
      </View>
      <View style={chartSideBySide ? styles.legendCol : undefined}>
        <CategoryLegend series={data.series} others={others} categories={categories} total={data.total}
          colors={colors} active={active} onActive={setActive} onOpen={onOpen} />
      </View>
    </View>
    {active === null && chartSideBySide && <Text variant="bodyMedium" style={[muted, styles.donutHint]}>{donutHint}</Text>}
  </View>;
});

const styles = StyleSheet.create({
  layout: { gap: layout.sectionGap },
  // Fondo alone on the first row, then Periodo and Grafico sharing the second in equal halves.
  toolbar: { gap: spacing.lg },
  filters: { flexDirection: 'row', gap: spacing.md },
  fundSelectWide: { alignSelf: 'stretch' },
  half: { flex: 1, minWidth: 0 },
  total: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartRow: { gap: spacing.lg },
  donutHint: { marginTop: spacing.xxl },
  // Clear space from the donut (plus the column gap), so the hint reads as a caption rather than part of the chart.
  donutHintBelow: { textAlign: 'center', marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: donutLegendWidth, flexShrink: 0 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  metric: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs },
});
