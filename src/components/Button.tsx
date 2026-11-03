import type { ComponentProps } from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { layout } from '../theme/tokens';

// The one button of the app: Paper's button with a 48 dp touch height. Corner radius comes from the
// theme (`paperRoundness` → 12 dp). Callers still choose the role: contained (primary),
// contained-tonal / outlined (secondary), text (tertiary), error colours (destructive).
export function Button({ contentStyle, ...rest }: ComponentProps<typeof PaperButton>) {
  return <PaperButton {...rest} contentStyle={[{ minHeight: layout.minTouch }, contentStyle]} />;
}
