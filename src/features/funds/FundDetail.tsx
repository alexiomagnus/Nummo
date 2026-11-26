import { useLayoutEffect, useRef, type ComponentRef } from 'react';
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
import { InfoGroup, PrimaryAction, detailActions, outlinedActionContent } from '../history/DetailScreen';
import { useReducedMotion, useSizeClass } from '../../theme/useSizeClass';
import { heroIconSpring } from '../../theme/containerTransform';
import { springEasing } from '../../theme/themeTransition';
import { BudgetMeter } from './BudgetMeter';
import { FundAvatar } from './FundAvatar';

// Screen of one fund (23 November, on request: «fai diventare schermi anche le schede dei fondi»), in place of the summary
// opened inside the card and of the card's own buttons. The same screen layer as the expenses (components/ScreenLayer.tsx):
// it slides up from the bottom and back down. The month is the one shown by the page; the
// figures are the same as before (the month's summary, never a list of expenses or movements, no balance).

// DOM id of each fund card (FundsPage), a stable hook for checks in the browser.
export const fundCardId = (id: string) => `fund-card-${id}`;

export type FundDetailProps = {
  item: FundMonth;
  monthLabel: string;
  isDefault: boolean;
  // The fund holds money (opening balance, monthly recharge or a transfer, `hasBalanceData`): only then the month has a «Totale».
  hasBalance: boolean;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
  // Only for archived funds (active ones are deleted from their edit screen).
  remove: { blocked?: string; title: string; description: string; onDelete: () => Promise<boolean> };
};

export function FundDetail(props: FundDetailProps) {
  const { t } = useI18n();
  const { fund } = props.item;
  return <Portal><ScreenLayer key={fund.id} label={t("Dettagli di {p0}", { p0: fund.name })}
    backLabel={t("Torna ai fondi")} onBack={props.onClose} onEscape={props.onClose}>
    <FundContent {...props} />
  </ScreenLayer></Portal>;
}

