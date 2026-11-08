import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import type { Breakdown, Series } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';
import { seriesColor, type ChartColors } from './charts';
import { blockLayout, blockTileBounds } from './categoryPresentation';
import { blockLabelPlan, blockLabelColors, type TextMeasure } from './blockLabels';

type Props = {
  data: Breakdown;
  colors: ChartColors;
  active: number | null;
  onActive: (index: number | null) => void;
  percent: (part: number, total: number) => string;
};

export function BlockChart({ data, colors, active, onActive, percent }: Props) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const fontFamily = theme.fonts.bodyMedium.fontFamily;
  const canvas = useMemo(() => typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'), []);
  const [, refreshFonts] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { if (mounted) refreshFonts((revision) => revision + 1); };
    document.fonts?.addEventListener('loadingdone', refresh);
    void document.fonts?.ready.then(refresh);
    return () => { mounted = false; document.fonts?.removeEventListener('loadingdone', refresh); };
  }, []);
  const measure: TextMeasure = (text, size, weight) => {
    if (!canvas) return Array.from(text).length * size;
    canvas.font = `${weight} ${size}px ${fontFamily}`;
    return canvas.measureText(text).width;
  };
  const focus = active === null ? null : data.series[active];
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const { height, tiles } = blockLayout(data.series, width);
  const indexOf = new Map<Series, number>(data.series.map((series, index) => [series, index]));
  return (
    <View style={styles.chart}>
      <View onLayout={onLayout} style={{ height }} role="group" accessibilityLabel={t("Blocchi delle spese per categoria")}>
        {width > 0 && tiles.map(({ item: series, x, y, w, h }) => {
          const index = indexOf.get(series)!;
          const fill = seriesColor(series, colors);
          const { ink, layer } = blockLabelColors(theme.dark, theme.colors.onSurface);
          const share = percent(series.total, data.total);
          const bounds = blockTileBounds({ x, y, w, h });
          const name = seriesLabel(series, t);
          const amount = formatAmount(series.total);
          // Text only: category icons appear in the legend below, not on the tiles.
          const labels = blockLabelPlan(bounds.w, bounds.h, { name, amount, percent: share }, measure);
          const typography = { color: ink, fontFamily, fontSize: labels.fontSize, lineHeight: labels.lineHeight, letterSpacing: 0 };
          return (
            <StateLayerPressable key={series.key} layerColor={layer} radius={radius.card} role="button"
              onPress={() => onActive(active === index ? null : index)} aria-pressed={active === index}
              accessibilityLabel={`${name}: ${amount}, ${share}`}
              aria-describedby={`dashboard-category-${series.key}`} tabIndex={bounds.w < 48 || bounds.h < 48 ? -1 : 0}
              style={[styles.tile, {
                left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h,
                backgroundColor: fill,
              }]}>
              <View pointerEvents="none" aria-hidden style={[styles.content, { padding: labels.padding }]}>
                {labels.name.length > 0 && <Text style={[typography, styles.label]}>{labels.name.join('\n')}</Text>}
                {labels.amount && <Text style={[typography, styles.number]}>{amount}</Text>}
                {labels.percent && <Text style={[typography, styles.number]}>{share}</Text>}
              </View>
              {active === index && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {
                borderWidth: 2, borderColor: ink, borderRadius: radius.card,
              }]} />}
            </StateLayerPressable>
          );
        })}
      </View>
      {focus && <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.onSurface }}>
        {seriesLabel(focus, t)} · {formatAmount(focus.total)} · {percent(focus.total, data.total)}
      </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', overflow: 'hidden' },
  chart: { gap: spacing.sm },
  content: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  label: { fontWeight: '600' },
  number: { fontWeight: '400' },
});
