import { View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { DateField } from '../../components/DateField';
import { todayInRome } from '../../domain/policy';
import { recurrenceLabels, type CalendarChange, type Recurrence } from '../../domain/recurrence';
import { maxFirstPaymentDate } from '../../domain/trial';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { formatLongDate } from './PriceSchedule';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  value: Recurrence;
  // Frequency in force for the next renewal, the next renewal itself (null = none left) and the day after today.
  current: Recurrence;
  next: { index: number; date: string } | null;
  firstDate: string;
  tomorrow: string;
  // A switch already saved that has not taken effect yet.
  pending: CalendarChange | null;
  error?: string;
  disabled?: boolean;
  onChange: (patch: { frequency?: Recurrence; firstDate?: string }) => void;
};

// Frequency of an existing series (issue #9). Only future renewals change: payments already made keep their dates. With
// no payment made yet (a trial still running) the frequency simply replaces the saved one; afterwards the calendar
// restarts on the chosen date, which is proposed as the renewal that was already planned.
export function FrequencyField({ value, current, next, firstDate, tomorrow, pending, error, disabled, onChange }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  if (!next) return null;
  const changed = value !== current;
  return <View style={{ gap: spacing.sm }}>
    <Text variant="titleSmall">{t("Frequenza")}</Text>
    <RecurrencePicker value={value} disabled={disabled} onChange={(frequency) => onChange({ frequency })} />
    {pending && <Text variant="bodySmall" style={muted}>
      {t("Cambio già programmato: dal {p0}, {p1}.", { p0: formatLongDate(pending.start, locale), p1: t(recurrenceLabels[pending.recurrence]).toLocaleLowerCase(locale) })}</Text>}
    {changed && next.index > 0 && <>
      <DateField name={t("Primo rinnovo con la nuova frequenza")} label={t("Primo rinnovo con la nuova frequenza")} value={firstDate}
        minDate={tomorrow} maxDate={maxFirstPaymentDate} error={Boolean(error)} disabled={disabled}
        onChange={(date) => onChange({ firstDate: date || todayInRome() })} />
      <Text variant="bodySmall" style={muted}>{t("I pagamenti già effettuati restano invariati: la nuova frequenza vale dai rinnovi successivi.")}</Text>
    </>}
    {changed && next.index === 0 && <Text variant="bodySmall" style={muted}>{t("Nessun pagamento è ancora stato effettuato: la nuova frequenza vale dal primo pagamento.")}</Text>}
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
}
