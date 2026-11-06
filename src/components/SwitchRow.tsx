import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { M3Switch } from './M3Switch';
import { StateLayerPressable } from './StateLayerPressable';

type Props = { label: string; supporting?: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void };

// Material 3 list item with a trailing switch: the whole row is the control (role switch, 56 dp).
export function SwitchRow({ label, supporting, value, disabled, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable onPress={() => onChange(!value)} disabled={disabled} layerColor={colors.onSurface} radius={radius.control}
      style={styles.row} accessibilityRole="switch" aria-checked={value} aria-disabled={disabled} accessibilityLabel={label}>
      <View style={styles.text}>
        <Text variant="bodyLarge">{label}</Text>
        {supporting && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{supporting}</Text>}
      </View>
      <M3Switch value={value} disabled={disabled} />
    </StateLayerPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  text: { flex: 1 },
});
