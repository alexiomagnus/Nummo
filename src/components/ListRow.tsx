import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';
import type { CategoryIcon } from '../domain/category';
import { CategoryGlyph, useIconStyle } from './CategoryGlyph';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// Fixed-size slot showing a category glyph (or a neutral placeholder): keeps every row aligned.
export function IconTile({ icon, size = 36 }: { icon: CategoryIcon | null; size?: number }) {
  const { colors } = useTheme();
  // The filled colourful and pixel drawings need a little more room than thin outlines to read at list size.
  const glyph = size - (useIconStyle() === 'minimal' ? 16 : 12);
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      {icon ? <CategoryGlyph icon={icon} size={glyph} color={colors.onSurfaceVariant} /> : <SvgIcon shape={iconShapes.tag} size={size - 18} color={colors.onSurfaceVariant} />}
    </View>
  );
}

type Props = {
  icon: CategoryIcon | null;
  title: string;
  subtitle?: string;
  // Between title and subtitle (phones put the amount here).
  meta?: ReactNode;
  // Right side, vertically centred (amount, actions).
  trailing?: ReactNode;
  // Hairline under the row; off for the last row of a group so dividers only sit between items.
  divider?: boolean;
  // Own bold outline (like the dashboard table) instead of the hairline divider.
  outlined?: boolean;
  // Below the row, inside the same divider (inline editor).
  children?: ReactNode;
  // Expandable row: the whole main area is one button (no nested buttons), the children stay outside it.
  onPress?: () => void;
  pressLabel?: string;
  expanded?: boolean;
  controls?: string;
  // Tighter vertical rhythm for dense lists (title up to two lines).
  dense?: boolean;
};

// The one list row of the app (Spese, Categorie): icon tile, title + subtitle, trailing slot, hairline divider.
// Every row has the same minimum height and centres its content vertically.
export function ListRow({ icon, title, subtitle, meta, trailing, divider = true, outlined, children, onPress, pressLabel, expanded, controls, dense }: Props) {
  const { colors } = useTheme();
  const content = <>
    <IconTile icon={icon} />
    <View style={styles.text}>
      <Text variant="bodyLarge" numberOfLines={dense ? 2 : 3}>{title}</Text>
      {meta}
      {subtitle ? <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text> : null}
    </View>
    {trailing && <View style={styles.trailing}>{trailing}</View>}
  </>;
  return (
    <View role="listitem" style={outlined ? [styles.row, styles.outlined, { borderColor: dense ? colors.outlineVariant : colors.outline }] : [styles.row, !divider && styles.noDivider, { borderColor: colors.outlineVariant }]}>
      {onPress ? <StateLayerPressable onPress={onPress} layerColor={colors.onSurface} radius={radius.control} accessibilityRole="button"
        accessibilityLabel={pressLabel} aria-expanded={expanded} aria-controls={controls} style={[styles.main, dense && styles.dense, styles.pressable]}>{content}</StateLayerPressable>
        : <View style={[styles.main, dense && styles.dense]}>{content}</View>}
      {children}
    </View>
  );
}

export const listRowStyles = StyleSheet.create({
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  iconButton: { margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 8 },
});

const styles = StyleSheet.create({
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs, gap: spacing.sm },
  noDivider: { borderBottomWidth: 0 },
  outlined: { borderWidth: 1, borderBottomWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  pressable: { paddingHorizontal: spacing.xs },
  dense: { minHeight: 52 },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  text: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
