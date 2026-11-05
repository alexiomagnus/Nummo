import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { ChoiceChips } from '../../components/ChoiceChips';
import { M3Switch } from '../../components/M3Switch';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { formatAmountMinor, parseAmountMinor } from '../../domain/expense';
import type { PriceChange, PriceScope } from '../../domain/pricing';
import { occurrenceDateAt, type Recurrence } from '../../domain/recurrence';
import { inputOutline, radius, spacing } from '../../theme/tokens';

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatLongDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

// Date of renewal number `index` (1 = first renewal), for texts that say when a price starts.
export const renewalDate = (start: string, recurrence: Recurrence, index: number) => formatLongDate(occurrenceDateAt(start, recurrence, index));

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
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const first = parseAmountMinor(firstAmount);
  const then = parseAmountMinor(amount);
  const count = /^\d{1,3}$/.test(after.trim()) ? Number(after) : 0;
  const summary = first !== null && then !== null && count >= 1 && count <= 999 && recurrence
    ? `${formatAmountMinor(first)} per ${count === 1 ? 'il primo pagamento' : `i primi ${count} pagamenti`}, poi ${formatAmountMinor(then)} dal ${count}° rinnovo (${renewalDate(startDate, recurrence, count)}).` : null;
  return (
    <View style={styles.group}>
      <StateLayerPressable onPress={() => onChange({ promo: !value })} disabled={disabled} layerColor={colors.onSurface}
        radius={radius.control} style={styles.toggle} accessibilityRole="switch" aria-checked={value} aria-disabled={disabled}
        accessibilityLabel="Prezzo promozionale">
        <View style={styles.text}>
          <Text variant="titleSmall">Prezzo promozionale</Text>
          <Text variant="bodySmall" style={muted}>L’importo sopra vale all’inizio, poi cambia dopo alcuni rinnovi</Text>
        </View>
        <M3Switch value={value} disabled={disabled} />
      </StateLayerPressable>
      {value && (
        <View style={styles.fields}>
          <View style={styles.row}>
            <View style={styles.amount}>
              <TextInput outlineStyle={inputOutline} label="Importo successivo" value={amount} mode="outlined" inputMode="decimal" placeholder="0,00"
                onChangeText={(promoAmount) => onChange({ promoAmount })} error={Boolean(errors.amount)} disabled={disabled}
                accessibilityLabel="Importo dopo il periodo promozionale, in euro" />
              {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
            </View>
            <View style={styles.after}>
              <TextInput outlineStyle={inputOutline} label="Dopo quanti rinnovi" value={after} mode="outlined" inputMode="numeric" placeholder="1"
                onChangeText={(promoAfter) => onChange({ promoAfter })} error={Boolean(errors.after)} disabled={disabled}
                accessibilityLabel="Numero di rinnovi dopo i quali cambia l’importo" />
              {errors.after && <HelperText type="error" accessibilityRole="alert">{errors.after}</HelperText>}
            </View>
          </View>
          <Text variant="bodySmall" style={muted}>
            {summary ?? 'Il primo pagamento non è un rinnovo: con «1» il nuovo importo vale dal primo rinnovo (per un abbonamento annuale, dal secondo anno).'}
          </Text>
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
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  if (!next) return null;
  const amount = parseAmountMinor(typed);
  const changed = amount !== null && amount !== shownAmount;
  const scheduled = changes.filter((change) => change.index >= next.index);
  return (
    <View style={styles.group}>
      <Text variant="titleSmall">Prezzo dei rinnovi</Text>
      <Text variant="bodySmall" style={muted}>
        Importo del prossimo rinnovo ({formatLongDate(next.date)}): {formatAmountMinor(shownAmount)}. I pagamenti già maturati non cambiano.
      </Text>
      {changed && (
        <View style={styles.group} role="group" aria-label="Da quando vale il nuovo importo">
          <Text variant="labelLarge" style={muted}>Il nuovo importo vale</Text>
          <ChoiceChips label="Da quando vale il nuovo importo" value={scope} disabled={disabled}
            onChange={(value) => { if (value) onScope(value); }}
            options={[{ value: 'future', label: 'Per tutti i rinnovi futuri' }, { value: 'once', label: 'Solo per il prossimo rinnovo' }]} />
        </View>
      )}
      {scheduled.length > 0 && (
        <View role="list" aria-label="Variazioni programmate">
          <Text variant="labelLarge" style={muted}>Variazioni programmate</Text>
          {scheduled.map((change) => (
            <View key={`${change.index}:${change.once}`} role="listitem" style={styles.scheduled}>
              <Text variant="bodyMedium" style={styles.scheduledText}>
                {change.once ? 'Solo il' : 'Dal'} {renewalDate(start, recurrence, change.index)}: {formatAmountMinor(change.amount_minor)}
              </Text>
              <IconButton accessibilityLabel={`Rimuovi la variazione del ${renewalDate(start, recurrence, change.index)}`} disabled={disabled}
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
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, gap: 2 },
  fields: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amount: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  after: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  scheduled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  scheduledText: { flex: 1 },
});
