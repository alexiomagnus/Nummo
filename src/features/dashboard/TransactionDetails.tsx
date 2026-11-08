import { ScrollView } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { ListRow } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import type { Occurrence } from '../../domain/history';
import { useI18n } from '../../i18n/I18nProvider';
import { useSizeClass } from '../../theme/useSizeClass';

export function TransactionDetails({ title, items, categories, onClose }: {
  title: string; items: readonly Occurrence[]; categories: readonly Category[]; onClose: () => void;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const compact = useSizeClass() === 'compact';
  return <Portal><AppDialog visible onDismiss={onClose}>
    <AppDialog.Title>{title}</AppDialog.Title>
    <AppDialog.Content>
      <Text variant="titleLarge" style={{ fontWeight: '700' }}>{items.length === 1 ? t('1 transazione') : t('{p0} transazioni', { p0: items.length })}</Text>
    </AppDialog.Content>
    <AppDialog.ScrollArea><ScrollView>
      {!items.length && <Text>{t('Nessuna spesa')}</Text>}
      {[...items].sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key)).map(item => {
        const category = categories.find(category => category.id === item.category_id);
        const amount = <Text style={{ fontVariant: ['tabular-nums'] }}>{formatAmount(item.amount_minor)}</Text>;
        return <ListRow key={item.key} icon={category?.icon ?? null} title={item.description}
          subtitle={formatDate(item.date) + ' · ' + (category?.label ?? t('Senza categoria'))}
          meta={compact ? amount : undefined} trailing={compact ? undefined : amount} />;
      })}
    </ScrollView></AppDialog.ScrollArea>
    <AppDialog.Actions><Button onPress={onClose}>{t('Chiudi')}</Button></AppDialog.Actions>
  </AppDialog></Portal>;
}
