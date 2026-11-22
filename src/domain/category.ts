export type Category = Readonly<{ id: string; label: string; icon: CategoryIcon | null }>;

// Stable IDs of the outline glyphs in src/components/categoryGlyphs.ts (kept in sync by tests).
export const categoryIconLabels = {
  cart: 'carrello', burger: 'hamburger', pizza: 'pizza', pasta: 'piatto di pasta', popcorn: 'popcorn',
  coffee: 'caffè', heart: 'cuore',
  gamepad: 'videogioco', bag: 'borsa della spesa', box: 'pacco',
  house: 'casa', key: 'chiave', bulb: 'lampadina', gift: 'regalo', shirt: 'maglietta',
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
// IDs deleted outright before icons were retired (8–12 November 2026, a mistake: categories, funds and backups that used
// one became unreadable). Valid again (20 November), never offered by the picker; drawn only as outlines (the colourful
// and pixel styles fall back to them). Same strings in both icon lists of firestore.rules.
export const legacyCategoryIconLabels = {
  baby: 'bambino',
  bed: 'viaggi e hotel',
  beer: 'birra',
  book: 'libro',
  briefcase: 'lavoro',
  bus: 'autobus',
  car: 'auto',
  droplet: 'acqua',
  ellipsis: 'altro',
  flame: 'gas',
  graduation: 'istruzione',
  leaf: 'pianta',
  phone: 'telefono',
  pill: 'medicina',
  plane: 'aereo',
  receipt: 'ricevuta',
  scissors: 'forbici',
  shield: 'assicurazione',
  star: 'stella',
  ticket: 'biglietto',
  tree: 'natura',
  umbrella: 'ombrello',
  wine: 'vino',
  wrench: 'chiave inglese',
} as const;
// IDs with a drawing in all three styles (the colourful and pixel tables are keyed by these).
export type ActiveCategoryIcon = keyof typeof categoryIconLabels;
export type CategoryIcon = ActiveCategoryIcon | keyof typeof legacyCategoryIconLabels;
export const activeCategoryIcons = Object.keys(categoryIconLabels) as ActiveCategoryIcon[];
export const legacyCategoryIcons = Object.keys(legacyCategoryIconLabels) as CategoryIcon[];
export const categoryIcons: readonly CategoryIcon[] = [...activeCategoryIcons, ...legacyCategoryIcons];
// Every valid ID with its accessible name (Italian source text, translated at the UI boundary).
export const allCategoryIconLabels: Readonly<Record<CategoryIcon, string>> = { ...categoryIconLabels, ...legacyCategoryIconLabels };
// Retired icons: still valid in records, backups and Rules (existing categories keep them and keep their drawing), but
// no longer offered by the picker. Removing an ID outright would make archives that use it unreadable.
export const retiredCategoryIcons: readonly CategoryIcon[] = ['sofa', ...legacyCategoryIcons];
export const selectableCategoryIcons = categoryIcons.filter((icon) => !retiredCategoryIcons.includes(icon));

export function isCategoryIcon(value: unknown): value is CategoryIcon {
  return typeof value === 'string' && (categoryIcons as readonly string[]).includes(value);
}

export function normalizeCategoryName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// Longest category name (mirrored by firestore.rules); the fields stop accepting characters at this length.
export const maxCategoryNameLength = 40;

export function categoryNameError(name: string, categories: readonly Category[]): string | null {
  const label = normalizeCategoryName(name);
  if (!label) return 'Inserisci il nome della categoria.';
  if (Array.from(label).length > maxCategoryNameLength) return 'Usa al massimo 40 caratteri.';
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
