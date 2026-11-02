import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };
type Props<T extends string> = {
  options: readonly Choice<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  // Optional choices (e.g. category) can be cleared by tapping the selected chip again.
  allowDeselect?: boolean;
  label?: string;
};

// The app-wide single-choice style: selected = filled primary + bold, no checkmark.
export function ChoiceChips<T extends string>({ options, value, onChange, allowDeselect, label }: Props<T>) {
  const theme = useTheme();
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? theme.colors.onPrimary : theme.colors.onSurface;
        return (
          <Pressable key={option.value} onPress={() => onChange(selected && allowDeselect ? '' : option.value)}
            accessibilityRole="radio" aria-checked={selected}
            accessibilityLabel={`${option.label}${selected ? ', selezionata' : ''}`}
            style={({ pressed }) => [styles.chip, {
              backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
              borderColor: selected ? theme.colors.primary : theme.colors.outline,
              opacity: pressed ? 0.8 : 1,
            }]}>
            {option.icon}
            <Text variant="labelLarge" style={[styles.label, { color, fontWeight: selected ? '700' : '500' }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5,
  },
  label: { flexShrink: 1 },
});
