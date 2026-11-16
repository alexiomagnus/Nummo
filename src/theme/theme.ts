import { MD3DarkTheme, MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { buildScheme, dialogColors, positiveColors } from './palette';
import { paperRoundness, typefaces } from './tokens';
import type { Preferences } from '../features/settings/preferences';

// Builds the Paper theme from the tokens. Paper has no surface-container roles, so they are
// exposed through its `elevation` levels: level1 = Container Low … level5 = Highest.
export function createTheme(dark: boolean, reduceMotion = false, preferences?: Pick<Preferences, 'accent' | 'colorMode' | 'font'>): MD3Theme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const s = buildScheme(preferences?.accent ?? 'mint', preferences?.colorMode ?? 'mono', dark);
  const colors = {
    ...base.colors,
    // Page panel: a touch lighter than the background (lowest container in light, low in dark).
    panel: dark ? s.surfaceContainerLow : s.surfaceContainerLowest,
    positive: dark ? positiveColors.dark : positiveColors.light,
    ...dialogColors(s, dark),
  };
  return {
    ...base,
    roundness: paperRoundness,
    fonts: configureFonts({ config: { fontFamily: typefaces[preferences?.font ?? 'google'] } }),
    animation: { ...base.animation, scale: reduceMotion ? 0 : 1 },
    colors: {
      ...colors,
      primary: s.primary, onPrimary: s.onPrimary, primaryContainer: s.primaryContainer, onPrimaryContainer: s.onPrimaryContainer,
      secondary: s.secondary, onSecondary: s.onSecondary, secondaryContainer: s.secondaryContainer, onSecondaryContainer: s.onSecondaryContainer,
      tertiary: s.tertiary, onTertiary: s.onTertiary, tertiaryContainer: s.tertiaryContainer, onTertiaryContainer: s.onTertiaryContainer,
      error: s.error, onError: s.onError, errorContainer: s.errorContainer, onErrorContainer: s.onErrorContainer,
      background: s.background, onBackground: s.onBackground,
      surface: s.surface, onSurface: s.onSurface, surfaceVariant: s.surfaceVariant, onSurfaceVariant: s.onSurfaceVariant,
      outline: s.outline, outlineVariant: s.outlineVariant,
      inverseSurface: s.inverseSurface, inverseOnSurface: s.inverseOnSurface, inversePrimary: s.inversePrimary,
      surfaceDisabled: `${s.onSurface}1F`, onSurfaceDisabled: `${s.onSurface}61`,
      elevation: {
        level0: 'transparent', level1: s.surfaceContainerLow, level2: s.surfaceContainer,
        level3: s.surfaceContainerHigh, level4: s.surfaceContainerHigh, level5: s.surfaceContainerHighest,
      },
    },
  };
}

// Reads the custom `panel` colour added by `createTheme` (Paper's colour type cannot be augmented).
export const panelColor = (colors: object): string => (colors as { panel?: string }).panel ?? 'transparent';
export const dialogColor = (colors: object): string => (colors as { dialog: string }).dialog;
// Reads the custom `positive` colour (money coming in), see palette.ts.
export const positiveColor = (colors: object): string => (colors as { positive: string }).positive;
