// Light ↔ dark switch as a Material 3 Expressive circular reveal (23 November, on request): the new theme grows from the
// control that asked for it (the top-bar button or the «Tema» chip) over the old one, on a soft spring (`themeRevealSpring`).
// Web View Transitions API: the browser snapshots the old page, the update runs, and only the new
// snapshot is clipped by a growing circle. Without the API (older browsers), with reduced motion or when nothing visible
// changes, the theme switches at once, as before.

export type Spring = Readonly<{ stiffness: number; damping: number; mass: number }>;
export type Point = Readonly<{ x: number; y: number }>;
type Rect = Readonly<{ left: number; top: number; width: number; height: number }>;

// Softer than the expressive slow spatial spring (ratio 0.8, stiffness 200), first used and found hurried (23 November, on
// request): there the circle reached 90 % of its radius in 215 ms, so the visible part was over almost at once. Ratio 0.95
// and stiffness 80: no visible bounce, 90 % at about 410 ms, settled in under 0.9 s. Same RN-style parameters as
// `spatialSpring` in tokens.ts.
export const themeRevealSpring: Spring = { stiffness: 80, damping: 0.95 * 2 * Math.sqrt(80), mass: 1 };

// Step response of a damped spring from 0 to 1 at time `t` (seconds). Under-damped only (ratio < 1), as every M3 spring.
export function springValue(spring: Spring, t: number): number {
  const omega = Math.sqrt(spring.stiffness / spring.mass);
  const ratio = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  if (ratio >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const damped = omega * Math.sqrt(1 - ratio * ratio);
  return 1 - Math.exp(-ratio * omega * t) * (Math.cos(damped * t) + (ratio * omega / damped) * Math.sin(damped * t));
}

// The spring as a CSS `linear()` easing and the time it takes to settle within `precision` of the end, so a Web
// Animation follows it exactly (the overshoot included) with a fixed duration.
export function springEasing(spring: Spring, precision = 0.002, steps = 40): { easing: string; duration: number } {
  const omega = Math.sqrt(spring.stiffness / spring.mass);
  const ratio = Math.min(spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass)), 0.999);
  // The envelope e^(−ζωt)/√(1−ζ²) bounds the distance from the end: past this time the motion is invisible.
  const seconds = Math.log(1 / (precision * Math.sqrt(1 - ratio * ratio))) / (ratio * omega);
  const points = Array.from({ length: steps + 1 }, (_, i) => i === steps ? 1 : springValue(spring, (seconds * i) / steps));
  return { easing: `linear(${points.map((value) => Number(value.toFixed(4))).join(', ')})`, duration: Math.round(seconds * 1000) };
}

// Radius that covers the whole viewport from `origin`: the distance to the farthest corner.
export function revealRadius(origin: Point, width: number, height: number): number {
  return Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y));
}

// Centre of the control that changed the theme (the focused one: a tap or a key focuses it), or of the viewport when there
// is none or it is out of view.
export function revealOrigin(rect: Rect | null, width: number, height: number): Point {
  const centre = { x: width / 2, y: height / 2 };
  if (!rect || rect.width <= 0 || rect.height <= 0) return centre;
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  return x >= 0 && x <= width && y >= 0 && y <= height ? { x, y } : centre;
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => ViewTransition };

// Attribute that turns off CSS transitions while the new snapshot is taken (GlobalStyle): without it, controls with a
// colour transition would fade from the old colours inside the circle.
export const themeSwitchAttribute = 'data-theme-switching';

// Runs `apply` (which must commit synchronously: flushSync) inside a view transition revealed from `origin`.
export function switchTheme(doc: Document, apply: () => void, options: { reducedMotion: boolean }): void {
  const view = doc.defaultView;
  const start = (doc as TransitionDocument).startViewTransition;
  if (!view || !start || options.reducedMotion || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    apply();
    return;
  }
  const width = view.innerWidth;
  const height = view.innerHeight;
  const focused = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement.getBoundingClientRect() : null;
  const origin = revealOrigin(focused, width, height);
  const radius = revealRadius(origin, width, height);
  const root = doc.documentElement;
  root.setAttribute(themeSwitchAttribute, '');
  let transition: ViewTransition;
  try {
    transition = start.call(doc, apply);
  } catch {
    root.removeAttribute(themeSwitchAttribute);
    apply();
    return;
  }
  const spring = springEasing(themeRevealSpring);
  const easing = view.CSS?.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : 'cubic-bezier(0.05, 0.7, 0.1, 1)';
  const at = `${origin.x}px ${origin.y}px`;
  transition.ready.then(() => {
    root.removeAttribute(themeSwitchAttribute);
    root.animate({ clipPath: [`circle(0px at ${at})`, `circle(${radius}px at ${at})`] },
      { duration: spring.duration, easing, pseudoElement: '::view-transition-new(root)' });
  }, () => root.removeAttribute(themeSwitchAttribute));
  transition.finished.catch(() => undefined).finally(() => root.removeAttribute(themeSwitchAttribute));
}
