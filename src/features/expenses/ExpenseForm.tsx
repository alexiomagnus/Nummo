import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Button } from '../../components/Button';
import { useSnackbar } from '../../components/SnackbarHost';
import { layout, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { Category } from '../../domain/category';
import { ExpenseFields, type BaseField } from './ExpenseFields';
import type { ExpenseStore } from './expenseStore';
import { PromoField } from './PriceSchedule';
import { RepeatField } from './RepeatField';
import { todayInRome } from '../../domain/policy';
import { FundField, noFund, type FundChoice } from '../funds/FundField';

// `fundChoices`: funds that can pay a new expense (active ones); none = the fund field is not shown.
type Props = { categories: readonly Category[]; store: ExpenseStore; onCreateCategory?: () => void; fundChoices?: readonly FundChoice[]; defaultFundId?: string };

// The draft keeps '' until the user picks a fund: the default fund (if still available) applies meanwhile, also after a save.
export function resolveFund(chosen: string, choices: readonly FundChoice[], defaultFundId = ''): string {
  if (chosen) return chosen;
  return choices.some((choice) => choice.fund.id === defaultFundId) ? defaultFundId : '';
}

export function ExpenseForm({ categories, store, onCreateCategory, fundChoices = [], defaultFundId }: Props) {
  const { t } = useI18n();
  const notify = useSnackbar();
  const size = useSizeClass();
  const desktop = size === 'expanded';
  const { submission } = store;
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  // Remounts the fields after a saved expense, so the «Altra data» field closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  // Locked while sending and while the outcome is uncertain: a retry must resend the same data.
  const busy = submission.status === 'sending' || submission.status === 'uncertain';
  const dataState = store.ready ? 'ready' : store.error ? 'error' : 'loading';
  const enabled = dataState === 'ready' && !busy;

  // The draft is cleared only after a verified confirmation (no sending happens here).
  useEffect(() => {
    if (submission.status !== 'confirmed') return;
    setDraft(newDraft());
    setErrors({});
    setFormKey((key) => key + 1);
    notify("Spesa salvata e confermata da Firestore.");
    store.startNew();
  }, [submission.status]);
  // A category deleted in the other section simply stops being selected.
  const categoryId = categories.some((category) => category.id === draft.categoryId) ? draft.categoryId : '';
  // Likewise a fund archived or deleted elsewhere; «Nessun fondo» stays an explicit choice.
  const pickedFund = resolveFund(draft.fundId, fundChoices, defaultFundId);
  const fundValue = pickedFund === noFund || fundChoices.some((choice) => choice.fund.id === pickedFund) ? pickedFund : '';
  const current = { ...draft, categoryId, fundId: fundValue === noFund ? '' : fundValue };
  const funds = fundChoices.map((choice) => choice.fund);
  const fundMissing = fundChoices.length > 0 && fundValue === '' ? { fundId: "Scegli il fondo che paga la spesa, oppure Nessun fondo." } : {};

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
    const result = validateDraft(current, categories, undefined, funds);
    setErrors((previous) => ({ ...previous, [field]: result.ok ? undefined : result.errors[field] }));
  };
  const categoryMissing = categories.length === 0 ? "Crea prima una categoria nella sezione Categorie." : "Seleziona una categoria.";
  const save = () => {
    // Today is resolved here, at save time, so a form left open past midnight is not stale.
    const result = validateDraft(current, categories, undefined, funds);
    if (!result.ok) {
      setErrors({ ...result.errors, ...(current.categoryId ? {} : { categoryId: categoryMissing }), ...fundMissing });
      return;
    }
    if (!current.categoryId || fundMissing.fundId) {
      setErrors({ ...(current.categoryId ? {} : { categoryId: categoryMissing }), ...fundMissing });
      return;
    }
    store.submit(result.data);
  };

  const startDate = draft.date || todayInRome();
  const repeat = (
    <View style={[styles.repeat, desktop && styles.repeatDesktop]}>
      {fundChoices.length > 0 && <FundField choices={fundChoices} value={fundValue} error={errors.fundId} disabled={!enabled}
        onChange={(fundId) => update({ fundId })} />}
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={startDate}
        error={errors.recurrence} disabled={!enabled} onRepeatChange={(value) => update({ repeat: value })}
        onRecurrenceChange={(recurrence) => update({ recurrence })} />
      {draft.repeat && draft.recurrence && (
        <PromoField value={draft.promo} amount={draft.promoAmount} after={draft.promoAfter} firstAmount={draft.amount}
          recurrence={draft.recurrence} startDate={startDate} disabled={!enabled}
          errors={{ amount: errors.promoAmount, after: errors.promoAfter }} onChange={update} />
      )}
    </View>
  );

  return (
    <View style={styles.page}>
    <View style={[styles.form, desktop && styles.formDesktop]}>
      <ExpenseFields dense={desktop} key={formKey} values={current} errors={errors} categories={categories} dataState={dataState} disabled={!enabled}
        extra={repeat} onCreateCategory={onCreateCategory} onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
      {store.error && <HelperText type="error" accessibilityRole="alert">{t(store.error)}</HelperText>}
      {submission.status === 'rejected' && (
        <HelperText type="error" accessibilityRole="alert">{t(submission.message)}</HelperText>
      )}
      {/* Save follows all fields in the scroll flow, including expanded recurrence and price options. */}
      <View style={styles.footer}>
        {submission.status === 'uncertain' ? (
          <>
            <Text accessibilityRole="alert">
              {t("Conferma non ancora disponibile: controlla lo stato e l’elenco prima di inserire di nuovo la spesa.")}</Text>
            <View style={styles.actions}><Button mode="contained" onPress={store.retry}>{t("Verifica sul server")}</Button></View>
          </>
        ) : (
          <View style={styles.actions}>
            <Button mode="contained" onPress={save} disabled={!enabled} loading={submission.status === 'sending'}
              contentStyle={styles.button} labelStyle={styles.label} style={styles.submit}>
              {submission.status === 'sending' ? t("In attesa di conferma…") : t("Salva")}
            </Button>
          </View>
        )}
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%' },
  form: { width: '100%', gap: spacing.lg },
  formDesktop: { gap: spacing.md },
  repeatDesktop: { gap: spacing.lg },
  repeat: { gap: spacing.xl },
  footer: { gap: spacing.md },
  actions: { flexDirection: 'row', marginTop: spacing.sm },
  submit: { flexGrow: 1 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  button: { minHeight: layout.controlHeight },
});
