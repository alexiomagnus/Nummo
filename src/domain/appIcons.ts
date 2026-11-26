// The launcher icons of the Android app (27 November 2026, on request, «Icona dell'app» in Impostazioni → Aspetto): the page only
// names and previews them, the app (NummoBridge.setAppIcon, one activity-alias per icon) switches them. `default` is the icon
// installed with the app (near-black, white «n»), `light` the same logo with the colours swapped, `original` the first icon of
// 6 November (dark green, mint «n»). Colours as in android/app/src/main/res/values/colors.xml.
export const appIcons = ['default', 'light', 'original'] as const;
export type AppIcon = (typeof appIcons)[number];
export const appIconLabels: Record<AppIcon, string> = { default: 'Predefinita', light: 'Chiara', original: 'Originale' };
export const appIconColors: Record<AppIcon, { background: string; foreground: string }> = {
  default: { background: '#171717', foreground: '#FAFAF7' },
  light: { background: '#FAFAF7', foreground: '#171717' },
  original: { background: '#0F1512', foreground: '#97D8BB' },
};
export const parseAppIcon = (value: unknown): AppIcon | null =>
  typeof value === 'string' && (appIcons as readonly string[]).includes(value) ? (value as AppIcon) : null;
