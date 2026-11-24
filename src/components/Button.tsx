import type { ComponentProps } from 'react';
import { screenActionStyles, useScreenActions } from './screenActions';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';
import { dangerColors } from '../theme/palette';
import { useSizeClass } from '../theme/useSizeClass';

// The one button of the app: Paper's button with a 48 dp touch height. Corner radius comes from the
// token `radius.button` (16 dp, as fields and cards). Callers still choose the role: contained (primary),
// contained-tonal / outlined (secondary), text (tertiary), error colours (destructive).
export function Button({ contentStyle, style, ...rest }: ComponentProps<typeof PaperButton>) {
  return <PaperButton {...rest} style={[{ borderRadius: radius.button }, style]} contentStyle={[{ minHeight: layout.minTouch }, contentStyle]} />;
}

// Balanced padding for `compact` buttons with a leading icon (phones). Paper puts the icon 8 dp from the edge with 8 dp on
// the trailing side, but the 18 dp icons carry their own whitespace, so the content looked pushed towards the end. Pass
// `content` as contentStyle and `label` as labelStyle. Measured ink (close, pencil, play, plus): about 16 / 8–10 / 16 dp
// (roomy, +10 dp wide) and 12 / 8 / 12 dp (snug, same width as Paper). `*Narrow` variants are for icons with a narrow
// glyph (pause), whose wider inner margins would otherwise leave about 2.5 dp more before the icon than after the label.
export const compactIconPadding = {
  roomy: StyleSheet.create({ content: { paddingLeft: spacing.xs }, label: { marginLeft: 6, marginRight: spacing.lg } }),
  snug: StyleSheet.create({ content: { paddingLeft: 0 }, label: { marginLeft: spacing.xs, marginRight: spacing.md } }),
  roomyNarrow: StyleSheet.create({ content: { paddingLeft: spacing.xs }, label: { marginLeft: 3, marginRight: 19 } }),
  snugNarrow: StyleSheet.create({ content: { paddingLeft: 0 }, label: { marginLeft: 2, marginRight: 14 } }),
} as const;

// The same for regular (non-compact) buttons: Paper leaves 16 dp before the icon but 24 dp after the label, so with the
// glyph's own inset the ink sat about 19 dp from the left edge and 25 dp from the right. Measured with the 18 dp icons
// (close, pencil, play): about 19–21 dp before the icon and 20 dp after the label, 12 dp between icon and text.
// `balancedNarrow` is for pause, whose narrow glyph leaves 3 dp more between icon and text.
export const regularIconPadding = {
  balanced: StyleSheet.create({ content: {}, label: { marginRight: 19 } }),
  balancedNarrow: StyleSheet.create({ content: {}, label: { marginLeft: 21, marginRight: 19 } }),
} as const;

// Actions of dialogs, confirmations and inline choices, the same everywhere (user's request, 21 November, after the receipt
// scan dialog): the way back («Annulla», «Indietro») is outlined, the confirmation contained (destructive ones pass the error
// colours), each at least 112 wide and 48 tall, 12 apart. Paper's Dialog.Actions clones its direct children adding `compact`
// and 8 dp after every button but the last: these buttons drop that margin (their style is applied last), so the space between
// them is only the `gap` of `dialogActionsRow`, also where they sit in a plain View. The `compact` it adds is overridden too:
// it shrinks the label's side margins from 24 to 8, so a label longer than the minimum width («Usa questi dati») looked
// cramped next to the others.
// `small`: the date picker only (user's request, 21 November: «Annulla» and «OK» looked too big under the calendar), 40 tall
// (the Material 3 button height); shorter on 22 November (user's request): 16 beside the label instead of 24 and at least 72
// wide; later the same day both 88 wide (user's request: «Annulla» and «OK» the same length), which «Annulla» fits; then 44 tall
// (user's request, 22 November: «slightly» taller), still below the 48 of the other dialog buttons.
const dialogActionStyles = StyleSheet.create({ button: { minWidth: 112, marginRight: 0 }, phone: { minWidth: 96 }, small: { minWidth: 88 }, smallContent: { minHeight: 44 },
  smallLabel: { marginHorizontal: spacing.lg } });
const dialogAction = dialogActionStyles.button;
export const dialogActionsRow = StyleSheet.create({ row: { flexWrap: 'wrap', gap: spacing.md } }).row;
// «Annulla» and the confirmation kept together next to a left-hand action (Elimina): when the row wraps on a narrow phone, the
// pair moves under it as one unit, never split.
export const dialogActionPair = StyleSheet.create({ pair: { flexDirection: 'row', gap: spacing.md, marginLeft: 'auto' } }).pair;

// `narrowOnPhone`: 96 instead of 112 on phones, for «Annulla»/«Salva» next to the trash of the edit dialogs (expense,
// template, product), so that the three fit one row from 360 px (user's request, 21 November).
type ActionProps = Omit<ComponentProps<typeof PaperButton>, 'mode'> & { narrowOnPhone?: boolean; small?: boolean };
function useActionStyle(narrowOnPhone?: boolean, small?: boolean) {
  const phone = useSizeClass() === 'compact';
  if (small) return [dialogAction, dialogActionStyles.small];
  return narrowOnPhone && phone ? [dialogAction, dialogActionStyles.phone] : dialogAction;
}
export function CancelButton({ style, narrowOnPhone, small, contentStyle, labelStyle, ...rest }: ActionProps) {
  return <Button {...rest} compact={false} mode="outlined" style={[style, useActionStyle(narrowOnPhone, small)]} contentStyle={[small && dialogActionStyles.smallContent, contentStyle]}
    labelStyle={[small && dialogActionStyles.smallLabel, labelStyle]} />;
}
export function ConfirmButton({ style, narrowOnPhone, small, contentStyle, labelStyle, ...rest }: ActionProps) {
  // In a screen's actions: a full-width pill like «Salva» of Nuova spesa (screenActions.ts).
  const onScreen = useScreenActions();
  return <Button {...rest} compact={false} mode="contained" style={[style, useActionStyle(narrowOnPhone, small), onScreen && screenActionStyles.button]}
    contentStyle={[small && dialogActionStyles.smallContent, contentStyle, onScreen && screenActionStyles.content]}
    labelStyle={[small && dialogActionStyles.smallLabel, labelStyle, onScreen && screenActionStyles.label]} />;
}

// Every «Elimina» (user's request, 23 November: «completamente in rosso, stessa forma e stessa colorazione»): filled in the error
// colour with its label in onError, pill-shaped. Layout (width, alignment) stays with the caller.
export function DangerButton({ style, ...rest }: Omit<ComponentProps<typeof PaperButton>, 'mode' | 'buttonColor' | 'textColor'>) {
  const danger = useDangerColors();
  return <Button {...rest} mode="contained" buttonColor={danger.fill} textColor={danger.ink} style={[style, dangerStyle]} />;
}
// A real red in both themes, a little softer than the pure roles (`dangerColors` in palette.ts).
export function useDangerColors(): { fill: string; ink: string } {
  const { colors, dark } = useTheme();
  return dangerColors(colors, dark);
}
const dangerStyle = StyleSheet.create({ pill: { borderRadius: radius.pill, borderWidth: 0 } }).pill;
