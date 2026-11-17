// Colours the static HTML (public/index.html, inline boot script) paints before the bundle runs.
// Written by GlobalStyle from the user's real theme, so the first frame already has the final background
// instead of the default mint scheme. Both schemes are stored: with the «system» theme the script picks
// by the device's current preference, which can differ from the one at write time.
import { buildScheme, type Accent, type ColorMode } from './palette.ts';

export const bootThemeKey = 'nummo.boot-theme.v1';
export type BootTheme = Readonly<{ v: 1; mode: 'system' | 'light' | 'dark'; light: string; dark: string }>;

// Both the canvas (including safe areas) and browser chrome must stop using the boot scheme together. `avoid`: the
// theme-color values Chrome no longer paints (see `themeColorFor`).
export function applyDocumentTheme(doc: Document, background: string, dark: boolean, avoid: ReadonlySet<string> = new Set()): void {
  const root = doc.documentElement;
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.setProperty('--nummo-boot-bg', background);
  root.style.backgroundColor = background;
  const tags = Array.from(doc.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  const meta = tags[0] ?? doc.head.appendChild(Object.assign(doc.createElement('meta'), { name: 'theme-color' }));
  tags.slice(1).forEach((tag) => tag.remove());
  meta.removeAttribute('media');
  meta.content = themeColorFor(background, avoid);
}

// Chrome on Android (installed app) stops painting the status bar for the exact theme-color value the page had when it
// left for another activity, such as the system camera of «Scansiona scontrino»: back in the app the bar stays black
// with that value, until the app is closed and reopened, while any other colour shows (user's test, 17 November: a
// different theme recolours the bar, going back to the previous one turns it black again). So that value is avoided
// for the rest of the session: the bar gets the same colour one to four steps away in its blue channel, which no eye
// can tell apart. Offsets in order 0, −1, +1, −2, +2…; with all of them avoided the plain colour is used.
const blueOffsets = [0, -1, 1, -2, 2, -3, 3, -4, 4] as const;

export function themeColorVariants(color: string): readonly string[] {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return [color];
  const base = color.toUpperCase();
  const blue = Number.parseInt(base.slice(5, 7), 16);
  return blueOffsets.filter((offset) => blue + offset >= 0 && blue + offset <= 255)
    .map((offset) => `${base.slice(0, 5)}${(blue + offset).toString(16).padStart(2, '0').toUpperCase()}`);
}

export function themeColorFor(color: string, avoid: ReadonlySet<string>): string {
  return themeColorVariants(color).find((variant) => !avoid.has(variant)) ?? color;
}

// Watches the page leaving (hidden, or the window losing focus to another activity) and coming back (visible, focus,
// cached page shown). On each return after a departure the theme-color value held when leaving joins `avoid` and
// `repaint` writes the colour again; a return without a departure (the page load) changes nothing. Only the latest
// `avoidedLimit` values are kept: an ordinary app switch also counts as a departure (harmless: Chrome repaints then).
export const avoidedLimit = 4;

export function observeThemeColorReturn(target: Window, avoid: Set<string>, repaint: () => void): () => void {
  const doc = target.document;
  let left: string | null = null;
  const leave = () => {
    if (left !== null) return;
    left = doc.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content.toUpperCase() ?? null;
  };
  const back = () => {
    if (left === null) return;
    avoid.delete(left);
    avoid.add(left);
    for (const oldest of avoid) { if (avoid.size <= avoidedLimit) break; avoid.delete(oldest); }
    left = null;
    repaint();
  };
  const visibility = () => { if (doc.visibilityState === 'hidden') leave(); else back(); };
  doc.addEventListener('visibilitychange', visibility);
  target.addEventListener('blur', leave);
  target.addEventListener('focus', back);
  target.addEventListener('pageshow', back);
  return () => {
    doc.removeEventListener('visibilitychange', visibility);
    target.removeEventListener('blur', leave);
    target.removeEventListener('focus', back);
    target.removeEventListener('pageshow', back);
  };
}

export function makeBootTheme(preferences: { theme: BootTheme['mode']; accent: Accent; colorMode: ColorMode }): BootTheme {
  return {
    v: 1, mode: preferences.theme,
    light: buildScheme(preferences.accent, preferences.colorMode, false).background,
    dark: buildScheme(preferences.accent, preferences.colorMode, true).background,
  };
}
