import { useI18n } from '../../i18n/I18nProvider';
import { SegmentedButtons } from '../../components/SegmentedButtons';
import { recurrenceLabels, recurrences, type Recurrence } from '../../domain/recurrence';

type Props = { value: Recurrence | ''; error?: boolean; disabled?: boolean; onChange: (value: Recurrence) => void };

// Frequency of a recurring expense: weekly / monthly / yearly as a Material 3 segmented button.
export function RecurrencePicker({ value, error, disabled, onChange }: Props) {
  const { t } = useI18n();
  return <SegmentedButtons label={t("Ricorrenza")} value={value} error={error} disabled={disabled} onChange={onChange}
    options={recurrences.map((recurrence) => ({ value: recurrence, label: t(recurrenceLabels[recurrence]) }))} />;
}
