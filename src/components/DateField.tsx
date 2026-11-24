import { useI18n } from '../i18n/I18nProvider';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from './AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow } from './Button';
import { leadingIcon } from './FieldIcon';
import { expensePolicy, todayInRome } from '../domain/policy';
import { inputOutline, radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { useSizeClass } from '../theme/useSizeClass';
import { SvgIcon, iconShapes } from './SvgIcon';

const monthFormat = (locale: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const italianWeekdays = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
const yesterdayOf = (today: string) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

const labelOf = (selected: string, today: string, locale: string) =>
  selected === today ? 'Oggi' : selected === yesterdayOf(today) ? 'Ieri' : dayFormat(locale).format(new Date(`${selected}T00:00:00Z`));

const headlineFormat = (locale: string) => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// Outlined read-only field showing the chosen date («Oggi», «Ieri» or the date); opens the modal date picker.
// An empty `value` means today (resolved at save time), as in the draft.
// `name` overrides the accessible name of the field (default: the expense date).
export function DateField({ value, error, disabled, name, label, minDate = expensePolicy.minDate, maxDate = todayInRome(), onChange }: { value: string; error?: boolean; disabled?: boolean; name?: string; label?: string; minDate?: string; maxDate?: string; onChange: (date: string) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const today = todayInRome();
  const shown = t(labelOf(value || today, today, locale));
  return (
    <>
      <Pressable style={styles.field} {...{ dataSet: { focusRing: 'field' } }} disabled={disabled} onPress={() => setOpen(true)} accessibilityRole="button" aria-haspopup="dialog" aria-expanded={open}
        aria-disabled={disabled} aria-invalid={Boolean(error)} accessibilityLabel={name ? t("{p0}: {p1}. Cambia data", { p0: name, p1: shown }) : t("Data della spesa: {p0}. Cambia data", { p0: shown })}>
        {/* Keep the decorative input and calendar icon outside hit-testing and keyboard focus. */}
        <div inert>
          <TextInput outlineStyle={inputOutline} label={label ?? t("Data")} value={shown} mode="outlined" readOnly focusable={false} error={error}
            aria-disabled={disabled} showSoftInputOnFocus={false} left={leadingIcon(iconShapes.calendar)} />
        </div>
      </Pressable>
      <DatePickerDialog visible={open} value={value} minDate={minDate} maxDate={maxDate} onDismiss={() => setOpen(false)}
        onConfirm={(date) => { setOpen(false); onChange(date); }} />
    </>
  );
}

// Material 3 modal date picker: headline with the pending date, month grid, Annulla / OK. Days outside the allowed
// range are disabled; the default remains 2000-01-01 … today for ordinary expenses.
function DatePickerDialog({ visible, value, minDate, maxDate, onDismiss, onConfirm }: { visible: boolean; value: string; minDate: string; maxDate: string; onDismiss: () => void; onConfirm: (date: string) => void }) {
  // A sheet on phones; from medium the whole content panel, as before (user's request, 23 November: the sheet in the middle of
  // a desktop page did not please).
  const sheet = useSizeClass() === 'compact';
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const today = todayInRome();
  const [picked, setPicked] = useState(value || today);
  // Reopening always restarts from the current value.
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) { setPicked(value || today); setMonth((value || today).slice(0, 7)); }
  }
  return (
    <Portal>
      <Dialog variant={sheet ? 'sheet' : 'screen'} visible={visible} onDismiss={onDismiss} style={styles.dialog} label={t("Seleziona data")}>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.headline} accessibilityLiveRegion="polite">
              <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Seleziona data")}</Text>
              <Text variant="headlineMedium" style={styles.headlineText}>{headlineFormat(locale).format(new Date(`${picked}T00:00:00Z`))}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            <View style={styles.body}>
              <Calendar selected={picked} month={month} minDate={minDate} maxDate={maxDate} onMonth={setMonth} onPick={setPicked} />
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={dialogActionsRow}>
          {/* Smaller than the other dialogs' actions (user's request, 21 November); «OK» keeps a minimum width all the same
              (17 November: it was 37 dp wide). */}
          <CancelButton small onPress={onDismiss}>{t("Annulla")}</CancelButton>
          <ConfirmButton small disabled={picked < minDate || picked > maxDate} onPress={() => onConfirm(picked === today ? '' : picked)}>OK</ConfirmButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Calendar({ selected, month, minDate, maxDate, onMonth, onPick }: { selected: string; month: string; minDate: string; maxDate: string; onMonth: (month: string) => void; onPick: (date: string) => void }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const today = todayInRome();
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lead = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, index) => (index < lead || index >= lead + days ? null : iso(year, monthIndex, index - lead + 1)));
  const shift = (delta: number) => onMonth(iso(year, monthIndex + delta, 1).slice(0, 7));
  const canPrev = iso(year, monthIndex, 1) > minDate;
  const canNext = iso(year, monthIndex + 1, 1) <= maxDate;
  const nav = (label: string, shape: string, enabled: boolean, onPress: () => void) => (
    <StateLayerPressable layerColor={colors.onSurface} radius={radius.pill} disabled={!enabled} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={label} style={styles.nav}>
      <SvgIcon shape={shape} size={20} color={colors.onSurface} />
    </StateLayerPressable>
  );
  return (
    <View>
      <View style={styles.header}>
        {nav(t("Mese precedente"), iconShapes.chevronLeft, canPrev, () => shift(-1))}
        <Text variant="titleSmall" accessibilityLiveRegion="polite" style={styles.month}>{monthFormat(locale).format(new Date(Date.UTC(year, monthIndex, 1)))}</Text>
        {nav(t("Mese successivo"), iconShapes.chevronRight, canNext, () => shift(1))}
      </View>
      <View style={styles.grid}>
        {(locale === 'it-IT' ? italianWeekdays : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, index) => <View key={index} style={styles.cell}><Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{day}</Text></View>)}
        {cells.map((date, index) => {
          if (!date) return <View key={index} style={styles.cell} />;
          const active = date === selected;
          const allowed = date >= minDate && date <= maxDate;
          return (
            <View key={index} style={styles.cell}>
              <StateLayerPressable layerColor={active ? colors.onPrimary : colors.onSurface} radius={radius.pill} disabled={!allowed}
                onPress={() => onPick(date)} accessibilityRole="button" aria-pressed={active}
                accessibilityLabel={dayFormat(locale).format(new Date(`${date}T00:00:00Z`))}
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
  // Material 3 minimum width of a text button.
  field: { borderRadius: radius.input },
  dialog: { maxWidth: 360 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginTop: 0, marginBottom: 0 },
  headline: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  headlineText: { textTransform: 'capitalize' },
  divider: { height: 1 },
  body: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { textTransform: 'capitalize' },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: '100%', maxWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
