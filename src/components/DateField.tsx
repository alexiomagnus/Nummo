import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { expensePolicy, todayInRome } from '../domain/policy';
import { layout, radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

const monthFormat = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const weekdays = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
const yesterdayOf = (today: string) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

const labelOf = (selected: string, today: string) =>
  selected === today ? 'Oggi' : selected === yesterdayOf(today) ? 'Ieri' : dayFormat.format(new Date(`${selected}T00:00:00Z`));

// 50 dp button showing the chosen date («Oggi», «Ieri» or the date); toggles the calendar.
export function DateButton({ value, open, onToggle, error, disabled }: { value: string; open: boolean; onToggle: () => void; error?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  const shown = labelOf(value || todayInRome(), todayInRome());
  return (
    <StateLayerPressable layerColor={colors.onSurface} radius={radius.input} disabled={disabled} accessibilityRole="button"
      aria-expanded={open} aria-haspopup="dialog" accessibilityLabel={`Data della spesa: ${shown}`} onPress={onToggle}
      style={[styles.field, { borderColor: error ? colors.error : colors.outline }]}>
      <SvgIcon shape={iconShapes.calendar} size={20} color={colors.onSurfaceVariant} />
      <Text variant="bodyLarge" numberOfLines={1} style={styles.value}>{shown}</Text>
    </StateLayerPressable>
  );
}

// Month grid. Days outside the allowed range (2000-01-01 … today) are disabled, so no invalid date
// can be picked. Mounted only while open: it always starts on the selected month.
export function DateCalendar({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const { colors } = useTheme();
  const today = todayInRome();
  const selected = value || today;
  const [month, setMonth] = useState(selected.slice(0, 7));
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lead = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, index) => (index < lead || index >= lead + days ? null : iso(year, monthIndex, index - lead + 1)));
  const shift = (delta: number) => setMonth(iso(year, monthIndex + delta, 1).slice(0, 7));
  const canPrev = iso(year, monthIndex, 1) > expensePolicy.minDate;
  const canNext = iso(year, monthIndex + 1, 1) <= today;
  const nav = (label: string, shape: string, enabled: boolean, onPress: () => void) => (
    <StateLayerPressable layerColor={colors.onSurface} radius={radius.control} disabled={!enabled} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={label} style={styles.nav}>
      <SvgIcon shape={shape} size={20} color={colors.onSurface} />
    </StateLayerPressable>
  );
  return (
    <View role="dialog" aria-label="Scegli la data" style={[styles.panel, { borderColor: colors.outlineVariant }]}>
      <View style={styles.header}>
        {nav('Mese precedente', iconShapes.chevronLeft, canPrev, () => shift(-1))}
        <Text variant="titleSmall" accessibilityLiveRegion="polite" style={styles.month}>{monthFormat.format(new Date(Date.UTC(year, monthIndex, 1)))}</Text>
        {nav('Mese successivo', iconShapes.chevronRight, canNext, () => shift(1))}
      </View>
      <View style={styles.grid}>
        {weekdays.map((day, index) => <View key={index} style={styles.cell}><Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{day}</Text></View>)}
        {cells.map((date, index) => {
          if (!date) return <View key={index} style={styles.cell} />;
          const active = date === selected;
          const allowed = date >= expensePolicy.minDate && date <= today;
          return (
            <View key={index} style={styles.cell}>
              <StateLayerPressable layerColor={active ? colors.onPrimary : colors.onSurface} radius={radius.control} disabled={!allowed}
                onPress={() => onChange(date === today ? '' : date)} accessibilityRole="button" aria-pressed={active}
                accessibilityLabel={dayFormat.format(new Date(`${date}T00:00:00Z`))}
                style={[styles.day, active && { backgroundColor: colors.primary }, !active && date === today && { borderWidth: 1, borderColor: colors.primary }]}>
                <Text variant="bodyMedium" style={{ color: active ? colors.onPrimary : colors.onSurface, fontVariant: ['tabular-nums'] }}>{Number(date.slice(8))}</Text>
              </StateLayerPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: layout.fieldBoxHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, paddingHorizontal: spacing.md },
  value: { flex: 1, minWidth: 0 },
  panel: { borderWidth: 1, borderRadius: radius.card, padding: spacing.sm, gap: spacing.xs, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { textTransform: 'capitalize' },
  nav: { width: layout.minTouch, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
