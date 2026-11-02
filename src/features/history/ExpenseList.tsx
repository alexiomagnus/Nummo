import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { formatAmountMinor } from '../../domain/expense';
import { searchAndSort, sortLabels, sortOptions, type Occurrence, type SortOption } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { ChoiceChips } from '../../components/ChoiceChips';
import { DeleteAction } from '../../components/DeleteAction';
import { PixelIcon } from '../../components/PixelIcon';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  onDelete: (expenseId: string) => boolean;
};

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

export function ExpenseList({ occurrences, categories, error, onDelete }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const results = useMemo(() => searchAndSort(occurrences, query, sort), [occurrences, query, sort]);
  const total = results.reduce((sum, item) => sum + item.amount_minor, 0);

  return (
    <Surface elevation={1} style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">Le tue spese</Text>
      <TextInput label="Cerca per nome" accessibilityLabel="Cerca per nome" mode="outlined" value={query}
        onChangeText={setQuery} autoCorrect={false}
        right={query ? <TextInput.Affix text="✕" onPress={() => setQuery('')} accessibilityLabel="Cancella ricerca" /> : undefined} />
      <ChoiceChips label="Ordina per" value={sort} onChange={(value) => value && setSort(value)}
        options={sortOptions.map((value) => ({ value, label: sortLabels[value] }))} />
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.onSurfaceVariant }}>
        {results.length === 1 ? '1 spesa' : `${results.length} spese`} · {formatAmountMinor(total)}
      </Text>
      <View style={styles.list}>
        {results.map((item) => {
          const category = categories.find((entry) => entry.id === item.category_id);
          const details = [formatDate(item.date), category?.label, item.recurrence && recurrenceLabels[item.recurrence]]
            .filter(Boolean).join(' · ');
          return (
            <View key={item.key} style={[styles.row, { borderColor: theme.colors.outlineVariant }]}>
              <View style={[styles.icon, { backgroundColor: theme.colors.surfaceVariant }]}>
                {category?.icon && <PixelIcon icon={category.icon} size={24} />}
              </View>
              <View style={styles.text}>
                <Text variant="bodyLarge" numberOfLines={1}>{item.description}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{details}</Text>
              </View>
              <Text variant="titleMedium" style={styles.amount}>{formatAmountMinor(item.amount_minor)}</Text>
              <DeleteAction name={item.recurrence ? `la serie ${item.description}` : item.description}
                onDelete={() => onDelete(item.expenseId)} />
            </View>
          );
        })}
        {occurrences.length === 0 && <Text>Non hai ancora salvato spese.</Text>}
        {occurrences.length > 0 && results.length === 0 && <Text>Nessuna spesa corrisponde alla ricerca.</Text>}
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Le spese ricorrenti compaiono una volta per ogni scadenza fino a oggi; eliminandone una si elimina l’intera serie.
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 28, gap: 16 },
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
