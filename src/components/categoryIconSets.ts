// The one place that maps a category icon ID to what is drawn for each display style. Pure (no React), so the
// selection and its fallbacks are testable. Stored data never changes: a style is only a way to draw the same ID.
import { categoryGlyphs } from './categoryGlyphs.ts';
import { categoryColorGlyphs, type ColorGlyph } from './categoryColorGlyphs.ts';
import { categoryPixelGlyphs, snapPixelSize } from './categoryPixelGlyphs.ts';
import { cartOutlineColor, iconRamp, type IconRamp } from '../theme/iconPalette.ts';

export const iconStyles = ['minimal', 'colorful', 'pixel'] as const;
export type IconStyle = (typeof iconStyles)[number];
export const defaultIconStyle: IconStyle = 'minimal';
// Source (Italian) texts of the settings; translated at the UI boundary and checked by tests/i18n.test.ts.
export const iconStyleText: Record<IconStyle, { label: string }> = {
  minimal: { label: 'Minimale' },
  colorful: { label: 'Colorato' },
  pixel: { label: 'Pixel art' },
};

// `color` is the stroke the SVG root needs; null means «use the caller's content colour» (outline glyphs).
export type ResolvedGlyph = Readonly<{ shape: string; color: string | null }>;

// The minimal and colourful drawings are enlarged a little around the centre of the canvas (they looked small); their
// shapes stay inside the 24×24 box at this scale. The pixel set is never scaled: it needs whole cells.
export const glyphZoom = 1.1;
export const zoomed = (shape: string): string => `<g transform="translate(12 12) scale(${glyphZoom}) translate(-12 -12)">${shape}</g>`;

const roles = /\{([btiol])\}/g;
const painted = new Map<string, ResolvedGlyph>();

function paint(markup: string, ramp: IconRamp): string {
  return markup.replace(roles, (_, role: keyof IconRamp) => ramp[role]);
}

const own = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key);

type Drawings = Readonly<{
  outline: Readonly<Record<string, string>>;
  color: Readonly<Record<string, ColorGlyph>>;
  pixel?: Readonly<Record<string, ColorGlyph>>;
}>;
const builtIn: Drawings = { outline: categoryGlyphs, color: categoryColorGlyphs, pixel: categoryPixelGlyphs };

// The pixel set is the only one that needs whole-cell sizes; the others scale freely.
export const glyphSize = (style: IconStyle, size: number): number => (style === 'pixel' ? snapPixelSize(size) : size);

// Pixel falls back to the colourful drawing, colourful to the outline (still the right subject); an ID with no drawing
// at all returns null and the caller shows its neutral placeholder. Unknown values never throw.
// `drawings` exists for tests only (to exercise the fallbacks); the app always uses the built-in tables.
export function resolveCategoryGlyph(style: IconStyle, icon: string | null | undefined, dark: boolean, drawings: Drawings = builtIn): ResolvedGlyph | null {
  if (!icon) return null;
  const pixel = style === 'pixel' && drawings.pixel && own(drawings.pixel, icon) ? drawings.pixel[icon] : undefined;
  const entry = pixel ?? (style !== 'minimal' && own(drawings.color, icon) ? drawings.color[icon] : undefined);
  if (entry) {
    const key = `${pixel ? 'pixel' : 'colorful'}:${icon}:${dark ? 'd' : 'l'}`;
    let glyph = drawings === builtIn ? painted.get(key) : undefined;
    if (!glyph) {
      const ramp = iconRamp(entry.hue, dark);
      const shape = paint(entry.shape, !pixel && icon === 'cart' ? { ...ramp, i: cartOutlineColor } : ramp);
      glyph = { shape: pixel ? shape : zoomed(shape), color: ramp.i };
      if (drawings === builtIn) painted.set(key, glyph);
    }
    return glyph;
  }
  return own(drawings.outline, icon) ? { shape: zoomed(drawings.outline[icon]!), color: null } : null;
}
