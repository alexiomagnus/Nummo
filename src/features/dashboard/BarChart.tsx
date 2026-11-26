import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { IconTile } from '../../components/ListRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
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

// From this width of the chart the category cards sit two to a row (user's request, 27 November: one per row left a wide desktop mostly empty).
const twoColumnsFrom = 720;

export function BarChart({ rows, total, colors, categories, onOpen }: {
  rows: readonly RankingRow[]; total: number; colors: ChartColors;
  categories: readonly Category[]; onOpen: (key: string) => void;
}) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const twoColumns = width >= twoColumnsFrom;
  const sorted = rankCategories(rows, 'amount');
  const maximum = Math.max(0, ...sorted.map(row => row.total));
  const icons = new Map(categories.map(category => [category.id, category.icon]));
  return <View style={styles.bars} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <View role="list" accessibilityLabel={t('Barre delle spese per categoria')} style={styles.list}>
      {sorted.map(series => {
        const name = seriesLabel(series, t);
        const amount = formatAmount(series.total);
        const share = categoryPercent(series.total, total);
        return <View key={series.key} role="listitem" style={twoColumns ? styles.half : styles.full}>
          {/* One tonal card per category: icon, name and amount on top; below, the bar (length against the largest
              category) and the share of the total in a fixed pill, so the shares line up from card to card. */}
          <StateLayerPressable role="button" layerColor={theme.colors.onSurface} radius={radius.dialog - 1}
            onPress={() => onOpen(series.key)}
            accessibilityLabel={[name, amount, share].filter(Boolean).join(', ')}
            style={[styles.card, { backgroundColor: cardFill(theme.colors) ?? theme.colors.elevation.level1, borderColor: cardFill(theme.colors) ?? theme.colors.outlineVariant }]}>
            <View style={styles.header}>
              <IconTile icon={icons.get(series.key) ?? null} size={40} />
              <Text variant="titleMedium" numberOfLines={1} style={styles.label}>{name}</Text>
              <Text variant="titleMedium" style={styles.amount}>{amount}</Text>
              <SvgIcon shape={iconShapes.chevronRight} size={24} color={theme.colors.onSurfaceVariant} />
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
  </View>;
}

const styles = StyleSheet.create({
  bars: { gap: spacing.sm },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  full: { width: '100%' },
  half: { width: `calc(50% - ${spacing.md / 2}px)` } as ViewStyle,
  // The box of the grouped rows and cards of the other pages: dialog corner and a 1 px outline on every size (user's request, 27 November).
  card: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.dialog, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { flex: 1, minWidth: 0 },
  amount: { flexShrink: 0, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 16, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' },
  share: { minWidth: 56, height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
