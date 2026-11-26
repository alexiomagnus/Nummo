import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { glassSurface } from '../theme/theme';
import { groupGap, layout, radius, spacing } from '../theme/tokens';
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
  // On the subtitle line, after it (Spese: the merchant beside the date); shrinks before the subtitle does.
  subtitleExtra?: ReactNode;
  // A line of its own under the subtitle (Analisi details on phones: the fund).
  subtitleBelow?: ReactNode;
  // Between title and subtitle (phones put the amount here).
  meta?: ReactNode;
  // Right side, vertically centred (amount, actions).
  trailing?: ReactNode;
  // Hairline under the row; off for the last row of a group so dividers only sit between items.
  divider?: boolean;
  // A glass card of its own instead of the hairline divider (26 November, on request, after Morphe): consecutive outlined rows
  // read as one group, 3 apart, the outer corners large and the inner ones small (GlobalStyle, `data-glass-item`).
  outlined?: boolean;
  // DOM id of the row (Spese, Abbonamenti: the detail screen finds the card it opened from).
  nativeID?: string;
  // Below the row, inside the same divider (inline editor).
  children?: ReactNode;
  // Expandable row: the whole main area is one button (no nested buttons), the children stay outside it; with
  // `expanded` set, a small chevron after the trailing slot shows that it opens.
  onPress?: () => void;
  pressLabel?: string;
  expanded?: boolean;
  controls?: string;
  // The row opens a screen of its own (Spese → the expense's detail): a chevron pointing right, as on the lists' cards.
  opens?: boolean;
  // Tighter vertical rhythm for dense lists (title up to two lines).
  dense?: boolean;
  // No icon tile: every row of the list would show the same icon (Analisi details of one category).
  iconless?: boolean;
};

// The one list row of the app (Spese, Categorie): icon tile, title + subtitle, trailing slot, hairline divider.
// Every row has the same minimum height and centres its content vertically.
export function ListRow({ nativeID, icon, title, subtitle, meta, trailing, divider = true, outlined, children, onPress, pressLabel, expanded, controls, opens, dense, subtitleExtra, subtitleBelow, iconless }: Props) {
  const { colors } = useTheme();
  const expandable = onPress !== undefined && expanded !== undefined;
  const opening = onPress !== undefined && opens === true && !expandable;
  const content = <>
    {!iconless && <IconTile icon={icon} />}
    <View style={styles.text}>
      <Text variant="bodyLarge" numberOfLines={dense ? 2 : 3}>{title}</Text>
      {meta}
      {subtitle && subtitleExtra ? <View style={styles.subtitleLine}>
        <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
        {subtitleExtra}
      </View> : subtitle ? <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text> : null}
      {subtitleBelow}
    </View>
    {(trailing || expandable || opening) && <View style={styles.trailing}>
      {trailing}
      {/* Small decorative chevron: hints that the row opens; state is announced by aria-expanded on the button. */}
      {expandable && <View aria-hidden style={styles.chevron}>
        <SvgIcon shape={expanded ? iconShapes.chevronUp : iconShapes.chevronDown} size={24} color={colors.onSurfaceVariant} />
      </View>}
      {opening && <View aria-hidden style={styles.chevron}>
        <SvgIcon shape={iconShapes.chevronRight} size={24} color={colors.onSurfaceVariant} />
      </View>}
    </View>}
  </>;
  // Outlined rows keep their padding inside the target, so the hover/pressed layer fills the card (clipped by its corners),
  // square bottom while an expanded panel continues below it.
  // The padding moves inside the target with the minimum height, so the row keeps its previous height.
  const inset = outlined && [styles.outlinedMain, { minHeight: (dense ? denseHeight : rowHeight) + 2 * spacing.xs }];
  const hasChildren = children !== undefined && children !== null && children !== false;
  return (
    <View role="listitem" nativeID={nativeID} {...(outlined ? { dataSet: { glassItem: 'true' } } : null)}
      style={outlined ? [styles.row, styles.outlined, glassSurface(colors)] : [styles.row, !divider && styles.noDivider, { borderColor: colors.outlineVariant }]}>
      {onPress ? <StateLayerPressable onPress={onPress} layerColor={colors.onSurface} radius={outlined ? 0 : radius.control}
        bottomRadius={outlined && hasChildren ? 0 : undefined} accessibilityRole="button"
        accessibilityLabel={pressLabel} aria-expanded={expanded} aria-controls={controls} aria-haspopup={opening ? 'dialog' : undefined} style={[styles.main, dense && styles.dense, outlined ? inset : styles.pressable]}>{content}</StateLayerPressable>
        : <View style={[styles.main, dense && styles.dense, inset, !outlined && styles.plainMain]}>{content}</View>}
      {hasChildren && (outlined ? <View style={styles.outlinedChildren}>{children}</View> : children)}
    </View>
  );
}

export const listRowStyles = StyleSheet.create({
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  // Corner 4: the hover/press layer reads as a square (user's request, 22 November: it was too rounded at 8). Same in DeleteAction.
  iconButton: { margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 4 },
});

const rowHeight = 56;
const denseHeight = 52;
const outlineWidth = 1;

const styles = StyleSheet.create({
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs, gap: spacing.sm },
  noDivider: { borderBottomWidth: 0 },
  outlined: { borderWidth: outlineWidth, borderBottomWidth: outlineWidth, borderRadius: radius.group, paddingVertical: 0, gap: 0, marginBottom: groupGap, overflow: 'hidden' },
  outlinedMain: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  // No gap and no side padding: a divider drawn at the top of the children spans the hover layer edge to edge and
  // starts exactly where it ends. The children pad their own content (spacing.md, like the row).
  outlinedChildren: { paddingBottom: spacing.xs },
  pressable: { paddingHorizontal: spacing.xs },
  // A plain row (no press target) inside a grouped card: the text starts where the group's label does (18), the action buttons
  // (48 wide, their own margin) end closer to the edge.
  plainMain: { paddingLeft: 18, paddingRight: spacing.xs },
  dense: { minHeight: denseHeight },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: rowHeight },
  text: { flex: 1, minWidth: 0 },
  subtitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  subtitle: { flexShrink: 0 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // 24 dp like the other icons, so it reads as an affordance; spacing.md from the amount (xs gap + sm margin).
  chevron: { marginLeft: spacing.sm, marginRight: -spacing.xs },
});
