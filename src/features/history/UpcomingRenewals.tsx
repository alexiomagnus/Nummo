import { useHeroIconEntry } from './DetailScreen';
import { useI18n } from '../../i18n/I18nProvider';
import { dateTimeFormat } from '../../i18n/translate';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ScreenLayer } from '../../components/ScreenLayer';
import { listRowStyles } from '../../components/ListRow';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Renewal } from '../../domain/history';
import { radius, spacing } from '../../theme/tokens';

const dateFormat = (locale: string) => dateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type Props = { renewals: readonly Renewal[]; categories: readonly Category[]; soon: number; days: number };

// Forecast, kept apart from the spending list: these payments have not happened yet, so they are not in the totals, the
// dashboard or the exports. A prominent summary card; a tap opens the renewals on a screen of their own, sliding up from
// the bottom (23 November, on request: in place of the list opened inside the card).
const cardId = 'upcoming-renewals-card';

export function UpcomingRenewals({ renewals, categories, soon, days }: Props) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (renewals.length === 0) return null;
  const count = renewals.length === 1 ? t("1 rinnovo") : t("{p0} rinnovi", { p0: renewals.length });
  const tone = { color: colors.onPrimaryContainer };
  return (
    <View nativeID={cardId} style={[styles.card, { backgroundColor: colors.primaryContainer }]}>
      <StateLayerPressable onPress={() => setOpen(true)} layerColor={colors.onPrimaryContainer} radius={radius.dialog}
        accessibilityRole="button" aria-haspopup="dialog" accessibilityLabel={t("Prossimo mese, {p0} entro {p1} giorni", { p0: formatAmount(soon), p1: days })}
        style={styles.header}>
        <View style={[styles.tile, { backgroundColor: colors.primary }]}>
          <SvgIcon shape={iconShapes.calendar} size={26} color={colors.onPrimary} />
        </View>
        <View style={styles.text}>
          <Text variant="titleMedium" style={[tone, styles.strong]}>{t("Prossimo mese")}</Text>
          <View style={styles.figures}>
            <Text variant="headlineSmall" style={[tone, styles.amount, styles.strong]}>{formatAmount(soon)}</Text>
            <View aria-hidden style={[styles.figureDivider, { backgroundColor: colors.onPrimaryContainer }]} />
            <Text variant="bodyLarge" style={tone}>{count}</Text>
          </View>
        </View>
        <SvgIcon shape={iconShapes.chevronRight} size={24} color={colors.onPrimaryContainer} />
      </StateLayerPressable>
      {/* The page's own colours, like every other screen (user's request, 24 November; the card's colour from the 23rd), with the
          summary in the card's colour. On phones it is dragged like the details (whole, peek, closed) and has no Back button (user's
          request, 24 November). */}
      {open && <Portal><ScreenLayer label={t("Prossimo mese")} backLabel={t("Torna agli abbonamenti")}
        onBack={() => setOpen(false)} onEscape={() => setOpen(false)}>
        <RenewalsContent renewals={renewals} categories={categories} soon={soon} count={count} days={days} />
      </ScreenLayer></Portal>}
    </View>
  );
}

function RenewalsContent({ renewals, categories, soon, count, days }: Props & { count: string }) {
  const { t, locale, formatAmount } = useI18n();
  const { colors } = useTheme();
  // The list in the page's colours; the summary on top in the colours of the card it was opened from (container, its ink, the icon
  // tile as on the card), so the screen keeps the colour of the card (user's request, 24 November).
  const tone = { color: colors.onSurface };
  const muted = { color: colors.onSurfaceVariant };
  const card = { color: colors.onPrimaryContainer };
  // The same entry as the icon of the details (user's request, 26 November).
  const { tile, glyph } = useHeroIconEntry();
  return <>
    <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
      <View ref={tile} style={[styles.heroTile, { backgroundColor: colors.primary }]}>
        <View ref={glyph}><SvgIcon shape={iconShapes.calendar} size={32} color={colors.onPrimary} /></View>
      </View>
      <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={[card, styles.center]}>{t("Prossimo mese")}</Text>
      <Text variant="displaySmall" style={[card, styles.amount, styles.bold, styles.center]}>{formatAmount(soon)}</Text>
      <Text variant="bodyLarge" style={[card, styles.soft, styles.center]}>{t("{p0} entro {p1} giorni", { p0: count, p1: days })}</Text>
    </View>
    <View role="list">
      {renewals.map(({ occurrence, previous }, index) => {
        const category = categories.find((c) => c.id === occurrence.category_id);
        const changed = occurrence.amount_minor !== previous;
        const details = [dateFormat(locale).format(new Date(`${occurrence.date}T00:00:00Z`)),
          changed && t("da {p0}", { p0: formatAmount(previous) })].filter(Boolean).join(' · ');
        return (
          <View key={occurrence.key} role="listitem">
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
            <View style={styles.row}>
              <View aria-hidden style={styles.rowIcon}>{category?.icon ? <CategoryGlyph icon={category.icon} size={24} color={colors.onSurfaceVariant} />
                : <SvgIcon shape={iconShapes.tag} size={24} color={colors.onSurfaceVariant} />}</View>
              <View style={styles.text}>
                <Text variant="titleMedium" numberOfLines={2} style={[tone, styles.strong]}>{occurrence.description}</Text>
                <Text variant="bodyMedium" style={muted}>{details}</Text>
              </View>
              <Text variant="titleLarge" style={[tone, listRowStyles.amount]}>{formatAmount(occurrence.amount_minor)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  </>;
}

const styles = StyleSheet.create({
  // Same footprint as a subscription row (ListRow outlined: radius, side padding, height with the status badge).
  card: { borderRadius: radius.dialog },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 80, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  tile: { width: 44, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  amount: { fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '600' },
  // Same separator as the «Totale» card of Spese.
  figures: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.md },
  figureDivider: { width: 1, height: 20, alignSelf: 'center', opacity: 0.4 },
  hero: { alignItems: 'center', gap: spacing.sm, borderRadius: radius.dialog, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  // The card's tile, larger.
  heroTile: { width: 64, height: 64, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  soft: { opacity: 0.85 },
  center: { textAlign: 'center' },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  rowIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
});
