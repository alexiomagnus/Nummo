import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };
type Props<T extends string> = {
  options: readonly Choice<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  // Optional choices (e.g. category) can be cleared by tapping the selected chip again.
  allowDeselect?: boolean;
  label?: string;
  disabled?: boolean;
  // Selected chips show a check instead of their own icon (default). Off: the icon stays.
  showCheck?: boolean;
};

// Material 3 filter chips used as a single-choice group: selected = secondary container + check.
export function ChoiceChips<T extends string>({ options, value, onChange, allowDeselect, label, disabled, showCheck = true }: Props<T>) {
  const { colors } = useTheme();
  // 44 dp everywhere (48+ with the touch slop).
  const height = 44;
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? colors.onSecondaryContainer : colors.onSurfaceVariant;
        return (
          <StateLayerPressable key={option.value} layerColor={color} radius={radius.control} disabled={disabled} hitSlop={{ top: 2, bottom: 2 }}
            onPress={() => onChange(selected && allowDeselect ? '' : option.value)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled}
            accessibilityLabel={`${option.label}${selected ? ', selezionata' : ''}`}
            style={[styles.chip, { minHeight: height }, selected
              ? { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer }
              : { borderColor: colors.outlineVariant }]}>
            {selected && showCheck ? <SvgIcon shape={iconShapes.check} size={18} color={color} /> : option.icon}
            <Text variant="labelLarge" style={[styles.label, { color }]}>{option.label}</Text>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, borderRadius: radius.control, borderWidth: 1,
  },
  label: { flexShrink: 1 },
});
