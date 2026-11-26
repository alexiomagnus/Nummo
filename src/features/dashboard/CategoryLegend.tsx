import { memo, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { useHaptics } from '../../components/Haptics';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import type { Category } from '../../domain/category';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { selectionFill } from '../../theme/motion';
import { useI18n } from '../../i18n/I18nProvider';
import { otherCategoriesKey, type Series } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';
import { categoryPercent } from './categoryPresentation';
import { seriesColor, type ChartColors } from './charts';
import { seriesLabel } from './seriesLabel';

type Props = { series: readonly Series[]; others: readonly Series[]; categories: readonly Category[]; total: number; colors: ChartColors;
  active: number | null; onActive: (index: number | null) => void; showSeries?: boolean; onOpen?: (key: string) => void;
  // Under the treemap: a table of aligned rows, two equal columns on wide windows (read top to bottom), one on phones.
  compact?: boolean };

// Two columns only when each keeps room for name, amount and share side by side.
const twoColumnsFrom = 720;
// Column-major split: the first column holds the largest categories, the order reads down then across.
function columnsOf<T>(items: readonly T[], count: number): T[][] {
  const size = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, i) => items.slice(i * size, (i + 1) * size)).filter((column) => column.length > 0);
}

export function CategoryLegend({ series, others, categories, total, colors, active, onActive, showSeries = true, onOpen, compact = false }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  // One box for every legend (under the blocks and beside or under the donut), like the grouped rows of the other pages.
  const box = [styles.box, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.outlineVariant }];
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const columns = compact && width >= twoColumnsFrom ? 2 : 1;
  const icons = useMemo(() => new Map(categories.map((category) => [category.id, category.icon] as const)), [categories]);
  // Compact table: equal columns; spacing separates rows without divider lines.
  const table = <T,>(items: readonly T[], row: (item: T) => ReactNode, label: string, id?: string) => (
    <View nativeID={id} role="list" accessibilityLabel={label}
      style={[styles.table, box]}>
      {columnsOf(items, columns).map((column, c) => <View key={c} style={styles.column}>
        {column.map((item) => row(item))}
      </View>)}
    </View>
  );
  // Rows are memoised: a new selection re-renders only the row that loses it and the one that gains it.
  const seriesRow = (item: Series) => {
    const index = series.indexOf(item);
    return <LegendRow key={item.key} item={item} index={index} selected={active === index} onActive={onActive} icon={icons.get(item.key) ?? null}
      colors={colors} total={total} compact={compact} />;
  };
  const otherRow = (item: Series) => <LegendRow key={item.key} item={item} onOpen={onOpen} icon={icons.get(item.key) ?? null}
    colors={colors} total={total} compact={compact} />;
  return <View style={styles.legend} onLayout={compact ? (event) => setWidth(event.nativeEvent.layout.width) : undefined}>
    {showSeries && (compact ? table(series, seriesRow, t('Legenda: categorie, importi e percentuali'))
      : <View role="list" accessibilityLabel={t('Legenda: categorie, importi e percentuali')} style={box}>{series.map(seriesRow)}</View>)}
    {others.length > 0 && <>
      <Button mode="text" aria-expanded={expanded} aria-controls={expanded ? 'dashboard-other-categories' : undefined}
        onPress={() => { setExpanded(!expanded); onActive(series.findIndex((item) => item.key === otherCategoriesKey)); }}>
        {expanded ? t('Nascondi dettaglio di Altre') : t('Mostra dettaglio di Altre ({p0})', { p0: others.length })}
      </Button>
      {expanded && (compact ? table(others, otherRow, t('Categorie incluse in Altre'), 'dashboard-other-categories')
        : <View nativeID="dashboard-other-categories" role="list" accessibilityLabel={t('Categorie incluse in Altre')} style={box}>{others.map(otherRow)}</View>)}
    </>}
  </View>;
}

type RowProps = { item: Series; icon: Category['icon'] | null; colors: ChartColors; total: number; compact: boolean } &
  ({ index: number; selected: boolean; onActive: (index: number | null) => void; onOpen?: undefined } | { onOpen?: (key: string) => void; index?: undefined; selected?: undefined; onActive?: undefined });

