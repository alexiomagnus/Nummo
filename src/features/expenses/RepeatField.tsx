import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { M3Switch } from '../../components/M3Switch';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import type { Recurrence } from '../../domain/recurrence';
import { radius, spacing } from '../../theme/tokens';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  repeat: boolean;
  recurrence: Recurrence | '';
  // ISO date of the first occurrence (the chosen date, or today for a new expense).
  startDate: string;
  error?: string;
  disabled?: boolean;
  onRepeatChange: (repeat: boolean) => void;
  onRecurrenceChange: (recurrence: Recurrence) => void;
};


// Shared by the new-expense form and the edit dialog. The frequency appears only while repeating
// is on, followed by a sentence that says exactly what a recurring expense means.
export function RepeatField({ repeat, recurrence, startDate, error, disabled, onRepeatChange, onRecurrenceChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <StateLayerPressable onPress={() => onRepeatChange(!repeat)} disabled={disabled} layerColor={colors.onSurface}
        radius={radius.control} style={styles.toggle} accessibilityRole="switch" aria-checked={repeat} aria-disabled={disabled}
        accessibilityLabel="Ricorrente">
        <View style={styles.text}>
          <Text variant="titleSmall">Ricorrente</Text>
        </View>
        <M3Switch value={repeat} disabled={disabled} />
      </StateLayerPressable>
      {repeat && (
        <View style={styles.options}>
          <RecurrencePicker value={recurrence} error={Boolean(error)} disabled={disabled} onChange={onRecurrenceChange} />
        </View>
      )}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  // M3 list item with trailing switch: the whole row is the touch target.
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 48, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  text: { flex: 1 },
  options: { gap: spacing.sm },
});
