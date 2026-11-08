import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import type { Breakdown, Series } from '../../domain/history';
import { spacing } from '../../theme/tokens';
import { donutMetrics } from './donutLayout';

export type ChartColors = {
  series: readonly string[]; // 12 validated categorical slots, fixed order
  neutral: string; // "Senza categoria"
  surface: string;
  text: string;
  muted: string;
  grid: string;
  baseline: string;
};
export type ChartProps = {
  data: Breakdown;
  colors: ChartColors;
  active: number | null;
  onActive: (index: number | null) => void;
};

export function seriesColor(series: Series, colors: ChartColors): string {
  return series.slot === null ? colors.neutral : colors.series[series.slot] ?? colors.neutral;
}

function useWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (event) => setWidth(Math.round(event.nativeEvent.layout.width))];
}

export function DonutChart({ data, colors, active, onActive }: ChartProps) {
  const { t, formatAmount } = useI18n();
  const [width, onLayout] = useWidth();
  const focus = active === null ? null : data.series[active];
  const amount = formatAmount(focus ? focus.total : data.total);
  const share = focus ? (focus.total / data.total) * 100 : 0;
  const caption = focus ? `${share > 0 && share < 1 ? '<1' : Math.round(share)}% · ${seriesLabel(focus, t)}` : t("totale");
  const { size, outer, inner, centerSide, amountFontSize } = donutMetrics(width, amount);
  const segments: { d: string; color: string }[] = [];
  let angle = -Math.PI / 2;
  const point = (r: number, a: number) => `${outer + r * Math.cos(a)} ${outer + r * Math.sin(a)}`;
  for (const series of data.series) {
    // Full circle cannot be one SVG arc: draw a 99.99% sweep instead.
    const sweep = Math.min((series.total / data.total) * 2 * Math.PI, 2 * Math.PI - 0.0001);
    const end = angle + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    segments.push({
      color: seriesColor(series, colors),
      d: `M ${point(outer, angle)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, end)} `
        + `L ${point(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, angle)} Z`,
    });
    angle = end;
  }
  return (
    <View onLayout={onLayout} style={styles.center}>
      {size > 0 && (
        <View style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={t("Grafico ad anello delle spese per categoria: {p0}, {p1}", { p0: amount, p1: caption })}
          onMouseLeave={() => onActive(null)}>
          {segments.map((segment, index) => (
            <path key={index} d={segment.d} fill={segment.color} stroke={colors.surface} strokeWidth={2}
              opacity={active === null || active === index ? 1 : 0.35} style={{ cursor: 'pointer' }}
              onMouseEnter={() => onActive(index)} onClick={() => onActive(active === index ? null : index)} />
          ))}
        </svg>
        {centerSide >= 64 && <View pointerEvents="none" aria-hidden style={[styles.caption, {
          width: centerSide, height: centerSide, left: outer - centerSide / 2, top: outer - centerSide / 2,
        }]}>
          <Text numberOfLines={1} style={[styles.captionText, { color: colors.text, fontSize: amountFontSize, lineHeight: amountFontSize * 1.3, fontWeight: '700' }]}>{amount}</Text>
          <Text numberOfLines={2} style={[styles.captionText, { color: colors.muted, fontSize: 14, lineHeight: 18 }]}>{caption}</Text>
        </View>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  caption: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, overflow: 'hidden' },
  captionText: { width: '100%', textAlign: 'center' },
});
