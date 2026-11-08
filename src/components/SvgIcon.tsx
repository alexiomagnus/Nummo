import { Image } from 'react-native';
import { iconStroke } from '../theme/tokens';

// Inline SVG: the project ships no icon font. `shape` is trusted static markup.
export function SvgIcon({ shape, size, color }: { shape: string; size: number; color: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${iconStroke}" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
  return <Image accessible={false} source={{ uri: `data:image/svg+xml,${encodeURIComponent(svg)}` }} style={{ width: size, height: size }} />;
}

export const iconShapes = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  minus: '<path d="M5 12h14"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-7M3 20h18"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  cloudOff: '<path d="M3 3l18 18M7 18a4.5 4.5 0 0 1-1.6-8.7M9.5 5.6A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 20 15M12 18H7"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14 4.5l2-2M20 20v-4.5h-4.5"/>',
  alert: '<path d="M12 3 2 20h20L12 3ZM12 10v4M12 17.5h.01"/>',
  dots: '<path d="M12 5h.01M12 12h.01M12 19h.01" stroke-width="2.4"/>',
  download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 16V5m-4.5 4.5L12 5l4.5 4.5M5 20h14"/>',
  face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  euro: '<path d="M17.5 6.5A6.5 6.5 0 0 0 7 9.5v5a6.5 6.5 0 0 0 10.5 3M5 10.5h9M5 13.5h9"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  sort: '<path d="M4 7h9M4 12h6M4 17h3M17 5v14m0 0-3-3m3 3 3-3"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>',
  settings: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4m8-4v4"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M16 13.5h1.5"/>',
  swap: '<path d="M4 8h14m-3-3 3 3-3 3M20 16H6m3-3-3 3 3 3"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M5 8.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18V8.5M10 12h4"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
} as const;
