import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import type { Category } from '../../domain/category';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { useI18n } from '../../i18n/I18nProvider';
import { otherCategoriesKey, type Series } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';
import { categoryPercent } from './categoryPresentation';
import { seriesColor, type ChartColors } from './charts';
import { seriesLabel } from './seriesLabel';

type Props = { series: readonly Series[]; others: readonly Series[]; categories: readonly Category[]; total: number; colors: ChartColors;
  active: number | null; onActive: (index: number | null) => void; showSeries?: boolean };

export function CategoryLegend({ series, others, categories, total, colors, active, onActive, showSeries = true }: Props) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const icons = new Map(categories.map((category) => [category.id, category.icon] as const));
  const iconOf = (item: Series) => icons.get(item.key) ?? null;
  const content = (item: Series) => <>
    <View style={[styles.swatch, { backgroundColor: seriesColor(item, colors) }]} />
    {/* Icon before the name it belongs to; the slot is kept empty for synthetic series so names stay aligned. */}
    <View style={styles.icon}>{iconOf(item) && <CategoryGlyph icon={iconOf(item)!} size={24} color={theme.colors.onSurfaceVariant} />}</View>
    <Text variant="bodyMedium" style={styles.label}>{seriesLabel(item, t)}</Text>
    <View style={styles.numbers}>
      <Text variant="bodyMedium" style={styles.number}>{formatAmount(item.total)}</Text>
      <Text variant="bodyMedium" style={[styles.number, { color: theme.colors.onSurfaceVariant }]}>{categoryPercent(item.total, total)}</Text>
    </View>
  </>;
  return <View style={styles.legend}>
    {showSeries && <View role="list" accessibilityLabel={t('Legenda: categorie, importi e percentuali')}>
      {series.map((item, index) => <View key={item.key} nativeID={`dashboard-category-${item.key}`} role="listitem">
        <StateLayerPressable role="button" layerColor={theme.colors.onSurface} radius={radius.card}
          onPress={() => onActive(active === index ? null : index)} aria-pressed={active === index}
          accessibilityLabel={`${seriesLabel(item, t)}: ${formatAmount(item.total)}, ${categoryPercent(item.total, total)}`}
          style={[styles.row, active === index && { backgroundColor: theme.colors.secondaryContainer }]}>
          {content(item)}
        </StateLayerPressable>
      </View>)}
    </View>}
    {others.length > 0 && <>
      <Button mode="text" aria-expanded={expanded} aria-controls={expanded ? 'dashboard-other-categories' : undefined}
        onPress={() => { setExpanded(!expanded); onActive(series.findIndex((item) => item.key === otherCategoriesKey)); }}>
        {expanded ? t('Nascondi dettaglio di Altre') : t('Mostra dettaglio di Altre ({p0})', { p0: others.length })}
      </Button>
      {expanded && <View nativeID="dashboard-other-categories" role="list" accessibilityLabel={t('Categorie incluse in Altre')}>
        {others.map((item) => <View key={item.key} role="listitem" style={styles.row}>{content(item)}</View>)}
      </View>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  legend: { gap: spacing.sm, minWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm,
    minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flexGrow: 1, flexBasis: 100, minWidth: 0 },
  numbers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginLeft: 'auto' },
  number: { fontVariant: ['tabular-nums'], textAlign: 'right' },
});
