import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { AnchoredMenu, BottomSheet, type MenuAnchor } from './Overlay';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// onLayout reports whole pixels: a label a fraction wider than the rounded measure would still be ellipsized.
const measureSlack = 2;

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

// Compact single-choice selector: a 50 dp field showing the caption and the current value. Used where chips would eat
// too much width (sort, filters). On phones the choices open in a modal bottom sheet, as in SelectField; from medium
// width in a Material 3 menu below the field (or above it when there is no room), which returns focus to the field.
export function MenuSelect<T extends string>({ label, icon, options, value, onChange, style }: Props<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor>({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<ComponentRef<typeof View>>(null);
  const openMenu = () => {
    if (compact) { setOpen(true); return; }
    anchorRef.current?.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setOpen(true); });
  };
  const closeMenu = () => setOpen(false);
  // Natural width of the widest row, measured off-screen while the menu is closed: the menu is at least as wide as the
  // field and grows to show whole labels («Importo più basso» next to a half-width field), within the viewport margins.
  const [contentWidth, setContentWidth] = useState(0);
  // On phones the leading icon is dropped to leave room for the value.
  const showIcon = !compact;
  const current = options.find((option) => option.value === value);
  const rows = options.map((option) => (
    <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem" style={styles.item}
      onPress={() => { closeMenu(); onChange(option.value); }}
      accessibilityLabel={`${option.label}${option.value === value ? t(", selezionato") : ''}`}>
      <Text variant="bodyLarge" numberOfLines={1} style={styles.itemLabel}>{option.label}</Text>
      {/* Fixed slot on every row: the check always sits at the right edge, whatever the label length. */}
      <View style={styles.check}>{option.value === value && <SvgIcon shape={iconShapes.check} size={24} color={colors.onSurface} />}</View>
    </StateLayerPressable>
  ));
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
      {/* Measuring copy of the rows: same paddings, gap and check slot, no width limit; never visible nor focusable.
          The zero-size clipping box keeps it from widening the page (horizontal overflow) next to the right edge. */}
      <View aria-hidden pointerEvents="none" style={styles.measureBox}>
        <View style={styles.measure} onLayout={({ nativeEvent }) => setContentWidth(Math.ceil(nativeEvent.layout.width) + measureSlack)}>
          {options.map((option) => (
            <View key={option.value} style={styles.item}>
              <Text variant="bodyLarge" style={styles.nowrap}>{option.label}</Text>
              <View style={styles.check} />
            </View>
          ))}
        </View>
      </View>
      {compact
        ? <BottomSheet visible={open} onDismiss={closeMenu} title={label}>{rows}</BottomSheet>
        : <AnchoredMenu visible={open} onDismiss={closeMenu} anchor={anchor} width={Math.max(anchor.width, contentWidth)} label={label}>{rows}</AnchoredMenu>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: layout.fieldBoxHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  text: { flex: 1, minWidth: 0 },
  // Rows fit the field width; long labels shrink while the check keeps its fixed slot.
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, minHeight: 48, minWidth: 0, paddingHorizontal: spacing.lg },
  itemLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  check: { width: 24, height: 24 },
  // max-content: the rows keep their natural width instead of wrapping inside the (narrower) field container.
  measureBox: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0 },
  // No numberOfLines here: RN Web line clamping understates the max-content width of the label.
  nowrap: { whiteSpace: 'nowrap' } as unknown as TextStyle,
  measure: { position: 'absolute', left: 0, top: 0, width: 'max-content', visibility: 'hidden' } as unknown as ViewStyle,
});
