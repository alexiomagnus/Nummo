import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { MenuSelect } from '../../components/MenuSelect';
import { iconShapes } from '../../components/SvgIcon';
import { allFunds, noFund } from '../../domain/history';
import type { Fund } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';

// «Fondo» filter of the Spese and Analisi pages (a setting turns it on or off): every fund, the expenses with no fund, or
// one fund. Archived funds stay in the list because their expenses are still in the archive. Shown only when there is at
// least one fund; a stored choice for a fund that no longer exists is resolved by the caller (`effectiveFundFilter`).
// `large` (Spese, where it leads the page) uses the larger text of `MenuSelect`; Analisi passes false to match its other fields.
export function FundFilter({ funds, value, onChange, style, large = true }: {
  funds: readonly Fund[]; value: string; onChange: (value: string) => void; style?: StyleProp<ViewStyle>; large?: boolean;
}) {
  const { t } = useI18n();
  const options = useMemo(() => [
    { value: allFunds, label: t("Tutti i fondi") },
    { value: noFund, label: t("Senza fondo") },
    ...[...funds].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
      .map((fund) => ({ value: fund.id, label: fund.archived ? t("{p0} (archiviato)", { p0: fund.name }) : fund.name })),
  ], [funds, t]);
  if (funds.length === 0) return null;
  return <MenuSelect label={t("Fondo")} icon={iconShapes.wallet} options={options} value={value} onChange={onChange} style={style} matchFieldWidth large={large} />;
}
