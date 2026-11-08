import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import type { Category } from '../../domain/category';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import type { ChartProps } from './charts';
import { seriesColor } from './charts';
import { seriesLabel } from './seriesLabel';
import { categoryPercent as percent } from './categoryPresentation';

export function BarChart({ data, colors, active, onActive, categories }: ChartProps & { categories: readonly Category[] }) {
  const { t, formatAmount } = useI18n();
  return <View style={styles.bars} role="list" accessibilityLabel={t('Barre delle spese per categoria')}>
    {data.series.map((series, index) => {
      const icon = categories.find((category) => category.id === series.key)?.icon;
      const fill = seriesColor(series, colors);
      const share = percent(series.total, data.total);
      return <View key={series.key} role="listitem">
        <StateLayerPressable role="button" layerColor={colors.text} radius={radius.card}
          onPress={() => onActive(active === index ? null : index)} aria-pressed={active === index}
          accessibilityLabel={`${seriesLabel(series, t)}: ${formatAmount(series.total)}, ${share}`}
          style={[styles.barRow, { opacity: active === null || active === index ? 1 : 0.5 }]}>
          <View style={styles.barSummary}>
            <View style={styles.category}>
              {icon && <CategoryGlyph icon={icon} size={24} color={colors.text} />}
              <Text variant="bodyLarge" style={styles.barLabel}>{seriesLabel(series, t)}</Text>
            </View>
            <Text variant="bodyMedium" style={styles.number}>{formatAmount(series.total)} · {share}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.grid }]} aria-hidden>
            <View style={{ height: '100%', width: `${series.total / data.total * 100}%`, backgroundColor: fill }} />
          </View>
        </StateLayerPressable>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bars: { gap: spacing.sm },
  barRow: { padding: spacing.sm, gap: spacing.md, minHeight: 88 },
  barSummary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  category: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexGrow: 1, flexBasis: 120, minWidth: 0 },
  barLabel: { flex: 1, minWidth: 0 },
  track: { height: spacing.xl, borderRadius: radius.pill, overflow: 'hidden' },
  number: { fontVariant: ['tabular-nums'] },
});
