import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ListGroup, RowDivider, StatusRow } from '../../components/ActionList';
import { DeleteAction } from '../../components/DeleteAction';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { SyncedFund, SyncedMovement } from '../../domain/firestore';
import { useI18n } from '../../i18n/I18nProvider';
import { positiveColor } from '../../theme/theme';
import { radius, spacing } from '../../theme/tokens';

// «Entrate e spostamenti» of the month shown in Fondi (27 November, on request): the incomes added by hand and the transfers
// between funds, newest first, each with a bin that deletes it. Deleting changes the balances the funds keep (they are computed
// from the movements), never the expenses. Recharges are not here: they follow from the fund's plan and are not documents.
export function MovementsSection({ movements, funds, monthLabel, canWrite, onRemove }: {
  movements: readonly SyncedMovement[]; funds: readonly SyncedFund[]; monthLabel: string; canWrite: boolean;
  onRemove: (movement: SyncedMovement) => Promise<boolean>;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const names = new Map(funds.map((fund) => [fund.id, fund.name]));
  const name = (id: string | null) => (id === null ? '' : names.get(id) ?? t("Fondo eliminato"));
  const positive = positiveColor(colors);
  return (
    <ListGroup label={t("Entrate e spostamenti")}>
      {movements.length === 0
        ? <StatusRow icon={iconShapes.swap} tone="secondary" title={t("Nessuna entrata o spostamento in {p0}.", { p0: monthLabel })} />
        : <View role="list" accessibilityLabel={t("Entrate e spostamenti")}>{movements.map((movement, index) => {
          const income = movement.kind === 'income';
          const title = income ? name(movement.to_fund_id) : t("{p0} → {p1}", { p0: name(movement.from_fund_id), p1: name(movement.to_fund_id) });
          const kind = income ? t("Entrata") : t("Trasferimento");
          const subtitle = [kind, formatDate(movement.date), movement.note].filter(Boolean).join(' · ');
          const amount = formatAmount(movement.amount_minor);
          return <View key={movement.id} role="listitem">
            {index > 0 && <RowDivider />}
            <View style={styles.row}>
              <View style={[styles.tile, { backgroundColor: income ? colors.primaryContainer : colors.secondaryContainer }]}>
                <SvgIcon shape={income ? iconShapes.euro : iconShapes.swap} size={22} color={income ? colors.onPrimaryContainer : colors.onSecondaryContainer} />
              </View>
              <View style={styles.text}>
                <Text variant="titleMedium" numberOfLines={2}>{title}</Text>
                <Text variant="bodyMedium" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text>
              </View>
              <Text variant="titleMedium" style={[styles.amount, income && { color: positive }]}>{income ? '+' : ''}{amount}</Text>
              <DeleteAction disabled={!canWrite} name={`${kind} ${amount}`}
                title={income ? t("Eliminare questa entrata?") : t("Eliminare questo trasferimento?")}
                description={income ? t("Il saldo del fondo cala dell’importo. Le spese non cambiano. L’operazione non può essere annullata.")
                  : t("I saldi dei due fondi tornano come prima del trasferimento. Le spese non cambiano. L’operazione non può essere annullata.")}
                onDelete={() => onRemove(movement)} />
            </View>
          </View>;
        })}</View>}
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 72, paddingVertical: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.sm },
  tile: { width: 40, height: 40, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  amount: { flexShrink: 0, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
