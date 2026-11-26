import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { glassSurface } from '../theme/theme';
import { radius, spacing } from '../theme/tokens';

type Props = {
  title?: string;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  // A glass card of the app's language (26 November, on request, after Morphe): translucent fill, hairline, large corners.
  glass?: boolean;
  children?: ReactNode;
};

// The one container of the app: a flat section (no fill, border or shadow), or with `glass` a glass card. Blocks are separated
// by spacing and alignment; `style` may add a surface for the rare alert.
export function Card({ title, actions, style, glass = false, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, glass && [styles.glass, glassSurface(colors)], style]}>
      {(title || actions) && (
        <View style={styles.header}>
          {title && <Text variant="titleMedium" style={styles.title} accessibilityRole="header" aria-level={2}>{title}</Text>}
          {actions}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  glass: { borderRadius: radius.group, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 32 },
  title: { flex: 1, fontWeight: '700' },
});
