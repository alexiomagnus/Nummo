import { View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
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
  return <View style={{ gap: spacing.sm }}>
    {existing ? <Text variant="titleSmall">{t('Periodo di prova gratuito')}</Text>
      : <SwitchRow label={t('Periodo di prova gratuito')} value={enabled} disabled={disabled}
        onChange={(trial) => onChange({ trial, ...(trial && !firstPaymentDate && isValidDate(startDate)
          ? { firstPaymentDate: occurrenceDateAt(startDate, 'monthly', 1) } : {}) })} />}
    {enabled && <>
      <DateField name={t('Primo pagamento')} label={t('Primo pagamento')} value={firstPaymentDate} minDate={dayAfterStart} maxDate={maxFirstPaymentDate}
        error={Boolean(error)} disabled={disabled || locked} onChange={(date) => onChange({ firstPaymentDate: date || todayInRome() })} />
      {locked && <Text variant="bodySmall">{t('La prova è terminata: la data del primo pagamento resta invariata.')}</Text>}
    </>}
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
}
