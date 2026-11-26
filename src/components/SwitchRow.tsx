import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { useInCard } from './ActionList';
import { M3Switch } from './M3Switch';
import { StateLayerPressable } from './StateLayerPressable';

type Props = { label: string; supporting?: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void };

// Material 3 list item with a trailing switch: the whole row is the control (role switch, 56 dp). On a screen its hover layer is
// rounded; directly in a card of a group it is a flush band, clipped by the card's own corners (ActionList, `useInCard`).
export function SwitchRow({ label, supporting, value, disabled, onChange }: Props) {
  const { colors } = useTheme();
  const flush = useInCard();
  return (
    <StateLayerPressable onPress={() => onChange(!value)} disabled={disabled} layerColor={colors.onSurface} radius={flush ? 0 : radius.control}
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
