import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { ListRow } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import type { Fund } from '../../domain/funds';
import { FundAvatar } from '../funds/FundAvatar';
import type { Occurrence } from '../../domain/history';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

// `funds` (archived included): a row whose expense has a fund shows its avatar and name.
// One category (the title names it): rows without its icon and name, only date and fund under the description; the
// header gives count and total, the amount sits on the right at every size (user's request, 21 November: the same
// category and icon on every row were confusing).
// Several categories («Altre»): each row keeps icon and category name.
export function TransactionDetails({ title, items, categories, funds = [], onClose }: {
  title: string; items: readonly Occurrence[]; categories: readonly Category[]; funds?: readonly Fund[]; onClose: () => void;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const fundById = useMemo(() => new Map(funds.map((fund) => [fund.id, fund])), [funds]);
  const compact = useSizeClass() === 'compact';
  const mixed = new Set(items.map((item) => item.category_id ?? '')).size > 1;
  const total = items.reduce((sum, item) => sum + item.amount_minor, 0);
  const count = items.length === 1 ? t('1 transazione') : t('{p0} transazioni', { p0: items.length });
  return <Portal><AppDialog visible detents onDismiss={onClose}>
    <AppDialog.Title>{title}</AppDialog.Title>
    <AppDialog.Content>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {count}{items.length > 0 && <>{' · '}<Text variant="bodyMedium" style={[styles.total, { color: colors.onSurface }]}>{t('Totale: {p0}', { p0: formatAmount(total) })}</Text></>}
      </Text>
    </AppDialog.Content>
    <AppDialog.ScrollArea style={styles.area}><ScrollView>
      {!items.length && <Text>{t('Nessuna spesa')}</Text>}
      {[...items].sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key)).map((item, index) => {
        const category = categories.find(category => category.id === item.category_id);
        const amount = <Text style={{ fontVariant: ['tabular-nums'] }}>{formatAmount(item.amount_minor)}</Text>;
        const fund = fundById.get(item.fund_id ?? '');
        // Date, then the category in another colour, then the fund with its avatar: on one line from medium; on phones the
        // fund has a line of its own under date and category (user's requests, 21 November: briefly beside the category in
        // 278b016, then back below).
        const categoryName = <Text variant="labelMedium" numberOfLines={1} style={[styles.shrink, { color: colors.primary }]}>{category?.label ?? t('Senza categoria')}</Text>;
        const fundMark = fund && <View style={[styles.fund, compact && styles.fundBelow]}>
          <FundAvatar fund={fund} size={16} />
          <Text variant="labelMedium" numberOfLines={1} style={[styles.shrink, { color: colors.onSurfaceVariant }]}>{fund.name}</Text>
        </View>;
        if (!mixed) {
          const fundInline = fund && <View style={styles.fund}>
            <FundAvatar fund={fund} size={16} />
            <Text variant="labelMedium" numberOfLines={1} style={[styles.shrink, { color: colors.onSurfaceVariant }]}>{fund.name}</Text>
          </View>;
          return <ListRow key={item.key} divider={index < items.length - 1} icon={null} iconless title={item.description}
            subtitle={formatDate(item.date)} subtitleExtra={fundInline || undefined} trailing={amount} />;
        }
        const extra = compact ? categoryName : <View style={styles.extra}>{categoryName}{fundMark}</View>;
        return <ListRow key={item.key} divider={index < items.length - 1} icon={category?.icon ?? null} title={item.description}
          subtitle={formatDate(item.date)} subtitleExtra={extra} subtitleBelow={compact ? fundMark : undefined}
          meta={compact ? amount : undefined} trailing={compact ? undefined : amount} />;
      })}
    </ScrollView></AppDialog.ScrollArea>
    {/* No «Chiudi»: the screen's Back closes it (user's request, 23 November). */}
  </AppDialog></Portal>;
}

const styles = StyleSheet.create({
  // Only ListRow draws separators; the area's dividers appear only on an edge that hides rows (AppDialog.ScrollArea).
  area: { minHeight: 0 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, minWidth: 0 },
  fund: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  fundBelow: { marginTop: 2 },
  shrink: { flexShrink: 1, minWidth: 0 },
  total: { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
