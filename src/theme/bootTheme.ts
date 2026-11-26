// Colours the static HTML (public/index.html, inline boot script) paints before the bundle runs.
// Written by GlobalStyle from the user's real theme, so the first frame already has the final background
// instead of the default blue scheme. Both schemes are stored: with the «system» theme the script picks
// by the device's current preference, which can differ from the one at write time.
import { androidBridge, systemBarsColor } from '../services/androidApp.ts';
import { buildScheme, type Accent, type ColorMode } from './palette.ts';

export const bootThemeKey = 'nummo.boot-theme.v1';
// `ink`: the few colours of the offline page (public/offline.html), per scheme; absent in values saved before 21 November,
// when the page falls back to its static blue colours.
export type BootInk = Readonly<{ primary: string; onPrimary: string; onSurface: string; onSurfaceVariant: string }>;
export type BootTheme = Readonly<{ v: 1; mode: 'system' | 'light' | 'dark'; light: string; dark: string; ink?: Readonly<{ light: BootInk; dark: BootInk }> }>;

// Both the canvas (including safe areas) and browser chrome must stop using the boot scheme together.
export function applyDocumentTheme(doc: Document, background: string, dark: boolean): void {
  const root = doc.documentElement;
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.setProperty('--nummo-boot-bg', background);
  root.style.backgroundColor = background;
  pageChrome = { background, dark };
  const chrome = () => paintChrome(doc, chromeOverrides.at(-1) ?? { background, dark });
  if (chromeHold) chromeHold.pending = chrome;
  else chrome();
}

// theme-color (Chrome's address bar, the installed app's status bar) and, in the Android app, the status and navigation bars,
// with icons readable on the colour (in Chrome they keep the manifest's fixed colour). Never an error for the page.
function paintChrome(doc: Document, { background, dark }: { background: string; dark: boolean }) {
  const tags = Array.from(doc.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  const meta = tags[0] ?? doc.head.appendChild(Object.assign(doc.createElement('meta'), { name: 'theme-color' }));
  tags.slice(1).forEach((tag) => tag.remove());
  meta.removeAttribute('media');
  meta.content = background;
  const bridge = androidBridge(doc.defaultView);
  const color = systemBarsColor(background);
  if (bridge && color) try { bridge.setSystemBars(color, dark); } catch { /* app gone */ }
}

// A full screen in a colour of its own on a phone (the payment history, «Prossimo mese»: ScreenLayer `tone`) takes the bars
// with it, then gives them back (user's report, 23 November: a dark status bar above a green screen in the Android app).
// The most recent override wins; `release` returns to the one below it, or to the page's colour.
let pageChrome: { background: string; dark: boolean } | null = null;
const chromeOverrides: { background: string; dark: boolean }[] = [];
export function overrideDocumentChrome(doc: Document, background: string, dark: boolean): () => void {
  const entry = { background, dark };
  chromeOverrides.push(entry);
  if (!chromeHold) paintChrome(doc, entry);
  return () => {
    const index = chromeOverrides.indexOf(entry);
    if (index < 0) return;
    chromeOverrides.splice(index, 1);
    const top = chromeOverrides.at(-1) ?? pageChrome;
    if (top && !chromeHold) paintChrome(doc, top);
  };
}

// Browser and system bars during the light ↔ dark reveal (themeTransition.ts). The page shows the old theme until the
// circle reaches it, but the bars (theme-color: Chrome's address bar, the installed app's status bar; the Android app's
// status and navigation bars) switched at once: a new-coloured bar above an old-coloured page. While held, the last
// colour asked for waits; `release` applies it. A newer hold supersedes an older one, whose release then does nothing
// (its colour is stale).
let chromeHold: { pending: (() => void) | null } | null = null;
export function holdDocumentChrome(): () => void {
  const hold: { pending: (() => void) | null } = { pending: null };
  chromeHold = hold;
  return () => {
    if (chromeHold !== hold) return;
    chromeHold = null;
    const apply = hold.pending;
    hold.pending = null;
    apply?.();
  };
}

export function makeBootTheme(preferences: { theme: BootTheme['mode']; accent: Accent; colorMode: ColorMode; amoled?: boolean }): BootTheme {
  const light = buildScheme(preferences.accent, preferences.colorMode, false);
  const dark = buildScheme(preferences.accent, preferences.colorMode, true, preferences.amoled ?? false);
  const ink = (scheme: typeof light): BootInk => ({
    primary: scheme.primary, onPrimary: scheme.onPrimary, onSurface: scheme.onSurface, onSurfaceVariant: scheme.onSurfaceVariant,
  });
  return { v: 1, mode: preferences.theme, light: light.background, dark: dark.background, ink: { light: ink(light), dark: ink(dark) } };
}
