import { useState } from 'react';
import { Button, Dialog, HelperText, Portal, Text } from 'react-native-paper';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import { ExpenseFields } from './ExpenseFields';
import { RecurrencePicker } from './RecurrencePicker';
import type { ExpenseStore } from './expenseStore';
export function ExpenseEditor({ record, categories, store, close }: { record: ExpenseRecord; categories: readonly Category[]; store: ExpenseStore; close: () => void }) {
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
  return <Portal><Dialog visible onDismiss={() => { if (!busy) close(); }} style={{ maxWidth: 540, alignSelf: 'center', width: '90%' }}>
    <Dialog.Title>Modifica {record.recurrence ? 'serie' : 'spesa'}</Dialog.Title>
    <Dialog.Content>
      <ExpenseFields values={draft} errors={errors} categories={categories} disabled={busy}
        onChange={(field, value) => setDraft((d) => ({ ...d, [field]: value }))} onBlur={() => {}} />
      <Button disabled={busy} onPress={() => setDraft((d) => ({ ...d, repeat: !d.repeat }))}>{draft.repeat ? 'Rendi singola' : 'Ripeti questa spesa'}</Button>
      {draft.repeat && <RecurrencePicker value={draft.recurrence} disabled={busy} error={Boolean(errors.recurrence)} onChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))} />}
      <Text variant="bodySmall">La data iniziale resta {record.expense_date}. Modificare una serie cambia tutte le sue occorrenze calcolate. È necessaria una connessione.</Text>
      {Object.values(errors).map((error) => <HelperText key={error} type="error">{error}</HelperText>)}
      {store.error && <HelperText type="error">{store.error}</HelperText>}
    </Dialog.Content>
    <Dialog.Actions><Button disabled={busy} onPress={close}>Annulla</Button><Button disabled={busy} loading={busy} onPress={() => void save()}>Salva modifica</Button></Dialog.Actions>
  </Dialog></Portal>;
}
