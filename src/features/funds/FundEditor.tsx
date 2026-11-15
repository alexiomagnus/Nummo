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
import { budgetFor, fundFromForm, fundNameError, fundPolicy, monthOf, nextFundColor, type Fund, type FundData } from '../../domain/funds';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { paletteColor } from '../../theme/chartPalette';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { IconPicker } from '../categories/IconPicker';

type Props = {
  record?: SyncedFund;
  funds: readonly Fund[];
  showBudget: boolean;
  ready: boolean;
  error: string | null;
  onSave: (data: FundData) => Promise<boolean>;
  close: () => void;
};
type Errors = Partial<Record<'name' | 'budgetAmount' | 'form', string>>;

const amountText = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;

// Create or edit a fund: name, colour, icon and an optional monthly budget, nothing else. Balance accounting is not offered any
// more; when a fund saved by an earlier version carries it (initial balance, recharges, per-month budget exceptions, start date)
// those fields are written back exactly as they were, so editing a fund never overwrites what the form does not show. The
// budget applies from the current month on (setRecurringBudget); months already closed keep theirs.
export function FundEditor({ record, funds, showBudget, ready, error, onSave, close }: Props) {
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
    if (showBudget && budgetOn && budgetMinor === null) next.budgetAmount = budgetAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo del budget.';
    if (Object.keys(next).length) { setErrors(next); return; }
    const data = fundFromForm(record, { name, icon, color, ...(showBudget ? { budget: budgetOn ? budgetMinor : null } : {}) }, today);
    if (!data) { setErrors({ form: 'Troppe modifiche programmate per questo fondo: crea un nuovo fondo per continuare.' }); return; }
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
          {showBudget && <View style={styles.section}>
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
          </View>}
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
  action: { minWidth: 96, flexShrink: 1 },
});
