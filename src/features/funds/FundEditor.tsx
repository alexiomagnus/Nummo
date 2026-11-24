import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button, CancelButton, ConfirmButton, dialogActionPair, dialogActionsRow } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import { leadingIcon } from '../../components/FieldIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { SwitchRow } from '../../components/SwitchRow';
import type { CategoryIcon } from '../../domain/category';
import { parseAmountMinor } from '../../domain/expense';
import type { SyncedFund } from '../../domain/firestore';
import { budgetFor, currentRecharge, fundFromForm, fundNameError, fundPolicy, monthOf, nextFundColor, parseMoneyMinor, type Fund, type FundData } from '../../domain/funds';
import { todayInRome } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { paletteColor } from '../../theme/chartPalette';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { useReducedMotion } from '../../theme/useSizeClass';
import { IconPicker } from '../categories/IconPicker';

type Props = {
  record?: SyncedFund;
  funds: readonly Fund[];
  ready: boolean;
  error: string | null;
  onSave: (data: FundData) => Promise<boolean>;
  close: () => void;
  // Editing an existing fund: «Elimina» on the row of the actions (22 November, user's request: before, in the card). `blocked`
  // says why a fund in use cannot be deleted (the dialog then offers only «Chiudi»).
  remove?: { blocked?: string; onDelete: () => Promise<boolean> };
};
type Errors = Partial<Record<'name' | 'budgetAmount' | 'initial' | 'rechargeAmount' | 'rechargeDay' | 'form', string>>;

const amountText = (minor: number) => `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;

// Create or edit a fund: name, colour, icon, an optional initial balance, an optional monthly recharge and an optional monthly
// budget. Fields the form does not show (start date, per-month budget exceptions) are written back exactly as they were.
// Budget and recharge change from now on only (fundFromForm); past recharges are never deleted.
export function FundEditor({ record, funds, ready, error, onSave, close, remove }: Props) {
  const { t } = useI18n();
  const { colors, dark } = useTheme();
  const [deleting, setDeleting] = useState(false);
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
  // A switch turned on reveals its amount: bring it wholly into view instead of leaving it under the bottom edge.
  const reduced = useReducedMotion();
  const rechargeFields = useRevealOnEnable(rechargeOn, reduced);
  const budgetFields = useRevealOnEnable(budgetOn, reduced);

  const save = async () => {
    if (blocked) return;
    const next: Errors = {};
    const nameError = fundNameError(name, funds, record?.id);
    if (nameError) next.name = nameError;
    const budgetMinor = parseAmountMinor(budgetAmount);
    if (budgetOn && budgetMinor === null) next.budgetAmount = budgetAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo del budget.';
    // Empty initial balance = 0.
    const initialMinor = initial.trim() === '' ? 0 : parseMoneyMinor(initial, true);
    if (initialMinor === null) next.initial = 'Importo non valido (es. 12,50).';
    const rechargeMinor = parseAmountMinor(rechargeAmount);
    const day = /^\d{1,2}$/.test(rechargeDay.trim()) ? Number(rechargeDay) : 0;
    if (rechargeOn && rechargeMinor === null) next.rechargeAmount = rechargeAmount.trim() ? 'Importo non valido (es. 12,50).' : 'Inserisci l’importo della ricarica.';
    if (rechargeOn && (day < 1 || day > 31)) next.rechargeDay = 'Indica un giorno da 1 a 31.';
    if (Object.keys(next).length) { setErrors(next); return; }
    // Recharge off = none from now on (a fund that never had one keeps none).
    const balance = { initial_minor: initialMinor!, recharge: rechargeOn ? { amount_minor: rechargeMinor!, day } : null };
    const data = fundFromForm(record, { name, icon, color, budget: budgetOn ? budgetMinor : null, balance }, today);
    if (!data) { setErrors({ form: 'Troppe modifiche programmate per questo fondo: crea un nuovo fondo per continuare.' }); return; }
    setBusy(true);
    try { if (await onSave(data)) close(); } finally { setBusy(false); }
  };

  const field = (key: keyof Errors) => errors[key] ? <HelperText type="error" accessibilityRole="alert">{t(errors[key]!)}</HelperText> : null;
  return <Portal>
    <Dialog visible detents onDismiss={() => { if (!busy) close(); }} focusTextEntry={!record}>
      <Dialog.Title>{record ? t("Modifica fondo") : t("Nuovo fondo")}</Dialog.Title>
      {/* Dividers on the edges that hide content come from AppDialog.ScrollArea, as in every dialog. */}
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
            {rechargeOn && <View ref={rechargeFields} style={styles.row}>
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
            {budgetOn && <View ref={budgetFields}>
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
      {/* Buttons (or Views) as direct children of Dialog.Actions (it clones each one): never a Fragment. */}
      {record && remove ? <Dialog.Actions style={dialogActionsRow}>
        <View style={styles.remove}><DeleteAction labeled="wide" disabled={busy || !ready} name={record.name} onOpenChange={setDeleting}
          title={remove.blocked ? t("Il fondo {p0} è in uso", { p0: record.name }) : t("Eliminare il fondo {p0}?", { p0: record.name })}
          description={t("Il fondo non ha spese collegate. L’operazione non può essere annullata.")} blocked={remove.blocked}
          onDelete={async () => { const removed = await remove.onDelete(); if (removed) close(); return removed; }} /></View>
        <View style={dialogActionPair}>
          <CancelButton narrowOnPhone disabled={busy || deleting} onPress={close}>{t("Annulla")}</CancelButton>
          <ConfirmButton narrowOnPhone disabled={blocked || deleting} loading={busy} onPress={() => void save()}>{t("Salva")}</ConfirmButton>
        </View>
      </Dialog.Actions> : <Dialog.Actions style={dialogActionsRow}>
        <CancelButton disabled={busy} onPress={close}>{t("Annulla")}</CancelButton>
        <ConfirmButton disabled={blocked} loading={busy} onPress={() => void save()}>{record ? t("Salva") : t("Crea")}</ConfirmButton>
      </Dialog.Actions>}
    </Dialog>
  </Portal>;
}

// Ref for the fields a switch reveals: when the switch goes from off to on (not at opening), they scroll wholly into view
// within the dialog, the nearest edge only. A callback ref, because Paper's Portal attaches the new node after the effect
// has run. Web target: a View's node is its DOM element.
function useRevealOnEnable(on: boolean, reduced: boolean) {
  const node = useRef<HTMLElement | null>(null);
  const was = useRef(on);
  const pending = useRef(false);
  const reveal = useCallback(() => {
    const element = node.current;
    if (!pending.current || !element) return;
    pending.current = false;
    // After layout, so the scroll area already includes the new fields.
    requestAnimationFrame(() => element.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }));
  }, [reduced]);
  useEffect(() => {
    if (on && !was.current) { pending.current = true; reveal(); }
    was.current = on;
  }, [on, reveal]);
  return useCallback((view: ComponentRef<typeof View> | null) => { node.current = view as unknown as HTMLElement | null; reveal(); }, [reveal]);
}

const styles = StyleSheet.create({
  // As in the other edit dialogs: natural width, so on a narrow phone the row wraps with Elimina above.
  remove: { flexGrow: 1, alignItems: 'flex-start', marginRight: 0 },
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.xl },
  section: { gap: spacing.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  swatchTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  start: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' },
  grow: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  day: { width: 96 },
});
