import { useI18n } from '../../i18n/I18nProvider';
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, useTheme } from 'react-native-paper';
import { Disclosure } from '../../components/Disclosure';
import { SwitchRow } from '../../components/SwitchRow';
import type { Recurrence } from '../../domain/recurrence';
import { spacing } from '../../theme/tokens';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  repeat: boolean;
  recurrence: Recurrence | '';
  error?: string;
  disabled?: boolean;
  onRepeatChange: (repeat: boolean) => void;
  onRecurrenceChange: (recurrence: Recurrence) => void;
  // Further option groups of a series (free trial, promotional price), shown under the frequency while repeating.
  children?: ReactNode;
};

// Recurring payment section of the new-expense form: the switch, then (only while repeating) the frequency and the
// optional groups, separated by discreet dividers. Every control lines up with the switch labels (16 dp inset).
export function RepeatField({ repeat, recurrence, error, disabled, onRepeatChange, onRecurrenceChange, children }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const groups = Children.toArray(children);
  return (
    <View style={styles.section} role="group" aria-label={t("Pagamento ricorrente")}>
      <SwitchRow label={t("Ricorrente")} value={repeat} disabled={disabled} onChange={onRepeatChange} />
      <Disclosure open={repeat} style={styles.body}>
        <View style={styles.frequency}>
          <RecurrencePicker value={recurrence} error={Boolean(error)} disabled={disabled} onChange={onRecurrenceChange} />
          {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
        </View>
        {groups.map((group, index) => (
          <Fragment key={index}>
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            {group}
          </Fragment>
        ))}
      </Disclosure>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  body: { gap: spacing.sm },
  frequency: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  helper: { paddingHorizontal: 0 },
  divider: { height: 1, marginHorizontal: spacing.lg },
});