// One legend row. A series row selects its category (second press clears); a row inside «Altre» opens its transactions.
// The selected fill appears and disappears at once, without the cross-fade of other fills: switching quickly between rows
// must never show two half-selected rows (user's report, 21 November).
const LegendRow = memo(function LegendRow({ item, icon, colors, total, compact, index, selected, onActive, onOpen }: RowProps) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const haptic = useHaptics(); // like the parts of the chart (23 November, user's request): stable, the row stays memoised
  const selectable = index !== undefined;
  const share = <View style={[styles.sharePill, { backgroundColor: theme.colors.secondaryContainer }]}>
    <Text variant="labelMedium" style={[styles.number, { color: theme.colors.onSecondaryContainer }]}>{categoryPercent(item.total, total)}</Text>
  </View>;
  return <View nativeID={selectable ? `dashboard-category-${item.key}` : undefined} role="listitem">
    <StateLayerPressable role="button" layerColor={theme.colors.onSurface} radius={radius.control}
      onPress={() => { haptic(); if (selectable) onActive(selected ? null : index); else onOpen?.(item.key); }} aria-pressed={selectable ? selected : undefined}
      accessibilityLabel={`${seriesLabel(item, t)}: ${formatAmount(item.total)}, ${categoryPercent(item.total, total)}`}
      style={[styles.row, compact && styles.compactRow, selected && { backgroundColor: theme.colors.elevation.level3 }, styles.compactCorner, selectionFill]}>
      {/* The category's colour as a small square (the key to the chart) and its icon, with no coloured tile around the icon
          (user's request, 27 November). A series without an icon keeps the square alone. */}
      <View style={[styles.swatch, { backgroundColor: seriesColor(item, colors) }]} />
      <View style={styles.icon}>{icon && <CategoryGlyph icon={icon} size={24} color={theme.colors.onSurfaceVariant} />}</View>
      <Text variant="bodyMedium" numberOfLines={compact ? 1 : undefined} style={compact ? styles.compactLabel : styles.label}>{seriesLabel(item, t)}</Text>
      {compact ? <>
        {/* Fixed right-aligned columns: amounts and shares line up from row to row. */}
        <Text variant="bodyMedium" style={[styles.number, styles.amountColumn]}>{formatAmount(item.total)}</Text>
        {share}
      </> : <View style={styles.numbers}>
        <Text variant="bodyMedium" style={styles.number}>{formatAmount(item.total)}</Text>
        {share}
      </View>}
    </StateLayerPressable>
  </View>;
});

const styles = StyleSheet.create({
  legend: { gap: spacing.sm, minWidth: 0 },
  // With wrap, alignItems centres within each line; alignContent centres the lines in the minimum row height.
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: spacing.sm,
    minHeight: 56, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  table: { flexDirection: 'row', alignItems: 'flex-start', columnGap: spacing.xxl },
  column: { flex: 1, minWidth: 0 },
  compactRow: { minHeight: 56, paddingVertical: spacing.xs, flexWrap: 'nowrap', gap: spacing.md },
  // Rounded like the tile it holds plus its padding (concentric); the selected row lifts to a neutral level, so it does not clash with the
  // tonal share pill or the category colours (user's request, 27 November).
  compactCorner: { borderRadius: radius.control },
  // The compact legend is one box like the grouped rows of the other pages (user's request, 27 November).
  box: { borderWidth: 1, borderRadius: radius.dialog, padding: spacing.sm, overflow: 'hidden' },
  sharePill: { flexShrink: 0, minWidth: 48, alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  compactLabel: { flex: 1, minWidth: 0 },
  amountColumn: { flexShrink: 0, minWidth: 88 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flexGrow: 1, flexBasis: 100, minWidth: 0 },
  numbers: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: spacing.md, marginLeft: 'auto' },
  number: { fontVariant: ['tabular-nums'], textAlign: 'right' },
});
