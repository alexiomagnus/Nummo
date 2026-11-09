import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { leadingIcon } from '../../components/FieldIcon';
import { SelectField } from '../../components/SelectField';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import type { CategoryIcon } from '../../domain/category';
import { parseAmountMinor } from '../../domain/expense';
import type { SyncedFund } from '../../domain/firestore';
import {
  addMonths, currentRecharge, fundNameError, fundPolicy, monthOf, nextFundColor, parseMoneyMinor, setRecharge, setRecurringBudget,
  budgetFor, type BudgetChange, type Fund, type FundData,
} from '../../domain/funds';
import { normalizeCategoryName } from '../../domain/category';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { paletteColor } from '../../theme/chartPalette';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { IconPicker } from '../categories/IconPicker';

type Props = {
  record?: SyncedFund;
  funds: readonly Fund[];
  ready: boolean;
  error: string | null;
  onSave: (data: FundData) => Promise<boolean>;
  close: () => void;
};
type Errors = Partial<Record<'name' | 'initial' | 'rechargeAmount' | 'rechargeDay' | 'budgetAmount' | 'exception' | 'form', string>>;

const amountText = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;

// Create or edit a fund in one dialog: identity (name, icon, colour), starting point (initial balance, start date — fixed
// once created), monthly recharge and monthly budget with per-month exceptions. Changes to recharge and budget never touch
// what has already happened (see setRecharge / setRecurringBudget in domain/funds.ts).
export function FundEditor({ record, funds, ready, error, onSave, close }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors, dark } = useTheme();
  const today = todayInRome();
  const current = record ? currentRecharge(record) : null;
  const recurring = record ? budgetFor({ ...record, budget_exceptions: [] }, monthOf(today)) : null;
  const [name, setName] = useState(record?.name ?? '');
  const [icon, setIcon] = useState<CategoryIcon | null>(record?.icon ?? null);
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [color, setColor] = useState(record?.color ?? nextFundColor(funds));
  const [initial, setInitial] = useState(record ? amountText(record.initial_minor) : '');
  const [startDate, setStartDate] = useState('');
  const [rechargeOn, setRechargeOn] = useState(Boolean(current?.active));
  const [rechargeAmount, setRechargeAmount] = useState(current ? amountText(current.amount_minor) : '');
  const [rechargeDay, setRechargeDay] = useState(String(current?.day ?? 1));
  const [budgetOn, setBudgetOn] = useState(recurring !== null);
  const [budgetAmount, setBudgetAmount] = useState(recurring !== null ? amountText(recurring) : '');
  // Exceptions of months already closed are kept as they are and not shown for editing.
  const past = (record?.budget_exceptions ?? []).filter((c) => c.month < monthOf(today));
  const [exceptions, setExceptions] = useState<BudgetChange[]>((record?.budget_exceptions ?? []).filter((c) => c.month >= monthOf(today)));
  const [exceptionMonth, setExceptionMonth] = useState(monthOf(today));
  const [exceptionAmount, setExceptionAmount] = useState('');
  const [showBudget, setShowBudget] = useState(false);
  const budgetMinorPreview = parseAmountMinor(budgetAmount);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const blocked = busy || !ready;
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(monthOf(today), i)), [today]);
  const monthLabel = (month: string) => formatDate(`${month}-01`, { month: 'long', year: 'numeric' });

  const addException = () => {
    const value = exceptionAmount.trim() === '' ? 0 : parseAmountMinor(exceptionAmount);
    if (value === null) { setErrors({ ...errors, exception: 'Importo non valido (es. 12,50).' }); return; }
    const next = [...exceptions.filter((c) => c.month !== exceptionMonth), { month: exceptionMonth, amount_minor: value }].sort((a, b) => a.month.localeCompare(b.month));
    if (next.length + past.length > fundPolicy.maxChanges) { setErrors({ ...errors, exception: 'Troppe eccezioni: rimuovi quelle che non servono.' }); return; }
    setExceptions(next); setExceptionAmount(''); setErrors({ ...errors, exception: undefined });
  };

  const save = async () => {
    if (blocked) return;
    const next: Errors = {};
    const nameError = fundNameError(name, funds, record?.id);
    if (nameError) next.name = nameError;
    const initialMinor = initial.trim() === '' ? 0 : parseMoneyMinor(initial, true);
    if (initialMinor === null) next.initial = 'Importo non valido (es. 12,50).';
    const rechargeMinor = parseAmountMinor(rechargeAmount);
    const day = /^\d{1,2}$/.test(rechargeDay.trim()) ? Number(rechargeDay) : 0;
    if (rechargeOn && rechargeMinor === null) next.rechargeAmount = rechargeAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo della ricarica.';
    if (rechargeOn && (day < 1 || day > 31)) next.rechargeDay = 'Indica un giorno da 1 a 31.';
    const budgetMinor = parseAmountMinor(budgetAmount);
    if (budgetOn && budgetMinor === null) next.budgetAmount = budgetAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo del budget.';
    // A budget error must not stay hidden inside the collapsed section.
    if (next.budgetAmount) setShowBudget(true);
    if (Object.keys(next).length) { setErrors(next); return; }
    const start = record?.start_date ?? (startDate || today);
    const base = { start_date: start, recharges: record?.recharges ?? [], budgets: record?.budgets ?? [] };
    // A new fund has its recharge and budget from its first month; an existing one changes them from now on only.
    const recharges = record ? setRecharge(base, rechargeOn ? { amount_minor: rechargeMinor!, day, active: true } : null, today)
      : rechargeOn ? [{ month: monthOf(start), amount_minor: rechargeMinor!, day, active: true }] : [];
    const budgets = record ? setRecurringBudget(base, budgetOn ? budgetMinor : null, today)
      : budgetOn ? [{ month: monthOf(start), amount_minor: budgetMinor! }] : [];
    const budget_exceptions = [...past, ...exceptions].filter((c) => c.month >= monthOf(start));
    if (!recharges || !budgets || budget_exceptions.length > fundPolicy.maxChanges) { setErrors({ form: 'Troppe modifiche programmate per questo fondo: crea un nuovo fondo per continuare.' }); return; }
    const data: FundData = {
      name: normalizeCategoryName(name), icon, color, initial_minor: initialMinor!, start_date: start,
      recharges, budgets, budget_exceptions, archived: record?.archived ?? false,
    };
    setBusy(true);
    try { if (await onSave(data)) close(); } finally { setBusy(false); }
  };

  const field = (key: keyof Errors) => errors[key] ? <HelperText type="error" accessibilityRole="alert">{t(errors[key]!)}</HelperText> : null;
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{record ? t("Modifica fondo") : t("Nuovo fondo")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nome del fondo")} value={name} readOnly={blocked} aria-disabled={blocked}
              accessibilityLabel={t("Nome del fondo, obbligatorio")} error={Boolean(errors.name)}
              placeholder={t("Es. Vita universitaria")} onChangeText={(value) => { setName(value); setErrors({ ...errors, name: undefined }); }} />
            {field('name')}
          </View>
          <View style={styles.section}>
            <Text variant="labelLarge">{t("Colore")}</Text>
            <View style={styles.swatches} role="radiogroup" aria-label={t("Colore del fondo")}>
              {Array.from({ length: fundPolicy.colorSlots }, (_, slot) => (
                <StateLayerPressable key={slot} layerColor={colors.onSurface} radius={radius.pill} disabled={blocked} onPress={() => setColor(slot)}
                  accessibilityRole="radio" aria-checked={slot === color} accessibilityLabel={t("Colore {p0}", { p0: slot + 1 })} style={styles.swatchTarget}>
                  <View style={[styles.swatch, { backgroundColor: paletteColor(slot, dark) }, slot === color && { borderColor: colors.onSurface, borderWidth: 3 }]}>
                    {slot === color && <SvgIcon shape={iconShapes.check} size={18} color={colors.surface} />}
                  </View>
                </StateLayerPressable>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Button mode="outlined" disabled={blocked} onPress={() => setChoosingIcon(!choosingIcon)} aria-expanded={choosingIcon} style={styles.start}
              icon={({ size, color: c }) => <SvgIcon shape={choosingIcon ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={c} />}>
              {icon ? t("Cambia icona") : t("Scegli un'icona")}</Button>
            {choosingIcon && <IconPicker value={icon} onChange={setIcon} disabled={blocked} />}
          </View>
          <View style={styles.section}>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Saldo iniziale")} value={initial} inputMode="decimal" placeholder="0,00"
              readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.initial)} left={leadingIcon(iconShapes.euro)}
              accessibilityLabel={t("Saldo iniziale in euro")} onChangeText={(value) => { setInitial(value); setErrors({ ...errors, initial: undefined }); }} />
            {field('initial')}
            {record ? <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Saldo iniziale al {p0}. Correggerlo ricalcola tutti i saldi del fondo.", { p0: formatDate(record.start_date) })}</Text>
              : <>
                <Text variant="labelLarge">{t("Data di inizio")}</Text>
                <DateField value={startDate} disabled={blocked} name={t("Data di inizio del fondo")} onChange={setStartDate} />
              </>}
          </View>
          <View style={styles.section}>
            <SwitchRow label={t("Ricarica mensile")} supporting={t("Denaro aggiunto al fondo ogni mese, ad esempio una paghetta o uno stipendio.")}
              value={rechargeOn} disabled={blocked} onChange={setRechargeOn} />
            {rechargeOn && <View style={styles.row}>
              <View style={styles.grow}>
                <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Importo della ricarica")} value={rechargeAmount} inputMode="decimal" placeholder="0,00"
                  readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.rechargeAmount)} left={leadingIcon(iconShapes.euro)}
                  onChangeText={(value) => { setRechargeAmount(value); setErrors({ ...errors, rechargeAmount: undefined }); }} />
                {field('rechargeAmount')}
              </View>
              <View style={styles.day}>
                <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Giorno")} value={rechargeDay} inputMode="numeric"
                  readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.rechargeDay)} accessibilityLabel={t("Giorno del mese dell'accredito, da 1 a 31")}
                  onChangeText={(value) => { setRechargeDay(value); setErrors({ ...errors, rechargeDay: undefined }); }} />
                {field('rechargeDay')}
              </View>
            </View>}
            {record && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Le modifiche valgono dalla prossima scadenza: gli accrediti già ricevuti non cambiano.")}</Text>}
          </View>
          {/* Budget and its exceptions are optional: collapsed by default, with a summary so active settings are never invisible. */}
          <View style={styles.section}>
            <Button mode="outlined" disabled={blocked} onPress={() => setShowBudget(!showBudget)} aria-expanded={showBudget} style={styles.start}
              icon={({ size, color: c }) => <SvgIcon shape={showBudget ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={c} />}>
              {t("Budget mensile")}</Button>
            {!showBudget && budgetOn && budgetMinorPreview !== null && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Budget ricorrente: {p0}", { p0: formatAmount(budgetMinorPreview) })}</Text>}
            {!showBudget && exceptions.length > 0 && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Eccezioni programmate: {p0}", { p0: exceptions.length })}</Text>}
            {showBudget && <>
            <SwitchRow label={t("Budget ricorrente")} supporting={t("Limite di spesa del mese: non aggiunge denaro al fondo e non blocca le spese.")}
              value={budgetOn} disabled={blocked} onChange={setBudgetOn} />
            {budgetOn && <View>
              <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Importo del budget")} value={budgetAmount} inputMode="decimal" placeholder="0,00"
                readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.budgetAmount)} left={leadingIcon(iconShapes.euro)}
                onChangeText={(value) => { setBudgetAmount(value); setErrors({ ...errors, budgetAmount: undefined }); }} />
              {field('budgetAmount')}
            </View>}
            <Text variant="labelLarge" style={styles.subheading}>{t("Eccezioni per singoli mesi")}</Text>
            {exceptions.length === 0 && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Nessuna eccezione: ogni mese vale il budget ricorrente.")}</Text>}
            <View role="list">
              {exceptions.map((change) => (
                <View key={change.month} role="listitem" style={styles.exception}>
                  <Text variant="bodyLarge" style={styles.grow}>{monthLabel(change.month)}</Text>
                  <Text variant="bodyLarge" style={styles.number}>{change.amount_minor > 0 ? formatAmount(change.amount_minor) : t("Nessun budget")}</Text>
                  <IconButton disabled={blocked} accessibilityLabel={t("Rimuovi l'eccezione di {p0}", { p0: monthLabel(change.month) })}
                    icon={({ size, color: c }) => <SvgIcon shape={iconShapes.close} size={size} color={c} />}
                    onPress={() => setExceptions(exceptions.filter((c) => c.month !== change.month))} />
                </View>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.grow}>
                <SelectField label={t("Mese")} value={exceptionMonth} disabled={blocked} onChange={setExceptionMonth}
                  options={months.map((month) => ({ value: month, label: monthLabel(month) }))} />
              </View>
              <View style={styles.grow}>
                <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Budget del mese")} value={exceptionAmount} inputMode="decimal"
                  placeholder={t("Vuoto = nessuno")} readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.exception)}
                  onChangeText={(value) => { setExceptionAmount(value); setErrors({ ...errors, exception: undefined }); }} />
              </View>
            </View>
            {field('exception')}
            <Button mode="contained-tonal" disabled={blocked} onPress={addException} style={styles.start}
              icon={({ size, color: c }) => <SvgIcon shape={iconShapes.plus} size={size} color={c} />}>{t("Aggiungi eccezione")}</Button>
            </>}
          </View>
          {field('form')}
          {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button style={styles.action} disabled={busy} onPress={close}>{t("Annulla")}</Button>
        <Button mode="contained" style={styles.action} disabled={blocked} loading={busy} onPress={() => void save()}>{record ? t("Salva") : t("Crea")}</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm, gap: spacing.xl },
  section: { gap: spacing.sm },
  subheading: { marginTop: spacing.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  swatchTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' },
  grow: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  day: { width: 96 },
  exception: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  number: { fontVariant: ['tabular-nums'] },
  start: { alignSelf: 'flex-start' },
  action: { minWidth: 96, flexShrink: 1 },
});
