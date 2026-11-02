import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { formatAmountMinor } from '../../domain/expense';
import {
  maxDescriptionLength, newRecurringDraft, recurrenceLabels, recurrences, validateRecurring,
  type RecurringData, type RecurringDraft, type RecurringErrors, type RecurringExpense,
} from '../../domain/recurring';

type Props = {
  items: readonly RecurringExpense[];
  error: string | null;
  ready: boolean;
  onCreate: (data: RecurringData) => boolean;
  onDelete: (id: string) => boolean;
};

export function RecurringExpenses({ items, error, ready, onCreate, onDelete }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<RecurringDraft>(() => newRecurringDraft());
  const [errors, setErrors] = useState<RecurringErrors>({});
  const [created, setCreated] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const change = (field: keyof RecurringDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setCreated(false);
  };
  const validateField = (field: keyof RecurringDraft) => {
    const result = validateRecurring(draft);
    setErrors((current) => ({ ...current, [field]: result.ok ? undefined : result.errors[field] }));
  };
  const create = () => {
    const result = validateRecurring(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (onCreate(result.data)) {
      setDraft(newRecurringDraft());
      setErrors({});
      setCreated(true);
    }
  };

  return (
    <Surface elevation={1} style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">Spese ricorrenti</Text>
      <View>
        <TextInput label="Importo (€)" value={draft.amount} onChangeText={(value) => change('amount', value)}
          mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)}
          onBlur={() => validateField('amount')} accessibilityLabel="Importo ricorrente in euro" disabled={!ready} />
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
      </View>
      <View>
        <TextInput label="Descrizione" value={draft.description} onChangeText={(value) => change('description', value)}
          mode="outlined" error={Boolean(errors.description)} onBlur={() => validateField('description')}
          accessibilityLabel="Descrizione della spesa ricorrente" disabled={!ready} />
        <HelperText type={errors.description ? 'error' : 'info'} accessibilityRole={errors.description ? 'alert' : undefined}>
          {errors.description ?? `${Array.from(draft.description).length} / ${maxDescriptionLength} caratteri`}
        </HelperText>
      </View>
      <View style={styles.group}>
        <Text variant="labelLarge">Ricorrenza</Text>
        <SegmentedButtons value={draft.recurrence} onValueChange={(value) => change('recurrence', value)}
          buttons={recurrences.map((value) => ({ value, label: recurrenceLabels[value], disabled: !ready }))} />
        {errors.recurrence && <HelperText type="error" accessibilityRole="alert">{errors.recurrence}</HelperText>}
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <Button mode="contained" onPress={create} disabled={!ready} contentStyle={styles.button}>Aggiungi spesa ricorrente</Button>
      {created && <Text accessibilityLiveRegion="polite">Spesa ricorrente aggiunta.</Text>}
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.label}>
              <Text variant="bodyLarge">{item.description}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatAmountMinor(item.amount_minor)} · {recurrenceLabels[item.recurrence]}
              </Text>
            </View>
            {pendingDelete === item.id ? (
              <View style={styles.actions}>
                <Button onPress={() => setPendingDelete(null)}>Annulla</Button>
                <Button mode="contained-tonal" accessibilityLabel={`Conferma eliminazione di ${item.description}`}
                  onPress={() => { if (onDelete(item.id)) setPendingDelete(null); }}>Elimina</Button>
              </View>
            ) : (
              <Button accessibilityLabel={`Elimina ${item.description}`}
                onPress={() => { setPendingDelete(item.id); setCreated(false); }}>Elimina</Button>
            )}
          </View>
        ))}
        {ready && items.length === 0 && <Text>Non hai ancora aggiunto spese ricorrenti.</Text>}
      </View>
      <Text variant="bodySmall">Le spese ricorrenti sono conservate in questo browser e non vengono ancora registrate automaticamente nel foglio.</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 28, gap: 16 },
  group: { gap: 10 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  label: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 4 },
  button: { minHeight: 48 },
});
