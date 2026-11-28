import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ThemeProvider, useTheme } from 'react-native-paper';
import { glassOf } from '../theme/theme';
import { groupGap, radius, spacing } from '../theme/tokens';
import { M3Switch } from './M3Switch';
import { Spinner } from './Spinner';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// The grouped lists of the app (Impostazioni, Notifiche, Archiviazione e backup, Info, Categorie, Esercenti…), in the glass
// language (26 November, on request, after Morphe on Android): a section heading with its icon, then the rows, each a translucent
// card of its own, a little apart, the outer corners of the group large and the inner ones small (GlobalStyle, `data-glass-group`:
// every direct child of the group, and every item of a `role="list"` inside it, becomes a card). The groups of a page are stacked
// in one column, the whole width of the panel, on every size. Rows are `ActionRow` (icon, title, one line of explanation, chevron:
// the whole row presses), `ToggleRow`, `OptionRow` or `StatusRow`; other content goes in a `RowBody`.
export function ListGroup({ label, icon, plain = false, children, footer }: { label?: string; icon?: string; plain?: boolean; children: ReactNode; footer?: ReactNode }) {
  const theme = useTheme();
  const { colors } = theme;
  // Outlined fields inside a card take their fill and the notch of their label from `background`: the card's colour.
  const cardTheme = useMemo(() => ({ ...theme, colors: { ...colors, background: glassOf(colors).glassSolid } }), [theme, colors]);
  return (
    <View style={styles.group} {...({ role: 'region', 'aria-label': label } as object)}>
      {label !== undefined && (plain
        ? <Text variant="titleMedium" style={styles.plainLabel} accessibilityRole="header" aria-level={2}>{label}</Text>
        : <SectionLabel label={label} icon={icon} />)}
      <ThemeProvider theme={cardTheme}>
        <View {...{ dataSet: { glassGroup: 'true' } }} style={styles.box}><InCard.Provider value>{children}</InCard.Provider></View>
      </ThemeProvider>
      {footer}
    </View>
  );
}

// Whether a row sits directly in a card of a group (26 November, on request: the hover of «Ricorrente» did not follow the card's
// outline). A row there runs flush to the card, which clips its state layer to its own corners; inside a `RowBody` (a card with
// padding) it is false again, so a padded row keeps its own rounded layer.
const InCard = createContext(false);
export const useInCard = () => useContext(InCard);

// Heading of a section: the icon in the accent, the name as written (not in capitals) in the muted text colour.
export function SectionLabel({ label, icon }: { label: string; icon?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.labelRow}>
      {icon !== undefined && <SvgIcon shape={icon} size={20} color={colors.primary} />}
      <Text variant="titleSmall" style={[styles.label, { color: colors.onSurfaceVariant }]} accessibilityRole="header" aria-level={2}>{label}</Text>
    </View>
  );
}

// Rows are cards of their own now: no hairline between them. Kept so the callers stay unchanged.
export const RowDivider = () => null;

type Tone = 'primary' | 'secondary' | 'tertiary';
function useToneColor(tone: Tone): string {
  const { colors } = useTheme();
  return tone === 'secondary' ? colors.secondary : tone === 'tertiary' ? colors.tertiary : colors.primary;
}

type Content = { icon: string; tone?: Tone; title: string; subtitle?: string };
function RowContent({ icon, tone = 'primary', title, subtitle, trailing }: Content & { trailing?: ReactNode }) {
  const { colors } = useTheme();
  const color = useToneColor(tone);
  return <>
    <View style={styles.icon}><SvgIcon shape={icon} size={24} color={color} /></View>
    <View style={styles.text}>
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {subtitle ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text> : null}
    </View>
    {trailing}
  </>;
}

// Pressable row. `busy` shows a spinner in place of the chevron (the action is running); `disabled` dims it.
export function ActionRow({ label, disabled, busy, busyLabel, onPress, arrow = true, ...content }: Content & { label?: string; busyLabel?: string; disabled?: boolean; busy?: boolean; onPress: () => void; arrow?: boolean }) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} role="button" accessibilityLabel={label ?? content.title} disabled={disabled || busy}
      onPress={onPress} style={styles.row}>
      <RowContent {...content} trailing={busy
        ? <Spinner size={20} label={busyLabel ?? content.title} />
        : arrow ? <SvgIcon shape={iconShapes.chevronRight} size={22} color={colors.onSurfaceVariant} /> : undefined} />
    </StateLayerPressable>
  );
}

// A row with a switch: the whole row turns it on and off (role switch), same icon, title and line as the other rows.
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

// A setting with its choices: the title row (icon, title, optional line) and the control under it, the whole width of the card
// (connected choices, a select). Used by the pages of options (Impostazioni, Notifiche, Templates).
// With `toggle` (28 November, on request: Altra ora) the head is a switch that enables what is below it.
export function OptionRow({ children, toggle, ...content }: Content & { children: ReactNode; toggle?: { value: boolean; onChange: (value: boolean) => void } }) {
  const { colors } = useTheme();
  return (
    <View style={styles.option}>
      <View style={styles.optionHead}>
        {toggle
          ? <StateLayerPressable layerColor={colors.onSurface} accessibilityRole="switch" aria-checked={toggle.value} accessibilityLabel={content.title}
              onPress={() => toggle.onChange(!toggle.value)} style={styles.optionToggle}><RowContent {...content} trailing={<M3Switch value={toggle.value} />} /></StateLayerPressable>
          : <RowContent {...content} />}
      </View>
      {children}
    </View>
  );
}

// Content of a card of its own inside a group (a preview, a note, a form): padded like a row.
export const RowBody = ({ children, tight = false }: { children: ReactNode; tight?: boolean }) =>
  <View style={[styles.body, tight && styles.bodyTight]}><InCard.Provider value={false}>{children}</InCard.Provider></View>;

// The groups of a page, one under the other.
export function ListGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

// A quiet disclosure line for secondary content (archived lists and funds; 26 November, on request): no box, no icon and no arrow on the right,
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

// Inner padding of a row: the icon of the heading above lines up with the icons of the rows.
const rowSide = 18;

const styles = StyleSheet.create({
  quiet: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  grid: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xl },
  group: { minWidth: 0, gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: rowSide + 3, minHeight: 24 },
  label: { flexShrink: 1, fontWeight: '600', letterSpacing: 0.1 },
  // A heading as written, larger (Fondi, 26 November, on request).
  plainLabel: { paddingHorizontal: spacing.sm },
  box: { gap: groupGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 68, paddingVertical: spacing.md + 2, paddingHorizontal: rowSide },
  icon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontWeight: '600' },
  value: { flexShrink: 1, fontWeight: '500', textAlign: 'right', maxWidth: '50%' },
  option: { paddingVertical: spacing.lg, paddingHorizontal: rowSide, gap: spacing.md },
  optionToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  body: { paddingVertical: spacing.lg, paddingHorizontal: rowSide, gap: spacing.md },
  // Both axes: a bare `padding` would lose to the body's paddingVertical/paddingHorizontal (React Native's precedence).
  bodyTight: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
});
