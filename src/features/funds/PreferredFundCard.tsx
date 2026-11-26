import { ListGroup, RowBody } from '../../components/ActionList';
import { SelectField } from '../../components/SelectField';
import { iconShapes } from '../../components/SvgIcon';
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
    <ListGroup icon={iconShapes.wallet} label={t("Fondo preferito")}>
      <RowBody><SelectField panel label={t("Nuova spesa")} options={options} value={current} onChange={(next) => onChange(next === none ? '' : next)} /></RowBody>
    </ListGroup>
  );
}
