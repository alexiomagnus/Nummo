// Palette of the colourful category icons. Pure data, shared by all icons: an icon picks one hue by meaning
// (food, transport, health…), never by taste, so the set reads as one family. It is independent of the user's
// accent on purpose: category icons keep their identity whatever the app tint is.
//
// Four roles per hue and theme:
//   b  base fill          t  tint fill (second face of the same object)
//   i  ink: outlines and details drawn on a tint fill
//   o  on-base: details drawn on a base fill
//   l  line: free strokes that touch no fill (handles, legs, stems); ink in light theme, tint in dark theme, so they
//      stay visible on a dark page
// Light theme: strong base (≥3:1 on the page), pale tint, dark ink, white on-base.
// Dark theme: bright base and tint, dark ink/on-base. The outline is then dark on a dark page, so the silhouette is
// carried by the fills, which are bright. `tests/categoryIcons.test.ts` checks these contrasts against real surfaces.
// Explicit black outline requested for the colourful shopping cart.
export const cartOutlineColor = '#000000';

export const iconHues = ['orange', 'amber', 'red', 'pink', 'violet', 'blue', 'teal', 'green', 'slate'] as const;
export type IconHue = (typeof iconHues)[number];
export type IconRamp = Readonly<{ b: string; t: string; i: string; o: string; l: string }>;

const light: Record<IconHue, IconRamp> = {
  orange: { b: '#C25E00', t: '#FFD8B2', i: '#4A2000', o: '#FFFFFF', l: '#4A2000' },
  amber: { b: '#A87200', t: '#FFE29A', i: '#3F2A00', o: '#FFFFFF', l: '#3F2A00' },
  red: { b: '#C1403B', t: '#FFD6D2', i: '#4A0F0C', o: '#FFFFFF', l: '#4A0F0C' },
  pink: { b: '#B93A74', t: '#FFD3E6', i: '#4B1230', o: '#FFFFFF', l: '#4B1230' },
  violet: { b: '#6750A4', t: '#E5DEFF', i: '#21005D', o: '#FFFFFF', l: '#21005D' },
  blue: { b: '#2563A8', t: '#D1E4FF', i: '#0B2B54', o: '#FFFFFF', l: '#0B2B54' },
  teal: { b: '#00796B', t: '#BDEFE6', i: '#00302A', o: '#FFFFFF', l: '#00302A' },
  green: { b: '#3F7F3A', t: '#CDEFC5', i: '#10300D', o: '#FFFFFF', l: '#10300D' },
  slate: { b: '#5C6B7A', t: '#DAE2EA', i: '#1B2630', o: '#FFFFFF', l: '#1B2630' },
};

const dark: Record<IconHue, IconRamp> = {
  orange: { b: '#F6A15A', t: '#FFD9B8', i: '#3A1900', o: '#3A1900', l: '#FFD9B8' },
  amber: { b: '#EDB83A', t: '#FFE9A8', i: '#2E2000', o: '#2E2000', l: '#FFE9A8' },
  red: { b: '#F28B82', t: '#FFD3CF', i: '#410E0B', o: '#410E0B', l: '#FFD3CF' },
  pink: { b: '#EE8CB5', t: '#FFD6E6', i: '#3E0A25', o: '#3E0A25', l: '#FFD6E6' },
  violet: { b: '#B6A4F2', t: '#E6DEFF', i: '#1D0F4D', o: '#1D0F4D', l: '#E6DEFF' },
  blue: { b: '#8DB8F5', t: '#D3E4FF', i: '#06244A', o: '#06244A', l: '#D3E4FF' },
  teal: { b: '#5FCFBF', t: '#BDF0E8', i: '#002B26', o: '#002B26', l: '#BDF0E8' },
  green: { b: '#8FD18A', t: '#CDEFC9', i: '#0B2B09', o: '#0B2B09', l: '#CDEFC9' },
  slate: { b: '#A9B8C7', t: '#DCE4EC', i: '#17212B', o: '#17212B', l: '#DCE4EC' },
};

export const iconRamp = (hue: IconHue, isDark: boolean): IconRamp => (isDark ? dark : light)[hue];
