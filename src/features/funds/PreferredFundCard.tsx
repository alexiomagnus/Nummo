import { Card } from '../../components/Card';
import { SelectField } from '../../components/SelectField';
import { useI18n } from '../../i18n/I18nProvider';
import { FundAvatar, NoFundAvatar } from './FundAvatar';
import type { SyncedFund } from '../../domain/firestore';

const none = 'none';

// Settings section, shown only with an archive open and at least one active fund: the fund «Nuova spesa» (and the
// registration of a list) starts with. Replaces the «Usa come predefinito» button of the Funds page.
export function PreferredFundCard({ funds, value, onChange }: {
  funds: readonly SyncedFund[]; value: string; onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const options = [
    { value: none, label: t("Nessuno"), icon: <NoFundAvatar size={24} /> },
    ...funds.map((fund) => ({ value: fund.id, label: fund.name, icon: <FundAvatar fund={fund} size={24} /> })),
  ];
  const current = funds.some((fund) => fund.id === value) ? value : none;
  return (
    <Card title={t("Fondo preferito")} style={{ width: '100%' }}>
      <SelectField label={t("Nuova spesa")} options={options} value={current} onChange={(next) => onChange(next === none ? '' : next)} />
    </Card>
  );
}
