import { useI18n } from '../../i18n/I18nProvider';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { recurrenceLabels, recurrences, type Recurrence } from '../../domain/recurrence';

// Short visible labels (one line even with three segments on a phone); the accessible name stays «Settimanale»…
const shortLabels: Record<Recurrence, string> = { weekly: 'Settimana', monthly: 'Mese', yearly: 'Anno' };

type Props = { value: Recurrence | ''; error?: boolean; disabled?: boolean; onChange: (value: Recurrence) => void };

// Frequency of a recurring expense: weekly / monthly / yearly as a Material 3 segmented button.
export function RecurrencePicker({ value, error, disabled, onChange }: Props) {
  const { t } = useI18n();
  // `haptic`: a tap when the frequency changes (user's request, 22 November).
  return <SegmentedButtons haptic label={t("Ricorrenza")} value={value} error={error} disabled={disabled} onChange={onChange}
    options={recurrences.map((recurrence) => ({ value: recurrence, label: t(shortLabels[recurrence]), accessibilityLabel: t(recurrenceLabels[recurrence]) }))} />;
}
