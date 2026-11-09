import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SwitchRow } from '../../components/SwitchRow';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { parseAmountMinor } from '../../domain/expense';
import { maxPromoAfter, type PriceChange, type PriceScope } from '../../domain/pricing';
import { occurrenceDateAt, type Recurrence } from '../../domain/recurrence';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatLongDate = (date: string, locale: string) => dateFormat(locale).format(new Date(`${date}T00:00:00Z`));

// Date of renewal number `index` (1 = first renewal), for texts that say when a price starts.
export const renewalDate = (start: string, recurrence: Recurrence, index: number, locale: string) => formatLongDate(occurrenceDateAt(start, recurrence, index), locale);

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
      accessibilityRole="button" accessibilityLabel={label} style={[styles.step, { borderColor: colors.outline }]}>
      <SvgIcon shape={shape} size={20} color={colors.onSurface} />
    </StateLayerPressable>
  );
}

type PromoProps = {
  value: boolean;
  amount: string;
  after: string;
  // The starting price typed in the main amount field.
  firstAmount: string;
  recurrence: Recurrence | '';
  startDate: string;
  errors: { amount?: string; after?: string };
  disabled?: boolean;
  onChange: (patch: { promo?: boolean; promoAmount?: string; promoAfter?: string }) => void;
};

// Optional promotional price of a new series: the amount typed above is the starting price.
export function PromoField({ value, amount, after, firstAmount, recurrence, startDate, errors, disabled, onChange }: PromoProps) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const current = /^\d{1,3}$/.test(after.trim()) ? Number(after) : 0;
  const step = (delta: number) => onChange({ promoAfter: String(Math.min(maxPromoAfter, Math.max(1, current + delta))) });
  const afterBox = useWheelStep(after, step);
  const first = parseAmountMinor(firstAmount);
  const then = parseAmountMinor(amount);
  const count = /^\d{1,3}$/.test(after.trim()) ? Number(after) : 0;
  const summary = first !== null && then !== null && count >= 1 && count <= 999 && recurrence
    ? t("{p0} per {p1}, poi {p2} dal {p3}° rinnovo ({p4}).", { p0: formatAmount(first), p1: count === 1 ? t("il primo pagamento") : t("i primi {p0} pagamenti", { p0: count }), p2: formatAmount(then), p3: count, p4: renewalDate(startDate, recurrence, count, locale) }) : null;
  return (
    <View style={styles.group}>
      <SwitchRow label={t("Prezzo promozionale")} value={value} disabled={disabled} onChange={(promo) => onChange({ promo })} />
      {value && (
        <View style={styles.fields}>
          <View style={styles.row}>
            <View style={styles.amount}>
              <TextInput outlineStyle={inputOutline} label={t("Importo successivo")} value={amount} mode="outlined" inputMode="decimal" placeholder={locale === 'it-IT' ? '0,00' : '0.00'}
                onChangeText={(promoAmount) => onChange({ promoAmount })} error={Boolean(errors.amount)} disabled={disabled}
                accessibilityLabel={t("Importo dopo il periodo promozionale, in euro")} />
              {errors.amount && <HelperText type="error" accessibilityRole="alert">{t(errors.amount)}</HelperText>}
            </View>
            <View ref={afterBox} style={styles.after}>
              <View style={styles.afterRow}>
              <TextInput style={styles.afterField} outlineStyle={inputOutline} label={t("Dopo quanti rinnovi")} value={after} mode="outlined" inputMode="numeric"
                onChangeText={(promoAfter) => onChange({ promoAfter })} error={Boolean(errors.after)} disabled={disabled}
                accessibilityLabel={t("Numero di rinnovi dopo i quali cambia l’importo")} />
              <View style={styles.steps}>
                <StepButton label={t("Meno un rinnovo")} shape={iconShapes.minus} disabled={disabled || current <= 1} onPress={() => step(-1)} />
                <StepButton label={t("Più un rinnovo")} shape={iconShapes.plus} disabled={disabled || current >= maxPromoAfter} onPress={() => step(1)} />
              </View>
              </View>
              {errors.after && <HelperText type="error" accessibilityRole="alert">{t(errors.after)}</HelperText>}
            </View>
          </View>
          {summary && <Text variant="bodySmall" style={muted}>{summary}</Text>}
        </View>
      )}
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
  disabled?: boolean;
  onScope: (scope: PriceScope) => void;
  onRemove: (change: PriceChange) => void;
};

// Edit dialog of a series: the amount field is the price of the next renewal. Past payments never change.
export function PriceChangeField({ next, shownAmount, typed, scope, changes, start, recurrence, disabled, onScope, onRemove }: ChangeProps) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  if (!next) return null;
  const amount = parseAmountMinor(typed);
  const changed = amount !== null && amount !== shownAmount;
  const scheduled = changes.filter((change) => change.index >= next.index);
  return (
    <View style={styles.group}>
      <Text variant="titleSmall">{t("Prezzo dei rinnovi")}</Text>
      <Text variant="bodySmall" style={muted}>
        {t("Prossimo rinnovo (")}{formatLongDate(next.date, locale)}): {formatAmount(shownAmount)}</Text>
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
                {change.once ? t("Solo il") : t("Dal")} {renewalDate(start, recurrence, change.index, locale)}: {formatAmount(change.amount_minor)}
              </Text>
              <IconButton accessibilityLabel={t("Rimuovi la variazione del {p0}", { p0: renewalDate(start, recurrence, change.index, locale) })} disabled={disabled}
                icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} onPress={() => onRemove(change)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  fields: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amount: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  after: { flexGrow: 1, flexBasis: 300, minWidth: 0 },
  afterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  afterField: { flex: 1, minWidth: 0 },
  // Paper's outlined field reserves 6 dp above its box: the buttons take the same 50 dp box and offset.
  steps: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
  step: { width: layout.fieldBoxHeight, height: layout.fieldBoxHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scheduled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  scheduledText: { flex: 1 },
});
