// Colour schemes derived from one accent hue. Pure (no SDK, no React) so it can be tested.
// `mono`: every role shares the accent hue. `palette`: secondary and tertiary roles rotate to
// other hues, so selected states, chips and icon tiles read as a small multi-colour palette.
import { schemes, type Scheme } from './tokens.ts';

export const accents = ['mint', 'blue', 'violet', 'rose', 'amber', 'graphite'] as const;
export type Accent = (typeof accents)[number];
export type ColorMode = 'mono' | 'palette';

export const accentLabels: Record<Accent, string> = {
  mint: 'Menta', blue: 'Blu', violet: 'Viola', rose: 'Rosa', amber: 'Ambra', graphite: 'Grafite',
};

// Hue (°) and saturation multiplier; graphite is a nearly neutral blue-grey.
const accentSpec: Record<Accent, { hue: number; sat: number }> = {
  mint: { hue: 153, sat: 1 }, blue: { hue: 215, sat: 1 }, violet: { hue: 268, sat: 0.9 },
  rose: { hue: 342, sat: 0.95 }, amber: { hue: 36, sat: 1 }, graphite: { hue: 215, sat: 0.14 },
};

function hex(h: number, s: number, l: number): string {
  const sat = Math.min(Math.max(s, 0), 100) / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

function generate(accent: Accent, mode: ColorMode, dark: boolean): Scheme {
  const { hue: h, sat: k } = accentSpec[accent];
  const palette = mode === 'palette' && accent !== 'graphite';
  const hs = palette ? (h + 45) % 360 : h;
  const ht = palette ? (h + 150) % 360 : h;
  const ks = palette ? 1.5 : 1;
  const error = schemes[dark ? 'dark' : 'light'];
  const p = (s: number, l: number) => hex(h, s * k, l);
  const sec = (s: number, l: number) => hex(hs, s * k * ks, l);
  const ter = (s: number, l: number) => hex(ht, s * k * ks, l);
  const common = {
    error: error.error, onError: error.onError, errorContainer: error.errorContainer, onErrorContainer: error.onErrorContainer,
  };
  if (!dark) {
    return {
      ...common,
      primary: p(42, 31), onPrimary: '#FFFFFF', primaryContainer: p(65, 86), onPrimaryContainer: p(90, 9),
      secondary: sec(16, 34), onSecondary: '#FFFFFF', secondaryContainer: sec(32, 87), onSecondaryContainer: sec(45, 11),
      tertiary: ter(34, 33), onTertiary: '#FFFFFF', tertiaryContainer: ter(55, 86), onTertiaryContainer: ter(80, 10),
      background: p(30, 97), onBackground: p(14, 10),
      surface: p(30, 97), onSurface: p(14, 10), surfaceVariant: p(14, 88), onSurfaceVariant: p(10, 27),
      outline: p(6, 42), outlineVariant: p(10, 77),
      inverseSurface: p(10, 18), inverseOnSurface: p(22, 94), inversePrimary: p(45, 72),
      surfaceContainerLowest: '#FFFFFF', surfaceContainerLow: p(24, 95), surfaceContainer: p(20, 93),
      surfaceContainerHigh: p(16, 91), surfaceContainerHighest: p(14, 89),
    };
  }
  return {
    ...common,
    primary: p(45, 72), onPrimary: p(90, 12), primaryContainer: p(48, 22), onPrimaryContainer: p(65, 88),
    secondary: sec(25, 76), onSecondary: sec(40, 14), secondaryContainer: sec(22, 26), onSecondaryContainer: sec(32, 88),
    tertiary: ter(35, 75), onTertiary: ter(60, 13), tertiaryContainer: ter(38, 25), onTertiaryContainer: ter(55, 88),
    background: p(18, 7), onBackground: p(10, 87),
    surface: p(18, 7), onSurface: p(10, 87), surfaceVariant: p(10, 26), onSurfaceVariant: p(8, 77),
    outline: p(6, 56), outlineVariant: p(10, 26),
    inverseSurface: p(10, 87), inverseOnSurface: p(10, 18), inversePrimary: p(42, 31),
    surfaceContainerLowest: p(18, 4), surfaceContainerLow: p(16, 9), surfaceContainer: p(14, 11),
    surfaceContainerHigh: p(12, 15), surfaceContainerHighest: p(10, 19),
  };
}

// Mint + mono is the original identity and keeps its hand-tuned values. In mono mode the tertiary
// roles are the neutral surface-variant pair, so icon tiles stay tonal; in palette mode they carry a hue.
export function buildScheme(accent: Accent, mode: ColorMode, dark: boolean): Scheme {
  const scheme = accent === 'mint' && mode === 'mono' ? { ...schemes[dark ? 'dark' : 'light'] } : generate(accent, mode, dark);
  if (mode === 'mono') {
    scheme.tertiary = scheme.secondary;
    scheme.onTertiary = scheme.onSecondary;
    scheme.tertiaryContainer = scheme.surfaceVariant;
    scheme.onTertiaryContainer = scheme.onSurfaceVariant;
  }
  return scheme;
}
