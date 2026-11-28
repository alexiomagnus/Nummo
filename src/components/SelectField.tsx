import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { inputOutline, radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { AnchoredMenu, BottomSheet, type MenuAnchor } from './Overlay';
import { ChoiceScreen } from './ChoiceScreen';
import { decorativeIcon } from './FieldIcon';
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
  // The choices on a screen of their own (ChoiceScreen): on phones a panel with three positions opening in peek, from medium a screen
  // over the content panel instead of the menu under the field (user's requests, 24 November, for Categoria and Fondo).
  panel?: boolean;
};

// Material 3 exposed dropdown: an outlined text field (label, trailing arrow). On phones the choices open in a modal
// bottom sheet (long lists, never over the navigation or the form's buttons); from medium width in a menu as wide as
// the field, below it or above when there is no room. The field is read-only and not focusable itself: the surrounding
// button owns focus, press and accessibility; the overlay returns focus to it without scrolling.

export function SelectField<T extends string>({ label, options, value, onChange, error, disabled, panel = false }: Props<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor>({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = useRef<ComponentRef<typeof Pressable>>(null);
  const openMenu = () => {
    if (compact || panel) { setOpen(true); return; }
    anchorRef.current?.measureInWindow((x, y, width, height) => { setAnchor({ x, y, width, height }); setOpen(true); });
  };
  const closeMenu = () => setOpen(false);
  const current = options.find((option) => option.value === value);
  const rows = options.map((option) => {
    const selected = option.value === value;
    return (
      <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem" style={[styles.item, selected && { backgroundColor: colors.secondaryContainer }]}
        onPress={() => { closeMenu(); onChange(option.value); }} accessibilityLabel={`${option.label}${selected ? t(", selezionata") : ''}`}>
        {option.icon && <View style={styles.icon}>{option.icon}</View>}
        <Text variant="bodyLarge" numberOfLines={1} style={[styles.itemLabel, selected && { color: colors.onSecondaryContainer }]}>{option.label}</Text>
        <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onSecondaryContainer} />}</View>
      </StateLayerPressable>
    );
  });
  const accessibilityLabel = `${label}${current ? `: ${current.label}` : t(", obbligatoria, nessuna selezione")}`;
  return (
    <View>
      <Pressable ref={anchorRef} style={styles.anchor} disabled={disabled} onPress={openMenu}
        {...{ dataSet: { focusRing: 'field' } }}
        accessibilityRole="button" aria-haspopup="listbox" aria-expanded={open} aria-disabled={disabled} aria-invalid={Boolean(error)}
        accessibilityLabel={accessibilityLabel}>
        {/* `inert` excludes every descendant, including Paper surfaces that restore pointer events. */}
        <div inert>
          <TextInput outlineStyle={inputOutline} label={label} value={current?.label ?? ''} mode="outlined" readOnly focusable={false} contentStyle={styles.value}
            error={Boolean(error)} aria-disabled={disabled} showSoftInputOnFocus={false}
            left={current?.icon ? decorativeIcon(() => current.icon, false) : undefined}
            right={decorativeIcon(({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />, false)} />
        </div>
      </Pressable>
      {panel
        ? open && <ChoiceScreen label={label} options={options} value={value} selectedSuffix={t(", selezionata")} onChoose={onChange} onClose={closeMenu} />
        : compact
        ? <BottomSheet visible={open} onDismiss={closeMenu} title={label}>{rows}</BottomSheet>
        : <AnchoredMenu visible={open} onDismiss={closeMenu} anchor={anchor} width={anchor.width} label={label} contentStyle={styles.menu}>{rows}</AnchoredMenu>}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  // The shared keyboard focus style colours Paper's own outline without moving the input or its label.
  anchor: { borderRadius: radius.input },
  // A value longer than the field ends in «…» instead of a hard cut.
  value: { textOverflow: 'ellipsis' } as object,
  menu: { borderRadius: radius.card },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.lg },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1 },
  check: { width: 20, height: 20 },
});
