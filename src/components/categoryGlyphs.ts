// Outline glyphs (24×24, 2 px stroke) for the category icon IDs. Same style as the UI icons in
// SvgIcon.tsx. Pure data: IDs are the stable `categoryIcons` stored in Firestore.
import type { CategoryIcon } from '../domain/category.ts';

export const categoryGlyphs: Record<CategoryIcon, string> = {
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M3 4h2.5l2.2 11h10.6l2-8H6.2"/>',
  burger: '<path d="M4 10.5a8 6 0 0 1 16 0Z"/><path d="M3 14.5h18"/><path d="M4.5 18h15a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/>',
  pizza: '<path d="M12 21 3.5 6.5a17 17 0 0 1 17 0L12 21Z"/><circle cx="10.5" cy="9.5" r="1"/><circle cx="14" cy="12" r="1"/>',
  pasta: '<path d="M3 12h18c0 4.5-4 8-9 8s-9-3.5-9-8Z"/><path d="M8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3"/>',
  popcorn: '<path d="M6 10h12l-1.5 11h-9L6 10Z"/><path d="M9.5 10v11M14.5 10v11"/><path d="M6 10a2.5 2.5 0 0 1 2-4 2.5 2.5 0 0 1 4-2 2.5 2.5 0 0 1 4 2 2.5 2.5 0 0 1 2 4"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H16.5"/><path d="M8 3v3M12 3v3"/>',
  heart: '<path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20Z"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9L12 3.5Z"/>',
  gamepad: '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10.5v4M6 12.5h4M15.5 11h.01M17.5 14h.01"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
  house: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  car: '<path d="M4 17v-5l2-5h12l2 5v5H4Z"/><path d="M4 12h16M7.5 15h.01M16.5 15h.01"/><path d="M6 17v2M18 17v2"/>',
  gift: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11"/><path d="M12 9C9 9 7.5 7.5 7.5 6.2S9 4 10 4.5C11.5 5.2 12 9 12 9Zm0 0c3 0 4.5-1.5 4.5-2.8S15 4 14 4.5C12.5 5.2 12 9 12 9Z"/>',
  book: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  shirt: '<path d="m8.5 4-5 3 2 4 2-1V20h9V10l2 1 2-4-5-3a3.5 3.5 0 0 1-7 0Z"/>',
  paw: '<circle cx="6.5" cy="11" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="17.5" cy="11" r="1.8"/><path d="M12 12.5c-3 0-5.5 3-4.5 5.2.8 1.8 2.8 1.3 4.5 1.3s3.7.5 4.5-1.3c1-2.2-1.5-5.2-4.5-5.2Z"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5"/>',
};
