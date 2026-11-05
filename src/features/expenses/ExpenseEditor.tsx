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
import { layout, radius } from '../../theme/tokens';
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
    description: record.description, categoryId: record.category_id ?? '', date: record.expense_date, repeat: record.recurrence !== null, recurrence: record.recurrence ?? '' });
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
    if (!result.ok) { setErrors(result.errors); return; }
    const applied = applyPriceEdit(record, result.data, { shownAmount, scope, changes }, today);
    if (!applied.ok) { setPriceError(applied.error); return; }
    setPriceError(null);
    setBusy(true);
    try { if (await store.update(record, applied.data)) close(); } finally { setBusy(false); }
  };
  return <Portal><Dialog visible onDismiss={() => { if (!busy) close(); }} style={{ maxWidth: layout.maxForm, alignSelf: 'center', width: '92%', maxHeight: '90%', borderRadius: radius.dialog }}>
    <Dialog.Title>Modifica {record.recurrence ? 'serie' : 'spesa'}</Dialog.Title>
    <Dialog.ScrollArea style={{ paddingHorizontal: 24 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy}
        onChange={(field, value) => setDraft((d) => ({ ...d, [field]: value }))} onBlur={() => {}} />
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={record.expense_date} error={errors.recurrence} disabled={busy}
        onRepeatChange={(repeat) => setDraft((d) => ({ ...d, repeat }))} onRecurrenceChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))} />
      {recurrence && <PriceChangeField next={next} shownAmount={shownAmount} typed={draft.amount} scope={scope} changes={changes}
        start={record.expense_date} recurrence={recurrence} disabled={busy} onScope={setScope}
        onRemove={(change) => setChanges((all) => all.filter((item) => item !== change))} />}
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>La data iniziale resta {record.expense_date}. Descrizione, categoria e frequenza di una serie valgono per tutte le sue occorrenze. È necessaria una connessione.</Text>
      {priceError && <HelperText type="error" accessibilityRole="alert">{priceError}</HelperText>}
      {store.error && <HelperText type="error">{store.error}</HelperText>}
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions><Button disabled={busy} onPress={close}>Annulla</Button><Button mode="contained" disabled={busy} loading={busy} onPress={() => void save()}>Salva modifica</Button></Dialog.Actions>
  </Dialog></Portal>;
}
