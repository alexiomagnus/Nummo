// Colourful category glyphs (24×24), the second icon set next to the minimal outlines in categoryGlyphs.ts.
// Same IDs, same subject, same 1.5 stroke; each icon is a few flat shapes in one hue of src/theme/iconPalette.ts.
//
// Markup uses colour roles instead of hex values, resolved per theme by categoryIconSets.ts:
//   {b} base  {t} tint  {i} ink  {o} on-base  {l} line. Shapes default to no fill and the ink as stroke (set on the root).
// Rules: details on a base fill use stroke="{o}", details on a tint fill use the ink, free strokes use {l} (L below). To add an icon: add its ID to
// categoryIconLabels and categoryGlyphs.ts, then a hue and markup here (TypeScript and tests enforce the pairing).
import type { CategoryIcon } from '../domain/category.ts';
import type { IconHue } from '../theme/iconPalette.ts';

export type ColorGlyph = Readonly<{ hue: IconHue; shape: string }>;

const B = 'fill="{b}"';
const T = 'fill="{t}"';
const L = 'stroke="{l}"';
const dot = (x: number, y: number, width = 2.2) => `<path stroke="{o}" stroke-width="${width}" d="M${x} ${y}h.01"/>`;

export const categoryColorGlyphs: Record<CategoryIcon, ColorGlyph> = {
  // Groceries and food
  cart: { hue: 'green', shape: `<path stroke="{i}" stroke-width="3" d="M2.5 3.5h2.4l2.5 11a1.7 1.7 0 0 0 1.7 1.3h8.6"/><path stroke="{b}" stroke-width="1.8" d="M2.5 3.5h2.4l2.5 11a1.7 1.7 0 0 0 1.7 1.3h8.6"/><path ${T} stroke="{i}" stroke-width="1.2" d="M6.3 8h14.5l-1.6 6.8a1.7 1.7 0 0 1-1.7 1.3H9.1a1.7 1.7 0 0 1-1.7-1.3L6.3 8Z"/><path stroke="{b}" stroke-width="1.2" d="M10.8 9.2l.3 5.4M14.6 9.2v5.4M18.2 9.2l-.4 5.4"/><circle ${B} stroke="{i}" stroke-width="1" cx="9.6" cy="20" r="1.9"/><circle ${B} stroke="{i}" stroke-width="1" cx="17.4" cy="20" r="1.9"/>` },
  burger: { hue: 'orange', shape: `<path ${T} d="M4 10a8 6.2 0 0 1 16 0Z"/><rect ${B} x="3.5" y="11.4" width="17" height="3.2" rx="1.6"/><path ${T} d="M4.5 15.8h15v1a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-1Z"/>${dot(9, 7, 1.6).replace('{o}', '{i}')}${dot(12.6, 5.8, 1.6).replace('{o}', '{i}')}${dot(15.6, 7.4, 1.6).replace('{o}', '{i}')}` },
  pizza: { hue: 'orange', shape: `<path ${T} stroke="{b}" stroke-width="1.2" d="M4.8 8.5Q12 5.5 19.2 8.5L12 21.5Z"/><path ${B} stroke="{i}" stroke-width="1.2" d="M3.5 5.8Q12 1.8 20.5 5.8L19.2 9Q12 5.8 4.8 9Z"/><path stroke="{t}" stroke-width="1" d="M6.2 6.1Q12 3.9 17.8 6.1"/><circle ${B} stroke="none" cx="9.2" cy="11.2" r="1.5"/><circle ${B} stroke="none" cx="14.5" cy="11.8" r="1.4"/><circle ${B} stroke="none" cx="11.8" cy="16.2" r="1.3"/>` },
  pasta: { hue: 'amber', shape: `<path ${T} d="M5.5 12a6.5 5 0 0 1 13 0Z"/><path ${L} d="M8 8.5c0-1.5 1-1.5 1-3M12 8.5c0-1.5 1-1.5 1-3M16 8.5c0-1.5 1-1.5 1-3"/><path ${B} d="M3 12h18c0 4.5-4 8-9 8s-9-3.5-9-8Z"/>` },
  popcorn: { hue: 'popcorn', shape: `<path ${T} d="M6 10a2.5 2.5 0 0 1 2-4 2.5 2.5 0 0 1 4-2 2.5 2.5 0 0 1 4 2 2.5 2.5 0 0 1 2 4Z"/><path ${B} d="M6 10h12l-1.5 11h-9L6 10Z"/><path stroke="{o}" d="M9.8 10.8l.4 9.4M14.2 10.8l-.4 9.4"/>` },
  coffee: { hue: 'amber', shape: `<path ${B} d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path ${T} d="M4 9h13v2.5H4Z"/><path ${L} d="M17 10h1.5a2.5 2.5 0 0 1 0 5H16.5"/><path ${L} d="M8 3v3M12 3v3"/>` },
  utensils: { hue: 'orange', shape: `<path ${B} d="M6 3v6a2.5 2.5 0 0 0 5 0V3Z"/><path ${L} d="M8.5 9.5V21"/><path ${T} d="M17.5 3c-2.5 1.5-4 4.5-4 8h4V3Z"/><path ${L} d="M17.5 11v10"/>` },
  cake: { hue: 'pink', shape: `<path ${B} d="M4 20h16v-6.5H4V20Z"/><path ${T} d="M4 13.5h16v3c-2-1.5-3-1.5-4 0s-3 1.5-4 0-2.5-1.5-4 0-3 1.5-4 0v-3Z"/><path ${L} d="M12 13.5V10"/><path ${T} d="M12 3.5c1 1.5 1 2.5 0 3.5-1-1-1-2 0-3.5Z"/>` },
  // Shopping and gifts
  bag: { hue: 'pink', shape: `<path ${B} d="M5 8h14l-1 12H6L5 8Z"/><path ${L} d="M9 8V6.5a3 3 0 0 1 6 0V8"/>${dot(9.5, 11.5)}${dot(14.5, 11.5)}` },
  box: { hue: 'orange', shape: `<path ${T} d="M3.5 7.5 12 3l8.5 4.5L12 12 3.5 7.5Z"/><path ${B} d="M3.5 7.5 12 12v9l-8.5-4.5v-9Z"/><path ${T} d="M20.5 7.5 12 12v9l8.5-4.5v-9Z"/>` },
  gift: { hue: 'pink', shape: `<rect ${T} x="3.5" y="9" width="17" height="4" rx="1"/><path ${B} d="M5 13h14v7H5Z"/><path d="M12 9v11"/><path ${T} d="M12 9C9 9 7.5 7.5 7.5 6.2S9 4 10 4.5C11.5 5.2 12 9 12 9Zm0 0c3 0 4.5-1.5 4.5-2.8S15 4 14 4.5C12.5 5.2 12 9 12 9Z"/>` },
  shirt: { hue: 'pink', shape: `<path ${B} d="m8.5 4-5 3 2 4 2-1V20h9V10l2 1 2-4-5-3a3.5 3.5 0 0 1-7 0Z"/><path ${T} d="M8.5 4a3.5 3.5 0 0 0 7 0l-1.2-.7a2.5 2.5 0 0 1-4.6 0L8.5 4Z"/>` },
  // Home
  house: { hue: 'blue', shape: `<path ${T} d="M5.5 11.5h13V20h-13Z"/><path ${B} d="M3.5 11.5 12 4l8.5 7.5h-17Z"/><rect ${B} x="10" y="14" width="4" height="6"/>` },
  sofa: { hue: 'blue', shape: `<path ${T} d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3H5Z"/><path ${B} d="M3 12.5a2 2 0 0 1 4 0V14h10v-1.5a2 2 0 0 1 4 0V18H3v-5.5Z"/><path ${L} d="M6 18v2M18 18v2"/>` },
  key: { hue: 'amber', shape: `<path stroke="{i}" stroke-width="3.6" d="m10.5 12.5 9-9M15.5 7.5l2.5 2.5M18 5l2 2"/><path stroke="{b}" stroke-width="2" d="m10.5 12.5 9-9M15.5 7.5l2.5 2.5M18 5l2 2"/><circle ${B} cx="7.5" cy="15.5" r="4.5"/><circle ${T} cx="6.5" cy="16.5" r="1.5"/>` },
  bulb: { hue: 'amber', shape: `<path ${B} d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/><rect ${T} x="9.5" y="16" width="5" height="2.2" rx="1"/><path ${L} d="M10.5 21h3"/><path stroke="{o}" d="M9.8 8.3a2.6 2.6 0 0 1 2-1.7"/>` },
  wifi: { hue: 'blue', shape: `<path stroke="{b}" stroke-width="2.4" d="M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9 16.5a5 5 0 0 1 6 0"/><circle fill="{l}" stroke="none" cx="12" cy="20" r="1.6"/>` },
  // Transport
  train: { hue: 'teal', shape: `<rect ${B} x="5" y="3.5" width="14" height="13" rx="3"/><rect ${T} x="7.2" y="6.2" width="9.6" height="5" rx="1"/><path ${L} d="M9 16.5 7 20.5M15 16.5l2 4"/>${dot(9, 14, 2.4)}${dot(15, 14, 2.4)}` },
  bike: { hue: 'teal', shape: `<circle ${T} cx="6" cy="16" r="3.5"/><circle ${T} cx="18" cy="16" r="3.5"/><path stroke="{b}" stroke-width="2.2" d="M6 16l4-8h5l3 8M12.5 12.5H9"/><path ${L} d="M10 8 8.5 6H7"/>` },
  fuel: { hue: 'teal', shape: `<path ${B} d="M5 20V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 5v15H5Z"/><rect ${T} x="6.8" y="6" width="5.4" height="4" rx=".8"/><path ${L} d="M4 20h11M14 8l3 2.5V16a1.5 1.5 0 0 0 3 0V9l-3-3"/>` },
  // Leisure and culture
  gamepad: { hue: 'violet', shape: `<rect ${B} x="3" y="7" width="18" height="11" rx="4"/><path stroke="{o}" d="M8 10.5v4M6 12.5h4"/>${dot(15.5, 11)}${dot(17.5, 14)}` },
  music: { hue: 'violet', shape: `<path ${T} d="M9 5l11-2v4L9 9V5Z"/><path ${L} d="M9 18V5l11-2v13"/><circle ${B} cx="6.5" cy="18" r="2.5"/><circle ${B} cx="17.5" cy="16" r="2.5"/>` },
  film: { hue: 'violet', shape: `<rect ${B} x="3.5" y="4" width="17" height="16" rx="2"/><path stroke="{o}" d="M3.5 9h4.5M3.5 15h4.5M16 9h4.5M16 15h4.5"/><rect ${T} x="8" y="5.5" width="8" height="13" rx="1"/>` },
  tv: { hue: 'violet', shape: `<rect ${B} x="3" y="5.5" width="18" height="12" rx="2"/><rect ${T} x="5.2" y="7.7" width="13.6" height="7.6" rx="1"/><path ${L} d="M8 20.5h8M12 17.5v3"/>` },
  sparkles: { hue: 'violet', shape: `<path ${B} d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>` },
  camera: { hue: 'slate', shape: `<path ${B} d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z"/><circle ${T} cx="12" cy="13" r="3.5"/>${dot(17.5, 10.5)}` },
  // Money and work
  coin: { hue: 'gold', shape: `<circle ${B} cx="12" cy="12" r="9"/><circle ${T} cx="12" cy="12" r="6.4"/><path d="M12 8v8M13.8 9.9c-.4-.7-1.1-1-1.8-1-1 0-1.8.5-1.8 1.4s.8 1.2 1.8 1.4 1.8.5 1.8 1.4-.8 1.4-1.8 1.4c-.7 0-1.4-.3-1.8-1" stroke-width="1.2"/>` },
  wallet: { hue: 'orange', shape: `<path ${T} d="M5 7.5A2.5 2.5 0 0 1 7.5 5H17v3H5Z"/><rect ${B} x="3.5" y="7.5" width="17" height="12" rx="2"/><path ${T} d="M20.5 11.5H16a2 2 0 0 0 0 4h4.5Z"/><path stroke-width="2.2" d="M16.3 13.5h.01"/>` },
  bank: { hue: 'blue', shape: `<path ${B} d="M3 9 12 4l9 5H3Z"/><rect ${T} x="5" y="10" width="2.6" height="6.5" rx=".4"/><rect ${T} x="9.1" y="10" width="2.6" height="6.5" rx=".4"/><rect ${T} x="13.2" y="10" width="2.6" height="6.5" rx=".4"/><rect ${T} x="17.3" y="10" width="2.6" height="6.5" rx=".4"/><rect ${B} x="3" y="17.5" width="18" height="3" rx=".6"/>${dot(12, 7.2)}` },
  cash: { hue: 'green', shape: `<rect ${B} x="2.5" y="6.5" width="19" height="11" rx="2"/><circle ${T} cx="12" cy="12" r="2.8"/><path stroke="{o}" d="M5.8 10v4M18.2 10v4"/>` },
  safe: { hue: 'slate', shape: `<path ${L} stroke-width="2" d="M7 19v1.5M17 19v1.5"/><rect ${B} x="3.5" y="4" width="17" height="15" rx="2"/><circle ${T} cx="11" cy="11.5" r="4"/><path stroke-width="1.2" d="M11 8.8v1.2M11 13v1.2M8.3 11.5h1.2M12.5 11.5h1.2"/><path stroke="{o}" stroke-width="1.8" d="M17.2 9.5v4"/>` },
  growth: { hue: 'teal', shape: `<rect ${T} x="4" y="14" width="3.5" height="6" rx=".6"/><rect ${T} x="10.2" y="11" width="3.5" height="9" rx=".6"/><rect ${B} x="16.5" y="8" width="3.5" height="12" rx=".6"/><path ${L} stroke-width="1.6" d="M3.5 10.5 8.5 6l3 2.5 6-5M14.5 3.5H17.5V6.5"/>` },
  piggy: { hue: 'green', shape: `<path ${B} d="M5 12.5c0-3.5 3-6 7-6 1.5 0 2.8.4 3.8 1L19 6.5v3.5c1 .8 1.5 1.8 1.5 3V16h-2.5l-1 2.5h-3L13 17h-3l-.5 1.5h-3L5.5 15.5C5.2 14.5 5 13.5 5 12.5Z"/>${dot(15.5, 11.5)}<path stroke="{o}" d="M9 8.8h4"/>` },
  laptop: { hue: 'blue', shape: `<rect ${B} x="5" y="5" width="14" height="10" rx="1.5"/><rect ${T} x="6.8" y="6.8" width="10.4" height="6.4" rx=".6" stroke-width="1"/><path ${T} d="M2.5 19h19l-1.5-4H4l-1.5 4Z"/>` },
  cloud: { hue: 'blue', shape: `<path ${B} d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.25 18H7Z"/><path stroke="{o}" d="M8.6 14.4a2.6 2.6 0 0 1 2-2"/>` },
  // Health, sport, nature
  heart: { hue: 'red', shape: `<path ${B} d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20Z"/><path stroke="{o}" d="M6.8 10a2.4 2.4 0 0 1 1.8-1.9"/>` },
  heartpulse: { hue: 'red', shape: `<path ${B} d="M12 20.5s-8.5-5-8.5-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5c0 6-8.5 11-8.5 11Z"/><path stroke="{o}" d="M7 12.5h2.5l1.5-2.5 2 5 1.5-2.5H17"/>` },
  cross: { hue: 'red', shape: `<path ${B} d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9V3.5Z"/>` },
  dumbbell: { hue: 'green', shape: `<path ${L} stroke-width="2" d="M8 12h8"/><rect ${B} x="5.5" y="5.5" width="4.5" height="13" rx="1.6"/><rect ${T} x="2.2" y="8.5" width="3.8" height="7" rx="1.3"/><rect ${B} x="14" y="5.5" width="4.5" height="13" rx="1.6"/><rect ${T} x="18" y="8.5" width="3.8" height="7" rx="1.3"/>` },
  paw: { hue: 'orange', shape: `<circle ${B} cx="4.3" cy="11.2" r="2.1" stroke-width="1.2"/><circle ${B} cx="8.8" cy="6.6" r="2.1" stroke-width="1.2"/><circle ${B} cx="15.2" cy="6.6" r="2.1" stroke-width="1.2"/><circle ${B} cx="19.7" cy="11.2" r="2.1" stroke-width="1.2"/><path ${B} stroke-width="1.2" d="M12 11.8c-3.3 0-6.2 3.2-5.4 5.8.6 2 2.8 1.9 5.4 1.9s4.8.1 5.4-1.9c.8-2.6-2.1-5.8-5.4-5.8Z"/><path ${T} stroke-width="1.2" d="M9.2 16.4c.5-1.2 1.4-1.9 2.4-1.9"/>` },
};
