import { useI18n } from '../../i18n/I18nProvider';
import { existingCategory } from '../categories/preferredCategories';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Button, compactIconPadding } from '../../components/Button';
import { useSnackbar } from '../../components/SnackbarHost';
import { layout, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { newDraft, validateDraft, type ExpenseDraft, type FieldErrors } from '../../domain/expense';
import type { Category } from '../../domain/category';
import { ExpenseFields, type BaseField } from './ExpenseFields';
import type { ExpenseStore } from './expenseStore';
import { PromoField } from './PriceSchedule';
import { TrialField } from './TrialField';
import { RepeatField } from './RepeatField';
import { todayInRome } from '../../domain/policy';
import { FundField, type FundChoice } from '../funds/FundField';
import { noFund, resolveFund } from '../../domain/funds';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { ScanReceiptDialog } from '../receipts/ScanReceiptDialog';
import { useReceiptAi } from '../receipts/aiSettings';
import type { RankedMerchant } from '../../domain/merchant';

// `fundChoices`: funds that can pay a new expense (active ones); none = the fund field is not shown.
// Categories are created only in the Categories page, never from this form.
type Props = {
  categories: readonly Category[]; store: ExpenseStore; fundChoices?: readonly FundChoice[]; defaultFundId?: string;
  // Preferred category from Settings: used while the draft has none of its own (also after each save).
  defaultCategoryId?: string;
  // Saved merchants ranked by use (suggestions of «Esercente»).
  merchants?: readonly RankedMerchant[];
};


export const ExpenseForm = memo(ExpenseFormView);

const noMerchants: readonly RankedMerchant[] = [];

function ExpenseFormView({ categories, store, fundChoices = [], defaultFundId, defaultCategoryId = '', merchants = noMerchants }: Props) {
  const { t } = useI18n();
  const notify = useSnackbar();
  const size = useSizeClass();
  const { width: windowWidth } = useWindowDimensions();
  const desktop = size === 'expanded';
  // Half of a phone narrower than 380 px cannot hold «Scansiona scontrino» (measured: truncated at 360 px).
  const narrow = size === 'compact' && windowWidth < 380;
  const { submission } = store;
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  // Remounts the fields after a saved expense, so the «Altra data» field closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  // «Scansiona scontrino» exists only once the scan is switched on in Settings (off by default, 21 November).
  const scanEnabled = useReceiptAi().settings.enabled;
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
    notify(submission.request.first_payment_date ? "Abbonamento salvato." : store.local ? "Spesa salvata." : "Spesa salvata e confermata da Firestore.");
    store.startNew();
  }, [submission.status]);
  // A category deleted in the other section simply stops being selected; without one, the preferred category if it exists.
  const categoryId = existingCategory(draft.categoryId, categories) || existingCategory(defaultCategoryId, categories);
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
    const result = validateDraft(current, categories, undefined, funds, merchants);
    setErrors((previous) => ({ ...previous, [field]: result.ok ? undefined : result.errors[field] }));
  };
  const categoryMissing = categories.length === 0 ? "Crea prima una categoria nella sezione Categorie." : "Seleziona una categoria.";
  const save = () => {
    // Today is resolved here, at save time, so a form left open past midnight is not stale.
    const result = validateDraft(current, categories, undefined, funds, merchants);
    if (!result.ok) {
      setErrors({ ...result.errors, ...(current.categoryId ? {} : { categoryId: categoryMissing }), ...fundMissing });
      return;
    }
    if (!current.categoryId || fundMissing.fundId) {
      setErrors({ ...(current.categoryId ? {} : { categoryId: categoryMissing }), ...fundMissing });
      return;
    }
    store.submit(result.data, result.merchant);
  };

  const startDate = draft.date || todayInRome();
  const billingStart = draft.trial && draft.firstPaymentDate ? draft.firstPaymentDate : startDate;
  // One rhythm for the blocks that follow the fund field: recurrence, free trial, promotional price and Save are all
  // spaced like the fund field and the recurrence switch (this gap plus the switch row's own inset).
  const blockGap = desktop ? spacing.lg : spacing.xl;
  const formGap = desktop ? spacing.md : spacing.lg;
  // Fondo follows Categoria: beside it, in halves, from medium; on its own row below it on phones (user's requests,
  // 17 November), where the shorter description keeps «Salva» whole above the navigation.
  const fundField = fundChoices.length > 0 ? <FundField choices={fundChoices} value={fundValue} error={errors.fundId} disabled={!enabled}
    onChange={(fundId) => update({ fundId })} /> : null;
  const repeat = (
    <View style={{ gap: blockGap }}>
      <RepeatField gap={blockGap} repeat={draft.repeat} recurrence={draft.recurrence}
        error={errors.recurrence} disabled={!enabled} onRepeatChange={(value) => update({ repeat: value })}
        onRecurrenceChange={(recurrence) => update({ recurrence })}>
        <TrialField enabled={draft.trial} firstPaymentDate={draft.firstPaymentDate} startDate={startDate}
          error={errors.firstPaymentDate} disabled={!enabled} onChange={update} />
        <PromoField value={draft.promo} amount={draft.promoAmount} after={draft.promoAfter} firstAmount={draft.amount}
          recurrence={draft.recurrence} startDate={billingStart} disabled={!enabled}
          errors={{ amount: errors.promoAmount, after: errors.promoAfter }} onChange={update} />
      </RepeatField>
    </View>
  );

  return (
    <View style={styles.page}>
    <View style={[styles.form, desktop && styles.formDesktop]}>
      {/* A scan only fills the fields below after a review: saving stays on «Salva», with the usual validation. No message
          when the fields are filled (removed on request, 17 November): the filled fields speak for themselves. */}
      {/* Phones: as wide as «Importo» below (same halves and gap as the amount/date row), so both edges line up. */}
      {scanEnabled && <View style={[styles.scan, size === 'compact' && styles.scanCompact]}>
        <Button mode="contained-tonal" disabled={!enabled} onPress={() => setScanning(true)} style={size === 'compact' && styles.scanHalf}
          compact={size === 'compact'} contentStyle={size === 'compact' && compactIconPadding.snug.content} labelStyle={size === 'compact' && compactIconPadding.snug.label}
          accessibilityLabel={t("Scansiona scontrino")}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.receipt} size={size} color={color} />}>{narrow ? t("Scansiona") : t("Scansiona scontrino")}</Button>
        {size === 'compact' && <View style={styles.scanHalf} />}
      </View>}
      {scanEnabled && scanning && <ScanReceiptDialog categories={categories} merchants={merchants} onClose={() => setScanning(false)}
        draft={{ amount: draft.amount, date: draft.date, description: draft.description, merchant: draft.merchant ?? '', categoryId: draft.categoryId }}
        onApply={update} />}
      <ExpenseFields dense={desktop} key={formKey} values={current} errors={errors} categories={categories} dataState={dataState} disabled={!enabled}
        extra={repeat} fund={fundField ?? undefined} fundBelow={size === 'compact'}
        merchant={{ value: draft.merchant ?? '', merchants, error: errors.merchant, onChange: (merchant) => update({ merchant }) }}
        onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
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
          <View style={[styles.actions, { marginTop: blockGap - formGap }]}>
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
  footer: { gap: spacing.md },
  actions: { flexDirection: 'row' },
  scan: { flexDirection: 'row' },
  scanCompact: { gap: spacing.md },
  scanHalf: { flex: 1, minWidth: 0 },
  submit: { flexGrow: 1 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  button: { minHeight: layout.controlHeight },
});
