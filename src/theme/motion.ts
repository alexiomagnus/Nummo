import type { ViewStyle } from 'react-native';
import { motion } from './tokens.ts';

// Web CSS transitions for state changes (colour, opacity, transform). RN Web compiles `transition*` styles to CSS, so they
// run on the compositor/browser rather than the JS thread; the global `prefers-reduced-motion` rule in GlobalStyle
// shortens them to ~0. The cast is needed because React Native's own style types do not declare these web-only props.
const cssEasing = `cubic-bezier(${motion.easing.join(', ')})`;

export function transition(properties: readonly string[], duration: number = motion.short): ViewStyle {
  return {
    transitionProperty: properties.join(', '),
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: cssEasing,
  } as ViewStyle;
}

// Shared presets: state layers fade, selected fills and borders cross-fade, dimming (chart focus) eases.
export const fadeTransition = transition(['opacity']);
export const fillTransition = transition(['background-color', 'border-color', 'color', 'opacity']);

// Quicker fade for state layers so press feedback feels immediate (hover and release still ease out).
export const layerTransition = transition(['opacity'], 100);

// Bar fills scale with transform (compositor only) instead of animating their width.
export const barTransition = transition(['transform', 'background-color'], 400);
