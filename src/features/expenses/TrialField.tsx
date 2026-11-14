import { StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Disclosure } from '../../components/Disclosure';
import { DateField } from '../../components/DateField';
import { SwitchRow } from '../../components/SwitchRow';
import { isValidDate } from '../../domain/expense';
import { todayInRome } from '../../domain/policy';
import { occurrenceDateAt } from '../../domain/recurrence';
import { maxFirstPaymentDate } from '../../domain/trial';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';

type Props = {
  enabled: boolean; firstPaymentDate: string; startDate: string; error?: string;
  disabled?: boolean; existing?: boolean; locked?: boolean;
  onChange: (patch: { trial?: boolean; firstPaymentDate?: string }) => void;
};

// The date is canonical. No second persisted duration that could disagree with it.
export function TrialField({ enabled, firstPaymentDate, startDate, error, disabled, existing, locked, onChange }: Props) {
  const { t } = useI18n();
  const dayAfterStart = isValidDate(startDate) ? new Date(Date.parse(startDate + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10) : todayInRome();
  const date = <DateField name={t('Primo pagamento')} label={t('Primo pagamento')} value={firstPaymentDate} minDate={dayAfterStart} maxDate={maxFirstPaymentDate}
    error={Boolean(error)} disabled={disabled || locked} onChange={(value) => onChange({ firstPaymentDate: value || todayInRome() })} />;
  // Edit dialog: a saved trial cannot be removed, so a title replaces the switch and the date follows it directly.
  if (existing) return <View style={styles.group}>
    <Text variant="titleSmall">{t('Prova gratuita')}</Text>
    {date}
    {locked && <Text variant="bodySmall">{t('La prova è terminata: la data del primo pagamento resta invariata.')}</Text>}
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
  // New series: the switch, and the date (aligned with the switch label) only while the trial is on.
  return <View>
    <SwitchRow label={t('Prova gratuita')} value={enabled} disabled={disabled}
      onChange={(trial) => onChange({ trial, ...(trial && !firstPaymentDate && isValidDate(startDate)
        ? { firstPaymentDate: occurrenceDateAt(startDate, 'monthly', 1) } : {}) })} />
    <Disclosure open={enabled} style={styles.inset}>
      {date}
      {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
    </Disclosure>
  </View>;
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  inset: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  helper: { paddingHorizontal: 0 },
});
