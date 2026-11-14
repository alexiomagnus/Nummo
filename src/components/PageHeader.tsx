import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';

// One h1 per screen; the top app bar only carries branding. `action` is a secondary,
// screen-level action aligned to the title row. No subtitle: the title says it.
// On a phone a long title (e.g. «Archiviazione e backup») is set smaller, so that it does not take most of the screen.
export function PageHeader({ title, action, style }: { title: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const compact = useSizeClass() === 'compact';
  return (
    <View style={[styles.header, style]}>
      <Text variant="headlineMedium" style={[styles.title, compact && title.length > 16 && styles.longTitle]} accessibilityRole="header" aria-level={1}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, lineHeight: 42, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  longTitle: { fontSize: 26, lineHeight: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 48 },
});
