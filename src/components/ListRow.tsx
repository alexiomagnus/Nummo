import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';
import type { CategoryIcon } from '../domain/category';
import { CategoryGlyph } from './CategoryGlyph';
import { SvgIcon, iconShapes } from './SvgIcon';

// Rounded tile showing a category icon (or a neutral placeholder).
export function IconTile({ icon, size = 40 }: { icon: CategoryIcon | null; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.tertiaryContainer }]}>
      {icon ? <CategoryGlyph icon={icon} size={size - 18} color={colors.onTertiaryContainer} /> : <SvgIcon shape={iconShapes.tag} size={size - 20} color={colors.onTertiaryContainer} />}
    </View>
  );
}

type Props = {
  icon: CategoryIcon | null;
  title: string;
  subtitle: string;
  // Between title and subtitle (phones put the amount here).
  meta?: ReactNode;
  // Right side, vertically centred (amount, actions).
  trailing?: ReactNode;
  // Hairline under the row; off for the last row of a group so dividers only sit between items.
  divider?: boolean;
  // Below the row, inside the same divider (inline editor).
  children?: ReactNode;
};

// The one list row of the app (Spese, Categorie): icon tile, title + subtitle, trailing slot, hairline divider.
// Every row has the same minimum height and centres its content vertically.
export function ListRow({ icon, title, subtitle, meta, trailing, divider = true, children }: Props) {
  const { colors } = useTheme();
  return (
    <View role="listitem" style={[styles.row, !divider && styles.noDivider, { borderColor: colors.outlineVariant }]}>
      <View style={styles.main}>
        <IconTile icon={icon} />
        <View style={styles.text}>
          <Text variant="bodyLarge" numberOfLines={3}>{title}</Text>
          {meta}
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text>
        </View>
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
      {children}
    </View>
  );
}

export const listRowStyles = StyleSheet.create({
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  iconButton: { margin: 0, width: layout.minTouch, height: layout.minTouch },
});

const styles = StyleSheet.create({
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, gap: spacing.sm },
  noDivider: { borderBottomWidth: 0 },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
  text: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  tile: { borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
