import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Portal, Text, useTheme } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ScreenLayer } from '../../components/ScreenLayer';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { CategoryIcon } from '../../domain/category';
import { cardFill } from '../../theme/theme';
import { layout, radius, spacing } from '../../theme/tokens';

// Detail screen of one card of the Spese page (23 November, on request, in place of the details opened inside the card):
// one shell for the expenses (ExpenseDetail) and the subscriptions (SubscriptionDetail), on the shared screen layer
// (components/ScreenLayer.tsx: container transform from the card and back, Back, safe areas, panel from medium up).

type ShellProps<T> = {
  // The item shown, null when closed (the layer then closes back into its card, or fades if the card is gone).
  value: T | null;
  // DOM id of the element around the item's card in the list: the origin and the destination of the transform.
  cardId: (value: T) => string;
  label: (value: T) => string;
  backLabel: string;
  onClose: () => void;
  children: (value: T) => ReactNode;
};

export function DetailScreen<T>({ value, cardId, label, backLabel, onClose, children }: ShellProps<T>) {
  if (!value) return null;
  const id = cardId(value);
  return <Portal><ScreenLayer key={id} originId={id} label={label(value)} backLabel={backLabel} onBack={onClose} onEscape={onClose}>
    {children(value)}
  </ScreenLayer></Portal>;
}

// What the item is and how much: icon, name, the figure first in weight, then what the caller adds (merchant, status, marks).
// `dense`: a smaller icon tile and tighter gaps, for a screen that must fit one page on a phone (the subscription's detail).
export function DetailHero({ icon, title, amount, muted, dense, children }: { icon: CategoryIcon | null; title: string; amount: string; muted?: boolean; dense?: boolean; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, dense && styles.denseHero]}>
      <View style={[styles.heroTile, dense && styles.denseTile, { backgroundColor: colors.primaryContainer }]}>
        {icon ? <CategoryGlyph icon={icon} size={dense ? 32 : 40} color={colors.onPrimaryContainer} />
          : <SvgIcon shape={iconShapes.tag} size={dense ? 28 : 36} color={colors.onPrimaryContainer} />}
      </View>
      <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={styles.center}>{title}</Text>
      <Text variant="displaySmall" style={[styles.amount, { color: muted ? colors.onSurfaceVariant : colors.onSurface }]}>{amount}</Text>
      {children}
    </View>
  );
}

// Merchant under the amount, in the accent colour with the shop icon (as in the list rows), whole.
export function DetailMerchant({ name, label }: { name: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.merchant} accessibilityLabel={`${label}: ${name}`}>
      <SvgIcon shape={iconShapes.store} size={18} color={colors.primary} />
      <Text variant="titleSmall" numberOfLines={2} style={[styles.merchantName, { color: colors.primary }]}>{name}</Text>
    </View>
  );
}

export function DetailMarks({ children }: { children: ReactNode }) {
  return <View style={styles.marks}>{children}</View>;
}

export function Mark({ icon, label, background, color }: { icon: string; label: string; background: string; color: string }) {
  return (
    <View style={[styles.mark, { backgroundColor: background }]}>
      <SvgIcon shape={icon} size={16} color={color} />
      <Text variant="labelMedium" style={{ color }}>{label}</Text>
    </View>
  );
}

// The details: one group, rows apart by hairlines (no stack of cards); filled like the list cards in light, outlined in dark.
export function InfoGroup({ rows }: { rows: readonly ReactNode[] }) {
  const { colors } = useTheme();
  const fill = cardFill(colors);
  return (
    <View style={[styles.group, fill ? { backgroundColor: fill, borderColor: fill } : { borderColor: colors.outlineVariant }]}>
      {rows.map((row, index) => <View key={index} style={index > 0 && [styles.divided, { borderTopColor: colors.outlineVariant }]}>{row}</View>)}
    </View>
  );
}

