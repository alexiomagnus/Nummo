import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Card } from '../../components/Card';
import { ListRow, listRowStyles } from '../../components/ListRow';
import type { Category } from '../../domain/category';
import { formatAmountMinor } from '../../domain/expense';
import type { Renewal } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type Props = { renewals: readonly Renewal[]; categories: readonly Category[]; soon: number; days: number };

// Forecast, kept apart from the spending list: these payments have not happened yet, so they are
// not in the totals, the dashboard or the exports.
export function UpcomingRenewals({ renewals, categories, soon, days }: Props) {
  const { colors } = useTheme();
  if (renewals.length === 0) return null;
  return (
    <Card title="Prossimi rinnovi" description={`Pagamenti previsti, non ancora contati nelle spese. Entro ${days} giorni: ${formatAmountMinor(soon)}.`}>
      <View role="list">
        {renewals.map(({ occurrence, previous }, index) => {
          const category = categories.find((entry) => entry.id === occurrence.category_id);
          const changed = occurrence.amount_minor !== previous;
          const details = [`Previsto il ${dateFormat.format(new Date(`${occurrence.date}T00:00:00Z`))}`, category?.label,
            occurrence.recurrence && recurrenceLabels[occurrence.recurrence],
            changed && `cambia da ${formatAmountMinor(previous)}`].filter(Boolean).join(' · ');
          return (
            <ListRow key={occurrence.key} divider={index < renewals.length - 1} icon={category?.icon ?? null} title={occurrence.description} subtitle={details}
              trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.amount, { color: colors.onSurfaceVariant }]}>{formatAmountMinor(occurrence.amount_minor)}</Text>} />
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ amount: { minWidth: 96, textAlign: 'right' } });
