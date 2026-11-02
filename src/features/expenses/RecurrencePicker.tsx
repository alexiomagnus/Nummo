import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { recurrenceLabels, recurrences, type Recurrence } from '../../domain/recurrence';

type Props = { value: Recurrence | ''; error?: boolean; disabled?: boolean; onChange: (value: Recurrence) => void };

export function RecurrencePicker({ value, error, disabled, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Ricorrenza">
      {recurrences.map((recurrence) => {
        const selected = recurrence === value;
        const color = selected ? theme.colors.onPrimary : theme.colors.onSurface;
        return (
          <Pressable key={recurrence} disabled={disabled} onPress={() => onChange(recurrence)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled}
            accessibilityLabel={recurrenceLabels[recurrence]}
            style={({ pressed }) => [styles.tile, {
              backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
              borderColor: selected ? theme.colors.primary : error ? theme.colors.error : theme.colors.outline,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            }]}>
            <Text variant="titleMedium" style={[styles.title, { color }]}>{recurrenceLabels[recurrence]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 2, padding: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
});
