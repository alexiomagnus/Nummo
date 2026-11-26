// Display preferences. Pure and storage-agnostic so they can be tested; the browser storage
// adapter lives in usePreferences.ts. Only presentation choices: never expense data.
import { accents, type Accent, type ColorMode } from '../../theme/palette.ts';
import { periods, type Period } from '../../domain/history.ts';
import type { Language } from '../../i18n/translate.ts';
import { timeFormats, type TimeFormat } from '../../domain/timeFormat.ts';
import { autoTimeZone, parseTimeZoneChoice } from '../../domain/timeZones.ts';
import { defaultIconStyle, iconStyles, type IconStyle } from '../../components/categoryIconSets.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type FontChoice = 'google' | 'system';
export const chartTypes = ['donut', 'bars', 'blocks'] as const;
export type ChartType = (typeof chartTypes)[number];
// `showArchivedLists` hides the archived lists of the Lists page,
// `showArchivedFunds` the archived funds of the Funds page,
// `timeFormat` how hours are written (24 or 12 hours, AM/PM), `timeZone` the clock of the notification hour («auto» = the device's, or an IANA name).
// `templatesEnabled`: the Template field of «Nuova spesa» (off by default; the saved templates are archive data). Reintroduced
// on 21 November 2026: a value saved before the 16 November removal applies again.
// `haptics`: short vibration on the phone navigation bar, the Analisi charts, «Salva», «Crea» and the Spese/Abbonamenti views (on by default; does nothing where the
// browser cannot vibrate).
// `drawerToggle`: the «Comprimi» row at the foot of the desktop drawer (on by default; off, the drawer is always open: 27 November, on request).
// `halfScreens` («Apri a metà schermo», 24 November) is gone the same day, on request: the panels that open in peek do so by
// themselves (ScreenLayer `opensHalf`); a saved value is ignored.
// `avatarRing` (a ring switch around the account picture, 22 November) is gone the same day: the ring now marks the Advanced
// mode by itself; a saved value is ignored.
export type DashboardPreferences = { dashboardChart: ChartType; dashboardPeriod: Period; dashboardTrend: boolean; showArchivedLists: boolean; showArchivedFunds: boolean; templatesEnabled: boolean; haptics: boolean; drawerToggle: boolean; timeFormat: TimeFormat; timeZone: string };
export type Preferences = DashboardPreferences & { theme: ThemeChoice; colorMode: ColorMode; accent: Accent; amoled: boolean; font: FontChoice; language: Language; iconStyle: IconStyle };

export const preferencesKey = 'nummo.preferences.v1';
// `accent`: «Grigio» (`graphite`) by default since 27 November (user's request; before «Blu»), a saved choice stays. `amoled`: true black
// in the dark theme (off by default).
// `colorMode`: «Palette» by default since 22 November (user's request; before «Monocolore»). A saved choice stays.
export const defaultPreferences: Preferences = { theme: 'system', colorMode: 'palette', accent: 'graphite', amoled: false, font: 'google', language: 'it', dashboardChart: 'donut', dashboardPeriod: 'month', dashboardTrend: true, showArchivedLists: true, showArchivedFunds: true, templatesEnabled: false, haptics: true, drawerToggle: true, timeFormat: '24h', timeZone: autoTimeZone, iconStyle: defaultIconStyle };

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
    amoled: typeof o.amoled === 'boolean' ? o.amoled : defaultPreferences.amoled,
    font: oneOf(['google', 'system'], o.font, defaultPreferences.font),
    language: oneOf(['it', 'en'], o.language, defaultPreferences.language),
    iconStyle: oneOf(iconStyles, o.iconStyle, defaultPreferences.iconStyle),
    dashboardChart: oneOf(chartTypes, o.dashboardChart === 'ranking' ? 'bars' : o.dashboardChart, defaultPreferences.dashboardChart),
    dashboardPeriod: oneOf(periods, o.dashboardPeriod, defaultPreferences.dashboardPeriod),
    dashboardTrend: typeof o.dashboardTrend === 'boolean' ? o.dashboardTrend : defaultPreferences.dashboardTrend,
    showArchivedLists: typeof o.showArchivedLists === 'boolean' ? o.showArchivedLists : defaultPreferences.showArchivedLists,
    showArchivedFunds: typeof o.showArchivedFunds === 'boolean' ? o.showArchivedFunds : defaultPreferences.showArchivedFunds,
    templatesEnabled: typeof o.templatesEnabled === 'boolean' ? o.templatesEnabled : defaultPreferences.templatesEnabled,
    drawerToggle: typeof o.drawerToggle === 'boolean' ? o.drawerToggle : defaultPreferences.drawerToggle,
    haptics: typeof o.haptics === 'boolean' ? o.haptics : defaultPreferences.haptics,
    timeFormat: oneOf(timeFormats, o.timeFormat, defaultPreferences.timeFormat),
    timeZone: parseTimeZoneChoice(o.timeZone),
  };
}
