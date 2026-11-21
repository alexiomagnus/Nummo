import { useI18n } from '../../i18n/I18nProvider';
import { existingCategory } from '../categories/preferredCategories';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button, compactIconPadding } from '../../components/Button';
import { useHaptics } from '../../components/Haptics';
import { layout, radius, spacing } from '../../theme/tokens';
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
import { draftOfTemplate, type TemplateRecord } from '../../domain/template';
import { TemplatePicker } from '../templates/TemplatePicker';

// `fundChoices`: funds that can pay a new expense (active ones); none = the fund field is not shown.
// Categories are created only in the Categories page, never from this form.
type Props = {
  categories: readonly Category[]; store: ExpenseStore; fundChoices?: readonly FundChoice[]; defaultFundId?: string;
  // Preferred category from Settings: used while the draft has none of its own (also after each save).
  defaultCategoryId?: string;
  // Saved merchants ranked by use (suggestions of «Esercente»).
  merchants?: readonly RankedMerchant[];
  // Saved templates, given only when they are turned on (Templates page): the button beside the scan fills the form from one.
  templates?: readonly TemplateRecord[];
};


export const ExpenseForm = memo(ExpenseFormView);

const noMerchants: readonly RankedMerchant[] = [];

function ExpenseFormView({ categories, store, fundChoices = [], defaultFundId, defaultCategoryId = '', merchants = noMerchants, templates }: Props) {
  const { t } = useI18n();
  const haptic = useHaptics();
  const { colors } = useTheme();
  const size = useSizeClass();
  const { width: windowWidth } = useWindowDimensions();
  const desktop = size === 'expanded';
  // Half of a phone narrower than 380 px cannot hold «Scansiona scontrino» (measured: truncated at 360 px).
  const narrow = size === 'compact' && windowWidth < 380;
  const { submission } = store;
  // Saved templates, given only when they are turned on (Templates page); the button needs at least one.
  const templateShown = templates !== undefined && templates.length > 0;
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  // Remounts the fields after a saved expense, so the «Altra data» field closes with the cleared draft.
  const [formKey, setFormKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  // The template the form was filled from (shown in its field until saved); the fields stay editable afterwards.
  const [templateId, setTemplateId] = useState('');
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
    setTemplateId('');
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
  // Fills amount (when the template has one), date, description, merchant (when it has one), category and fund; never the
  // repeat. A category or fund that no longer exists is left to be chosen again.
  const applyTemplate = (id: string) => {
    const template = templates?.find((item) => item.id === id);
    setTemplateId(template ? template.id : '');
    if (!template) return;
    const filled = draftOfTemplate(template);
    const fundId = template.fund_id === null ? noFund : fundChoices.some((choice) => choice.fund.id === template.fund_id) ? template.fund_id : '';
    update({ description: filled.description, date: filled.date, categoryId: existingCategory(template.category_id, categories), fundId,
      ...(template.amount_minor !== null ? { amount: filled.amount } : {}), ...(template.merchant ? { merchant: template.merchant } : {}) });
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
      {/* «Scansiona scontrino» and «Template» share the first row (user's request, 21 November: the Template field above the
          repeat pushed «Salva» under the navigation on phones); without the scan, Template takes its place. Phones: each as
          wide as «Importo» and «Data» below (same halves and gap as the amount/date row), so the edges line up. */}
      {(scanEnabled || templateShown) && <View style={[styles.scan, size === 'compact' && styles.scanCompact]}>
        {scanEnabled && <Button mode="contained-tonal" disabled={!enabled} onPress={() => setScanning(true)} style={size === 'compact' && styles.scanHalf}
          compact={size === 'compact'} contentStyle={size === 'compact' && compactIconPadding.snug.content} labelStyle={size === 'compact' && compactIconPadding.snug.label}
          accessibilityLabel={t("Scansiona scontrino")}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.receipt} size={size} color={color} />}>{narrow ? t("Scansiona") : t("Scansiona scontrino")}</Button>}
        {templateShown && <TemplatePicker templates={templates} categories={categories} disabled={!enabled}
          value={templates.some((item) => item.id === templateId) ? templateId : ''} onChange={applyTemplate}
          style={size === 'compact' && styles.scanHalf} />}
        {size === 'compact' && !(scanEnabled && templateShown) && <View style={styles.scanHalf} />}
      </View>}
      {/* Templates turned on but none saved yet: the button cannot appear, so say why. */}
      {templates && templates.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Il campo Template compare quando crei un template nella pagina Templates.")}</Text>}
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
            <Button mode="contained" onPress={() => { haptic(); save(); }} disabled={!enabled} loading={submission.status === 'sending'}
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
  scan: { flexDirection: 'row', gap: spacing.md },
  scanCompact: {},
  scanHalf: { flex: 1, minWidth: 0 },
  // Full width at every size, pill-shaped (user's request, 21 November): the one primary action of the page.
  submit: { flexGrow: 1, borderRadius: radius.pill },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  button: { minHeight: layout.controlHeight },
});
