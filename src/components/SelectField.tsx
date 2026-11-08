import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { HelperText, Menu, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inputOutline, layout, radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type SelectOption<T extends string> = { value: T; label: string; icon?: ReactNode };
type Props<T extends string> = {
  label: string;
  options: readonly SelectOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};

// Material 3 exposed dropdown menu: an outlined text field (label, trailing arrow) that opens a menu as wide as the field.
// The field is read-only and not focusable itself: the surrounding button owns focus, press and accessibility.
const MENU_MAX_HEIGHT = 360;
const MENU_MIN_HEIGHT = 192; // below this much room, Paper shifts the menu up instead (it then fits whole)
const SCREEN_MARGIN = 16;
// Selected/hover highlight is inset in the menu and rounded like the keyboard focus ring (GlobalStyle: 12).
const itemRadius = 12;
const fieldLabelGap = layout.controlHeight - layout.fieldBoxHeight;

export function SelectField<T extends string>({ label, options, value, onChange, error, disabled }: Props<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const [maxHeight, setMaxHeight] = useState(MENU_MAX_HEIGHT);
  const anchorRef = useRef<ComponentRef<typeof Pressable>>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewportHeight = Math.max(0, windowHeight - insets.top - insets.bottom - 2 * SCREEN_MARGIN);
  const menuHeight = Math.min(maxHeight, viewportHeight);
  const menuWidth = Math.min(width, Math.max(0, windowWidth - insets.left - insets.right - 2 * SCREEN_MARGIN));
  // Open: cap the height to the room below the field (inner scroll for the rest); with little room Paper moves the menu up.
  const openMenu = () => {
    anchorRef.current?.measureInWindow((_x, y, _w, h) => {
      const below = windowHeight - insets.bottom - (y + h) - SCREEN_MARGIN;
      setMaxHeight(Math.min(MENU_MAX_HEIGHT, below >= MENU_MIN_HEIGHT ? below : viewportHeight));
      setOpen(true);
    });
  };
  const current = options.find((option) => option.value === value);
  return (
    <View>
      <Menu visible={open} onDismiss={() => setOpen(false)} anchorPosition="bottom"
        contentStyle={{ backgroundColor: colors.elevation.level2, maxHeight: menuHeight, borderRadius: radius.card,
          width: menuWidth, paddingVertical: spacing.xs, overflow: 'hidden' }}
        anchor={
          <Pressable ref={anchorRef} style={styles.anchor} disabled={disabled} onPress={openMenu} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            accessibilityRole="button" aria-haspopup="listbox" aria-expanded={open} aria-disabled={disabled}
            accessibilityLabel={`${label}${current ? `: ${current.label}` : t(", obbligatoria, nessuna selezione")}`}>
            {/* `inert` excludes every descendant, including Paper surfaces that restore pointer events. */}
            <div inert style={{ marginTop: -fieldLabelGap }}>
              <TextInput outlineStyle={inputOutline} label={label} value={current?.label ?? ''} mode="outlined" readOnly focusable={false}
                error={Boolean(error)} aria-disabled={disabled} showSoftInputOnFocus={false}
                left={current?.icon ? <TextInput.Icon icon={() => current.icon} forceTextInputFocus={false} tabIndex={-1} aria-hidden /> : undefined}
                right={<TextInput.Icon icon={({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />} forceTextInputFocus={false} tabIndex={-1} aria-hidden />} />
            </div>
          </Pressable>
        }>
        <ScrollView style={{ maxHeight: Math.max(0, menuHeight - 2 * spacing.xs) }} keyboardShouldPersistTaps="handled">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <StateLayerPressable key={option.value} layerColor={colors.onSurface} radius={itemRadius} accessibilityRole="menuitem" style={[styles.item, selected && { backgroundColor: colors.secondaryContainer }]}
              onPress={() => { setOpen(false); onChange(option.value); }} accessibilityLabel={`${option.label}${selected ? t(", selezionata") : ''}`}>
              {option.icon && <View style={styles.icon}>{option.icon}</View>}
              <Text variant="bodyLarge" numberOfLines={1} style={[styles.itemLabel, selected && { color: colors.onSecondaryContainer }]}>{option.label}</Text>
              <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onSecondaryContainer} />}</View>
            </StateLayerPressable>
          );
        })}
        </ScrollView>
      </Menu>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Paper's 56 dp input reserves 6 dp above the outline for the floating label. The pressable (focus ring, press) must
  // hug the visible outline (fieldBoxHeight), so the input is pulled up by that gap and the pressable pushed down by it.
  anchor: { borderRadius: radius.input, marginTop: fieldLabelGap },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, marginHorizontal: spacing.xs },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1 },
  check: { width: 20, height: 20 },
});
