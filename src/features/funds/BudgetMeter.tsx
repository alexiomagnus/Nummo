import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { BudgetState } from '../../domain/funds';
import { useI18n } from '../../i18n/I18nProvider';
import { transition } from '../../theme/motion';
import { radius, spacing } from '../../theme/tokens';

const fillTransition = transition(['transform', 'background-color'], 400);

// Budget usage: spent against the month's limit. The state is always written (never colour alone); over the limit the
// bar turns to the error colour but nothing is blocked. The fill scales with transform (no layout animation).
export function BudgetMeter({ spent, budget, state, forecast, label }: { spent: number; budget: number; state: BudgetState; forecast?: boolean; label: string }) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const share = budget > 0 ? Math.min(spent / budget, 1) : 1;
  const remaining = budget - spent;
  const color = state === 'over' ? colors.error : state === 'near' || state === 'reached' ? colors.tertiary : colors.primary;
  const status = state === 'over' ? t("Budget superato di {p0}", { p0: formatAmount(-remaining) })
    : state === 'reached' ? t("Budget raggiunto")
    : state === 'near' ? t("Vicino al limite: restano {p0}", { p0: formatAmount(remaining) })
    : t("Restano {p0}", { p0: formatAmount(remaining) });
  const summary = forecast ? t("Previsti {p0} di {p1}", { p0: formatAmount(spent), p1: formatAmount(budget) })
    : t("Spesi {p0} di {p1}", { p0: formatAmount(spent), p1: formatAmount(budget) });
  return (
    <View style={styles.root}>
      <View role="progressbar" aria-label={`${label}: ${summary}. ${status}`} aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.min(spent, budget)}
        style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.fill, { backgroundColor: color, transform: [{ scaleX: share }] } as ViewStyle, fillTransition]} />
      </View>
      <View style={styles.text} aria-hidden>
        <Text variant="bodyMedium" style={[styles.number, { color: colors.onSurfaceVariant }]}>{summary}</Text>
        <View style={styles.status}>
          {state !== 'ok' && <SvgIcon shape={state === 'over' ? iconShapes.alert : iconShapes.checkCircle} size={16} color={state === 'over' ? colors.error : colors.onSurfaceVariant} />}
          <Text variant="labelLarge" style={[styles.number, { color: state === 'over' ? colors.error : colors.onSurface }]}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' } as ViewStyle,
  text: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  number: { fontVariant: ['tabular-nums'] },
});
