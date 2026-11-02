import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, useTheme } from 'react-native-paper';
import { M3Switch } from '../../components/M3Switch';
import { newDraft, validateDraft, type ExpenseData, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { Category } from '../../domain/category';
import { ExpenseFields, type BaseField } from './ExpenseFields';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  categories: readonly Category[];
  ready: boolean;
  error: string | null;
  onSave: (data: ExpenseData) => boolean;
};

export function ExpenseForm({ categories, ready, error, onSave }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  // A category deleted in the other section simply stops being selected.
  const categoryId = categories.some((category) => category.id === draft.categoryId) ? draft.categoryId : '';
  const current = { ...draft, categoryId };

  const update = (patch: Partial<ExpenseDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const field of Object.keys(patch) as (keyof ExpenseDraft)[]) delete next[field];
      if ('repeat' in patch) delete next.recurrence;
      return next;
    });
    setSaved(false);
  };
  // Leaving a field empty is not an error yet: missing values are reported on save.
  const validateField = (field: BaseField) => {
    if (!current[field].trim()) return;
    const result = validateDraft(current, categories);
    setErrors((previous) => ({ ...previous, [field]: result.ok ? undefined : result.errors[field] }));
  };
  const save = () => {
    // Today is resolved here, at save time, so a form left open past midnight is not stale.
    const result = validateDraft(current, categories);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (onSave(result.data)) {
      setDraft(newDraft());
      setErrors({});
      setSaved(true);
    }
  };

  return (
    <Surface elevation={1} style={styles.form}>
      <Text variant="titleLarge" accessibilityRole="header">Nuova spesa</Text>
      <ExpenseFields values={current} errors={errors} categories={categories} disabled={!ready}
        onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
      <View style={styles.group}>
        <Pressable onPress={() => update({ repeat: !draft.repeat })} disabled={!ready}
          style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: theme.colors.surfaceVariant }]}
          accessibilityRole="switch" aria-checked={draft.repeat} aria-disabled={!ready}
          accessibilityLabel="Ripeti questa spesa">
          <View style={styles.toggleText}>
            <Text variant="titleSmall">Ripeti questa spesa</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Abbonamenti, affitto, bollette: verrà contata a ogni scadenza da oggi in poi.
            </Text>
          </View>
          <M3Switch value={draft.repeat} disabled={!ready} />
        </Pressable>
        {draft.repeat && (
          <RecurrencePicker value={draft.recurrence} error={Boolean(errors.recurrence)} disabled={!ready}
            onChange={(recurrence) => update({ recurrence })} />
        )}
        {errors.recurrence && <HelperText type="error" accessibilityRole="alert">{errors.recurrence}</HelperText>}
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <View style={styles.group}>
        <Button mode="contained" onPress={save} disabled={!ready} contentStyle={styles.button}>Salva spesa</Button>
        {saved && <Text accessibilityLiveRegion="polite" style={styles.center}>Spesa salvata.</Text>}
        <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          Le spese sono salvate solo in questo browser: Google Sheets non è ancora collegato.
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, borderRadius: 28, gap: 20 },
  group: { gap: 12 },
  // M3 list item with trailing switch: the whole row is the touch target.
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56,
    marginHorizontal: -12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
  },
  toggleText: { flex: 1, gap: 2 },
  button: { minHeight: 48 },
  center: { textAlign: 'center' },
});
