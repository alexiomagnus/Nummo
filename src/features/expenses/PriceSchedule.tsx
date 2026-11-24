import { useI18n } from '../../i18n/I18nProvider';
import { dateTimeFormat } from '../../i18n/translate';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput as NativeInput, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Disclosure } from '../../components/Disclosure';
import { leadingIcon } from '../../components/FieldIcon';
import { SwitchRow } from '../../components/SwitchRow';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { parseAmountMinor } from '../../domain/expense';
import { maxPromoAfter, type PriceChange, type PriceScope } from '../../domain/pricing';
import { scheduleDateAt, type CalendarChange, type Recurrence } from '../../domain/recurrence';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';

const dateFormat = (locale: string) => dateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatLongDate = (date: string, locale: string) => dateFormat(locale).format(new Date(`${date}T00:00:00Z`));

// Date of renewal number `index` (1 = first renewal), for texts that say when a price starts.
export const renewalDate = (start: string, recurrence: Recurrence, index: number, locale: string, calendar: readonly CalendarChange[] = []) => formatLongDate(scheduleDateAt(start, recurrence, calendar, index), locale);

// Round Material 3 outlined icon buttons (− / +) at the height of the fields, always visible. The mouse wheel
// over the focused field steps too; the native listener is non-passive so the page does not scroll meanwhile.
function useWheelStep(value: string, step: (delta: number) => void) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const latest = useRef({ value, step });
  latest.current = { value, step };
  useEffect(() => {
    const node = box.current as unknown as HTMLElement | null;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!node.contains(document.activeElement) || event.deltaY === 0) return;
      event.preventDefault();
      latest.current.step(event.deltaY < 0 ? 1 : -1);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);
  return box;
}

function StepButton({ label, shape, disabled, onPress }: { label: string; shape: string; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} radius={radius.pill} disabled={disabled} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={label} style={styles.step}>
      <SvgIcon shape={shape} size={20} color={disabled ? colors.onSurfaceDisabled : colors.onSurface} />
    </StateLayerPressable>
  );
}

// Compact stepper: − [number] + in one 48 dp pill, the number still typeable; leaving it empty or at 0 restores the minimum, 1. The visible label sits beside it,
// like the switch rows, so the long label never has to fit inside a field.
function RenewalStepper({ label, value, error, disabled, onType, onStep }: {
  label: string; value: string; error: boolean; disabled?: boolean;
  onType: (value: string) => void; onStep: (delta: number) => void;
}) {
  const { t } = useI18n();
  const { colors, fonts } = useTheme();
  const [focused, setFocused] = useState(false);
  const box = useWheelStep(value, onStep);
  const current = /^\d{1,3}$/.test(value.trim()) ? Number(value) : 0;
  const border = error ? colors.error : focused ? colors.primary : colors.outline;
  return (
    <View ref={box} style={styles.counter}>
      <Text variant="bodyLarge" style={styles.counterLabel} aria-hidden>{label}</Text>
      <View style={[styles.stepper, { borderColor: border }, (focused || error) && styles.stepperStrong]}>
        <StepButton label={t("Meno un rinnovo")} shape={iconShapes.minus} disabled={Boolean(disabled) || current <= 1} onPress={() => onStep(-1)} />
        <NativeInput value={value} onChangeText={onType} inputMode="numeric" maxLength={3} editable={!disabled}
          aria-disabled={disabled} aria-invalid={error} accessibilityLabel={label}
          onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); if (current < 1) onType('1'); }} style={[styles.count, { color: colors.onSurface, fontFamily: fonts.bodyLarge.fontFamily }]} />
        <StepButton label={t("Più un rinnovo")} shape={iconShapes.plus} disabled={Boolean(disabled) || current >= maxPromoAfter} onPress={() => onStep(1)} />
      </View>
    </View>
  );
}

type PromoProps = {
  value: boolean;
  amount: string;
  after: string;
  // The starting price typed in the main amount field.
  firstAmount: string;
  // Empty until a frequency is chosen: the summary waits for it.
  recurrence: Recurrence | '';
  startDate: string;
  errors: { amount?: string; after?: string };
  disabled?: boolean;
  onChange: (patch: { promo?: boolean; promoAmount?: string; promoAfter?: string }) => void;
};

// Optional promotional price of a new series: the amount typed above is the starting price. Turning it on fills in the
// minimum number of renewals (1) when none is set, so the stepper never starts empty.
export function PromoField({ value, amount, after, firstAmount, recurrence, startDate, errors, disabled, onChange }: PromoProps) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const current = /^\d{1,3}$/.test(after.trim()) ? Number(after) : 0;
  const step = (delta: number) => onChange({ promoAfter: String(Math.min(maxPromoAfter, Math.max(1, current + delta))) });
  const first = parseAmountMinor(firstAmount);
  const then = parseAmountMinor(amount);
  const summary = first !== null && then !== null && current >= 1 && current <= 999 && recurrence
    ? t("{p0} per {p1}, poi {p2} dal {p3}° rinnovo ({p4}).", { p0: formatAmount(first), p1: current === 1 ? t("il primo pagamento") : t("i primi {p0} pagamenti", { p0: current }), p2: formatAmount(then), p3: current, p4: renewalDate(startDate, recurrence, current, locale) }) : null;
  return (
    <View>
      <SwitchRow label={t("Prezzo promozionale")} value={value} disabled={disabled} onChange={(promo) => onChange({ promo, ...(promo && current < 1 ? { promoAfter: '1' } : {}) })} />
      <Disclosure open={value} style={styles.fields}>
        <View style={styles.row}>
          <View style={styles.amount}>
            <TextInput outlineStyle={inputOutline} label={t("Importo successivo")} value={amount} mode="outlined" inputMode="decimal" placeholder={locale === 'it-IT' ? '0,00' : '0.00'}
              onChangeText={(promoAmount) => onChange({ promoAmount })} error={Boolean(errors.amount)} readOnly={disabled} aria-disabled={disabled}
              left={leadingIcon(iconShapes.euro)} accessibilityLabel={t("Importo dopo il periodo promozionale, in euro")} />
            {errors.amount && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(errors.amount)}</HelperText>}
          </View>
          <View style={styles.after}>
            <RenewalStepper label={t("Rinnovi a prezzo promozionale")} value={after} error={Boolean(errors.after)} disabled={disabled}
              onType={(promoAfter) => onChange({ promoAfter })} onStep={step} />
            {errors.after && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(errors.after)}</HelperText>}
          </View>
        </View>
        {summary && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{summary}</Text>}
      </Disclosure>
    </View>
  );
}

