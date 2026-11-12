import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// `label` is the short visible text; `accessibilityLabel` the full name when the short one is abbreviated.
export type Segment<T extends string> = { value: T; label: string; accessibilityLabel?: string };
type Props<T extends string> = {
  options: readonly Segment<T>[];
  value: T | '';
  onChange: (value: T) => void;
  label: string;
  error?: boolean;
  disabled?: boolean;
};

const checkSize = 18;

// Material 3 segmented button, always one line and 40 dp tall: labels never wrap (ellipsis only as a last resort,
// after dropping the check and narrowing the padding).
// The check mark of the selected segment is optional in M3: it is drawn only when it fits beside the label, measured
// from the segment width and the label's natural width (hidden nowrap clone); the filled colour still marks selection.
export function SegmentedButtons<T extends string>({ options, value, onChange, label, error, disabled }: Props<T>) {
  const { colors } = useTheme();
  const border = error ? colors.error : colors.outline;
  const [widths, setWidths] = useState<Readonly<Record<string, { segment?: number; text?: number }>>>({});
  const measure = (key: string, part: 'segment' | 'text', width: number) =>
    setWidths((previous) => (previous[key]?.[part] === width ? previous : { ...previous, [key]: { ...previous[key], [part]: width } }));
  // Room for each label inside the standard padding (minus the left divider), null until measured.
  const roomOf = (key: string, index: number) => {
    const size = widths[key];
    return size?.segment !== undefined && size.text !== undefined ? size.segment - spacing.md * 2 - (index > 0 ? 1 : 0) - size.text : null;
  };
  // Segments share free space on top of their padding (flex: 1), so a narrower padding goes to all of them or none:
  // otherwise the tight segment itself would shrink.
  const tight = options.some((option, index) => { const room = roomOf(option.value, index); return room !== null && room < 0; });
  return (
    <View style={[styles.row, { borderColor: border }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const color = selected ? colors.onSecondaryContainer : colors.onSurface;
        // The check needs the gap beside the label; without room for it the label alone, tighter still 8 dp padding.
        const room = roomOf(option.value, index);
        const fits = !tight && room !== null && room >= spacing.sm + checkSize;
        return (
          <StateLayerPressable key={option.value} disabled={disabled} layerColor={color} onPress={() => onChange(option.value)}
            accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} accessibilityLabel={option.accessibilityLabel ?? option.label}
            onLayout={(event) => measure(option.value, 'segment', event.nativeEvent.layout.width)}
            style={[styles.segment,
              index === 0 && styles.firstSegment,
              index === options.length - 1 && styles.lastSegment,
              index > 0 && { borderLeftWidth: 1, borderLeftColor: border },
              tight && styles.tight,
              selected && { backgroundColor: colors.secondaryContainer }]}>
            {selected && fits && <SvgIcon shape={iconShapes.check} size={checkSize} color={color} />}
            <Text variant="labelLarge" numberOfLines={1} style={[styles.label, { color }]}>{option.label}</Text>
            {/* Natural width of the label, out of the layout and invisible; +2 because onLayout rounds. */}
            <View aria-hidden style={styles.clip} pointerEvents="none">
              <Text variant="labelLarge" style={styles.clone}
                onLayout={(event) => measure(option.value, 'text', Math.ceil(event.nativeEvent.layout.width) + 2)}>{option.label}</Text>
            </View>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 40, borderWidth: 1, borderRadius: radius.pill, overflow: 'hidden' },
  segment: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tight: { paddingHorizontal: spacing.sm },
  label: { flexShrink: 1, minWidth: 0, textAlign: 'center' },
  clip: { position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 },
  clone: { position: 'absolute', whiteSpace: 'nowrap' } as object,
  firstSegment: { borderTopLeftRadius: radius.pill, borderBottomLeftRadius: radius.pill },
  lastSegment: { borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill },
});
