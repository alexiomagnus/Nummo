import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { shape, spacing } from '../theme/tokens';

type Props = {
  title?: string;
  description?: string;
  // filled = tonal surface (default); outlined = transparent with outline.
  variant?: 'filled' | 'outlined';
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// Material 3 card: the one container used by every screen.
export function Card({ title, description, variant = 'filled', actions, style, children }: Props) {
  const { colors } = useTheme();
  const background = variant === 'filled' ? { backgroundColor: colors.elevation.level1 } : { borderWidth: 1, borderColor: colors.outlineVariant };
  return (
    <View style={[styles.card, background, style]}>
      {(title || actions) && (
        <View style={styles.header}>
          <View style={styles.titles}>
            {title && <Text variant="titleLarge" accessibilityRole="header" aria-level={2}>{title}</Text>}
            {description && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{description}</Text>}
          </View>
          {actions}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: shape.md, padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  titles: { flex: 1, gap: spacing.xs },
});
