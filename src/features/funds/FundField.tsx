import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { SelectField } from '../../components/SelectField';
import type { Fund } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { FundAvatar } from './FundAvatar';

// What the expense form needs to know about a fund: its balance now and what remains of this month's budget.
export type FundChoice = Readonly<{ fund: Fund; balance: number; remaining: number | null }>;
// Explicit «no fund» choice (expenses that should not touch any balance).
export const noFund = 'none';

// Fund paying the expense. Shown only when at least one fund exists, so the form is unchanged for those who do not use
// funds. The selected fund's balance and remaining budget are written below the field; nothing is ever blocked.
export function FundField({ choices, value, error, disabled, onChange }: {
  choices: readonly FundChoice[]; value: string; error?: string; disabled?: boolean; onChange: (value: string) => void;
}) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const selected = choices.find((choice) => choice.fund.id === value);
  const options = [
    ...choices.map(({ fund }) => ({ value: fund.id, label: fund.archived ? t("{p0} (archiviato)", { p0: fund.name }) : fund.name, icon: <FundAvatar fund={fund} size={24} /> })),
    { value: noFund, label: t("Nessun fondo") },
  ];
  const over = selected && selected.remaining !== null && selected.remaining < 0;
  return (
    <View>
      <SelectField label={t("Fondo")} options={options} value={selected ? value : value === noFund ? noFund : ''} disabled={disabled} error={error} onChange={onChange} />
      {selected ? <View style={styles.info} aria-live="polite">
        <Text variant="bodySmall" style={{ color: selected.balance < 0 ? colors.error : colors.onSurfaceVariant }}>
          {t("Saldo disponibile: {p0}", { p0: formatAmount(selected.balance) })}</Text>
        {selected.remaining !== null && <Text variant="bodySmall" style={{ color: over ? colors.error : colors.onSurfaceVariant }}>
          {over ? t("Budget del mese superato di {p0}", { p0: formatAmount(-selected.remaining) }) : t("Budget residuo del mese: {p0}", { p0: formatAmount(selected.remaining) })}</Text>}
      </View> : value === noFund ? <HelperText type="info" style={styles.helper}>{t("La spesa non inciderà sul saldo di nessun fondo.")}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  helper: { paddingHorizontal: spacing.md },
});
