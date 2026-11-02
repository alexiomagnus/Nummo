import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import { expensePolicy } from '../../domain/policy';
import { todayInRome } from '../../domain/policy';
import type { Category } from '../../domain/category';

export function ExpenseForm({ categories, onManageCategories }: {
  categories: readonly Category[];
  onManageCategories: () => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [editingDate, setEditingDate] = useState(false);

  const change = (field: keyof ExpenseDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const validateField = (field: keyof ExpenseDraft) => {
    const result = validateDraft(draft, categories);
    setErrors((current) => ({ ...current, [field]: result.ok ? undefined : result.errors[field] }));
  };

  return (
    <Surface elevation={1} style={styles.form}>
      <Text variant="titleLarge" accessibilityRole="header">Nuova spesa</Text>
      <View>
        <TextInput label="Importo (€)" value={draft.amount} onChangeText={(value) => change('amount', value)}
          mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)}
          onBlur={() => validateField('amount')}
          accessibilityLabel="Importo in euro" style={styles.amount} />
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
      </View>
      <View style={styles.group}>
        <Text variant="labelLarge">Categoria</Text>
        <View style={styles.categories}>
          {categories.map((category) => (
            <Chip key={category.id} selected={draft.categoryId === category.id} showSelectedCheck={false} showSelectedOverlay
              accessibilityLabel={`${category.label}${draft.categoryId === category.id ? ', selezionata' : ''}`}
              onPress={() => change('categoryId', category.id)} style={styles.chip}>
              {category.label}
            </Chip>
          ))}
        </View>
        {categories.length === 0 && <Text variant="bodyMedium">Crea la tua prima categoria per organizzare le spese.</Text>}
        <Button onPress={onManageCategories}>{categories.length === 0 ? 'Crea categoria' : 'Gestisci categorie'}</Button>
        {errors.categoryId && <HelperText type="error" accessibilityRole="alert">{errors.categoryId}</HelperText>}
      </View>
      {editingDate ? (
        <View style={styles.group}>
          <TextInput label="Data (AAAA-MM-GG)" value={draft.date} onChangeText={(value) => change('date', value)}
            mode="outlined" accessibilityLabel="Data della spesa, anno mese giorno"
            onBlur={() => validateField('date')} error={Boolean(errors.date)} />
          {errors.date && <HelperText type="error" accessibilityRole="alert">{errors.date}</HelperText>}
          <Button onPress={() => { change('date', ''); setEditingDate(false); }}>Usa data automatica</Button>
        </View>
      ) : <Button onPress={() => { change('date', todayInRome()); setEditingDate(true); }}>Modifica data</Button>}
      <View>
        <TextInput label="Nota (facoltativa)" value={draft.note} onChangeText={(value) => change('note', value)}
          mode="outlined" multiline numberOfLines={3} accessibilityLabel="Nota facoltativa"
          onBlur={() => validateField('note')}
          error={Boolean(errors.note)} />
        <HelperText type={errors.note ? 'error' : 'info'} accessibilityRole={errors.note ? 'alert' : undefined}>
          {errors.note ?? `${Array.from(draft.note).length} / ${expensePolicy.maxNoteLength} caratteri`}
        </HelperText>
      </View>
      <View style={styles.group}>
        <Button mode="contained" disabled contentStyle={styles.button}>Salva spesa</Button>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>Collegamento a Google Sheets non ancora disponibile.</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, borderRadius: 28, gap: 20 },
  amount: { fontSize: 32 },
  group: { gap: 10 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 44, maxWidth: '100%', justifyContent: 'center' },
  button: { minHeight: 48 },
});
