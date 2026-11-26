import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { ActionRow, ListGroup, RowDivider } from '../../components/ActionList';
import { AppDialog } from '../../components/AppDialog';
import { DeleteAction } from '../../components/DeleteAction';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { SyncedFund, SyncedMovement } from '../../domain/firestore';
import { useI18n } from '../../i18n/I18nProvider';
import { positiveColor } from '../../theme/theme';
import { radius, spacing } from '../../theme/tokens';

// Fondi shows only a «Tutte le operazioni» button under a heading as written (27 November, on request): it opens a screen with every income added by
// hand and every transfer between funds, newest first, each with a bin that deletes it. Deleting changes the balances the funds keep
// (computed from the movements), never the expenses. Recharges are not here: they follow from the fund's plan and are not documents.
export function MovementsSection({ all, funds, canWrite, onRemove }: {
  all: readonly SyncedMovement[]; funds: readonly SyncedFund[]; canWrite: boolean;
  onRemove: (movement: SyncedMovement) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [allOpen, setAllOpen] = useState(false);
  // Only the button and its heading (user's request, 27 November), no list of the month on the page.
  if (all.length === 0) return null;
  return (
    <ListGroup plain label={t("Entrate e spostamenti")}>
      <ActionRow icon={iconShapes.list} tone="secondary" title={t("Tutte le operazioni")} onPress={() => setAllOpen(true)} />
      {allOpen && <AllMovements movements={all} funds={funds} canWrite={canWrite} onRemove={onRemove} onClose={() => setAllOpen(false)} />}
    </ListGroup>
  );
}

// Every income and transfer of every month, newest first, on a screen of its own with Back (phones and desktop).
function AllMovements({ movements, funds, canWrite, onRemove, onClose }: {
  movements: readonly SyncedMovement[]; funds: readonly SyncedFund[]; canWrite: boolean;
  onRemove: (movement: SyncedMovement) => Promise<boolean>; onClose: () => void;
}) {
  const { t } = useI18n();
  const sorted = useMemo(() => [...movements].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)), [movements]);
  return <Portal><AppDialog visible onDismiss={onClose}>
    <AppDialog.Title>{t("Tutte le operazioni")}</AppDialog.Title>
    <AppDialog.ScrollArea style={{ minHeight: 0 }}><ScrollView>
      <MovementRows movements={sorted} funds={funds} canWrite={canWrite} onRemove={onRemove} />
    </ScrollView></AppDialog.ScrollArea>
  </AppDialog></Portal>;
}

function MovementRows({ movements, funds, canWrite, onRemove }: {
  movements: readonly SyncedMovement[]; funds: readonly SyncedFund[]; canWrite: boolean;
  onRemove: (movement: SyncedMovement) => Promise<boolean>;
}) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const names = new Map(funds.map((fund) => [fund.id, fund.name]));
  const name = (id: string | null) => (id === null ? '' : names.get(id) ?? t("Fondo eliminato"));
  const positive = positiveColor(colors);
  return (
    <View role="list" accessibilityLabel={t("Entrate e spostamenti")}>{movements.map((movement, index) => {
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
    })}</View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 72, paddingVertical: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.sm },
  tile: { width: 40, height: 40, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  amount: { flexShrink: 0, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
