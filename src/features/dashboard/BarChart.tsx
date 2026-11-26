import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { IconTile } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import { barTransition } from '../../theme/motion';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { useI18n } from '../../i18n/I18nProvider';
import { cardFill } from '../../theme/theme';
import { radius, spacing } from '../../theme/tokens';
import { rankCategories, type RankingRow } from './insights';
import { seriesColor, type ChartColors } from './charts';
import { seriesLabel } from './seriesLabel';
import { categoryPercent } from './categoryPresentation';

export function BarChart({ rows, total, colors, categories, onOpen }: {
  rows: readonly RankingRow[]; total: number; colors: ChartColors;
  categories: readonly Category[]; onOpen: (key: string) => void;
}) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const sorted = rankCategories(rows, 'amount');
  const maximum = Math.max(0, ...sorted.map(row => row.total));
  const icons = new Map(categories.map(category => [category.id, category.icon]));
  return <View style={styles.bars}>
    <View role="list" accessibilityLabel={t('Barre delle spese per categoria')} style={styles.list}>
      {sorted.map(series => {
        const name = seriesLabel(series, t);
        const amount = formatAmount(series.total);
        const share = categoryPercent(series.total, total);
        return <View key={series.key} role="listitem">
          {/* One tonal card per category: icon, name and amount on top; below, the bar (length against the largest
              category) and the share of the total in a fixed pill, so the shares line up from card to card. */}
          <StateLayerPressable role="button" layerColor={theme.colors.onSurface} radius={radius.card}
            onPress={() => onOpen(series.key)}
            accessibilityLabel={[name, amount, share].filter(Boolean).join(', ')}
            style={[styles.card, { backgroundColor: cardFill(theme.colors) ?? theme.colors.elevation.level1 }]}>
            <View style={styles.header}>
              <IconTile icon={icons.get(series.key) ?? null} size={40} />
              <Text variant="titleMedium" numberOfLines={1} style={styles.label}>{name}</Text>
              <Text variant="titleMedium" style={styles.amount}>{amount}</Text>
            </View>
            <View style={styles.meter}>
              <View style={[styles.track, { backgroundColor: colors.grid }]} aria-hidden>
                <View style={[styles.fill, { backgroundColor: seriesColor(series, colors),
                  transform: [{ scaleX: maximum > 0 ? series.total / maximum : 0 }] } as ViewStyle, barTransition]} />
              </View>
              <View style={[styles.share, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSecondaryContainer, fontVariant: ['tabular-nums'] }}>{share}</Text>
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
  list: { gap: spacing.md },
  hint: { marginTop: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { flex: 1, minWidth: 0 },
  amount: { flexShrink: 0, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 16, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' },
  share: { minWidth: 56, height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