type ChangeProps = {
  // Next renewal, or null when the series has none to change.
  next: { index: number; date: string } | null;
  // Price currently scheduled for the next renewal, and what the user typed.
  shownAmount: number;
  typed: string;
  scope: PriceScope;
  changes: readonly PriceChange[];
  start: string;
  recurrence: Recurrence;
  // Frequency switches of the series: the dates of scheduled prices follow the calendar in force.
  calendar?: readonly CalendarChange[];
  disabled?: boolean;
  onScope: (scope: PriceScope) => void;
  onRemove: (change: PriceChange) => void;
};

// Edit dialog of a series: the amount field is the price of the next renewal. Past payments never change.
export function PriceChangeField({ next, shownAmount, typed, scope, changes, start, recurrence, calendar = [], disabled, onScope, onRemove }: ChangeProps) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  if (!next) return null;
  const amount = parseAmountMinor(typed);
  const changed = amount !== null && amount !== shownAmount;
  const scheduled = changes.filter((change) => change.index >= next.index);
  // The next renewal and its price are in NextRenewalRow, at the top of the «Rinnovi» group: here only what there is to choose or
  // review (user's request, 24 November: the bottom of «Modifica serie» was not tidy), nothing when there is nothing.
  if (!(changed && next.index > 0) && scheduled.length === 0) return null;
  return (
    <View style={styles.group}>
      {changed && next.index > 0 && (
        <View style={styles.group} role="group" aria-label={t("Da quando vale il nuovo importo")}>
          <Text variant="labelLarge" style={muted}>{t("Il nuovo importo vale")}</Text>
          <ChoiceChips label={t("Da quando vale il nuovo importo")} value={scope} disabled={disabled}
            onChange={(value) => { if (value) onScope(value); }}
            options={[{ value: 'future', label: t("Per tutti i rinnovi futuri") }, { value: 'once', label: t("Solo per il prossimo rinnovo") }]} />
        </View>
      )}
      {scheduled.length > 0 && (
        <View role="list" aria-label={t("Variazioni programmate")}>
          <Text variant="labelLarge" style={muted}>{t("Variazioni programmate")}</Text>
          {scheduled.map((change) => (
            <View key={`${change.index}:${change.once}`} role="listitem" style={styles.scheduled}>
              <Text variant="bodyMedium" style={styles.scheduledText}>
                {change.once ? t("Solo il") : t("Dal")} {renewalDate(start, recurrence, change.index, locale, calendar)}: {formatAmount(change.amount_minor)}
              </Text>
              <IconButton accessibilityLabel={t("Rimuovi la variazione del {p0}", { p0: renewalDate(start, recurrence, change.index, locale, calendar) })} disabled={disabled}
                icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} onPress={() => onRemove(change)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// The next renewal of a series at a glance, at the top of the «Rinnovi» group of «Modifica serie»: calendar tile, «Prossimo rinnovo»
// and its date, the price on the right (user's request, 24 November, in place of a small line «Prossimo rinnovo (date): price»).
export function NextRenewalRow({ date, amount }: { date: string; amount: number }) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.next} role="group" aria-label={`${t("Prossimo rinnovo")}: ${formatLongDate(date, locale)}, ${formatAmount(amount)}`}>
      <View aria-hidden style={[styles.nextTile, { backgroundColor: colors.secondaryContainer }]}>
        <SvgIcon shape={iconShapes.calendar} size={22} color={colors.onSecondaryContainer} />
      </View>
      <View aria-hidden style={styles.nextText}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Prossimo rinnovo")}</Text>
        <Text variant="bodyLarge" numberOfLines={1}>{formatLongDate(date, locale)}</Text>
      </View>
      <Text aria-hidden variant="titleMedium" style={styles.nextAmount}>{formatAmount(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  next: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nextTile: { width: 40, height: 40, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  nextText: { flex: 1, minWidth: 0 },
  nextAmount: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  fields: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  // Amount and stepper side by side when both fit (≥ 2 × 240 + gap), stacked on phones.
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: spacing.xl, rowGap: spacing.md },
  amount: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  after: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  helper: { paddingHorizontal: 0 },
  // Same 50 dp box and 6 dp top offset as Paper's outlined field beside it, so both align on wide screens.
  // On the narrowest phones the label takes its own line and the stepper moves under it, still at the end.
  counter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: spacing.sm, minHeight: layout.fieldBoxHeight, marginTop: 6 },
  counterLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 136, minWidth: 0 },
  stepper: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'stretch', height: layout.fieldBoxHeight, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 1 },
  stepperStrong: { borderWidth: 2, paddingHorizontal: 0 },
  step: { width: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  count: { width: 40, textAlign: 'center', fontSize: 16, fontVariant: ['tabular-nums'], outlineWidth: 0 },
  scheduled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  scheduledText: { flex: 1 },
});
