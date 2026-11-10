import { useI18n } from '../../i18n/I18nProvider';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { chartTypes, type ChartType, type DashboardPreferences } from '../settings/preferences';
import { Card } from '../../components/Card';
import { ChoiceChips } from '../../components/ChoiceChips';
import { MenuSelect } from '../../components/MenuSelect';
import { iconShapes } from '../../components/SvgIcon';
import { layout, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { Category } from '../../domain/category';
import { breakdown, periodLabels, periods, type Occurrence, type Period } from '../../domain/history';
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

// Existing validated 12-colour palette (shared with the funds); slots come from `categoryColorSlots` (distinct up to 12 used categories); labels disambiguate repeats beyond that.
const palette = chartPalette;

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[];
  preferences: DashboardPreferences; onChangePreferences: (change: Partial<DashboardPreferences>) => void;
};

export const Dashboard = memo(DashboardView);

function DashboardView({ occurrences, categories, preferences, onChangePreferences }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const [chartWidth, setChartWidth] = useState(0);
  const chartSideBySide = chartWidth >= donutMaxSize + donutLegendWidth + spacing.lg;
  const { dashboardChart: chart, dashboardPeriod: period } = preferences;
  const [detail, setDetail] = useState<{ title: string; items: readonly Occurrence[] } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const source = useMemo(() => breakdown(occurrences, categories, period, todayInRome()), [occurrences, categories, period]);
  const { data, others } = useMemo(() => categoryPresentation(source), [source]);
  const insights = useMemo(() => dashboardInsights(source, occurrences, categories, todayInRome()), [source, occurrences, categories]);
  const openCategory = (key: string) => {
    const series = data.series.find(item => item.key === key) ?? source.series.find(item => item.key === key);
    const keys = key === otherCategoriesKey ? new Set(others.map(item => item.key)) : new Set([key]);
    setDetail({ title: series ? seriesLabel(series, t) : t('Senza categoria'),
      items: insights.current.filter(item => keys.has(insights.keyOf(item))) });
  };
  const activeIndex = data.series.findIndex((series) => series.key === activeKey);
  const active = activeIndex < 0 ? null : activeIndex;
  const setActive = (index: number | null) => setActiveKey(index === null ? null : data.series[index]?.key ?? null);
  const colors: ChartColors = {
    series: theme.dark ? palette.dark : palette.light,
    neutral: theme.colors.outline,
    surface: theme.colors.background,
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    grid: theme.colors.outlineVariant,
    baseline: theme.colors.outline,
  };
  const chartProps = { data, colors, active, onActive: setActive };
  const muted = { color: theme.colors.onSurfaceVariant };
  const legend = <CategoryLegend key={period} series={data.series} others={others} categories={categories} total={data.total}
    colors={colors} active={active} onActive={setActive} onOpen={openCategory} />;

  const changePeriod = (value: Period | '') => { if (value) { onChangePreferences({ dashboardPeriod: value }); setActive(null); } };
  const changeChart = (value: ChartType | '') => { if (value) { onChangePreferences({ dashboardChart: value }); } };


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
            chart === 'blocks' ? <View style={styles.chartRow}>
              <BlockChart data={data} colors={colors} active={active} onActive={setActive} percent={percent} onOpen={openCategory} />
              {/* Every category, by amount, identified by colour; «Altre» expands to the categories it groups. */}
              <CategoryLegend key={period} series={data.series} others={others} categories={categories} total={data.total}
                colors={colors} active={active} onActive={setActive} onOpen={openCategory} compact />
            </View> :
            <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
              style={[styles.chartRow, chartSideBySide && styles.row]}>
              <View style={styles.chartCol}><View style={!sideBySide ? { width: '100%', maxWidth: 280, alignSelf: 'center' } : undefined}>
                <DonutChart {...chartProps} />
              </View>
              {active !== null && <Button mode="text" onPress={() => openCategory(data.series[active]!.key)}>{t('Mostra transazioni')}</Button>}
              </View>
              <View style={chartSideBySide ? styles.legendCol : undefined}>{legend}</View>
            </View>}
        </Card>}
      {preferences.dashboardTrend && <Card><TimeChart key={period} days={insights.days} /></Card>}
      {detail && <TransactionDetails {...detail} categories={categories} onClose={() => setDetail(null)} />}

    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: layout.sectionGap },
  // Period on the left, chart type on the right; they wrap on narrow windows.
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  select: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  total: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartRow: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: donutLegendWidth, flexShrink: 0 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  metric: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs },
});
