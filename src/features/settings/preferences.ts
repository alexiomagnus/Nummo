// Display preferences. Pure and storage-agnostic so they can be tested; the browser storage
// adapter lives in usePreferences.ts. Only presentation choices: never expense data.
import { accents, type Accent, type ColorMode } from '../../theme/palette.ts';
import { periods, type Period } from '../../domain/history.ts';
import type { Language } from '../../i18n/translate.ts';
import { defaultIconStyle, iconStyles, type IconStyle } from '../../components/categoryIconSets.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type FontChoice = 'google' | 'system';
export const chartTypes = ['donut', 'bars', 'blocks'] as const;
export type ChartType = (typeof chartTypes)[number];
export type DashboardPreferences = { dashboardChart: ChartType; dashboardPeriod: Period };
export type Preferences = DashboardPreferences & { theme: ThemeChoice; colorMode: ColorMode; accent: Accent; font: FontChoice; language: Language; iconStyle: IconStyle };

export const preferencesKey = 'nummo.preferences.v1';
export const defaultPreferences: Preferences = { theme: 'system', colorMode: 'mono', accent: 'mint', font: 'google', language: 'it', dashboardChart: 'donut', dashboardPeriod: 'month', iconStyle: defaultIconStyle };

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
    language: oneOf(['it', 'en'], o.language, defaultPreferences.language),
    iconStyle: oneOf(iconStyles, o.iconStyle, defaultPreferences.iconStyle),
    dashboardChart: oneOf(chartTypes, o.dashboardChart === 'ranking' ? 'bars' : o.dashboardChart, defaultPreferences.dashboardChart),
    dashboardPeriod: oneOf(periods, o.dashboardPeriod, defaultPreferences.dashboardPeriod),
  };
}
