export type Category = Readonly<{ id: string; label: string; icon: CategoryIcon | null }>;

// Stable IDs of the outline glyphs in src/components/categoryGlyphs.ts (kept in sync by tests).
export const categoryIconLabels = {
  cart: 'carrello', burger: 'hamburger', pizza: 'pizza', pasta: 'piatto di pasta', popcorn: 'popcorn',
  coffee: 'caffè', heart: 'cuore',
  gamepad: 'videogioco', bag: 'borsa della spesa', box: 'pacco',
  house: 'casa', bulb: 'lampadina', gift: 'regalo', shirt: 'maglietta',
  paw: 'zampa', dumbbell: 'manubrio', coin: 'moneta',
  wallet: 'portafoglio', bank: 'banca', cash: 'contanti', safe: 'cassaforte', growth: 'investimenti',
  train: 'treno',
  bike: 'bicicletta',
  fuel: 'carburante',
  wifi: 'internet',
  music: 'musica',
  film: 'cinema',
  camera: 'fotocamera',
  sofa: 'divano',
  cake: 'dolce',
  laptop: 'computer',
  piggy: 'risparmio',
  cross: 'salute',
  sparkles: 'svago',
  tv: 'televisione',
  utensils: 'posate',
  heartpulse: 'salute e battito',
  cloud: 'nuvola',
} as const;
export type CategoryIcon = keyof typeof categoryIconLabels;
export const categoryIcons = Object.keys(categoryIconLabels) as CategoryIcon[];

export function isCategoryIcon(value: unknown): value is CategoryIcon {
  return typeof value === 'string' && (categoryIcons as readonly string[]).includes(value);
}

export function normalizeCategoryName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function categoryNameError(name: string, categories: readonly Category[]): string | null {
  const label = normalizeCategoryName(name);
  if (!label) return 'Inserisci il nome della categoria.';
  if (Array.from(label).length > 40) return 'Usa al massimo 40 caratteri.';
  if (categories.some((category) => category.label.toLocaleLowerCase('it') === label.toLocaleLowerCase('it'))) {
    return 'Esiste già una categoria con questo nome.';
  }
  return null;
}

// Created once for a new, empty archive (seedDefaults.ts), or on request from an empty Categories page.
export const defaultCategories: readonly { label: string; icon: CategoryIcon }[] = [
  { label: 'Alimentari', icon: 'cart' },
  { label: 'Intrattenimento', icon: 'popcorn' },
  { label: 'Shopping', icon: 'shirt' },
  { label: 'Tecnologia', icon: 'laptop' },
  { label: 'Trasporti', icon: 'train' },
];
