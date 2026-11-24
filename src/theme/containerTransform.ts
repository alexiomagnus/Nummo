// Geometry and timing of the container transform of every screen layer (components/ScreenLayer.tsx: the detail of an
// expense or subscription, and every editor and content panel that used to be a dialog; 23 November, on request): the
// pressed element (a card, a button, a field) grows into the screen and the screen shrinks back into it. Pure, so it is
// tested without a DOM (tests/containerTransform.test.ts).

import type { Spring } from './themeTransition.ts';

export type Box = Readonly<{ left: number; top: number; width: number; height: number }>;

// Softer than the first version (M3 standard slow spatial, 0.9/300: about 450 ms), on request («ancora più smooth»): damping
// ratio 0.95, no overshoot at all, which a container filling the screen must not have. Stiffness 200 until 24 November, then
// 260 on request («leggermente più veloci»): half the way in about 100 ms, 90 % at 225 ms, settled in about 480 ms.
export const detailSpring: Spring = { stiffness: 260, damping: 0.95 * 2 * Math.sqrt(260), mass: 1 };

// Closing ends the spring at about 99 % (precision of `springEasing`) instead of 99.8 %: the last part of the way crawls, and
// while the container is only a few pixels larger than the card it covered the neighbouring rows and the month heading for
// about 300 ms before vanishing (user's report, 24 November: the closing «non perfetta»). About 380 ms instead of 480.
export const closePrecision = 0.01;

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

// Fade-through of the two contents, as fractions of the transform's duration (24 November, on the user's report: the detail's
// content appeared over the list while the container was still small, and the card's place looked like a hole). The copy of
// the card stays at its place (it no longer travels with the container's corner) and is gone by `cardOut`; only then, with
// the container covering nearly all the frame (the spring is at about 90 % by 40 % of the time), the content appears between
// `contentIn` and `contentShown`: the screen is opaque and whole before anything is drawn on it. Closing, the content fades
// out first, in `closeLead` ms while the container still covers the frame (so the shrinking clip never cuts the Back button
// or the content), then the container shrinks and the card's copy appears between `cardIn` and `cardShown` of the spring;
// the empty container's fill then dissolves by `surfaceGone`, leaving the copy alone over the page (24 November).
export const crossfade = {
  open: { cardOut: 0.25, contentIn: 0.4, contentShown: 0.65 },
  close: { cardIn: 0.1, cardShown: 0.35, surfaceGone: 0.7 },
} as const;
export const closeLead = 70;

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
