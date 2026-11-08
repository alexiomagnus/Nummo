import type { ComponentProps } from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { layout, radius } from '../theme/tokens';

// The one button of the app: Paper's button with a 48 dp touch height. Corner radius comes from the
// token `radius.button` (16 dp, as fields and cards). Callers still choose the role: contained (primary),
// contained-tonal / outlined (secondary), text (tertiary), error colours (destructive).
export function Button({ contentStyle, style, ...rest }: ComponentProps<typeof PaperButton>) {
  return <PaperButton {...rest} style={[{ borderRadius: radius.button }, style]} contentStyle={[{ minHeight: layout.minTouch }, contentStyle]} />;
}
