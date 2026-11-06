import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Menu, Text, TextInput, useTheme } from 'react-native-paper';
import { inputOutline, radius, spacing } from '../theme/tokens';
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
export function SelectField<T extends string>({ label, options, value, onChange, error, disabled }: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const current = options.find((option) => option.value === value);
  return (
    <View>
      <Menu visible={open} onDismiss={() => setOpen(false)} anchorPosition="bottom"
        contentStyle={{ backgroundColor: colors.elevation.level2, maxHeight: 360, borderRadius: radius.card, minWidth: width, paddingVertical: spacing.xs }}
        anchor={
          <Pressable disabled={disabled} onPress={() => setOpen(true)} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            accessibilityRole="button" aria-haspopup="listbox" aria-expanded={open} aria-disabled={disabled}
            accessibilityLabel={`${label}${current ? `: ${current.label}` : ', obbligatoria, nessuna selezione'}`}>
            <View pointerEvents="none">
              <TextInput outlineStyle={inputOutline} label={label} value={current?.label ?? ''} mode="outlined" readOnly focusable={false}
                error={Boolean(error)} disabled={disabled} showSoftInputOnFocus={false}
                left={current?.icon ? <TextInput.Icon icon={() => current.icon} tabIndex={-1} aria-hidden /> : undefined}
                right={<TextInput.Icon icon={({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />} tabIndex={-1} aria-hidden />} />
            </View>
          </Pressable>
        }>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem" style={[styles.item, selected && { backgroundColor: colors.secondaryContainer }]}
              onPress={() => { setOpen(false); onChange(option.value); }} accessibilityLabel={`${option.label}${selected ? ', selezionata' : ''}`}>
              {option.icon && <View style={styles.icon}>{option.icon}</View>}
              <Text variant="bodyLarge" numberOfLines={1} style={[styles.itemLabel, selected && { color: colors.onSecondaryContainer }]}>{option.label}</Text>
              <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onSecondaryContainer} />}</View>
            </StateLayerPressable>
          );
        })}
      </Menu>
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingHorizontal: spacing.lg },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1 },
  check: { width: 20, height: 20 },
});
