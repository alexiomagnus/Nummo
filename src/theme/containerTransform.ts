// Motion of the screen layers (components/ScreenLayer.tsx: the detail of an expense, a subscription, a fund, a list, and every
// editor and content panel that used to be a dialog, sheets included) and of the page entrance (AppShell). Pure, so it is
// tested without a DOM (tests/containerTransform.test.ts). Until 24 November the layers grew out of the pressed element (a
// Material 3 container transform: clip from the card, a copy of it fading, content fading through); replaced on request by
// the slide below, history in docs/architecture.md.

import type { Spring } from './themeTransition.ts';

export type Box = Readonly<{ left: number; top: number; width: number; height: number }>;

// Page entrance (AppShell: every page of the account menu, the destinations, Nuova spesa): damping ratio 0.95, no overshoot.
// Stiffness 200 until 24 November, then 260 on request («leggermente più veloci»): half the way in about 100 ms, 90 % at
// 225 ms, settled in about 480 ms.
export const detailSpring: Spring = { stiffness: 260, damping: 0.95 * 2 * Math.sqrt(260), mass: 1 };

// The page under a moving layer dims to this opacity of the theme's backdrop (and back); a sheet keeps it while open.
export const scrimOpacity = 0.32;

// Screens and sheets: slide (user's choice, 24 November, among three trial pairs on the Fondi page). They rise on a soft spring
// with no overshoot (`slideSpring`, about 470 ms, 90 % at 245 ms; ends at 99.6 %, `precision`) with a shadow above the edge and,
// for a whole screen, round top corners (`corner`) that square off as it lands, while the page under a whole screen steps back
// (scale `pageScale`); they go down on the accelerating curve in `close` ms while the page comes forward again.
export const slideTimings = { close: 280, pageScale: 0.96, corner: 28, precision: 0.004 } as const;
export const slideSpring: Spring = { stiffness: 220, damping: 0.95 * 2 * Math.sqrt(220), mass: 1 };
// The icon tile of a detail settling in as the screen arrives (user's request, 24 November: «una piccola animazione iniziale per
// l'icona, molto soft e clean in stile Material 3 Expressive»): a spatial spring with a small overshoot (damping ratio 0.75), from a
// smaller, slightly turned tile; its opacity on a short curve of its own; started a little after the screen.
export const heroIconSpring: Spring = { stiffness: 380, damping: 0.75 * 2 * Math.sqrt(380), mass: 1 };
export const heroIconEntry = { delay: 120, fade: 180, scale: 0.6, turn: -10 } as const;