function FundContent({ item, monthLabel, isDefault, hasBalance, canWrite, onEdit, onArchive, remove }: FundDetailProps) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  // Archiving or restoring changes the screen in place (the «Archiviato» mark, the actions): a soft transition instead of a jump (user's
  // request, 25 November): the avatar settles from a little smaller, the marks and the new actions come in from below, on the spring of
  // the detail icons. Nothing at the opening, nothing with reduced motion.
  const reduced = useReducedMotion();
  const avatarRef = useRef<ComponentRef<typeof View>>(null);
  const marksRef = useRef<ComponentRef<typeof View>>(null);
  const actionsRef = useRef<ComponentRef<typeof View>>(null);
  const wasArchived = useRef(item.fund.archived);
  useLayoutEffect(() => {
    if (wasArchived.current === item.fund.archived) return undefined;
    wasArchived.current = item.fund.archived;
    if (reduced) return undefined;
    const spring = springEasing(heroIconSpring);
    const easing = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : 'cubic-bezier(0.2, 0, 0, 1)';
    const fade = { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' as const };
    const node = (ref: { current: unknown }) => { const element = ref.current as HTMLElement | null; return element && typeof element.animate === 'function' ? element : null; };
    const moves: Animation[] = [];
    const avatar = node(avatarRef);
    if (avatar) moves.push(avatar.animate({ transform: ['scale(0.82) rotate(-8deg)', 'scale(1) rotate(0deg)'] }, { duration: spring.duration, easing }));
    const marks = node(marksRef);
    if (marks) moves.push(marks.animate({ transform: ['translateY(8px) scale(0.9)', 'none'] }, { duration: spring.duration, delay: 60, easing, fill: 'backwards' }),
      marks.animate({ opacity: [0, 1] }, { ...fade, delay: 60 }));
    const actions = node(actionsRef);
    if (actions) moves.push(actions.animate({ transform: ['translateY(16px)', 'none'] }, { duration: spring.duration, delay: 120, easing, fill: 'backwards' }),
      actions.animate({ opacity: [0, 1] }, { ...fade, delay: 120 }));
    return () => moves.forEach((move) => move.cancel());
  }, [item.fund.archived, reduced]);
  // The actions share one row in equal parts, from medium (24 November) and on phones too (27 November, on request: two stacked pills
  // pushed «Archivia» under the bottom edge on a 411×914 screen, now that the page also draws under the status bar).
  const wide = useSizeClass() !== 'compact';
  const { fund } = item;
  const forecast = item.kind === 'future';
  const spentNow = forecast ? item.forecastSpent : item.spent;
  const muted = { color: colors.onSurfaceVariant };
  const positive = positiveColor(colors);
  // The month in a few totals, always the same rows: money in «+» in green, money out «−» in red, a zero plain and muted.
  const total = (key: string, label: string, value: number, tone: 'in' | 'out') => {
    const sign = value === 0 ? '' : tone === 'in' ? '+' : '−';
    const color = value === 0 ? colors.onSurfaceVariant : tone === 'in' ? positive : colors.error;
    return (
      <View key={key} style={[styles.line, !wide && styles.linePhone]} role="listitem" aria-label={`${label}: ${sign}${formatAmount(value)}`}>
        <Text variant="bodyLarge" style={[styles.grow, muted]}>{label}</Text>
        <Text variant="bodyLarge" style={[styles.number, styles.strong, { color }]}>{sign}{formatAmount(value)}</Text>
      </View>
    );
  };
  // «Totale» (user's request, 27 November): what came in this month (opening balance in the fund's first month, entrata, recharge,
  // transfers received) minus what went out (subscriptions, expenses, transfers sent); a loss reads red. Only for a fund with money.
  const received = item.initial + item.income + item.recharges + item.forecastRecharges + item.transfersIn;
  const net = received - (spentNow + item.transfersOut);
  return <>
    <View style={[styles.hero, !wide && styles.heroPhone]}>
      <View ref={avatarRef}><FundAvatar fund={fund} size={wide ? 72 : 56} /></View>
      <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={styles.center}>{fund.name}</Text>
      <Text variant="displaySmall" style={[styles.amount, styles.center]}>{formatAmount(spentNow)}</Text>
      <Text variant="bodyMedium" style={[muted, styles.center]}>
        {`${forecast ? t("previsti") : t("speso nel mese")}\u2002|\u2002${monthLabel}`}</Text>
      {(isDefault || fund.archived) && <View ref={marksRef} style={styles.marks}>
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
    {/* Two blocks under a title (user's request, 27 November): what came in and what went out. The total spent is no longer a row: it is
        the big number on top (it was the same figure twice). Every row stays, zeros included. */}
    <View role="list" accessibilityLabel={t("Riepilogo del mese")} style={[styles.blocks, !wide && styles.blocksPhone]}>
      <View style={styles.block}>
        <Text variant="titleSmall" accessibilityRole="header" aria-level={2} style={[{ color: colors.primary }, styles.blockTitle]}>{t("Entrate")}</Text>
        <InfoGroup rows={[
          // The opening balance only counts in the month the fund starts.
          ...(item.initial > 0 ? [total('initial', t("Saldo iniziale"), item.initial, 'in')] : []),
          total('income', t("Entrata"), item.income, 'in'),
          // The month's recharge: received or still due within the month (forecast for future months).
          total('recharge', t("Ricarica mensile"), item.recharges + item.forecastRecharges, 'in'),
          total('in', t("Trasferimenti ricevuti"), item.transfersIn, 'in'),
        ]} />
      </View>
      <View style={styles.block}>
        <Text variant="titleSmall" accessibilityRole="header" aria-level={2} style={[{ color: colors.primary }, styles.blockTitle]}>{t("Uscite")}</Text>
        <InfoGroup rows={[
          total('subscriptions', t("Abbonamenti"), item.subscriptions, 'out'),
          total('singles', t("Spese"), item.singles, 'out'),
          total('out', t("Trasferimenti inviati"), item.transfersOut, 'out'),
        ]} />
      </View>
      {hasBalance && <View style={styles.block}>
        <Text variant="titleSmall" accessibilityRole="header" aria-level={2} style={[{ color: colors.primary }, styles.blockTitle]}>{t("Totale")}</Text>
        <InfoGroup rows={[total('net', t("Bilancio del mese"), Math.abs(net), net < 0 ? 'out' : 'in')]} />
      </View>}
    </View>
    {/* Actions as on the other screens: full-width pills, the main one first. */}
    <ScreenActionsContext.Provider value>
      <View style={styles.actions}>
        <View ref={actionsRef} style={detailActions.line}>
        {fund.archived ? <>
          <PrimaryAction label={t("Ripristina")} icon={iconShapes.archive} onPress={() => onArchive(false)} style={detailActions.part} />
          <View style={detailActions.part}><DeleteAction labeled disabled={!canWrite} name={fund.name} blocked={remove.blocked} title={remove.title} description={remove.description}
            onDelete={remove.onDelete} /></View>
        </> : <>
          <PrimaryAction label={t("Modifica")} accessibilityLabel={t("Modifica {p0}", { p0: fund.name })} icon={iconShapes.pencil} onPress={onEdit} style={detailActions.part} />
          {/* «Aggiungi denaro» is no longer here (user's request, 25 November): money is added from the page's «Aggiungi». */}
          <View style={[styles.row, detailActions.part]}>
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
  // On phones everything is a little tighter so that «Archivia» is on the first screen without scrolling (user's request, 27 November).
  heroPhone: { gap: spacing.xs, paddingBottom: 0 },
  blocks: { gap: spacing.lg },
  blocksPhone: { gap: spacing.md },
  block: { gap: spacing.sm },
  blockTitle: { paddingHorizontal: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  linePhone: { minHeight: 44, paddingVertical: spacing.xs },
  grow: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  number: { fontVariant: ['tabular-nums'] },
  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Pill-shaped like «Modifica» above them, as in the subscription's detail (user's request, 24 November).
  half: { flexGrow: 1, flexBasis: 100, minWidth: 0, borderRadius: radius.pill },
});
