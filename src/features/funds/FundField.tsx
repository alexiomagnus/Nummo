import { View } from 'react-native';
import { SelectField } from '../../components/SelectField';
import { noFund, type Fund } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { FundAvatar, NoFundAvatar } from './FundAvatar';

// What the expense form needs to know about a fund: what remains of this month's budget (no balance is shown since
// 16 November 2026).
export type FundChoice = Readonly<{ fund: Fund; remaining: number | null }>;
// Explicit «no fund» choice.
export { noFund };

// Fund paying the expense. Shown only when at least one fund exists, so the form is unchanged for those who do not use
// funds. Nothing is written below it (no remaining or exceeded budget since 17 November); nothing is ever blocked.
export function FundField({ choices, value, error, disabled, narrow, onChange }: {
  choices: readonly FundChoice[]; value: string; error?: string; disabled?: boolean; narrow?: boolean; onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const selected = choices.find((choice) => choice.fund.id === value);
  const options = [
    ...choices.map(({ fund }) => ({ value: fund.id, label: fund.archived ? t("{p0} (archiviato)", { p0: fund.name }) : fund.name, icon: <FundAvatar fund={fund} size={24} /> })),
    { value: noFund, label: t("Nessun fondo"), shortLabel: t("Nessuno"), icon: <NoFundAvatar size={24} /> },
  ];
  return (
    <View>
      <SelectField label={t("Fondo")} options={options} value={selected ? value : value === noFund ? noFund : ''} disabled={disabled} error={error} narrow={narrow} onChange={onChange} />
      {/* No budget line under the field: «Budget residuo del mese» and «Budget del mese superato» were removed on request (17 November). */}
    </View>
  );
}
