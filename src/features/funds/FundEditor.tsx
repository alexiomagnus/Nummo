import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { leadingIcon } from '../../components/FieldIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import type { CategoryIcon } from '../../domain/category';
import { parseAmountMinor } from '../../domain/expense';
import type { SyncedFund } from '../../domain/firestore';
import {
  budgetFor, currentRecharge, fundFromForm, fundNameError, fundPolicy, monthOf, nextFundColor, parseMoneyMinor,
  type Fund, type FundData,
} from '../../domain/funds';
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
type Errors = Partial<Record<'name' | 'budgetAmount' | 'initial' | 'rechargeAmount' | 'rechargeDay' | 'form', string>>;

const amountText = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;

// Create or edit a fund: name, colour, icon, an optional initial balance, an optional monthly recharge and an optional
// monthly budget. The balance has no switch of its own: it exists while the fund has an initial balance, recharges or
// movements (hasBalanceData). Fields the form does not show (start date, per-month budget exceptions) are written back
// exactly as they were. Budget and recharge change from now on only (fundFromForm); past recharges are never deleted.
export function FundEditor({ record, funds, ready, error, onSave, close }: Props) {
  const { t } = useI18n();
  const { colors, dark } = useTheme();
  const today = todayInRome();
  const recurring = record ? budgetFor({ ...record, budget_exceptions: [] }, monthOf(today)) : null;
  const [name, setName] = useState(record?.name ?? '');
  const [icon, setIcon] = useState<CategoryIcon | null>(record?.icon ?? null);
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [color, setColor] = useState(record?.color ?? nextFundColor(funds));
  const [budgetOn, setBudgetOn] = useState(recurring !== null);
  const [budgetAmount, setBudgetAmount] = useState(recurring !== null ? amountText(recurring) : '');
  const recharge = record ? currentRecharge(record) : null;
  const [initial, setInitial] = useState(record && record.initial_minor > 0 ? amountText(record.initial_minor) : '');
  const [rechargeOn, setRechargeOn] = useState(Boolean(recharge?.active));
  const [rechargeAmount, setRechargeAmount] = useState(recharge ? amountText(recharge.amount_minor) : '');
  const [rechargeDay, setRechargeDay] = useState(String(recharge?.day ?? 1));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const blocked = busy || !ready;
  const keptExceptions = (record?.budget_exceptions ?? []).filter((c) => c.month >= monthOf(today)).length;

  const save = async () => {
    if (blocked) return;
    const next: Errors = {};
    const nameError = fundNameError(name, funds, record?.id);
    if (nameError) next.name = nameError;
    const budgetMinor = parseAmountMinor(budgetAmount);
    if (budgetOn && budgetMinor === null) next.budgetAmount = budgetAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo del budget.';
    const initialMinor = initial.trim() === '' ? 0 : parseMoneyMinor(initial, true);
    const rechargeMinor = parseAmountMinor(rechargeAmount);
    const day = /^\d{1,2}$/.test(rechargeDay.trim()) ? Number(rechargeDay) : 0;
    if (initialMinor === null) next.initial = 'Importo non valido (es. 12,50).';
    if (rechargeOn && rechargeMinor === null) next.rechargeAmount = rechargeAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo della ricarica.';
    if (rechargeOn && (day < 1 || day > 31)) next.rechargeDay = 'Indica un giorno da 1 a 31.';
    if (Object.keys(next).length) { setErrors(next); return; }
    // Empty initial balance = 0; recharge off = none from now on (a fund that never had one keeps none).
    const balance = { initial_minor: initialMinor!, recharge: rechargeOn ? { amount_minor: rechargeMinor!, day } : null };
    const data = fundFromForm(record, { name, icon, color, budget: budgetOn ? budgetMinor : null, balance }, today);
    if (!data) { setErrors({ form: 'Troppe modifiche programmate per questo fondo: crea un nuovo fondo per continuare.' }); return; }
    setBusy(true);
    try { if (await onSave(data)) close(); } finally { setBusy(false); }
  };

  const field = (key: keyof Errors) => errors[key] ? <HelperText type="error" accessibilityRole="alert">{t(errors[key]!)}</HelperText> : null;
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }} focusTextEntry={!record}>
      <Dialog.Title>{record ? t("Modifica fondo") : t("Nuovo fondo")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nome del fondo")} value={name} readOnly={blocked} aria-disabled={blocked}
              accessibilityLabel={t("Nome del fondo, obbligatorio")} error={Boolean(errors.name)}
              placeholder={t("Es. Risparmi")} onChangeText={(value) => { setName(value); setErrors({ ...errors, name: undefined }); }} />
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
          <View>
            <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Saldo iniziale (facoltativo)")} value={initial} inputMode="decimal" placeholder="0,00"
              readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.initial)} left={leadingIcon(iconShapes.euro)}
              accessibilityLabel={t("Saldo iniziale in euro, facoltativo")}
              onChangeText={(value) => { setInitial(value); setErrors({ ...errors, initial: undefined }); }} />
            {field('initial')}
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
          </View>
          <View style={styles.section}>
            <SwitchRow label={t("Budget mensile")} supporting={t("Facoltativo: un limite di spesa indicativo per il mese, non blocca le spese.")}
              value={budgetOn} disabled={blocked} onChange={setBudgetOn} />
            {budgetOn && <View>
              <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Importo del budget")} value={budgetAmount} inputMode="decimal" placeholder="0,00"
                readOnly={blocked} aria-disabled={blocked} error={Boolean(errors.budgetAmount)} left={leadingIcon(iconShapes.euro)}
                onChangeText={(value) => { setBudgetAmount(value); setErrors({ ...errors, budgetAmount: undefined }); }} />
              {field('budgetAmount')}
            </View>}
            {keptExceptions > 0 && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {t("Eccezioni programmate per singoli mesi: {p0}. Restano attive.", { p0: keptExceptions })}</Text>}
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
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  swatchTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  start: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' },
  grow: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  day: { width: 96 },
  action: { minWidth: 96, flexShrink: 1 },
});
