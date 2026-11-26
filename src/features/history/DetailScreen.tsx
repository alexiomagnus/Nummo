import { useLayoutEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from '../../components/Button';
import { Portal, Text, useTheme } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ScreenLayer } from '../../components/ScreenLayer';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { CategoryIcon } from '../../domain/category';
import { heroIconEntry, heroIconSpring } from '../../theme/containerTransform';
import { springEasing } from '../../theme/themeTransition';
import { useReducedMotion } from '../../theme/useSizeClass';
import { groupGap, layout, radius, spacing } from '../../theme/tokens';

// Detail screen of one card of the Spese page (23 November, on request, in place of the details opened inside the card):
// one shell for the expenses (ExpenseDetail) and the subscriptions (SubscriptionDetail), on the shared screen layer
// (components/ScreenLayer.tsx: slide from the bottom, Back, safe areas, panel from medium up; on phones always whole, closed with Back: no
// drag, no `detents`, 26 November, on request).

type ShellProps<T> = {
  // The item shown, null when closed (the layer then slides back down).
  value: T | null;
  // DOM id of the element around the item's card in the list: the layer's key, so another item opens a new screen.
  cardId: (value: T) => string;
  label: (value: T) => string;
  backLabel: string;
  onClose: () => void;
  children: (value: T) => ReactNode;
};

export function DetailScreen<T>({ value, cardId, label, backLabel, onClose, children }: ShellProps<T>) {
  if (!value) return null;
  const id = cardId(value);
  return <Portal><ScreenLayer key={id} label={label(value)} backLabel={backLabel} onBack={onClose} onEscape={onClose}>
    {children(value)}
  </ScreenLayer></Portal>;
}

// Entry animation of the big icon tile of a screen (see `heroIconSpring`): the tile, then the glyph in it. Once, on opening;
// nothing with reduced motion. Shared by the details and by «Prossimo mese».
export function useHeroIconEntry() {
  const reduced = useReducedMotion();
  const tile = useRef<ComponentRef<typeof View>>(null);
  const glyph = useRef<ComponentRef<typeof View>>(null);
  // Once, when the screen opens (see `heroIconSpring`); nothing with reduced motion.
  useLayoutEffect(() => {
    const node = tile.current as unknown as HTMLElement | null;
    if (reduced || !node || typeof node.animate !== 'function') return undefined;
    const spring = springEasing(heroIconSpring);
    const easing = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : 'cubic-bezier(0.2, 0, 0, 1)';
    const { delay, fade, scale, turn, glyphDelay, glyphScale, glyphTurn } = heroIconEntry;
    const inner = glyph.current as unknown as HTMLElement | null;
    const moves = [
      node.animate({ transform: [`scale(${scale}) rotate(${turn}deg)`, 'scale(1) rotate(0deg)'] }, { duration: spring.duration, delay, easing, fill: 'backwards' }),
      node.animate({ opacity: [0, 1] }, { duration: fade, delay, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' }),
      ...(inner ? [
        inner.animate({ transform: [`scale(${glyphScale}) rotate(${glyphTurn}deg)`, 'scale(1) rotate(0deg)'] }, { duration: spring.duration, delay: glyphDelay, easing, fill: 'backwards' }),
        inner.animate({ opacity: [0, 1] }, { duration: fade, delay: glyphDelay, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' }),
      ] : []),
    ];
    return () => moves.forEach((move) => move.cancel());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { tile, glyph };
}

// What the item is and how much: icon, name, the figure first in weight, then what the caller adds (merchant, status, marks).
// `dense`: a smaller icon tile and tighter gaps, for a screen that must fit one page on a phone (the subscription's detail).
export function DetailHero({ icon, title, amount, muted, dense, children }: { icon: CategoryIcon | null; title: string; amount: string; muted?: boolean; dense?: boolean; children?: ReactNode }) {
  const { colors } = useTheme();
  const { tile, glyph } = useHeroIconEntry();
  return (
    <View style={[styles.hero, dense && styles.denseHero]}>
      {/* The same size for expenses and subscriptions (user's request, 25 November: the expense's took the subscription's): tile 64,
          glyph 38. */}
      <View ref={tile} style={[styles.heroTile, dense && styles.denseTile, { backgroundColor: colors.secondaryContainer }]}>
        <View ref={glyph}>{icon ? <CategoryGlyph icon={icon} size={38} color={colors.onSecondaryContainer} />
          : <SvgIcon shape={iconShapes.tag} size={34} color={colors.onSecondaryContainer} />}</View>
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

// The details: grouped rows of the glass language (26 November, on request, after Morphe): each row a card of its own, a little
// apart, the outer corners of the group large (GlobalStyle, `data-glass-group`).
export function InfoGroup({ rows }: { rows: readonly ReactNode[] }) {
  return (
    <View {...{ dataSet: { glassGroup: 'true' } }} style={styles.group}>
      {rows.map((row, index) => <View key={index}>{row}</View>)}
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
  const rows: GridCell[][] = [];
  for (const cell of cells) {
    const last = rows.at(-1);
    if (!cell.wide && last && last.length === 1 && !last[0]!.wide) last.push(cell); else rows.push([cell]);
  }
  const line = { borderColor: colors.outlineVariant };
  // A row of the grid is a card of the group; two cells in it apart by a hairline.
  return (
    <View {...{ dataSet: { glassGroup: 'true' } }} style={styles.group}>
      {rows.map((row) => (
        <View key={row[0]!.key} style={styles.gridRow}>
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
export function PrimaryAction({ label, accessibilityLabel, icon, onPress, style }: { label: string; accessibilityLabel?: string; icon: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.actions, style]}>
      <Button mode="contained" accessibilityLabel={accessibilityLabel} onPress={onPress}
        icon={({ size: iconSize, color }) => <SvgIcon shape={icon} size={iconSize} color={color} />}
        contentStyle={styles.actionContent} labelStyle={styles.actionLabel} style={styles.action}>{label}</Button>
    </View>
  );
}

// The half-width actions under «Modifica» (subscription and fund details): as tall as it outside (user's request, 24 November).
// An outlined button draws its 1 dp border around the content, so its content is 2 shorter.
export const secondaryActionContent = { minHeight: layout.controlHeight } as const;
// From medium the actions of a detail share one row in equal parts (user's request, 24 November: «per risparmiare spazio, almeno su
// desktop»): `line` around them, `part` on each (also on the inner row of the half-width ones, with `flex` = how many it holds).
export const detailActions = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  part: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});
export const outlinedActionContent = { minHeight: layout.controlHeight - 2 } as const;

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  heroTile: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  denseHero: { gap: spacing.xs, paddingBottom: 0 },
  denseTile: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.xs },
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
  group: { gap: groupGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row' },
  action: { flexGrow: 1, borderRadius: radius.pill },
  actionContent: { minHeight: layout.controlHeight },
  actionLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
