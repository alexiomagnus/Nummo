// Geometry and timing of the container transform of every screen layer (components/ScreenLayer.tsx: the detail of an
// expense or subscription, and every editor and content panel that used to be a dialog; 23 November, on request): the
// pressed element (a card, a button, a field) grows into the screen and the screen shrinks back into it. Pure, so it is
// tested without a DOM (tests/containerTransform.test.ts).

import type { Spring } from './themeTransition.ts';

export type Box = Readonly<{ left: number; top: number; width: number; height: number }>;

// Softer than the first version (M3 standard slow spatial, 0.9/300: about 450 ms), on request («ancora più smooth»): damping
// ratio 0.95, stiffness 200. Half the way in about 115 ms, so the response to the tap is as quick, then a longer, softer
// landing (90 % at 260 ms, settled in about 550 ms) and no overshoot at all, which a container filling the screen must not have.
// Softened again (stiffness 170, same day, «ancora più smooth»): half the way at about 130 ms, 90 % at 280 ms, settled in about
// 600 ms, a more even glide with the same quick response.
export const detailSpring: Spring = { stiffness: 170, damping: 0.95 * 2 * Math.sqrt(170), mass: 1 };

// The page under the growing screen dims to this opacity of the theme's backdrop (and back), for depth while it moves;
// once the screen covers its frame the scrim is hidden under it.
export const scrimOpacity = 0.32;

// The screen's content enters from slightly smaller, centred on the pressed element (and leaves the same way).
export const contentScale = 0.94;

// The screen fills `frame`; `card` is the pressed element (a card, a button, a field), both in the same coordinates. The clip that shows only the card's
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
// The two fades overlap (23 November, on request: smoother): the content starts appearing while the copy is still there, so there
// is never a moment where both are half transparent over the bare surface (it read as a blink).
export const crossfade = {
  open: { cardOut: 0.3, contentIn: 0.05, contentShown: 0.4 },
  close: { contentOut: 0.25, cardIn: 0.05, cardShown: 0.3 },
} as const;

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
