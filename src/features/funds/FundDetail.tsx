import { StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import { ScreenLayer } from '../../components/ScreenLayer';
import { ScreenActionsContext } from '../../components/screenActions';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { FundMonth } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { positiveColor } from '../../theme/theme';
import { radius, spacing } from '../../theme/tokens';
import { InfoGroup, PrimaryAction, detailActions, outlinedActionContent, secondaryActionContent } from '../history/DetailScreen';
import { useSizeClass } from '../../theme/useSizeClass';
import { BudgetMeter } from './BudgetMeter';
import { FundAvatar } from './FundAvatar';

// Screen of one fund (23 November, on request: «fai diventare schermi anche le schede dei fondi»), in place of the summary
// opened inside the card and of the card's own buttons. The same screen layer and container transform as the expenses
// (components/ScreenLayer.tsx): it grows from the card and goes back into it. The month is the one shown by the page; the
// figures are the same as before (the month's summary, never a list of expenses or movements, no balance).

// DOM id of each fund card (FundsPage): the origin and destination of the transform.
export const fundCardId = (id: string) => `fund-card-${id}`;

export type FundDetailProps = {
  item: FundMonth;
  monthLabel: string;
  isDefault: boolean;
  // The fund keeps a balance: «Aggiungi denaro».
  tracksBalance: boolean;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAdd: () => void;
  onArchive: (archived: boolean) => void;
  // Only for archived funds (active ones are deleted from their edit screen).
  remove: { blocked?: string; title: string; description: string; onDelete: () => Promise<boolean> };
};

export function FundDetail(props: FundDetailProps) {
  const { t } = useI18n();
  const { fund } = props.item;
  return <Portal><ScreenLayer key={fund.id} originId={fundCardId(fund.id)} detents label={t("Dettagli di {p0}", { p0: fund.name })}
    backLabel={t("Torna ai fondi")} onBack={props.onClose} onEscape={props.onClose}>
    <FundContent {...props} />
  </ScreenLayer></Portal>;
}

function FundContent({ item, monthLabel, isDefault, tracksBalance, canWrite, onEdit, onAdd, onArchive, remove }: FundDetailProps) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  // From medium the actions share one row in equal parts (user's request, 24 November).
  const wide = useSizeClass() !== 'compact';
  const { fund } = item;
  const forecast = item.kind === 'future';
  const spentNow = forecast ? item.forecastSpent : item.spent;
  const muted = { color: colors.onSurfaceVariant };
  const positive = positiveColor(colors);
  // The month in a few totals, always the same rows: money in «+» in green, money out «−» in red, a zero plain and muted; the
  // total spent closes the summary in bold, unsigned (as in the card before).
  const total = (key: string, label: string, value: number, tone: 'in' | 'out' | 'total') => {
    const strong = tone === 'total';
    const sign = value === 0 ? '' : tone === 'in' ? '+' : tone === 'out' ? '−' : '';
    const color = strong ? colors.onSurface : value === 0 ? colors.onSurfaceVariant : tone === 'in' ? positive : colors.error;
    return (
      <View key={key} style={styles.line} role="listitem" aria-label={`${label}: ${sign}${formatAmount(value)}`}>
        <Text variant={strong ? 'titleMedium' : 'bodyLarge'} style={[styles.grow, strong ? styles.strong : muted]}>{label}</Text>
        <Text variant={strong ? 'titleMedium' : 'bodyLarge'} style={[styles.number, styles.strong, { color }]}>{sign}{formatAmount(value)}</Text>
      </View>
    );
  };
  return <>
    <View style={styles.hero}>
      <FundAvatar fund={fund} size={72} />
      <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={styles.center}>{fund.name}</Text>
      <Text variant="displaySmall" style={[styles.amount, styles.center]}>{formatAmount(spentNow)}</Text>
      <Text variant="bodyMedium" style={[muted, styles.center]}>
        {`${forecast ? t("previsti") : t("speso nel mese")} · ${monthLabel}`}</Text>
      {(isDefault || fund.archived) && <View style={styles.marks}>
        {isDefault && <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
          <SvgIcon shape={iconShapes.star} size={16} color={colors.onSecondaryContainer} />
          <Text variant="labelMedium" style={{ color: colors.onSecondaryContainer }}>{t("Preferito")}</Text>
        </View>}
        {fund.archived && <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
          <SvgIcon shape={iconShapes.archive} size={16} color={colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{t("Archiviato")}</Text>
        </View>}
      </View>}
    </View>
    {item.budget !== null && <BudgetMeter label={t("Budget di {p0}", { p0: fund.name })}
      spent={spentNow} budget={item.budget} state={item.state} forecast={forecast} />}
    <View role="list" accessibilityLabel={t("Riepilogo del mese")}>
      <InfoGroup rows={[
        total('income', t("Entrata"), item.income, 'in'),
        // The month's recharge: received or still due within the month (forecast for future months).
        total('recharge', t("Ricarica mensile"), item.recharges + item.forecastRecharges, 'in'),
        total('in', t("Trasferimenti ricevuti"), item.transfersIn, 'in'),
        total('out', t("Trasferimenti inviati"), item.transfersOut, 'out'),
        total('subscriptions', t("Abbonamenti"), item.subscriptions, 'out'),
        total('singles', t("Spese"), item.singles, 'out'),
        total('total', forecast ? t("Spesa totale prevista") : t("Spesa totale"), spentNow, 'total'),
      ]} />
    </View>
    {/* Actions as on the other screens: full-width pills, the main one first. */}
    <ScreenActionsContext.Provider value>
      <View style={styles.actions}>
        <View style={wide ? detailActions.line : styles.actions}>
        {fund.archived ? <>
          <PrimaryAction label={t("Ripristina")} icon={iconShapes.archive} onPress={() => onArchive(false)} style={wide && detailActions.part} />
          <View style={wide ? detailActions.part : undefined}><DeleteAction labeled disabled={!canWrite} name={fund.name} blocked={remove.blocked} title={remove.title} description={remove.description}
            onDelete={remove.onDelete} /></View>
        </> : <>
          <PrimaryAction label={t("Modifica")} accessibilityLabel={t("Modifica {p0}", { p0: fund.name })} icon={iconShapes.pencil} onPress={onEdit} style={wide && detailActions.part} />
          <View style={[styles.row, wide && [detailActions.part, { flexGrow: tracksBalance ? 2 : 1 }]]}>
            {tracksBalance && <Button mode="contained-tonal" disabled={!canWrite} style={styles.half} contentStyle={secondaryActionContent} accessibilityLabel={t("Aggiungi denaro a {p0}", { p0: fund.name })}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />} onPress={onAdd}>{t("Aggiungi denaro")}</Button>}
            <Button mode="outlined" disabled={!canWrite} style={styles.half} contentStyle={outlinedActionContent} onPress={() => onArchive(true)}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.archive} size={size} color={color} />}>{t("Archivia")}</Button>
          </View>
        </>}
        </View>
        {!canWrite && <Text variant="bodySmall" style={[muted, styles.center]}>{t("Le modifiche ai fondi richiedono la connessione e dati sincronizzati.")}</Text>}
      </View>
    </ScreenActionsContext.Provider>
  </>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  center: { textAlign: 'center' },
  amount: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  grow: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  number: { fontVariant: ['tabular-nums'] },
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Pill-shaped like «Modifica» above them, as in the subscription's detail (user's request, 24 November).
  half: { flexGrow: 1, flexBasis: 140, borderRadius: radius.pill },
});
