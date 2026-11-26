import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { shapeMorph } from '../theme/motion';
import { glassOf } from '../theme/theme';
import { groupGap, radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { useHaptics } from './Haptics';

// `label` is the short visible text; `accessibilityLabel` the full name when the short one is abbreviated.
export type Segment<T extends string> = { value: T; label: string; accessibilityLabel?: string };
type Props<T extends string> = {
  options: readonly Segment<T>[];
  value: T | '';
  onChange: (value: T) => void;
  label: string;
  error?: boolean;
  disabled?: boolean;
  // A `tap` vibration when the choice changes. Off by default: removed from every segmented button on 21 November (user's
  // request), back only for the Spese/Abbonamenti views on 22 November (user's request, a switch of page view).
  haptic?: boolean;
};

// Horizontal padding, from the comfortable measure to the narrowest that still looks balanced.
const paddings = [spacing.md, spacing.sm, spacing.xs] as const;

// Material 3 Expressive connected button group, as in Morphe (26 November, on request, in place of the joined segmented
// button with a check): one row of separate outlined tiles a little apart, the outer ends of the group rounded, the corners
// between tiles small; the selected tile turns into a pill, filled with the primary container and outlined in the primary, its
// label bold. The shape and the fill mark the selection (no check). Always one line, 44 dp: labels never wrap; when one does not
// fit, the whole group narrows its padding (the same for every tile, so a new selection never moves the labels).
export function SegmentedButtons<T extends string>({ options, value, onChange, label, error, disabled, haptic = false }: Props<T>) {
  const { colors } = useTheme();
  const glass = glassOf(colors);
  const vibrate = useHaptics();
  const [widths, setWidths] = useState<Readonly<Record<string, { segment?: number; text?: number }>>>({});
  const measure = (key: string, part: 'segment' | 'text', width: number) =>
    setWidths((previous) => (previous[key]?.[part] === width ? previous : { ...previous, [key]: { ...previous[key], [part]: width } }));
  // Every label fits at a padding (null while not yet measured counts as fitting).
  const fitsAt = (padding: number) => options.every((option) => {
    const size = widths[option.value];
    return size?.segment === undefined || size.text === undefined || size.segment - padding * 2 - 2 >= size.text;
  });
  const padding = paddings.find(fitsAt) ?? paddings[paddings.length - 1]!;
  const last = options.length - 1;
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const color = selected ? colors.onPrimaryContainer : colors.onSurface;
        const corners = selected ? { borderRadius: radius.pill } : {
          borderTopLeftRadius: index === 0 ? radius.group : radius.groupInner, borderBottomLeftRadius: index === 0 ? radius.group : radius.groupInner,
          borderTopRightRadius: index === last ? radius.group : radius.groupInner, borderBottomRightRadius: index === last ? radius.group : radius.groupInner,
        };
        return (
          <StateLayerPressable key={option.value} disabled={disabled} layerColor={color} onPress={() => { if (haptic && option.value !== value) vibrate(); onChange(option.value); }}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} accessibilityLabel={option.accessibilityLabel ?? option.label}
            onLayout={(event) => measure(option.value, 'segment', event.nativeEvent.layout.width)}
            style={[styles.segment, corners, { paddingHorizontal: padding },
              selected ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                : { backgroundColor: glass.glass, borderColor: error ? colors.error : glass.glassBorder }, shapeMorph]}>
            <Text variant="labelLarge" numberOfLines={1} style={[styles.label, { color, fontWeight: selected ? '700' : '500' }]}>{option.label}</Text>
            {/* Natural width of the label (bold, the widest state), out of the layout and invisible; +2 because onLayout rounds. */}
            <View aria-hidden style={styles.clip} pointerEvents="none">
              <Text variant="labelLarge" style={[styles.clone, { fontWeight: '700' }]}
                onLayout={(event) => measure(option.value, 'text', Math.ceil(event.nativeEvent.layout.width) + 2)}>{option.label}</Text>
            </View>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: groupGap, minHeight: 44 },
  segment: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderWidth: 1 },
  label: { flexShrink: 1, minWidth: 0, textAlign: 'center' },
  clip: { position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 },
  clone: { position: 'absolute', whiteSpace: 'nowrap' } as object,
});
