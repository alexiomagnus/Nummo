import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { AppDialog } from '../../components/AppDialog';
import { ConfirmButton } from '../../components/Button';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { DateField } from '../../components/DateField';
import { todayInRome } from '../../domain/policy';
import { occurrenceDateAt, recurrenceLabels, type CalendarChange, type Recurrence } from '../../domain/recurrence';
import { maxFirstPaymentDate } from '../../domain/trial';
import { useHeroIconEntry } from '../history/DetailScreen';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import { NextRenewalRow, formatLongDate } from './PriceSchedule';
import { RecurrencePicker } from './RecurrencePicker';

type Props = {
  value: Recurrence;
  // Frequency in force for the next renewal, the next renewal itself (null = none left) and the day after today.
  current: Recurrence;
  next: { index: number; date: string } | null;
  firstDate: string;
  tomorrow: string;
  // A switch already saved that has not taken effect yet.
  pending: CalendarChange | null;
  error?: string;
  disabled?: boolean;
  onChange: (patch: { frequency?: Recurrence; firstDate?: string }) => void;
};

// Frequency of an existing series (issue #9). Only future renewals change: payments already made keep their dates. With
// no payment made yet (a trial still running) the frequency simply replaces the saved one; afterwards the calendar
// restarts on the chosen date, which is proposed as the renewal that was already planned.
export function FrequencyField({ value, current, next, firstDate, tomorrow, pending, error, disabled, onChange, hideTitle }: Props & { hideTitle?: boolean }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  if (!next) return null;
  const changed = value !== current;
  return <View style={{ gap: spacing.sm }}>
    {!hideTitle && <Text variant="titleSmall">{t("Frequenza")}</Text>}
    <RecurrencePicker value={value} disabled={disabled} onChange={(frequency) => onChange({ frequency })} />
    {pending && <Text variant="bodySmall" style={muted}>
      {t("Cambio già programmato: dal {p0}, {p1}.", { p0: formatLongDate(pending.start, locale), p1: t(recurrenceLabels[pending.recurrence]).toLocaleLowerCase(locale) })}</Text>}
    {/* No explanatory lines under the choice (user's request, 25 November): payments already made never change. */}
    {changed && next.index > 0 && <DateField name={t("Primo rinnovo con la nuova frequenza")} label={t("Primo rinnovo con la nuova frequenza")} value={firstDate}
      minDate={tomorrow} maxDate={maxFirstPaymentDate} error={Boolean(error)} disabled={disabled}
      onChange={(date) => onChange({ firstDate: date || todayInRome() })} />}
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
}

// The frequency is edited on a screen of its own (user's request, 26 November: the series editor was crowded), opened by the row of
// the next renewal, which ends with an arrow (a row of its own «Frequenza» was tried the same day and removed). The screen holds the
// choice, the pending switch and the date of the first renewal. Nothing is saved there: the draft stays in the editor and «Salva» applies it.
export function FrequencyEntry({ renewal, ...props }: Props & { renewal: { date: string; amount: number } }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!props.next) return <NextRenewalRow date={renewal.date} amount={renewal.amount} />;
  return <View style={{ gap: spacing.xs }}>
    <NextRenewalRow date={renewal.date} amount={renewal.amount} disabled={props.disabled} onPress={() => setOpen(true)} />
    {/* An error found when saving would otherwise stay hidden behind the closed screen. */}
    {!open && props.error && <HelperText type="error" accessibilityRole="alert">{t(props.error)}</HelperText>}
    {open && <Portal><AppDialog visible onDismiss={() => setOpen(false)}>
      <AppDialog.Title>{t("Frequenza")}</AppDialog.Title>
      <AppDialog.Content><View style={styles.content}>
        <FrequencyOverview {...props} renewal={renewal} />
        <FrequencyField {...props} hideTitle />
        <UpcomingDates {...props} renewal={renewal} />
      </View></AppDialog.Content>
      <AppDialog.Actions><ConfirmButton onPress={() => setOpen(false)}>{t("Fatto")}</ConfirmButton></AppDialog.Actions>
    </AppDialog></Portal>}
  </View>;
}

const everyLabel: Record<Recurrence, string> = { weekly: 'Ogni settimana', monthly: 'Ogni mese', yearly: 'Ogni anno' };

// First date of the calendar as the choice would leave it: the saved next renewal when nothing changes (or no payment has been made
// yet: the frequency then replaces the saved one and the first payment stays), the chosen date otherwise.
const calendarStart = (p: Props, renewal: { date: string }) => p.next && p.value !== p.current && p.next.index > 0 ? p.firstDate : renewal.date;

// What the choice means at a glance (user's request, 26 November: the screen was too empty): the frequency in words, under its icon.
function FrequencyOverview(props: Props & { renewal: { date: string; amount: number } }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { tile, glyph } = useHeroIconEntry();
  return <View style={[styles.hero, { backgroundColor: colors.secondaryContainer }]}>
    <View ref={tile} style={[styles.heroTile, { backgroundColor: colors.secondary }]}>
      <View ref={glyph}><SvgIcon shape={iconShapes.rotateCcw} size={32} color={colors.onSecondary} /></View>
    </View>
    <Text variant="headlineSmall" accessibilityRole="header" aria-level={2} style={{ color: colors.onSecondaryContainer }}>{t(everyLabel[props.value])}</Text>
  </View>;
}

// The next renewals the choice would give, so the effect of a change shows before saving. Prices that change later are not
// projected: every row shows the amount of the next renewal.
function UpcomingDates(props: Props & { renewal: { date: string; amount: number } }) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  if (!props.next) return null;
  const start = calendarStart(props, props.renewal);
  const dates = [0, 1, 2, 3].map((n) => occurrenceDateAt(start, props.value, n));
  return <View style={{ gap: spacing.xs }}>
    <Text variant="titleSmall">{t("Prossimi rinnovi")}</Text>
    <View role="list">
      {dates.map((date, index) => <View key={date} role="listitem">
        {index > 0 && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
        <View style={styles.dateRow}>
          <Text variant="bodyLarge" style={styles.dateText}>{formatLongDate(date, locale)}</Text>
          <Text variant="bodyLarge" style={styles.amount}>{formatAmount(props.renewal.amount)}</Text>
        </View>
      </View>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, borderRadius: radius.dialog, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  heroTile: { width: 64, height: 64, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  divider: { height: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.md },
  dateText: { flex: 1, minWidth: 0 },
  amount: { fontVariant: ['tabular-nums'], fontWeight: '600' },
});
