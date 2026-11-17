// Colours the static HTML (public/index.html, inline boot script) paints before the bundle runs.
// Written by GlobalStyle from the user's real theme, so the first frame already has the final background
// instead of the default mint scheme. Both schemes are stored: with the «system» theme the script picks
// by the device's current preference, which can differ from the one at write time.
import { buildScheme, type Accent, type ColorMode } from './palette.ts';

export const bootThemeKey = 'nummo.boot-theme.v1';
export type BootTheme = Readonly<{ v: 1; mode: 'system' | 'light' | 'dark'; light: string; dark: string }>;

// Both the canvas (including safe areas) and browser chrome must stop using the boot scheme together.
export function applyDocumentTheme(doc: Document, background: string, dark: boolean): void {
  const root = doc.documentElement;
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.setProperty('--nummo-boot-bg', background);
  root.style.backgroundColor = background;
  const tags = Array.from(doc.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  const meta = tags[0] ?? doc.head.appendChild(Object.assign(doc.createElement('meta'), { name: 'theme-color' }));
  tags.slice(1).forEach((tag) => tag.remove());
  meta.removeAttribute('media');
  meta.content = background;
}

// The same colour one step away in its blue channel: invisible, but a different value for the browser.
export function nudgedColor(hex: string): string {
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  if (!/^#[0-9a-fA-F]{6}$/.test(hex) || Number.isNaN(blue)) return hex;
  return `${hex.slice(0, 5)}${(blue === 0 ? 1 : blue - 1).toString(16).padStart(2, '0').toUpperCase()}`;
}

// Chrome on Android can lose the status bar colour when the installed app comes back from another activity (the
// system camera opened by «Scansiona scontrino»): the bar turns black while the page still holds the same
// theme-color, so writing that value again sends nothing. A one-step different value, then the real one in a later
// task, are two real changes: the bar takes the page colour again. Without the bug the bar never visibly changes.
export function refreshThemeColor(doc: Document, background: string, later: (run: () => void) => void): void {
  const meta = doc.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta || meta.content !== background) return;
  meta.content = nudgedColor(background);
  later(() => { if (meta.content === nudgedColor(background)) meta.content = background; });
}

// Calls `run` when the page is shown again: back from another app or activity (visibility, focus) or from the cache.
export function observePageReturn(target: Window, run: () => void): () => void {
  const doc = target.document;
  const visible = () => { if (doc.visibilityState === 'visible') run(); };
  doc.addEventListener('visibilitychange', visible);
  target.addEventListener('focus', run);
  target.addEventListener('pageshow', run);
  return () => {
    doc.removeEventListener('visibilitychange', visible);
    target.removeEventListener('focus', run);
    target.removeEventListener('pageshow', run);
  };
}

export function makeBootTheme(preferences: { theme: BootTheme['mode']; accent: Accent; colorMode: ColorMode }): BootTheme {
  return {
    v: 1, mode: preferences.theme,
    light: buildScheme(preferences.accent, preferences.colorMode, false).background,
    dark: buildScheme(preferences.accent, preferences.colorMode, true).background,
  };
}
