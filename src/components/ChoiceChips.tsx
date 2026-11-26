import { useI18n } from '../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { shapeMorph } from '../theme/motion';
import { glassOf } from '../theme/theme';
import { groupGap, radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };
type Props<T extends string> = {
  options: readonly Choice<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  // Optional choices (e.g. category) can be cleared by tapping the selected chip again.
  allowDeselect?: boolean;
  label?: string;
  disabled?: boolean;
};

// A single choice among a few (Lingua, Tema, Carattere, Servizio AI…), as the connected tiles of Morphe's «Modalità tema»
// (26 November, on request, in place of the wrapping filter chips with a check): equal tiles side by side, a little apart, the
// outer corners of the row rounded and the inner ones small; the selected tile becomes a pill filled with the primary container
// and outlined in the primary. An option's icon sits above its label. Long labels wrap on two lines, never cut.
export function ChoiceChips<T extends string>({ options, value, onChange, allowDeselect, label, disabled }: Props<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const glass = glassOf(colors);
  const last = options.length - 1;
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const color = selected ? colors.onPrimaryContainer : colors.onSurface;
        const corners = selected ? { borderRadius: radius.pill } : {
          borderTopLeftRadius: index === 0 ? radius.group : radius.groupInner, borderBottomLeftRadius: index === 0 ? radius.group : radius.groupInner,
          borderTopRightRadius: index === last ? radius.group : radius.groupInner, borderBottomRightRadius: index === last ? radius.group : radius.groupInner,
        };
        return (
          <StateLayerPressable key={option.value} layerColor={color} disabled={disabled} hitSlop={{ top: 2, bottom: 2 }}
            onPress={() => onChange(selected && allowDeselect ? '' : option.value)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled}
            accessibilityLabel={`${option.label}${selected ? t(", selezionata") : ''}`}
            style={[styles.chip, corners, option.icon ? styles.withIcon : null, selected
              ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
              : { backgroundColor: glass.glass, borderColor: glass.glassBorder }, shapeMorph]}>
            {option.icon}
            <Text variant="labelLarge" style={[styles.label, { color, fontWeight: selected ? '700' : '500' }]}>{option.label}</Text>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', gap: groupGap },
  chip: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1 },
  withIcon: { minHeight: 64 },
  label: { textAlign: 'center' },
});
