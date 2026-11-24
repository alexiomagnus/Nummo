// Colour schemes derived from one accent hue. Pure (no SDK, no React) so it can be tested.
// `mono`: every role shares the accent hue. `palette`: secondary and tertiary roles rotate to
// other hues, so selected states, chips and icon tiles read as a small multi-colour palette.
import { schemes, type Scheme } from './tokens.ts';

export const accents = ['mint', 'blue', 'violet', 'rose', 'amber', 'graphite'] as const;
export type Accent = (typeof accents)[number];
export type ColorMode = 'mono' | 'palette';

// Modal surfaces have their own role: changing them must not recolour navigation or menus.
export const dialogColors = (scheme: Scheme, dark: boolean) => ({
  dialog: dark ? scheme.surfaceContainerHighest : scheme.surfaceContainerLowest,
  backdrop: dark ? '#000000A3' : '#00000066',
});

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
  // Light (reworked on 23 November, user's request: it read weaker than the dark one, then «ancora più deciso»). Like the dark
  // scheme, the surface containers are clear steps apart (92 → 83 instead of 95 → 89) on a more tinted background, and the
  // containers of selections, chips and indicators are saturated and deeper (tone ~76 instead of ~86); outlines and secondary
  // text are firmer and the primary more vivid (M3 Expressive). The error red of the light scheme is a little deeper
  // (tokens.ts) so it keeps 4.5:1 on the deepest container.
  if (!dark) {
    // Accent roles (primary, secondary, tertiary: buttons, text, swatches, the avatar ring) take, for each hue, the lightest
    // tone that still reads at 4.5:1 (plus a small margin) on the deepest surface container, on the filled expense card and
    // under white text. A fixed HSL lightness, as before (26–30), was right for mint but far too dark for blue, violet, rose
    // and graphite (7–8:1: navy, plum, maroon; user's report, 23 November), whose luminance is lower at the same lightness.
    const primaryContainer = p(78, 76);
    const surfaceContainerHighest = p(26, 83);
    const grounds = [surfaceContainerHighest, mixColors(primaryContainer, '#FFFFFF', 0.5), '#FFFFFF'];
    const readable = (make: (l: number) => string) => {
      for (let l = 60; l > 10; l -= 0.5) {
        const color = make(l);
        if (grounds.every((ground) => contrastRatio(color, ground) >= accentContrast)) return color;
      }
      return make(10);
    };
    return {
      ...common,
      primary: readable((l) => p(60, l)), onPrimary: '#FFFFFF', primaryContainer, onPrimaryContainer: p(90, 9),
      secondary: readable((l) => sec(28, l)), onSecondary: '#FFFFFF', secondaryContainer: sec(50, 77), onSecondaryContainer: sec(55, 10),
      tertiary: readable((l) => ter(45, l)), onTertiary: '#FFFFFF', tertiaryContainer: ter(68, 76), onTertiaryContainer: ter(85, 9),
      background: p(45, 95), onBackground: p(16, 9),
      surface: p(45, 95), onSurface: p(16, 9), surfaceVariant: p(22, 82), onSurfaceVariant: p(16, 22),
      outline: p(10, 36), outlineVariant: p(18, 66),
      inverseSurface: p(10, 18), inverseOnSurface: p(22, 94), inversePrimary: p(45, 72),
      surfaceContainerLowest: '#FFFFFF', surfaceContainerLow: p(36, 92), surfaceContainer: p(32, 89),
      surfaceContainerHigh: p(28, 86), surfaceContainerHighest,
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

// Colours that stand for an accent where it is only shown, never read as text: the dots of «Colore» and the avatar ring
// (user's report, 23 November: in light they were the text-safe primary, navy, plum, maroon and brown). In light each hue
// takes the lightest vivid tone with 3:1 on the background (WCAG non-text contrast), like the seed colours of a Material
// You picker; in dark the scheme's own primary, secondary and tertiary, already light and vivid there. One colour, or three
// in palette mode (graphite has one hue only).
export function accentSwatches(accent: Accent, mode: ColorMode, dark: boolean): string[] {
  const scheme = buildScheme(accent, mode, dark);
  const multi = mode === 'palette' && accent !== 'graphite';
  if (dark) return multi ? [scheme.primary, scheme.secondary, scheme.tertiary] : [scheme.primary];
  const { hue, sat } = accentSpec[accent];
  const vivid = (h: number, s: number) => {
    for (let l = 70; l > 15; l -= 0.5) {
      const color = hex(h, s * sat, l);
      if (contrastRatio(color, scheme.background) >= swatchContrast) return color;
    }
    return hex(h, s * sat, 15);
  };
  const first = vivid(hue, 72);
  return multi ? [first, vivid((hue + 45) % 360, 60), vivid((hue + 150) % 360, 66)] : [first];
}

// 3:1 (non-text contrast) with a margin for rounding.
const swatchContrast = 3.1;

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

// WCAG 2.x contrast ratio of two #RRGGBB colours.
export function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const [r, g, b] = [0, 1, 2].map((i) => parseInt(color.slice(1 + i * 2, 3 + i * 2), 16) / 255)
      .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

// Target for the accent roles of the light scheme: AA (4.5:1) with a margin for rounding.
const accentContrast = 4.6;

// Mix of two #RRGGBB colours (`weight` of the first).
export function mixColors(a: string, b: string, weight: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(channel(a, i) * weight + channel(b, i) * (1 - weight)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Fill of the expense and subscription cards (filled M3 card, tinted with the primary): light only, 23 November, user's request
// («le schede delle spese colorate»). null in dark, where the cards stay outlined.
export const cardColor = (scheme: Scheme, dark: boolean): string | null =>
  dark ? null : mixColors(scheme.primaryContainer, scheme.surfaceContainerLowest, 0.5);

// Semantic green for money coming in (additions, recharges), the counterpart of `error` for money going out. Fixed, not tied to
// the accent: the meaning must not change with the chosen colour. Contrast ≥ 4.5:1 on every surface (tests/theme.test.ts).
export const positiveColors = { light: '#18692C', dark: '#7DD992' } as const;
// Camera viewfinder of the receipt scan (CameraViewfinder.tsx): always dark, in either theme, like a camera app, so the
// picture is judged against black and the white controls read over any frame. Fixed values, not tied to the accent.
export const viewfinderColors = {
  background: '#0B0A08',
  sheet: '#000000',
  onMedia: '#FFFFFF',
  onMediaMuted: 'rgba(255, 255, 255, 0.72)',
  control: 'rgba(255, 255, 255, 0.16)',
  controlActive: '#FFFFFF',
  onControlActive: '#0B0A08',
  ring: 'rgba(255, 255, 255, 0.42)',
  handle: 'rgba(255, 255, 255, 0.5)',
  badge: 'rgba(11, 10, 8, 0.55)',
  shade: 'rgba(11, 10, 8, 0.62)',
} as const;

