import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import type { Category } from '../../domain/category';
import type { Breakdown, Series } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';
import { seriesColor, type ChartColors } from './charts';
import { treemap } from './treemap';

const gap = 3; // half of the 6 dp gutter between tiles

// Readable content colour on an arbitrary fill (WCAG relative luminance).
function onColor(hex: string): string {
  const channel = (offset: number) => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.3 ? '#1c1b16' : '#ffffff';
}

type Props = {
  data: Breakdown;
  categories: readonly Category[];
  colors: ChartColors;
  active: number | null;
  onActive: (index: number | null) => void;
  percent: (part: number, total: number) => string;
};

export function BlockChart({ data, categories, colors, active, onActive, percent }: Props) {
  const { t, formatAmount } = useI18n();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  // Phones: a treemap makes small categories too narrow to read, so blocks stack full width with height growing with the share.
  const stacked = width > 0 && width < 520;
  const stackedHeight = (total: number) => Math.round(Math.max(76, 76 + (total / data.total) * 220));
  const ordered = [...data.series].sort((a, b) => b.total - a.total);
  const height = stacked ? ordered.reduce((sum, series) => sum + stackedHeight(series.total), 0)
    : Math.round(Math.min(Math.max(width * 0.5, 260), 460));
  const indexOf = new Map<Series, number>(data.series.map((series, index) => [series, index]));
  let top = 0;
  const tiles = stacked
    ? ordered.map((series) => { const h = stackedHeight(series.total); const tile = { item: series, x: 0, y: top, w: width, h }; top += h; return tile; })
    : treemap(data.series.map((series) => ({ item: series, value: series.total })), width, height);
  return (
    <View onLayout={onLayout} style={{ height }} role="list" accessibilityLabel={t("Blocchi delle spese per categoria")}>
      {width > 0 && tiles.map(({ item: series, x, y, w, h }) => {
        const index = indexOf.get(series)!;
        const fill = seriesColor(series, colors);
        const ink = onColor(fill);
        const icon = categories.find((category) => category.id === series.key)?.icon;
        const share = percent(series.total, data.total);
        const roomy = w >= 120 && h >= 96;
        // Shorter wide tiles still show the icon, smaller.
        const showIcon = Boolean(icon) && w >= 100 && h >= 84;
        const compact = w >= 72 && h >= 56;
        return (
          <StateLayerPressable key={series.key} layerColor={ink} radius={radius.card} role="listitem"
            onPress={() => onActive(active === index ? null : index)} aria-pressed={active === index}
            accessibilityLabel={`${seriesLabel(series, t)}: ${formatAmount(series.total)}, ${share}`}
            style={[styles.tile, {
              left: x + gap, top: y + gap, width: Math.max(w - gap * 2, 0), height: Math.max(h - gap * 2, 0),
              backgroundColor: fill, opacity: active === null || active === index ? 1 : 0.4,
            }]}>
            {stacked ? (
              <View style={styles.row}>
                {icon ? <CategoryGlyph icon={icon} size={28} color={ink} /> : null}
                <View style={styles.rowText}>
                  <Text variant="titleMedium" numberOfLines={1} style={[styles.label, { color: ink }]}>{seriesLabel(series, t)}</Text>
                  <Text variant="titleSmall" numberOfLines={1} style={[styles.number, { color: ink }]}>{formatAmount(series.total)}</Text>
                </View>
                <Text variant="titleMedium" style={[styles.number, styles.label, { color: ink }]}>{share}</Text>
              </View>
            ) : compact && (
              <View style={styles.content}>
                <View style={styles.head}>
                  {showIcon && icon ? <CategoryGlyph icon={icon} size={roomy ? 28 : 20} color={ink} /> : <View />}
                  <Text variant="labelLarge" style={[styles.number, { color: ink }]}>{share}</Text>
                </View>
                <View>
                  <Text variant={roomy ? 'titleMedium' : 'labelLarge'} numberOfLines={1} style={[styles.label, { color: ink }]}>{seriesLabel(series, t)}</Text>
                  <Text variant={roomy ? 'titleSmall' : 'labelMedium'} numberOfLines={1} style={[styles.number, { color: ink }]}>{formatAmount(series.total)}</Text>
                </View>
              </View>
            )}
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', overflow: 'hidden' },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.md },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  rowText: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontWeight: '700' },
  number: { fontVariant: ['tabular-nums'] },
});