export function InfoRow({ icon, label, value, action }: { icon: ReactNode; label: string; value: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View aria-hidden style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="bodyLarge">{value}</Text>
      </View>
      {action}
    </View>
  );
}

// The details in two columns (the subscription's detail, so that it fits one page on a phone): cells side by side in pairs,
// a `wide` cell on a row of its own; a cell with `onPress` is a button with a chevron (the payment history).
// `accent`: the cell in the tonal secondary colour, as «Scansiona scontrino» (the payment history, which opens a screen of the same colour).
export type GridCell = { key: string; icon: ReactNode; label: string; value: string; wide?: boolean; accent?: boolean; onPress?: () => void; accessibilityLabel?: string };
export function InfoGrid({ cells }: { cells: readonly GridCell[] }) {
  const { colors } = useTheme();
  const fill = cardFill(colors);
  const rows: GridCell[][] = [];
  for (const cell of cells) {
    const last = rows.at(-1);
    if (!cell.wide && last && last.length === 1 && !last[0]!.wide) last.push(cell); else rows.push([cell]);
  }
  const line = { borderColor: colors.outlineVariant };
  return (
    <View style={[styles.group, fill ? { backgroundColor: fill, borderColor: fill } : { borderColor: colors.outlineVariant }]}>
      {rows.map((row, index) => (
        <View key={row[0]!.key} style={[styles.gridRow, index > 0 && [styles.divided, { borderTopColor: colors.outlineVariant }]]}>
          {row.map((cell, column) => {
            const ink = cell.accent ? colors.onSecondaryContainer : undefined;
            const inner = <>
              <View aria-hidden style={styles.cellIcon}>{cell.icon}</View>
              <View style={styles.rowText}>
                <Text variant="bodySmall" style={{ color: ink ?? colors.onSurfaceVariant }}>{cell.label}</Text>
                <Text variant="bodyLarge" numberOfLines={2} style={ink ? { color: ink, fontWeight: '600' } : undefined}>{cell.value}</Text>
              </View>
              {cell.onPress && <SvgIcon shape={iconShapes.chevronRight} size={24} color={ink ?? colors.onSurfaceVariant} />}
            </>;
            const style = [styles.cell, column > 0 && [styles.cellDivided, line], cell.accent && { backgroundColor: colors.secondaryContainer }];
            return cell.onPress
              ? <StateLayerPressable key={cell.key} onPress={cell.onPress} accessibilityRole="button" aria-haspopup="dialog"
                accessibilityLabel={cell.accessibilityLabel} layerColor={cell.accent ? colors.onSecondaryContainer : colors.onSurface} style={style}>{inner}</StateLayerPressable>
              : <View key={cell.key} style={style}>{inner}</View>;
          })}
        </View>
      ))}
    </View>
  );
}

// The page's one primary action (Modifica): full width, pill-shaped, as «Salva» in Nuova spesa.
export function PrimaryAction({ label, accessibilityLabel, icon, onPress }: { label: string; accessibilityLabel?: string; icon: string; onPress: () => void }) {
  return (
    <View style={styles.actions}>
      <Button mode="contained" accessibilityLabel={accessibilityLabel} onPress={onPress}
        icon={({ size: iconSize, color }) => <SvgIcon shape={icon} size={iconSize} color={color} />}
        contentStyle={styles.actionContent} labelStyle={styles.actionLabel} style={styles.action}>{label}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  heroTile: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  denseHero: { gap: spacing.xs, paddingBottom: 0 },
  denseTile: { width: 56, height: 56, borderRadius: 28, marginBottom: spacing.xs },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cellDivided: { borderLeftWidth: StyleSheet.hairlineWidth },
  cellIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  amount: { fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  merchant: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  merchantName: { flexShrink: 1, fontWeight: '600' },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  mark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  group: { borderWidth: 1, borderRadius: radius.control, overflow: 'hidden' },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row' },
  action: { flexGrow: 1, borderRadius: radius.pill },
  actionContent: { minHeight: layout.controlHeight },
  actionLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
