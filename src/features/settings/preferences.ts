// Display preferences. Pure and storage-agnostic so they can be tested; the browser storage
// adapter lives in usePreferences.ts. Only presentation choices: never expense data.
import { accents, type Accent, type ColorMode } from '../../theme/palette.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type FontChoice = 'google' | 'system';
export type Preferences = { theme: ThemeChoice; colorMode: ColorMode; accent: Accent; font: FontChoice };

export const preferencesKey = 'nummo.preferences.v1';
export const defaultPreferences: Preferences = { theme: 'system', colorMode: 'mono', accent: 'mint', font: 'google' };

const oneOf = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

// Untrusted input (localStorage can be edited or corrupted): every field falls back on its own.
export function parsePreferences(raw: string | null): Preferences {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const o = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return {
    theme: oneOf(['system', 'light', 'dark'], o.theme, defaultPreferences.theme),
    colorMode: oneOf(['mono', 'palette'], o.colorMode, defaultPreferences.colorMode),
    accent: oneOf(accents, o.accent, defaultPreferences.accent),
    font: oneOf(['google', 'system'], o.font, defaultPreferences.font),
  };
}
