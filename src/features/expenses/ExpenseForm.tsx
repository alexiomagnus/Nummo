import { useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useSnackbar } from '../../components/SnackbarHost';
import { layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { Category } from '../../domain/category';
import { ExpenseFields, type BaseField } from './ExpenseFields';
import type { ExpenseStore } from './expenseStore';
import { PromoField } from './PriceSchedule';
import { RepeatField } from './RepeatField';
import { todayInRome } from '../../domain/policy';

type Props = { categories: readonly Category[]; store: ExpenseStore };

export function ExpenseForm({ categories, store }: Props) {
  const theme = useTheme();
  const notify = useSnackbar();
  const size = useSizeClass();
  const { submission } = store;
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  // Remounts the fields after a saved expense, so the «Altra data» field closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  // Locked while sending and while the outcome is uncertain: a retry must resend the same data.
  const busy = submission.status === 'sending' || submission.status === 'uncertain';
  const enabled = store.ready && !busy;

  // The draft is cleared only after a verified confirmation (no sending happens here).
  useEffect(() => {
    if (submission.status !== 'confirmed') return;
    setDraft(newDraft());
    setErrors({});
    setFormKey((key) => key + 1);
    notify('Spesa salvata e confermata da Firestore.');
    store.startNew();
  }, [submission.status]);
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
  };
  // Leaving a field empty is not an error yet: missing values are reported on save.
  const validateField = (field: BaseField) => {
    if (!current[field].trim()) return;
    const result = validateDraft(current, categories);
    setErrors((previous) => ({ ...previous, [field]: result.ok ? undefined : result.errors[field] }));
  };
  const categoryMissing = categories.length === 0 ? 'Crea prima una categoria nella sezione Categorie.' : 'Seleziona una categoria.';
  const save = () => {
    // Today is resolved here, at save time, so a form left open past midnight is not stale.
    const result = validateDraft(current, categories);
    if (!result.ok) {
      setErrors({ ...result.errors, ...(current.categoryId ? {} : { categoryId: categoryMissing }) });
      return;
    }
    if (!current.categoryId) {
      setErrors({ categoryId: categoryMissing });
      return;
    }
    store.submit(result.data);
  };

  const startDate = draft.date || todayInRome();
  const repeat = (
    <View style={styles.repeat}>
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={startDate}
        error={errors.recurrence} disabled={!enabled} onRepeatChange={(value) => update({ repeat: value })}
        onRecurrenceChange={(recurrence) => update({ recurrence })} />
      {draft.repeat && (
        <PromoField value={draft.promo} amount={draft.promoAmount} after={draft.promoAfter} firstAmount={draft.amount}
          recurrence={draft.recurrence} startDate={startDate} disabled={!enabled}
          errors={{ amount: errors.promoAmount, after: errors.promoAfter }} onChange={update} />
      )}
    </View>
  );

  return (
    <Card style={[styles.form, size === 'compact' && styles.formCompact]}>
      <ExpenseFields key={formKey} values={current} errors={errors} categories={categories} disabled={!enabled} categoryRequired withDate split={size !== 'compact'}
        extra={repeat} onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
      {store.error && <HelperText type="error" accessibilityRole="alert">{store.error}</HelperText>}
      {submission.status === 'rejected' && (
        <HelperText type="error" accessibilityRole="alert">{submission.message}</HelperText>
      )}
      <View style={[styles.footer, size === 'compact' && [styles.sticky, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.outlineVariant }]]}>
        {submission.status === 'uncertain' ? (
          <>
            <Text accessibilityRole="alert">
              Conferma non ancora disponibile. Firestore gestisce la sincronizzazione: controlla lo stato e l’elenco prima di inserire nuovamente la spesa.
            </Text>
            <View style={styles.actions}><Button mode="contained" onPress={store.retry}>Verifica sul server</Button></View>
          </>
        ) : (
          <View style={styles.actions}>
            <Button mode="contained" onPress={save} disabled={!enabled} loading={submission.status === 'sending'}
              contentStyle={styles.button} style={[styles.submit, size === 'compact' && styles.full]}>
              {submission.status === 'sending' ? 'In attesa di conferma…' : 'Salva spesa'}
            </Button>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { width: '100%', maxWidth: layout.maxFormPage, padding: spacing.xl, gap: spacing.lg },
  // Compact: the save bar sticks to the bottom of the scrolling area, so it stays above the
  // virtual keyboard (the viewport uses dynamic height) and above the navigation bar.
  sticky: { position: 'sticky', bottom: 0, marginHorizontal: -spacing.lg, marginBottom: -spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, zIndex: 1, borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card } as unknown as ViewStyle,
  formCompact: { padding: spacing.lg, gap: spacing.lg },
  repeat: { gap: spacing.sm },
  footer: { gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  submit: { minWidth: 200 },
  full: { flexGrow: 1 },
  button: { minHeight: layout.controlHeight },
});
