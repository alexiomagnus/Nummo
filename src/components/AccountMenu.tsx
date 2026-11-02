import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Menu, Text, useTheme } from 'react-native-paper';
import { spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

type Props = { email: string | null; busy: boolean; onSignOut: () => void };

// Account avatar → menu with the signed-in e-mail and the sign-out action.
export function AccountMenu({ email, busy, onSignOut }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const initial = (email ?? 'N').charAt(0).toUpperCase();
  return (
    <Menu visible={open} onDismiss={() => setOpen(false)} anchorPosition="bottom" contentStyle={{ backgroundColor: colors.elevation.level2 }}
      anchor={
        <StateLayerPressable layerColor={colors.onSurfaceVariant} radius={24} accessibilityRole="button"
          aria-haspopup="menu" aria-expanded={open} accessibilityLabel={`Account${email ? `: ${email}` : ''}`}
          onPress={() => setOpen(true)} style={styles.trigger}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text variant="titleSmall" style={{ color: colors.onPrimaryContainer }}>{initial}</Text>
          </View>
        </StateLayerPressable>
      }>
      <View style={styles.info}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>Account Google</Text>
        <Text variant="bodyMedium" numberOfLines={1} selectable style={styles.email}>{email ?? 'Account senza e-mail'}</Text>
      </View>
      <Divider />
      <Menu.Item title={busy ? 'Uscita in corso…' : 'Esci'} disabled={busy}
        leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.logout} size={size} color={color} />}
        onPress={() => { setOpen(false); onSignOut(); }} />
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2, maxWidth: 280 },
  email: { flexShrink: 1 },
});
