import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import type { Breakdown, Series } from '../../domain/history';
import { spacing } from '../../theme/tokens';
import { donutMetrics } from './donutLayout';
import { useHaptics } from '../../components/Haptics';

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
  // Hover is only a preview. A clicked/tapped selection belongs to the dashboard and survives pointer exit.
  const [hovered, setHovered] = useState<number | null>(null);
  const haptic = useHaptics(); // tick on selecting a part of the chart («Vibrazione» in Settings)
  const highlighted = hovered ?? active;
  const focus = highlighted === null ? null : data.series[highlighted];
  const amount = focus ? formatAmount(focus.total) : '';
  const share = focus && data.total > 0 ? (focus.total / data.total) * 100 : 0;
  const caption = focus ? seriesLabel(focus, t) : '';
  const percent = `${share > 0 && share < 1 ? '<1' : Math.round(share)}%`;
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
        <svg width={size} height={size} role="group" aria-label={t("Grafico ad anello delle spese per categoria: {p0}, {p1}", { p0: focus ? amount : formatAmount(data.total), p1: focus ? caption + ' · ' + percent : t('totale') })}
          onPointerLeave={() => setHovered(null)}>
          {segments.map((segment, index) => (
            <path key={index} role="button" tabIndex={0} aria-pressed={active === index}
              aria-label={seriesLabel(data.series[index]!, t) + ': ' + formatAmount(data.series[index]!.total)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActive(active === index ? null : index); } }}
              d={segment.d} fill={segment.color} stroke={colors.surface} strokeWidth={2}
              opacity={highlighted === null || highlighted === index ? 1 : 0.35} style={{ cursor: 'pointer', transition: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)' }}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(index); }}
              onPointerLeave={() => setHovered(null)}
              onClick={() => { haptic('tick'); setHovered(null); onActive(active === index ? null : index); }} />
          ))}
        </svg>
        {focus && centerSide >= 64 && <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.caption, {
          width: centerSide, height: centerSide, left: outer - centerSide / 2, top: outer - centerSide / 2,
        }]}>
          <Text numberOfLines={2} style={[styles.captionText, { color: colors.muted, fontSize: 14, lineHeight: 18 }]}>{caption}</Text>
          <Text numberOfLines={1} style={[styles.captionText, { color: colors.text, fontSize: Math.min(amountFontSize, 32), lineHeight: Math.min(amountFontSize, 32) * 1.3, fontWeight: '700' }]}>{amount}</Text>
          <Text style={[styles.captionText, { color: colors.muted, fontSize: 14, lineHeight: 18 }]}>{percent}</Text>
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
