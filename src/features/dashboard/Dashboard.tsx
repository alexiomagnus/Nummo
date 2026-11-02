import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { formatAmountMinor } from '../../domain/expense';
import { breakdown, periodLabels, periods, type Bucket, type Occurrence, type Period } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import { ChoiceChips } from '../../components/ChoiceChips';
import { AreaChart, DonutChart, StackedBarChart, seriesColor, type ChartColors } from './charts';

const chartTypes = ['donut', 'area', 'bars'] as const;
type ChartType = (typeof chartTypes)[number];
const chartLabels: Record<ChartType, string> = { donut: 'Ciambella', area: 'Andamento', bars: 'Barre' };

// Reference categorical palette from the dataviz skill, validated with its script against
// this app's light (#F7F2F9) and dark (#1F2421) card surfaces. Order is fixed, never cycled.
const palette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });
function bucketTitle(bucket: Bucket, period: Period): string {
  return period === 'month' ? dayFormat.format(new Date(`${bucket.from}T00:00:00Z`)) : `${bucket.label} ${bucket.from.slice(0, 4)}`;
}

type Props = { occurrences: readonly Occurrence[]; categories: readonly Category[] };

export function Dashboard({ occurrences, categories }: Props) {
  const theme = useTheme();
  const [chart, setChart] = useState<ChartType>('donut');
  const [period, setPeriod] = useState<Period>('month');
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
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

  // Hover/tap detail: one bucket (area, bars) or one category (donut).
  const bucket = chart !== 'donut' && active !== null ? data.buckets[active] : undefined;
  const bucketParts = bucket ? data.series.filter((series) => series.values[active!]! > 0) : [];

  return (
    <Surface elevation={1} style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">Dashboard</Text>
      <View style={styles.filters}>
        <ChoiceChips label="Tipo di grafico" value={chart} onChange={(value) => { if (value) { setChart(value); setActive(null); } }}
          options={chartTypes.map((value) => ({ value, label: chartLabels[value] }))} />
        <ChoiceChips label="Periodo" value={period} onChange={(value) => { if (value) { setPeriod(value); setActive(null); } }}
          options={periods.map((value) => ({ value, label: periodLabels[value] }))} />
      </View>

      <View>
        <Text variant="labelLarge" style={muted}>Totale · {periodLabels[period].toLowerCase()}</Text>
        <Text variant="displaySmall" style={styles.hero}>{formatAmountMinor(data.total)}</Text>
        <Text variant="bodyMedium" style={muted}>{data.count === 1 ? '1 spesa' : `${data.count} spese`}</Text>
      </View>

      {data.total === 0 ? (
        <Text style={muted}>Nessuna spesa in questo periodo. Salvane una da «Nuova» per vedere il grafico.</Text>
      ) : (
        <>
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
                {chart === 'donut' ? 'Passa sopra o tocca una categoria per i dettagli.' : 'Passa sopra o tocca il grafico per i dettagli.'}
              </Text>
            )}
          </View>

          {chart !== 'area' && (
            <View style={styles.legend} accessibilityLabel="Legenda">
              {data.series.map((series, index) => (
                <View key={series.key} style={styles.legendRow}>
                  <View style={[styles.swatch, { backgroundColor: seriesColor(series, colors) }]} />
                  <Text variant="bodyMedium" style={styles.legendLabel}
                    onPress={chart === 'donut' ? () => setActive(active === index ? null : index) : undefined}>{series.label}</Text>
                  <Text variant="bodyMedium" style={[styles.number, muted]}>
                    {formatAmountMinor(series.total)} · {Math.round((series.total / data.total) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Button onPress={() => setShowTable(!showTable)} style={styles.start}>
            {showTable ? 'Nascondi tabella' : 'Mostra tabella'}
          </Button>
          {showTable && (
            <View accessibilityLabel="Tabella delle spese per periodo">
              {data.buckets.map((item, index) => (
                <View key={item.key} style={[styles.tableRow, { borderColor: theme.colors.outlineVariant }]}>
                  <Text variant="bodyMedium" style={styles.legendLabel}>{bucketTitle(item, period)}</Text>
                  <Text variant="bodyMedium" style={styles.number}>{formatAmountMinor(data.totals[index]!)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 28, gap: 16 },
  filters: { gap: 10 },
  hero: { fontWeight: '700' },
  detail: { minHeight: 24, gap: 4 },
  legend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1 },
  number: { fontVariant: ['tabular-nums'] },
  start: { alignSelf: 'flex-start' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
