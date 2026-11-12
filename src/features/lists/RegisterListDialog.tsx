import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { SwitchRow } from '../../components/SwitchRow';
import type { Category } from '../../domain/category';
import { newDraft, validateDraft, type ExpenseData, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { purchasedNames } from '../../domain/shoppingList';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { ExpenseFields } from '../expenses/ExpenseFields';
import { FundField, noFund, type FundChoice } from '../funds/FundField';

type Props = {
  list: SyncedList; items: readonly SyncedListItem[]; categories: readonly Category[];
  // Use the current draft, without waiting for the total's queued write to reach the list listener.
  initialAmount: string;
  fundChoices: readonly FundChoice[]; defaultFundId: string; canRegister: boolean;
  onRegister: (expenseId: string, data: ExpenseData, remember: boolean) => Promise<boolean>;
  // After a confirmed registration, when the user asked to move what was not bought into a new list (with the list's
  // default category after this registration).
  onMoveRemaining: (categoryId: string | null) => void;
  onCreateCategory?: () => void;
  error: string | null;
  close: () => void;
};

// Confirmation before registering a list: the same fields as a new expense (amount required, date, description and
// category, fund) prefilled from the list. The expense ID is chosen once per opening: pressing again after an uncertain
// outcome repeats the same transaction, which finds the expense already saved instead of adding a second one.
export function RegisterListDialog({ list, initialAmount, items, categories, fundChoices, defaultFundId, canRegister, onRegister, onMoveRemaining, onCreateCategory, error, close }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const expenseId = useRef(crypto.randomUUID()).current;
  const bought = purchasedNames(items);
  const remaining = items.length - bought.length;
  const category = list.category_id && categories.some((c) => c.id === list.category_id) ? list.category_id : '';
  const fund = fundChoices.some((c) => c.fund.id === defaultFundId) ? defaultFundId : fundChoices.length ? noFund : '';
  const [draft, setDraft] = useState<ExpenseDraft>({ ...newDraft(), amount: initialAmount, description: list.name, categoryId: category, fundId: fund });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [remember, setRemember] = useState(list.category_id === null);
  const [move, setMove] = useState(remaining > 0);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const register = async () => {
    if (busy || !canRegister) return;
    const result = validateDraft({ ...draft, fundId: draft.fundId === noFund ? '' : draft.fundId }, categories, undefined, fundChoices.map((c) => c.fund));
    const missing = draft.categoryId ? {} : { categoryId: "Seleziona una categoria." };
    if (!result.ok || !draft.categoryId) { setErrors({ ...(result.ok ? {} : result.errors), ...missing }); return; }
    setBusy(true);
    setAttempted(true);
    try {
      const keep = remember && result.data.category_id !== list.category_id;
      const saved = await onRegister(expenseId, { ...result.data, list_id: list.id, list_items: bought }, keep);
      if (saved) {
        if (move && remaining > 0) onMoveRemaining(keep ? result.data.category_id : list.category_id);
        close();
      }
    } finally { setBusy(false); }
  };
  return <Portal><Dialog visible onDismiss={() => { if (!busy) close(); }}>
    <Dialog.Title>{t("Registra spesa")}</Dialog.Title>
    <Dialog.ScrollArea style={styles.area}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {bought.length === 0 ? t("Nessun prodotto spuntato: la spesa conterrà solo il totale.")
          : t("Verrà creata una sola spesa con {p0} di {p1} prodotti acquistati. La lista sarà archiviata.", { p0: bought.length, p1: items.length })}</Text>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy} onCreateCategory={onCreateCategory}
        extra={fundChoices.length > 0 ? <FundField choices={fundChoices} value={draft.fundId} error={errors.fundId} disabled={busy}
          onChange={(fundId) => { setDraft((d) => ({ ...d, fundId })); setErrors((e) => ({ ...e, fundId: undefined })); }} /> : undefined}
        onChange={(field, value) => { setDraft((d) => ({ ...d, [field]: value })); setErrors((e) => ({ ...e, [field]: undefined })); }} onBlur={() => {}} />
      {draft.categoryId !== '' && draft.categoryId !== list.category_id && (
        <SwitchRow label={t("Usa come categoria predefinita della lista")} supporting={t("Anche le sue copie la proporranno.")}
          value={remember} disabled={busy} onChange={setRemember} />
      )}
      {remaining > 0 && (
        <SwitchRow label={t("Sposta i non acquistati in una nuova lista")} supporting={remaining === 1 ? t("1 prodotto non spuntato") : t("{p0} prodotti non spuntati", { p0: remaining })}
          value={move} disabled={busy} onChange={setMove} />
      )}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {attempted && error && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        {t("Puoi riprovare: se la spesa era già stata salvata non verrà duplicata.")}</Text>}
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions style={styles.actions}>
      <Button disabled={busy} onPress={close}>{t("Annulla")}</Button>
      <Button mode="contained" disabled={busy || !canRegister} loading={busy} onPress={() => void register()}>{attempted && error ? t("Riprova") : t("Registra")}</Button>
    </Dialog.Actions>
  </Dialog></Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm, gap: spacing.lg },
  actions: { flexWrap: 'wrap', gap: spacing.xs },
});
