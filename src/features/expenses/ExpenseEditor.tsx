import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { applyPriceEdit, currentPrice, newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import { todayInRome } from '../../domain/policy';
import { nextRenewal, type PriceChange, type PriceScope } from '../../domain/pricing';
import { isRecurrence } from '../../domain/recurrence';
import { layout, radius, spacing } from '../../theme/tokens';
import { ExpenseFields } from './ExpenseFields';
import { PriceChangeField } from './PriceSchedule';
import { RepeatField } from './RepeatField';
import type { ExpenseStore } from './expenseStore';

const amountText = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

export function ExpenseEditor({ record, categories, store, close }: { record: ExpenseRecord; categories: readonly Category[]; store: ExpenseStore; close: () => void }) {
  const { colors } = useTheme();
  const today = todayInRome();
  // For a series the amount field is the price of the next renewal; the first payment's price stays untouched.
  const shownAmount = useMemo(() => currentPrice(record, today), [record, today]);
  const [draft, setDraft] = useState<ExpenseDraft>({ ...newDraft(), amount: amountText(shownAmount),
    description: record.description, categoryId: record.category_id ?? '', date: record.expense_date === todayInRome() ? '' : record.expense_date, repeat: record.recurrence !== null, recurrence: record.recurrence ?? '' });
  const [changes, setChanges] = useState<readonly PriceChange[]>(record.price_changes);
  const [scope, setScope] = useState<PriceScope>('future');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const series = record.recurrence !== null;
  const recurrence = isRecurrence(draft.recurrence) ? draft.recurrence : record.recurrence;
  const next = series && draft.repeat ? nextRenewal(record.expense_date, recurrence, today) : null;
  const save = async () => {
    if (busy || !store.update) return;
    const result = validateDraft(draft, categories);
    const missing = draft.categoryId ? {} : { categoryId: 'Seleziona una categoria.' };
    if (!result.ok) { setErrors({ ...result.errors, ...missing }); return; }
    if (!draft.categoryId) { setErrors(missing); return; }
    const applied = applyPriceEdit(record, result.data, { shownAmount, scope, changes }, today);
    if (!applied.ok) { setPriceError(applied.error); return; }
    setPriceError(null);
    setBusy(true);
    try { if (await store.update(record, applied.data)) close(); } finally { setBusy(false); }
  };
  return <Portal><Dialog visible onDismiss={() => { if (!busy) close(); }} style={{ maxWidth: layout.maxForm, alignSelf: 'center', width: '92%', maxHeight: '90%', borderRadius: radius.dialog }}>
    <Dialog.Title>{record.recurrence ? 'Modifica serie' : 'Modifica spesa'}</Dialog.Title>
    <Dialog.ScrollArea style={{ paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.lg }}>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy}
        onChange={(field, value) => { setDraft((d) => ({ ...d, [field]: value })); setErrors((e) => ({ ...e, [field]: undefined })); }} onBlur={() => {}} />
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={draft.date || today} error={errors.recurrence} disabled={busy}
        onRepeatChange={(repeat) => setDraft((d) => ({ ...d, repeat }))} onRecurrenceChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))} />
      {recurrence && <PriceChangeField next={next} shownAmount={shownAmount} typed={draft.amount} scope={scope} changes={changes}
        start={record.expense_date} recurrence={recurrence} disabled={busy} onScope={setScope}
        onRemove={(change) => setChanges((all) => all.filter((item) => item !== change))} />}
      {series && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Le modifiche valgono per tutte le occorrenze.</Text>}
      {priceError && <HelperText type="error" accessibilityRole="alert">{priceError}</HelperText>}
      {store.error && <HelperText type="error">{store.error}</HelperText>}
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions><Button disabled={busy} style={{ minWidth: 88 }} onPress={close}>Annulla</Button><Button mode="contained" disabled={busy} loading={busy} style={{ minWidth: 88 }} onPress={() => void save()}>Salva</Button></Dialog.Actions>
  </Dialog></Portal>;
}
