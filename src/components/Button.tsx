import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { layout, radius, spacing } from '../theme/tokens';

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
