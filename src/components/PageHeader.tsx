import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '../theme/tokens';

// One h1 per screen; the top app bar only carries branding. `action` is a secondary,
// screen-level action aligned to the title row. No subtitle: the title says it.
export function PageHeader({ title, action, style }: { title: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.header, style]}>
      <Text variant="headlineMedium" style={styles.title} accessibilityRole="header" aria-level={1}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 48 },
});
