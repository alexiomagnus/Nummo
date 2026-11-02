import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import { ExpenseFields } from './ExpenseFields';
import { RepeatField } from './RepeatField';
import type { ExpenseStore } from './expenseStore';
export function ExpenseEditor({ record, categories, store, close }: { record: ExpenseRecord; categories: readonly Category[]; store: ExpenseStore; close: () => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<ExpenseDraft>({ amount: `${Math.floor(record.amount_minor / 100)}.${String(record.amount_minor % 100).padStart(2, '0')}`,
    description: record.description, categoryId: record.category_id ?? '', date: record.expense_date, repeat: record.recurrence !== null, recurrence: record.recurrence ?? '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy || !store.update) return;
    const result = validateDraft(draft, categories);
    if (!result.ok) { setErrors(result.errors); return; }
    setBusy(true);
    try { if (await store.update(record, result.data)) close(); } finally { setBusy(false); }
  };
  return <Portal><Dialog visible onDismiss={() => { if (!busy) close(); }} style={{ maxWidth: 560, alignSelf: 'center', width: '92%', maxHeight: '90%' }}>
    <Dialog.Title>Modifica {record.recurrence ? 'serie' : 'spesa'}</Dialog.Title>
    <Dialog.ScrollArea style={{ paddingHorizontal: 24 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy}
        onChange={(field, value) => setDraft((d) => ({ ...d, [field]: value }))} onBlur={() => {}} />
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={record.expense_date} error={errors.recurrence} disabled={busy}
        onRepeatChange={(repeat) => setDraft((d) => ({ ...d, repeat }))} onRecurrenceChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))} />
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>La data iniziale resta {record.expense_date}. Modificare una serie cambia tutte le sue occorrenze calcolate. È necessaria una connessione.</Text>
      {store.error && <HelperText type="error">{store.error}</HelperText>}
    </ScrollView></Dialog.ScrollArea>
    <Dialog.Actions><Button disabled={busy} onPress={close}>Annulla</Button><Button mode="contained" disabled={busy} loading={busy} onPress={() => void save()}>Salva modifica</Button></Dialog.Actions>
  </Dialog></Portal>;
}
