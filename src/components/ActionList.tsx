import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { M3Switch } from './M3Switch';
import { Spinner } from './Spinner';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// The language of «Archiviazione e backup» (27 November, on request: the page of loose buttons was redone): the same grouped
// lists as «Info». A `ListGroup` is a labelled rounded surface; the groups of a page are stacked in one column, the whole width
// of the panel, on every size (27 November, on request: side by side on desktop they looked scattered); its rows are `ActionRow` (a tonal icon tile, a title, one line of
// explanation, a chevron: the whole row presses) or `StatusRow` (the same, not pressable).
export function ListGroup({ label, plain = false, children, footer }: { label?: string; plain?: boolean; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.group} {...({ role: 'region', 'aria-label': label } as object)}>
      {label !== undefined && (plain
        ? <Text variant="titleMedium" style={styles.plainLabel} accessibilityRole="header" aria-level={2}>{label}</Text>
        : <Text variant="labelLarge" style={[styles.label, { color: colors.primary }]} accessibilityRole="header" aria-level={2}>
          {label.toLocaleUpperCase()}</Text>)}
      <View style={[styles.box, { backgroundColor: colors.elevation.level1, borderColor: colors.outlineVariant }]}>{children}</View>
      {footer}
    </View>
  );
}

// A hairline between two rows, aligned with the text (after the icon tile).
export const RowDivider = () => <Divider style={styles.divider} />;

type Tone = 'primary' | 'secondary' | 'tertiary';
function useTile(tone: Tone): readonly [string, string] {
  const { colors } = useTheme();
  return tone === 'secondary' ? [colors.secondaryContainer, colors.onSecondaryContainer]
    : tone === 'tertiary' ? [colors.tertiaryContainer, colors.onTertiaryContainer] : [colors.primaryContainer, colors.onPrimaryContainer];
}

type Content = { icon: string; tone?: Tone; title: string; subtitle?: string };
function RowContent({ icon, tone = 'primary', title, subtitle, trailing }: Content & { trailing?: ReactNode }) {
  const { colors } = useTheme();
  const tile = useTile(tone);
  return <>
    <View style={[styles.tile, { backgroundColor: tile[0] }]}><SvgIcon shape={icon} size={22} color={tile[1]} /></View>
    <View style={styles.text}>
      <Text variant="titleMedium">{title}</Text>
      {subtitle ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text> : null}
    </View>
    {trailing}
  </>;
}

// Pressable row. `busy` shows a spinner in place of the chevron (the action is running); `disabled` dims it.
export function ActionRow({ label, disabled, busy, busyLabel, onPress, ...content }: Content & { label?: string; busyLabel?: string; disabled?: boolean; busy?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} role="button" accessibilityLabel={label ?? content.title} disabled={disabled || busy}
      onPress={onPress} style={styles.row}>
      <RowContent {...content} trailing={busy
        ? <Spinner size={20} label={busyLabel ?? content.title} />
        : <SvgIcon shape={iconShapes.chevronRight} size={20} color={colors.onSurfaceVariant} />} />
    </StateLayerPressable>
  );
}

// A row with a switch: the whole row turns it on and off (role switch), same tile, title and line as the other rows.
export function ToggleRow({ value, onChange, disabled, ...content }: Content & { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} accessibilityRole="switch" aria-checked={value} aria-disabled={disabled} accessibilityLabel={content.title}
      disabled={disabled} onPress={() => onChange(!value)} style={styles.row}>
      <RowContent {...content} trailing={<M3Switch value={value} disabled={disabled} />} />
    </StateLayerPressable>
  );
}

// The same row without an action: what is true of the archive (where it is, how it is kept).
export function StatusRow(content: Content & { value?: string }) {
  const { colors } = useTheme();
  const { value, ...rest } = content;
  return (
    <View style={styles.row} role="status">
      <RowContent {...rest} trailing={value ? <Text variant="bodyLarge" selectable style={[styles.value, { color: colors.onSurfaceVariant }]}>{value}</Text> : undefined} />
    </View>
  );
}

// A setting with its choices: the title row (tonal tile, title, optional line) and the control under it, the whole width of
// the row (chips, segments, a select). Used by the pages of options (Impostazioni, Notifiche, Templates).
export function OptionRow({ children, ...content }: Content & { children: ReactNode }) {
  return (
    <View style={styles.option}>
      <View style={styles.optionHead}><RowContent {...content} /></View>
      {children}
    </View>
  );
}

// Content under the rows inside the surface (a preview, a note): padded like a row.
export const RowBody = ({ children }: { children: ReactNode }) => <View style={styles.body}>{children}</View>;

// The groups of a page, one under the other.
export function ListGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

// A quiet disclosure line for secondary content (archived lists and funds; 27 November, on request): no box, no tile and no arrow on the right,
// only a small chevron and the label in the muted colour, so it does not compete with the cards above it.
export function QuietToggle({ title, open, onPress }: { title: string; open: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} radius={radius.control} role="button" aria-expanded={open} accessibilityLabel={title} onPress={onPress} style={styles.quiet}>
      <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={20} color={colors.onSurfaceVariant} />
      <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{title}</Text>
    </StateLayerPressable>
  );
}

const styles = StyleSheet.create({
  quiet: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  grid: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xl },
  group: { minWidth: 0, gap: spacing.sm },
  label: { letterSpacing: 0.8, paddingHorizontal: spacing.sm },
  // A heading as written, not in capitals (Fondi, 27 November, on request).
  plainLabel: { paddingHorizontal: spacing.sm },
  box: { borderRadius: radius.dialog, borderWidth: 1, overflow: 'hidden' },
  divider: { marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 72, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  tile: { width: 40, height: 40, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  value: { flexShrink: 1, fontWeight: '500', textAlign: 'right', maxWidth: '50%' },
  option: { padding: spacing.lg, gap: spacing.md },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  body: { padding: spacing.lg, gap: spacing.md },
});
