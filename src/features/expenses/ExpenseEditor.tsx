import { paymentStart } from '../../domain/trial';
import { TrialField } from './TrialField';
import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { applyPriceEdit, currentPrice, newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import { todayInRome } from '../../domain/policy';
import { nextRenewal, type PriceChange, type PriceScope } from '../../domain/pricing';
import { isRecurrence } from '../../domain/recurrence';
import { spacing } from '../../theme/tokens';
import { ExpenseFields } from './ExpenseFields';
import { PriceChangeField } from './PriceSchedule';
import type { ExpenseStore } from './expenseStore';
import { FundField, noFund, type FundChoice } from '../funds/FundField';

const amountText = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

// `fundChoices` includes the record's own fund even when archived, so editing never drops it silently.
// `listNote`: the expense registered a shopping list; 'linked' when that list still points at it (deleting it reopens the list).
export function ExpenseEditor({ record, categories, store, close, fundChoices = [], listNote }: { record: ExpenseRecord; categories: readonly Category[]; store: ExpenseStore; close: () => void; fundChoices?: readonly FundChoice[]; listNote?: 'linked' | 'unlinked' }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const today = todayInRome();
  // For a series the amount field is the price of the next renewal; the first payment's price stays untouched.
  const shownAmount = useMemo(() => currentPrice(record, today), [record, today]);
  const [draft, setDraft] = useState<ExpenseDraft>({ ...newDraft(), amount: amountText(shownAmount),
    description: record.description, categoryId: record.category_id ?? '', date: record.expense_date === todayInRome() ? '' : record.expense_date, repeat: record.recurrence !== null, recurrence: record.recurrence ?? '',
    trial: Boolean(record.first_payment_date), firstPaymentDate: record.first_payment_date ?? '',
    fundId: record.fund_id && fundChoices.some((c) => c.fund.id === record.fund_id) ? record.fund_id : fundChoices.length ? noFund : '' });
  const [changes, setChanges] = useState<readonly PriceChange[]>(record.price_changes);
  const [scope, setScope] = useState<PriceScope>('future');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const series = record.recurrence !== null;
  const recurrence = isRecurrence(draft.recurrence) ? draft.recurrence : record.recurrence;
  const next = series && draft.repeat ? nextRenewal(draft.trial ? draft.firstPaymentDate : record.expense_date, recurrence, today) : null;
  const save = async () => {
    if (busy || deleting || !store.update) return;
    const funds = fundChoices.map((choice) => choice.fund);
    const result = validateDraft({ ...draft, fundId: draft.fundId === noFund ? '' : draft.fundId }, categories, undefined, funds);
    const missing = draft.categoryId ? {} : { categoryId: "Seleziona una categoria." };
    if (!result.ok) { setErrors({ ...result.errors, ...missing }); return; }
    if (!draft.categoryId) { setErrors(missing); return; }
    const applied = applyPriceEdit(record, result.data, { shownAmount, scope, changes }, today);
    if (!applied.ok) { setPriceError(applied.error); return; }
    setPriceError(null);
    setBusy(true);
    // The shopping-list link and the products bought are not edited here: they stay as registered.
    const data = { ...applied.data, list_id: record.list_id ?? null, list_items: record.list_items ?? [] };
    try { if (await store.update(record, data)) close(); } finally { setBusy(false); }
  };
  return <Portal><Dialog visible onDismiss={() => { if (!busy && !deleting) close(); }}>
    <Dialog.Title>{record.recurrence ? t("Modifica serie") : t("Modifica spesa")}</Dialog.Title>
    <Dialog.ScrollArea style={{ minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.lg }}>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy}
        extra={fundChoices.length > 0 ? <View style={{ gap: spacing.xs }}>
          <FundField choices={fundChoices} value={draft.fundId} error={errors.fundId} disabled={busy}
            onChange={(fundId) => { setDraft((d) => ({ ...d, fundId })); setErrors((e) => ({ ...e, fundId: undefined })); }} />
          {series && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, paddingHorizontal: spacing.md }}>
            {t("Il fondo vale per tutti i pagamenti della serie, anche quelli già effettuati.")}</Text>}
        </View> : undefined}
        onChange={(field, value) => { setDraft((d) => ({ ...d, [field]: value })); setErrors((e) => ({ ...e, [field]: undefined })); }} onBlur={() => {}} />
      {record.first_payment_date && <TrialField existing enabled firstPaymentDate={draft.firstPaymentDate} startDate={draft.date || today}
        locked={record.first_payment_date <= today} disabled={busy} error={errors.firstPaymentDate}
        onChange={(patch) => { setDraft((d) => ({ ...d, ...patch })); setErrors((e) => ({ ...e, firstPaymentDate: undefined })); }} />}
      {recurrence && <PriceChangeField next={next} shownAmount={shownAmount} typed={draft.amount} scope={scope} changes={changes}
        start={paymentStart({ expense_date: record.expense_date, ...(draft.trial ? { first_payment_date: draft.firstPaymentDate } : {}) })} recurrence={recurrence} disabled={busy} onScope={setScope}
        onRemove={(change) => setChanges((all) => all.filter((item) => item !== change))} />}
      {listNote && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, paddingHorizontal: spacing.md }}>
        {t("Spesa registrata da una lista: i prodotti acquistati restano invariati.")}</Text>}
      {priceError && <HelperText type="error" accessibilityRole="alert">{t(priceError)}</HelperText>}
      {store.error && <HelperText type="error">{t(store.error)}</HelperText>}
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions style={{ flexWrap: 'wrap', gap: spacing.xs }}>
      {store.remove && <View style={{ flex: 1, alignItems: 'flex-start' }}><DeleteAction labeled disabled={busy} onOpenChange={setDeleting}
        name={series ? t("la serie {p0}", { p0: record.description }) : record.description}
        description={[(series ? t("Eliminando questa ricorrenza si elimina l’intera serie. ") : '') + (listNote === 'linked' ? t("La lista collegata tornerà tra quelle attive. ") : '') + t("L’operazione non può essere annullata."), store.error && t(store.error)].filter(Boolean).join('\n\n')}
        onDelete={async () => {
          setBusy(true);
          try {
            const removed = await store.remove!(record);
            if (removed) close();
            return removed;
          } finally { setBusy(false); }
        }} /></View>}
    <Button disabled={busy || deleting} style={{ minWidth: 88 }} onPress={close}>{t("Annulla")}</Button><Button mode="contained" disabled={busy || deleting} loading={busy && !deleting} style={{ minWidth: 88 }} onPress={() => void save()}>{t("Salva")}</Button></Dialog.Actions>
  </Dialog></Portal>;
}
