// Colours the static HTML (public/index.html, inline boot script) paints before the bundle runs.
// Written by GlobalStyle from the user's real theme, so the first frame already has the final background
// instead of the default mint scheme. Both schemes are stored: with the «system» theme the script picks
// by the device's current preference, which can differ from the one at write time.
import { buildScheme, type Accent, type ColorMode } from './palette.ts';

export const bootThemeKey = 'nummo.boot-theme.v1';
export type BootTheme = Readonly<{ v: 1; mode: 'system' | 'light' | 'dark'; light: string; dark: string }>;

export function makeBootTheme(preferences: { theme: BootTheme['mode']; accent: Accent; colorMode: ColorMode }): BootTheme {
  return {
    v: 1, mode: preferences.theme,
    light: buildScheme(preferences.accent, preferences.colorMode, false).background,
    dark: buildScheme(preferences.accent, preferences.colorMode, true).background,
  };
}
