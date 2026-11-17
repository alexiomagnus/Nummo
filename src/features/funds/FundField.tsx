import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SelectField } from '../../components/SelectField';
import { noFund, type Fund } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { FundAvatar, NoFundAvatar } from './FundAvatar';

// What the expense form needs to know about a fund: what remains of this month's budget (no balance is shown since
// 16 November 2026).
export type FundChoice = Readonly<{ fund: Fund; remaining: number | null }>;
// Explicit «no fund» choice.
export { noFund };

// Fund paying the expense. Shown only when at least one fund exists, so the form is unchanged for those who do not use
// funds. The selected fund's remaining budget is written below the field; nothing is ever blocked.
export function FundField({ choices, value, error, disabled, narrow, onChange }: {
  choices: readonly FundChoice[]; value: string; error?: string; disabled?: boolean; narrow?: boolean; onChange: (value: string) => void;
}) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const selected = choices.find((choice) => choice.fund.id === value);
  const options = [
    ...choices.map(({ fund }) => ({ value: fund.id, label: fund.archived ? t("{p0} (archiviato)", { p0: fund.name }) : fund.name, icon: <FundAvatar fund={fund} size={24} /> })),
    { value: noFund, label: t("Nessun fondo"), shortLabel: t("Nessuno"), icon: <NoFundAvatar size={24} /> },
  ];
  const over = selected && selected.remaining !== null && selected.remaining < 0;
  return (
    <View>
      <SelectField label={t("Fondo")} options={options} value={selected ? value : value === noFund ? noFund : ''} disabled={disabled} error={error} narrow={narrow} onChange={onChange} />
      {/* Only a budget already exceeded is said here: «Budget residuo del mese» was removed on request (17 November). */}
      {over ? <View style={styles.info} aria-live="polite">
        <Text variant="bodySmall" style={{ color: colors.error }}>{t("Budget del mese superato di {p0}", { p0: formatAmount(-selected.remaining!) })}</Text>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
});
