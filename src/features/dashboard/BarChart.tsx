import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTile } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import { barTransition } from '../../theme/motion';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import { rankCategories, type RankingRow } from './insights';
import { seriesColor, type ChartColors } from './charts';
import { seriesLabel } from './seriesLabel';
import { categoryPercent } from './categoryPresentation';

export function BarChart({ rows, total, colors, categories, onOpen }: {
  rows: readonly RankingRow[]; total: number; colors: ChartColors;
  categories: readonly Category[]; onOpen: (key: string) => void;
}) {
  const { t, formatAmount, locale } = useI18n();
  const sorted = rankCategories(rows, 'amount');
  const maximum = Math.max(0, ...sorted.map(row => row.total));
  const icons = new Map(categories.map(category => [category.id, category.icon]));
  return <View style={styles.bars}>
    <View role="list" accessibilityLabel={t('Barre delle spese per categoria')}>
      {sorted.map(series => {
        const name = seriesLabel(series, t);
        const amount = formatAmount(series.total);
        const share = categoryPercent(series.total, total);
        const change = series.change !== null && Math.abs(series.change) >= 1
          ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: 'always' }).format(series.change) + '%' : null;
        return <View key={series.key} role="listitem">
          <StateLayerPressable role="button" layerColor={colors.text} radius={radius.card}
            onPress={() => onOpen(series.key)}
            accessibilityLabel={[name, amount, share, change && t('{p0} rispetto al periodo precedente', { p0: change })].filter(Boolean).join(', ')}
            style={styles.barRow}>
            <View style={styles.header}>
              <IconTile icon={icons.get(series.key) ?? null} />
              <Text variant="bodyLarge" style={styles.label}>{name}</Text>
              <Text variant="titleMedium" style={styles.amount}>{amount}</Text>
            </View>
            <View style={styles.detail}>
              <View style={[styles.track, { backgroundColor: colors.grid }]} aria-hidden>
                <View style={[styles.fill, { backgroundColor: seriesColor(series, colors),
                  transform: [{ scaleX: maximum > 0 ? series.total / maximum : 0 }] } as ViewStyle, barTransition]} />
              </View>
              <View style={styles.footer}>
                <Text variant="bodySmall" style={{ color: colors.muted }}>{share}</Text>
                {change && <Text variant="bodySmall" style={{ color: colors.muted }}>{change}</Text>}
              </View>
            </View>
          </StateLayerPressable>
        </View>;
      })}
    </View>
    <Text variant="bodyMedium" style={[styles.hint, { color: colors.muted }]}>{t('Tocca una barra per vedere i dettagli della categoria.')}</Text>
  </View>;
}

const styles = StyleSheet.create({
  bars: { gap: spacing.sm },
  hint: { marginTop: spacing.md },
  barRow: { padding: spacing.sm, gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, minWidth: 0 },
  amount: { flexShrink: 0, fontWeight: '600', fontVariant: ['tabular-nums'] },
  detail: { marginLeft: 36 + spacing.sm, gap: spacing.sm, paddingBottom: spacing.sm },
  track: { height: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
});
