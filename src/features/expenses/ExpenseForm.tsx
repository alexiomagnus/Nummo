import { useI18n } from '../../i18n/I18nProvider';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Button } from '../../components/Button';
import { useSnackbar } from '../../components/SnackbarHost';
import { layout, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { Category, CategoryIcon } from '../../domain/category';
import { CategoryEditor } from '../categories/CategoryEditor';
import { ExpenseFields, type BaseField } from './ExpenseFields';
import type { ExpenseStore } from './expenseStore';
import { PromoField } from './PriceSchedule';
import { TrialField } from './TrialField';
import { RepeatField } from './RepeatField';
import { todayInRome } from '../../domain/policy';
import { FundField, type FundChoice } from '../funds/FundField';
import { noFund, resolveFund } from '../../domain/funds';

// `fundChoices`: funds that can pay a new expense (active ones); none = the fund field is not shown.
// `onCreateCategory` saves a category (name and icon) and resolves with its ID, null when not saved; `canCreateCategory`
// is false while offline or not ready (the save is a server transaction); `categoryError` is the outcome of the last attempt.
type Props = {
  categories: readonly Category[]; store: ExpenseStore; fundChoices?: readonly FundChoice[]; defaultFundId?: string;
  onCreateCategory?: (name: string, icon: CategoryIcon | null) => Promise<string | null>;
  canCreateCategory?: boolean; categoryError?: string | null;
};


export const ExpenseForm = memo(ExpenseFormView);

function ExpenseFormView({ categories, store, onCreateCategory, canCreateCategory = false, categoryError = null, fundChoices = [], defaultFundId }: Props) {
  const { t } = useI18n();
  const notify = useSnackbar();
  const size = useSizeClass();
  const desktop = size === 'expanded';
  const { submission } = store;
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  // Remounts the fields after a saved expense, so the «Altra data» field closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  // Category dialog opened from the picker; `tried` hides an older error of the Categories page until a save here fails.
  const [creating, setCreating] = useState(false);
  const [tried, setTried] = useState(false);
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
    notify(submission.request.first_payment_date ? "Abbonamento salvato." : "Spesa salvata e confermata da Firestore.");
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
  const categoryMissing = categories.length === 0
    ? (onCreateCategory ? "Crea prima una categoria." : "Crea prima una categoria nella sezione Categorie.") : "Seleziona una categoria.";
  const openCreate = () => { setTried(false); setCreating(true); };
  // The draft (other fields included) stays as it is: only the category changes, and only after the server confirmed it.
  const createCategory = async (name: string, icon: CategoryIcon | null) => {
    setTried(true);
    const id = await onCreateCategory!(name, icon);
    if (!id) return false;
    update({ categoryId: id });
    notify("Categoria creata.");
    return true;
  };
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
  const billingStart = draft.trial && draft.firstPaymentDate ? draft.firstPaymentDate : startDate;
  const repeat = (
    <View style={[styles.repeat, desktop && styles.repeatDesktop]}>
      {fundChoices.length > 0 && <FundField choices={fundChoices} value={fundValue} error={errors.fundId} disabled={!enabled}
        onChange={(fundId) => update({ fundId })} />}
      <RepeatField repeat={draft.repeat} recurrence={draft.recurrence} startDate={startDate}
        error={errors.recurrence} disabled={!enabled} onRepeatChange={(value) => update({ repeat: value })}
        onRecurrenceChange={(recurrence) => update({ recurrence })} />
      {draft.repeat && <TrialField enabled={draft.trial} firstPaymentDate={draft.firstPaymentDate} startDate={startDate}
        error={errors.firstPaymentDate} disabled={!enabled} onChange={update} />}
      {draft.repeat && draft.recurrence && (
        <PromoField value={draft.promo} amount={draft.promoAmount} after={draft.promoAfter} firstAmount={draft.amount}
          recurrence={draft.recurrence} startDate={billingStart} disabled={!enabled}
          errors={{ amount: errors.promoAmount, after: errors.promoAfter }} onChange={update} />
      )}
    </View>
  );

  return (
    <View style={styles.page}>
    <View style={[styles.form, desktop && styles.formDesktop]}>
      <ExpenseFields dense={desktop} key={formKey} values={current} errors={errors} categories={categories} dataState={dataState} disabled={!enabled}
        extra={repeat} onAddCategory={onCreateCategory ? openCreate : undefined} addCategoryDisabled={!canCreateCategory}
        onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
      {creating && <CategoryEditor categories={categories} ready={canCreateCategory} error={tried ? categoryError : null}
        onSave={createCategory} close={() => setCreating(false)} />}
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
              contentStyle={styles.button} labelStyle={styles.label} style={[styles.submit, desktop && styles.submitDesktop]}>
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
  submitDesktop: { flexGrow: 0, minWidth: 192 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  button: { minHeight: layout.controlHeight },
});
