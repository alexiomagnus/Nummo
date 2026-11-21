import type { ViewStyle } from 'react-native';
import { motion } from './tokens.ts';

// Web CSS transitions for state changes (colour, opacity, transform). RN Web compiles `transition*` styles to CSS, so they
// run on the compositor/browser rather than the JS thread; the global `prefers-reduced-motion` rule in GlobalStyle
// shortens them to ~0. The cast is needed because React Native's own style types do not declare these web-only props.
const bezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;
const cssEasing = bezier(motion.easing);

export function transition(properties: readonly string[], duration: number = motion.short): ViewStyle {
  return {
    transitionProperty: properties.join(', '),
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: cssEasing,
  } as ViewStyle;
}

// One duration and curve per property (e.g. a quick opacity with a longer transform). The curve defaults to `easing`.
export type TransitionPart = readonly [property: string, duration: number, easing?: readonly number[]];
export function transitions(parts: readonly TransitionPart[]): ViewStyle {
  return {
    transitionProperty: parts.map(([property]) => property).join(', '),
    transitionDuration: parts.map(([, duration]) => `${duration}ms`).join(', '),
    transitionTimingFunction: parts.map(([, , easing]) => bezier(easing ?? motion.easing)).join(', '),
  } as ViewStyle;
}

// Shared presets: state layers fade, selected fills and borders cross-fade, dimming (chart focus) eases.
export const fadeTransition = transition(['opacity']);
export const fillTransition = transition(['background-color', 'border-color', 'color', 'opacity']);
// Selected fills (segments, chips, legend rows) switch at once, after fillTransition in the style array: a cross-fade
// left two half-selected items, or the new label colour on the old fill, when switching quickly (21 November).
export const selectionFill = transition(['opacity']);

// Quicker fade for state layers so press feedback feels immediate (hover and release still ease out).
export const layerTransition = transition(['opacity'], 100);

// Bar fills scale with transform (compositor only) instead of animating their width.
export const barTransition = transition(['transform', 'background-color'], 400);
