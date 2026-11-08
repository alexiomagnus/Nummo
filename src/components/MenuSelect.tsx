import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Menu, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const anchorRef = useRef<ComponentRef<typeof View>>(null);
  const openMenu = () => anchorRef.current?.measureInWindow((x, y, _width, height) => {
    setAnchor({ x, y: y + height });
    setOpen(true);
  });
  const closeMenu = () => {
    setOpen(false);
    if (anchorRef.current instanceof HTMLElement) {
      anchorRef.current.querySelector<HTMLElement>('button, [role="button"]')?.focus({ preventScroll: true });
    }
  };
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxHeight = Math.max(0, Math.min(360, height - insets.top - insets.bottom - 2 * spacing.lg));
  const maxWidth = Math.max(0, width - insets.left - insets.right - 2 * spacing.lg);
  // On phones the leading icon is dropped to leave room for the value.
  const showIcon = useSizeClass() !== 'compact';
  const current = options.find((option) => option.value === value);
  return (
    <View style={style}>
      <View ref={anchorRef}>
        <StateLayerPressable layerColor={colors.onSurface} radius={radius.input} accessibilityRole="button"
          aria-haspopup="menu" aria-expanded={open} accessibilityLabel={`${label}: ${current?.label ?? ''}`}
          onPress={openMenu} style={[styles.field, { borderColor: colors.outline }]}>
          {showIcon && <SvgIcon shape={icon} size={20} color={colors.onSurfaceVariant} />}
          <View style={styles.text}>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
            <Text variant="bodyMedium" numberOfLines={1}>{current?.label ?? ''}</Text>
          </View>
          <SvgIcon shape={iconShapes.chevronDown} size={20} color={colors.onSurfaceVariant} />
        </StateLayerPressable>
      </View>
      <Menu visible={open} onDismiss={closeMenu} anchorPosition="bottom"
        contentStyle={{ backgroundColor: colors.elevation.level2, maxHeight, maxWidth, borderRadius: radius.control,
          paddingVertical: spacing.xs, overflow: 'hidden' }}
        anchor={anchor}>
        {/* A maxHeight on Paper's surface alone does not make custom rows scrollable. */}
        <ScrollView style={{ maxHeight: Math.max(0, maxHeight - 2 * spacing.xs) }} keyboardShouldPersistTaps="handled">
        {options.map((option) => (
          <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem" style={styles.item}
            onPress={() => { closeMenu(); onChange(option.value); }}
            accessibilityLabel={`${option.label}${option.value === value ? t(", selezionato") : ''}`}>
            <Text variant="bodyLarge" numberOfLines={1} style={styles.itemLabel}>{option.label}</Text>
            {/* Fixed slot on every row: the check always sits at the right edge, whatever the label length. */}
            <View style={styles.check}>{option.value === value && <SvgIcon shape={iconShapes.check} size={24} color={colors.onSurface} />}</View>
          </StateLayerPressable>
        ))}
        </ScrollView>
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
  // Room for the check on every item, so the menu is always as wide as its longest label plus the check.
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, minHeight: 48, minWidth: 112, paddingHorizontal: spacing.lg },
  itemLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  check: { width: 24, height: 24 },
});
