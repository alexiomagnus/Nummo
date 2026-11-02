import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { recurrenceLabels, recurrences, type Recurrence } from '../../domain/recurrence';
import { shape, spacing } from '../../theme/tokens';

type Props = { value: Recurrence | ''; error?: boolean; disabled?: boolean; onChange: (value: Recurrence) => void };

// Material 3 segmented button (single choice).
export function RecurrencePicker({ value, error, disabled, onChange }: Props) {
  const { colors } = useTheme();
  const border = error ? colors.error : colors.outline;
  return (
    <View style={[styles.row, { borderColor: border }]} accessibilityRole="radiogroup" accessibilityLabel="Ricorrenza">
      {recurrences.map((recurrence, index) => {
        const selected = recurrence === value;
        const color = selected ? colors.onSecondaryContainer : colors.onSurface;
        return (
          <StateLayerPressable key={recurrence} disabled={disabled} layerColor={color} onPress={() => onChange(recurrence)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled}
            accessibilityLabel={recurrenceLabels[recurrence]}
            style={[styles.segment, index > 0 && { borderLeftWidth: 1, borderLeftColor: border },
              selected && { backgroundColor: colors.secondaryContainer }]}>
            {selected && <SvgIcon shape={iconShapes.check} size={18} color={color} />}
            <Text variant="labelLarge" style={{ color }}>{recurrenceLabels[recurrence]}</Text>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, borderRadius: shape.full, overflow: 'hidden' },
  segment: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
});
