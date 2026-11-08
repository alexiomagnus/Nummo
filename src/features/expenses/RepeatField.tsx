import { useI18n } from '../../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { HelperText } from 'react-native-paper';
import { SwitchRow } from '../../components/SwitchRow';
import type { Recurrence } from '../../domain/recurrence';
import { spacing } from '../../theme/tokens';
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
  const { t } = useI18n();
  return (
    <View style={styles.group}>
      <SwitchRow label={t("Ricorrente")} value={repeat} disabled={disabled} onChange={onRepeatChange} />
      {repeat && (
        <View style={styles.options}>
          <RecurrencePicker value={recurrence} error={Boolean(error)} disabled={disabled} onChange={onRecurrenceChange} />
        </View>
      )}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  options: { paddingHorizontal: spacing.lg },
});
