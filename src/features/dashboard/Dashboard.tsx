import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
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
import { BlockChart } from './BlockChart';
import { DonutChart, type ChartColors } from './charts';
import { categoryPresentation, categoryPercent as percent } from './categoryPresentation';
import { chartPalette } from '../../theme/chartPalette';
import { CategoryLegend } from './CategoryLegend';
import { DailyBreakdown } from './DailyBreakdown';
import { donutLegendWidth, donutMaxSize } from './donutLayout';

const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', blocks: 'Blocchi', bars: 'Barre' };

// Existing validated 12-colour palette (shared with the funds); slots follow category IDs, labels disambiguate repeated colours.
const palette = chartPalette;

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[];
  preferences: DashboardPreferences; onChangePreferences: (change: Partial<DashboardPreferences>) => void;
};

export function Dashboard({ occurrences, categories, preferences, onChangePreferences }: Props) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const size = useSizeClass();
  const sideBySide = size !== 'compact';
  const [chartWidth, setChartWidth] = useState(0);
  const chartSideBySide = chartWidth >= donutMaxSize + donutLegendWidth + spacing.lg;
  const { dashboardChart: chart, dashboardPeriod: period } = preferences;
  const [showDays, setShowDays] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const source = useMemo(() => breakdown(occurrences, categories, period, todayInRome()), [occurrences, categories, period]);
  const { data, others } = useMemo(() => categoryPresentation(source), [source]);
  const activeIndex = data.series.findIndex((series) => series.key === activeKey);
  const active = activeIndex < 0 ? null : activeIndex;
  const setActive = (index: number | null) => setActiveKey(index === null ? null : data.series[index]?.key ?? null);
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
  const legend = <CategoryLegend key={period} series={data.series} others={others} categories={categories} total={data.total}
    colors={colors} active={active} onActive={setActive} showSeries={chart !== 'bars'} />;

  const changePeriod = (value: Period | '') => { if (value) { onChangePreferences({ dashboardPeriod: value }); setActive(null); } };
  const changeChart = (value: ChartType | '') => { if (value) { onChangePreferences({ dashboardChart: value }); } };

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
          <Card>
            {chart !== 'donut' ? (
              <View style={styles.chartRow}>
                <View style={styles.totalHeading}>
                  <Text variant="titleLarge" style={styles.total}>{formatAmount(data.total)}</Text>
                  <Text style={[styles.totalCaption, muted]}>{t('totale')}</Text>
                </View>
                {chart === 'bars' ? <BarChart {...chartProps} categories={categories} />
                  : <BlockChart data={data} colors={colors} active={active} onActive={setActive} percent={percent} />}
                {(chart === 'blocks' || others.length > 0) && legend}
              </View>
            ) : (
              <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
                style={[styles.chartRow, chartSideBySide && styles.row]}>
                <View style={styles.chartCol}><DonutChart {...chartProps} /></View>
                <View style={chartSideBySide ? styles.legendCol : undefined}>{legend}</View>
              </View>
            )}
          </Card>

          <View style={styles.days}>
            <Button mode="text" aria-expanded={showDays} aria-controls={showDays ? 'dashboard-days' : undefined}
              onPress={() => setShowDays(!showDays)}>
              {showDays ? t('Nascondi giorni con spese') : t('Mostra giorni con spese')}
            </Button>
          </View>
          {showDays && <View nativeID="dashboard-days">
            <Card style={styles.detailCard}>
              <DailyBreakdown key={`${period}:${data.buckets[0]?.key}`} data={source} occurrences={occurrences} categories={categories} today={todayDate} />
            </Card>
          </View>}
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
  totalHeading: { alignSelf: 'flex-start', alignItems: 'flex-start', gap: spacing.xs },
  totalCaption: { fontSize: 14, lineHeight: 18, textAlign: 'left' },
  total: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartRow: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  chartCol: { flex: 1, minWidth: 0, gap: spacing.sm },
  legendCol: { width: donutLegendWidth, flexShrink: 0 },
  days: { alignItems: 'flex-start' },
  detailCard: { width: '100%', gap: spacing.sm },
});
