import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { M3Switch } from '../../components/M3Switch';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { recurrenceLabels, type Recurrence } from '../../domain/recurrence';
import { shape, spacing } from '../../theme/tokens';
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

const unit: Record<Recurrence, string> = { weekly: 'ogni settimana', monthly: 'ogni mese', yearly: 'ogni anno' };
const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Shared by the new-expense form and the edit dialog. The frequency appears only while repeating
// is on, followed by a sentence that says exactly what a recurring expense means.
export function RepeatField({ repeat, recurrence, startDate, error, disabled, onRepeatChange, onRecurrenceChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <StateLayerPressable onPress={() => onRepeatChange(!repeat)} disabled={disabled} layerColor={colors.onSurface}
        radius={shape.md} style={styles.toggle} accessibilityRole="switch" aria-checked={repeat} aria-disabled={disabled}
        accessibilityLabel="Spesa ricorrente">
        <View style={styles.text}>
          <Text variant="titleSmall">Spesa ricorrente</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Si ripete nel tempo: abbonamento, affitto, bolletta</Text>
        </View>
        <M3Switch value={repeat} disabled={disabled} />
      </StateLayerPressable>
      {repeat && (
        <View style={styles.options}>
          <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>Frequenza</Text>
          <RecurrencePicker value={recurrence} error={Boolean(error)} disabled={disabled} onChange={onRecurrenceChange} />
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {recurrence
              ? `Si ripete ${unit[recurrence]} dal ${dateFormat.format(new Date(`${startDate}T00:00:00Z`))}. Ogni occorrenza viene contata nelle spese quando arriva la sua data.`
              : `Scegli ogni quanto si ripete (${Object.values(recurrenceLabels).join(', ').toLowerCase()}).`}
          </Text>
        </View>
      )}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  // M3 list item with trailing switch: the whole row is the touch target.
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, gap: 2 },
  options: { gap: spacing.sm, paddingHorizontal: spacing.md },
});
