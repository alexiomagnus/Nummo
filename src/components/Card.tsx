import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '../theme/tokens';

type Props = {
  title?: string;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The one container of the app: a flat section (no fill, border or shadow). Blocks are separated
// by spacing and alignment only; `style` may add a surface for the rare alert.
export function Card({ title, actions, style, children }: Props) {
  return (
    <View style={[styles.card, style]}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 32 },
  title: { flex: 1, fontWeight: '700' },
});
