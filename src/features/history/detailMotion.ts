// Geometry and timing of the expense detail's container transform (23 November, on request): the tapped card grows into
// the detail screen and shrinks back into it. Pure, so it is tested without a DOM (tests/detailMotion.test.ts).

import type { Spring } from '../../theme/themeTransition.ts';

export type Box = Readonly<{ left: number; top: number; width: number; height: number }>;

// Material 3 Expressive, standard motion scheme, slow spatial spring (damping ratio 0.9, stiffness 300): about 450 ms,
// 90 % of the way in 200 ms, an overshoot of 0.15 % (invisible). The expressive springs bounce visibly, too much for a
// container that fills the screen (the request: fluid, not elastic).
export const detailSpring: Spring = { stiffness: 300, damping: 0.9 * 2 * Math.sqrt(300), mass: 1 };

// The detail fills `frame`; `card` is the tapped card, both in the same coordinates. The clip that shows only the card's
// area of the detail surface, with the card's own corner radius: the start of the opening, the end of the closing.
export function cardClip(card: Box, frame: Box, radius: number): string {
  const top = card.top - frame.top;
  const left = card.left - frame.left;
  const right = frame.left + frame.width - (card.left + card.width);
  const bottom = frame.top + frame.height - (card.top + card.height);
  return `inset(${px(top)} ${px(right)} ${px(bottom)} ${px(left)} round ${px(radius)})`;
}

// The whole detail surface, with the frame's corner radius (the rounded desktop panel, none elsewhere).
export function fullClip(radius: number): string {
  return `inset(0px 0px 0px 0px round ${px(radius)})`;
}

// The card can be the origin of the transform only if it is laid out and at least half of it is in the frame: a card
// hidden (another page, another view), scrolled away, or moved off-screen by an edit (a new date) is not grown from or
// shrunk into; the detail then simply fades.
export function usableCard(card: Box | null, frame: Box): card is Box {
  if (!card || !(card.width > 0) || !(card.height > 0)) return false;
  const visibleHeight = Math.min(card.top + card.height, frame.top + frame.height) - Math.max(card.top, frame.top);
  const visibleWidth = Math.min(card.left + card.width, frame.left + frame.width) - Math.max(card.left, frame.left);
  return visibleHeight >= card.height / 2 && visibleWidth >= card.width / 2;
}

// Where the copy of the card goes while the container grows: its top-left corner follows the container's (the frame's),
// so the card seems to become the screen instead of staying behind.
export function cardShift(card: Box, frame: Box): { x: number; y: number } {
  return { x: frame.left - card.left, y: frame.top - card.top };
}

// Fade-through of the two contents, as fractions of the transform's duration. The spring covers most of the way early
// (90 % at about 45 % of the time), so the two directions are timed apart instead of mirrored: opening, the card's copy is
// gone by `cardOut` and the detail's content appears between `contentIn` and `contentShown`; closing, the content is gone
// by `contentOut`, before the shrinking clip cuts it much, and the card's copy appears between `cardIn` and `cardShown`.
export const crossfade = {
  open: { cardOut: 0.3, contentIn: 0.15, contentShown: 0.55 },
  close: { contentOut: 0.2, cardIn: 0.1, cardShown: 0.35 },
} as const;

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
