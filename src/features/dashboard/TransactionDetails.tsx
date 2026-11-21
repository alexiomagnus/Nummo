import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { CancelButton, dialogActionsRow } from '../../components/Button';
import { ListRow } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import type { Fund } from '../../domain/funds';
import { FundAvatar } from '../funds/FundAvatar';
import type { Occurrence } from '../../domain/history';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

// `funds` (archived included): a row whose expense has a fund shows its avatar and name after the category.
export function TransactionDetails({ title, items, categories, funds = [], onClose }: {
  title: string; items: readonly Occurrence[]; categories: readonly Category[]; funds?: readonly Fund[]; onClose: () => void;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const fundById = useMemo(() => new Map(funds.map((fund) => [fund.id, fund])), [funds]);
  const compact = useSizeClass() === 'compact';
  return <Portal><AppDialog visible onDismiss={onClose}>
    <AppDialog.Title>{title}</AppDialog.Title>
    <AppDialog.Content>
      <Text variant="bodyMedium">{items.length === 1 ? t('1 transazione') : t('{p0} transazioni', { p0: items.length })}</Text>
    </AppDialog.Content>
    <AppDialog.ScrollArea style={styles.area}><ScrollView>
      {!items.length && <Text>{t('Nessuna spesa')}</Text>}
      {[...items].sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key)).map((item, index) => {
        const category = categories.find(category => category.id === item.category_id);
        const amount = <Text style={{ fontVariant: ['tabular-nums'] }}>{formatAmount(item.amount_minor)}</Text>;
        const fund = fundById.get(item.fund_id ?? '');
        // Date, then the category in another colour, then the fund with its avatar, on one line at every size (user's
        // requests, 21 November: on phones the fund first had a line of its own); long names end with «…».
        const categoryName = <Text variant="labelMedium" numberOfLines={1} style={[styles.shrink, { color: colors.primary }]}>{category?.label ?? t('Senza categoria')}</Text>;
        const fundMark = fund && <View style={styles.fund}>
          <FundAvatar fund={fund} size={16} />
          <Text variant="labelMedium" numberOfLines={1} style={[styles.shrink, { color: colors.onSurfaceVariant }]}>{fund.name}</Text>
        </View>;
        const extra = <View style={styles.extra}>{categoryName}{fundMark}</View>;
        return <ListRow key={item.key} divider={index < items.length - 1} icon={category?.icon ?? null} title={item.description}
          subtitle={formatDate(item.date)} subtitleExtra={extra}
          meta={compact ? amount : undefined} trailing={compact ? undefined : amount} />;
      })}
    </ScrollView></AppDialog.ScrollArea>
    <AppDialog.Actions style={dialogActionsRow}><CancelButton onPress={onClose}>{t("Chiudi")}</CancelButton></AppDialog.Actions>
  </AppDialog></Portal>;
}

const styles = StyleSheet.create({
  // Only ListRow draws separators; the area's dividers appear only on an edge that hides rows (AppDialog.ScrollArea).
  area: { minHeight: 0 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, minWidth: 0 },
  fund: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  shrink: { flexShrink: 1, minWidth: 0 },
});
