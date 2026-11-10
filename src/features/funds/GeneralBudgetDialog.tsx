import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { leadingIcon } from '../../components/FieldIcon';
import { iconShapes } from '../../components/SvgIcon';
import { parseAmountMinor } from '../../domain/expense';
import { generalBudgetFor, monthOf, sameBudgets, setGeneralBudget, type BudgetChange } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';

type Props = {
  budgets: readonly BudgetChange[];
  month: string;
  today: string;
  ready: boolean;
  error: string | null;
  onSave: (budgets: BudgetChange[]) => Promise<boolean>;
  close: () => void;
};

const amountText = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;

// The optional general monthly budget: one amount for all the spending of the month, independent of the funds. Setting,
// changing or removing it applies from the current month on; closed months keep the budget they had. It blocks nothing.
export function GeneralBudgetDialog({ budgets, today, ready, error, onSave, close }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const current = generalBudgetFor(budgets, monthOf(today));
  const [amount, setAmount] = useState(current !== null ? amountText(current) : '');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = busy || !ready;
  const submit = async (next: BudgetChange[] | null) => {
    if (next === null) { setProblem('Troppe modifiche al budget: il limite è di 24 variazioni.'); return; }
    if (sameBudgets(next, budgets)) { close(); return; }
    setBusy(true);
    try { if (await onSave(next)) close(); } finally { setBusy(false); }
  };
  const save = () => {
    if (blocked) return;
    const minor = parseAmountMinor(amount);
    if (minor === null) { setProblem(amount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo del budget.'); return; }
    setProblem(null);
    void submit(setGeneralBudget(budgets, minor, today));
  };
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{current === null ? t("Imposta un budget mensile") : t("Modifica budget")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {t("Un limite indicativo per tutte le spese del mese, indipendente dai fondi. Non blocca nulla e vale dal mese corrente: i mesi passati restano come sono.")}</Text>
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Importo del budget")} value={amount} inputMode="decimal" placeholder="0,00"
              readOnly={blocked} aria-disabled={blocked} error={Boolean(problem)} left={leadingIcon(iconShapes.euro)}
              onChangeText={(value) => { setAmount(value); setProblem(null); }} />
            {problem && <HelperText type="error" accessibilityRole="alert">{t(problem)}</HelperText>}
          </View>
          {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions style={styles.actions}>
        {current !== null && <View style={styles.remove}><Button mode="text" textColor={colors.error} disabled={blocked}
          onPress={() => void submit(setGeneralBudget(budgets, null, today))}>{t("Rimuovi budget")}</Button></View>}
        <Button style={styles.action} disabled={busy} onPress={close}>{t("Annulla")}</Button>
        <Button mode="contained" style={styles.action} disabled={blocked} loading={busy} onPress={save}>{t("Salva")}</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  actions: { flexWrap: 'wrap', gap: spacing.xs },
  remove: { flex: 1, alignItems: 'flex-start' },
  action: { minWidth: 96, flexShrink: 1 },
});
