import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { useKeyboardOpen } from '../../components/AppShell';
import { Button } from '../../components/Button';
import { reserveScrollPadding } from '../../theme/viewport';
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

type Props = { categories: readonly Category[]; store: ExpenseStore; onCreateCategory?: () => void };

export function ExpenseForm({ categories, store, onCreateCategory }: Props) {
  const { t } = useI18n();
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
  const dataState = store.ready ? 'ready' : store.error ? 'error' : 'loading';
  const enabled = dataState === 'ready' && !busy;
  // Compact: the save bar sticks to the bottom of the page. While the keyboard is open it goes back to the end of the
  // form, so it cannot cover a field in the little room left above the keyboard (it stays reachable by scrolling).
  const keyboard = useKeyboardOpen();
  const sticky = size === 'compact' && !keyboard;
  const footerRef = useRef<ComponentRef<typeof View>>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  // A sticky bar covers what the browser scrolls into view: reserve its height on the page's scroll container.
  useEffect(() => {
    const element = footerRef.current as unknown as Parameters<typeof reserveScrollPadding>[0];
    if (!sticky || !element || typeof getComputedStyle === 'undefined') return;
    return reserveScrollPadding(element, footerHeight, (node) => getComputedStyle(node as unknown as Element).overflowY);
  }, [sticky, footerHeight]);

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
  const categoryMissing = categories.length === 0 ? "Crea prima una categoria nella sezione Categorie." : "Seleziona una categoria.";
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
      {draft.repeat && draft.recurrence && (
        <PromoField value={draft.promo} amount={draft.promoAmount} after={draft.promoAfter} firstAmount={draft.amount}
          recurrence={draft.recurrence} startDate={startDate} disabled={!enabled}
          errors={{ amount: errors.promoAmount, after: errors.promoAfter }} onChange={update} />
      )}
    </View>
  );

  return (
    <View style={styles.page}>
    <View style={styles.form}>
      <ExpenseFields key={formKey} values={current} errors={errors} categories={categories} dataState={dataState} disabled={!enabled}
        extra={repeat} onCreateCategory={onCreateCategory} onChange={(field, value) => update({ [field]: value })} onBlur={validateField} />
      {store.error && <HelperText type="error" accessibilityRole="alert">{t(store.error)}</HelperText>}
      {submission.status === 'rejected' && (
        <HelperText type="error" accessibilityRole="alert">{t(submission.message)}</HelperText>
      )}
      <View ref={footerRef} onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        style={[styles.footer, sticky && [styles.sticky, { backgroundColor: theme.colors.background }]]}>
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
  // Compact, keyboard closed: the save bar sticks to the bottom of the scrolling area, above the navigation bar.
  sticky: { position: 'sticky', bottom: 0, marginHorizontal: -spacing.md, marginBottom: -spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: 0, boxShadow: 'none', zIndex: 1 } as unknown as ViewStyle,
  repeat: { gap: spacing.xl },
  footer: { gap: spacing.md },
  actions: { flexDirection: 'row', marginTop: spacing.sm },
  submit: { flexGrow: 1 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  button: { minHeight: layout.controlHeight },
});
