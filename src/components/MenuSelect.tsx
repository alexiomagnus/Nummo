import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type MenuOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  // Short caption ("Ordina", "Categoria") and the shape of its leading icon.
  label: string;
  icon: string;
  options: readonly MenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

// Compact single-choice selector: a 50 dp field showing the caption and the current value,
// opening a Material 3 menu. Used where chips would eat too much width (sort, filters).
export function MenuSelect<T extends string>({ label, icon, options, value, onChange, style }: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  // On phones the leading icon is dropped to leave room for the value.
  const showIcon = useSizeClass() !== 'compact';
  const current = options.find((option) => option.value === value);
  return (
    <View style={style}>
      <Menu visible={open} onDismiss={() => setOpen(false)} anchorPosition="bottom"
        contentStyle={{ backgroundColor: colors.elevation.level2, maxHeight: 360, borderRadius: radius.control }}
        anchor={
          <StateLayerPressable layerColor={colors.onSurface} radius={radius.input} accessibilityRole="button"
            aria-haspopup="menu" aria-expanded={open} accessibilityLabel={`${label}: ${current?.label ?? ''}`}
            onPress={() => setOpen(true)} style={[styles.field, { borderColor: colors.outline }]}>
            {showIcon && <SvgIcon shape={icon} size={20} color={colors.onSurfaceVariant} />}
            <View style={styles.text}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
              <Text variant="bodyMedium" numberOfLines={1}>{current?.label ?? ''}</Text>
            </View>
            <SvgIcon shape={iconShapes.chevronDown} size={20} color={colors.onSurfaceVariant} />
          </StateLayerPressable>
        }>
        {options.map((option) => (
          <Menu.Item key={option.value} title={option.label} onPress={() => { setOpen(false); onChange(option.value); }}
            trailingIcon={option.value === value ? ({ size, color }) => <View style={{ marginLeft: spacing.md }}><SvgIcon shape={iconShapes.check} size={size} color={color} /></View> : undefined}
            accessibilityLabel={`${option.label}${option.value === value ? ', selezionato' : ''}`} />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: layout.fieldBoxHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  text: { flex: 1, minWidth: 0 },
});
