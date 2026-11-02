import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../theme/tokens';

// One h1 per screen; the top app bar only carries branding. `action` is a secondary,
// screen-level action (e.g. export) aligned to the title row.
export function PageHeader({ title, description, action, style }: { title: string; description?: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, style]}>
      <View style={styles.titles}>
        <Text variant="headlineMedium" accessibilityRole="header" aria-level={1}>{title}</Text>
        {description && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{description}</Text>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  titles: { gap: spacing.xs, flexGrow: 1, flexShrink: 1, flexBasis: 240 },
});
