import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Renewal } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { radius, spacing } from '../../theme/tokens';

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type Props = { renewals: readonly Renewal[]; categories: readonly Category[]; soon: number; days: number };

// Forecast, kept apart from the spending list: these payments have not happened yet, so they are
// not in the totals, the dashboard or the exports. One discreet line, expandable.
export function UpcomingRenewals({ renewals, categories, soon, days }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (renewals.length === 0) return null;
  return (
    <View>
      <StateLayerPressable onPress={() => setOpen(!open)} layerColor={colors.onSurface} radius={radius.control}
        accessibilityRole="button" aria-expanded={open} accessibilityLabel={t("Prossimi rinnovi, {p0} entro {p1} giorni", { p0: formatAmount(soon), p1: days })}
        style={[styles.header, { borderColor: colors.outlineVariant }]}>
        <Text variant="titleSmall" style={styles.title}>{t("Prossimi rinnovi")}</Text>
        <Text variant="bodyMedium" style={[styles.amount, { color: colors.onSurfaceVariant }]}>{formatAmount(soon)} · {days} {t("giorni")}</Text>
        <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={20} color={colors.onSurfaceVariant} />
      </StateLayerPressable>
      {open && (
        <View role="list">
          {renewals.map(({ occurrence, previous }, index) => {
            const category = categories.find((entry) => entry.id === occurrence.category_id);
            const changed = occurrence.amount_minor !== previous;
            const details = [dateFormat(locale).format(new Date(`${occurrence.date}T00:00:00Z`)), category?.label,
              occurrence.recurrence && t(recurrenceLabels[occurrence.recurrence]),
              changed && t("da {p0}", { p0: formatAmount(previous) })].filter(Boolean).join(' · ');
            return (
              <ListRow key={occurrence.key} divider={index < renewals.length - 1} icon={category?.icon ?? null} title={occurrence.description} subtitle={details}
                trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount, { color: colors.onSurfaceVariant }]}>{formatAmount(occurrence.amount_minor)}</Text>} />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1 },
  title: { flex: 1 },
  amount: { fontVariant: ['tabular-nums'] },
  rowAmount: { minWidth: 96, textAlign: 'right' },
});
