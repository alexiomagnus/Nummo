import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type Segment<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  options: readonly Segment<T>[];
  value: T | '';
  onChange: (value: T) => void;
  label: string;
  error?: boolean;
  disabled?: boolean;
};

// Material 3 segmented button (single choice): 40 dp pill, 1 dp outline, selected segment = secondary container + check.
export function SegmentedButtons<T extends string>({ options, value, onChange, label, error, disabled }: Props<T>) {
  const { colors } = useTheme();
  const border = error ? colors.error : colors.outline;
  return (
    <View style={[styles.row, { borderColor: border }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const color = selected ? colors.onSecondaryContainer : colors.onSurface;
        return (
          <StateLayerPressable key={option.value} disabled={disabled} layerColor={color} onPress={() => onChange(option.value)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} accessibilityLabel={option.label}
            style={[styles.segment, index > 0 && { borderLeftWidth: 1, borderLeftColor: border },
              selected && { backgroundColor: colors.secondaryContainer }]}>
            {selected && <SvgIcon shape={iconShapes.check} size={18} color={color} />}
            <Text variant="labelLarge" numberOfLines={1} style={{ color }}>{option.label}</Text>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', height: 40, borderWidth: 1, borderRadius: radius.pill, overflow: 'hidden' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
});
