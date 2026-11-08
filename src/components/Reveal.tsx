import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { motion, spacing } from '../theme/tokens';

// Enter animation for content that appears on demand (expanded details): a short fade and 4 dp slide. It is a CSS
// keyframe animation (opacity/transform only), so it runs off the JS thread and cannot cause layout work; the global
// `prefers-reduced-motion` rule in GlobalStyle reduces it to ~0. Mounting stays immediate; exit is instant by design.
const keyframes = {
  from: { opacity: 0, transform: `translateY(${-spacing.xs}px)` },
  to: { opacity: 1, transform: 'translateY(0)' },
};
const style = {
  animationKeyframes: keyframes,
  animationDuration: `${motion.long}ms`,
  animationTimingFunction: `cubic-bezier(${motion.enter.join(', ')})`,
  animationFillMode: 'both',
} as ViewStyle;

export function Reveal({ children, style: extra, ...rest }: { children: ReactNode; style?: StyleProp<ViewStyle> } & Record<string, unknown>) {
  return <View {...rest} style={[extra, style]}>{children}</View>;
}
