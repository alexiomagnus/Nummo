import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { listRowStyles } from '../../components/ListRow';
import { Reveal } from '../../components/Reveal';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Renewal } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type Props = { renewals: readonly Renewal[]; categories: readonly Category[]; soon: number; days: number };

// Forecast, kept apart from the spending list: these payments have not happened yet, so they are
// not in the totals, the dashboard or the exports. A prominent summary card, expandable.
export function UpcomingRenewals({ renewals, categories, soon, days }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (renewals.length === 0) return null;
  const count = renewals.length === 1 ? t("1 rinnovo") : t("{p0} rinnovi", { p0: renewals.length });
  const tone = { color: colors.onPrimaryContainer };
  return (
    <View style={[styles.card, { backgroundColor: colors.primaryContainer }]}>
      <StateLayerPressable onPress={() => setOpen(!open)} layerColor={colors.onPrimaryContainer} radius={radius.card}
        accessibilityRole="button" aria-expanded={open} accessibilityLabel={t("Prossimi rinnovi, {p0} entro {p1} giorni", { p0: formatAmount(soon), p1: days })}
        style={styles.header}>
        <View style={[styles.tile, { backgroundColor: colors.primary }]}>
          <SvgIcon shape={iconShapes.calendar} size={26} color={colors.onPrimary} />
        </View>
        <View style={styles.text}>
          <Text variant="titleMedium" style={[tone, styles.strong]}>{t("Prossimi rinnovi")}</Text>
          <Text variant="bodyLarge" style={tone}><Text variant="headlineSmall" style={[tone, styles.amount, styles.strong]}>{formatAmount(soon)}</Text> · {count}</Text>
        </View>
        <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={24} color={colors.onPrimaryContainer} />
      </StateLayerPressable>
      {open && (
        <Reveal role="list" style={styles.list}>
          {renewals.map(({ occurrence, previous }, index) => {
            const changed = occurrence.amount_minor !== previous;
            const details = [dateFormat(locale).format(new Date(`${occurrence.date}T00:00:00Z`)),
              changed && t("da {p0}", { p0: formatAmount(previous) })].filter(Boolean).join(' · ');
            return (
              <View key={occurrence.key} role="listitem">
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.onPrimaryContainer }]} />}
                <View style={styles.item}>
                  <View style={styles.text}>
                    <Text variant="titleMedium" numberOfLines={2} style={[tone, styles.strong]}>{occurrence.description}</Text>
                    <Text variant="bodyMedium" style={tone}>{details}</Text>
                  </View>
                  <Text variant="titleLarge" style={[tone, listRowStyles.amount]}>{formatAmount(occurrence.amount_minor)}</Text>
                </View>
              </View>
            );
          })}
        </Reveal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same footprint as a subscription row (ListRow outlined: radius, side padding, height with the status badge).
  card: { borderRadius: radius.control },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 80, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  tile: { width: 44, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  amount: { fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, opacity: 0.25 },
});
