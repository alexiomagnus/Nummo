export type Category = Readonly<{ id: string; label: string; icon: CategoryIcon | null }>;

// Stable IDs of the outline glyphs in src/components/categoryGlyphs.ts (kept in sync by tests).
export const categoryIconLabels = {
  cart: 'carrello', burger: 'hamburger', pizza: 'pizza', pasta: 'piatto di pasta', popcorn: 'popcorn',
  coffee: 'caffè', heart: 'cuore',
  star: 'stella', gamepad: 'videogioco', bag: 'borsa della spesa', box: 'pacco',
  house: 'casa', bulb: 'lampadina', car: 'auto', gift: 'regalo', shirt: 'maglietta',
  paw: 'zampa', dumbbell: 'manubrio', phone: 'telefono', coin: 'moneta',
  train: 'treno',
  bus: 'autobus',
  bike: 'bicicletta',
  fuel: 'carburante',
  wifi: 'internet',
  music: 'musica',
  film: 'cinema',
  camera: 'fotocamera',
  wrench: 'chiave inglese',
  graduation: 'istruzione',
  briefcase: 'lavoro',
  sofa: 'divano',
  droplet: 'acqua',
  beer: 'birra',
  cake: 'dolce',
  laptop: 'computer',
  receipt: 'ricevuta',
  piggy: 'risparmio',
  ticket: 'biglietto',
  cross: 'salute',
  bed: 'viaggi e hotel',
  tree: 'natura',
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

// Client-side only: Firestore Rules cannot count a collection. Archives that already exceed it stay readable.
// Below the 12 dashboard colour slots (history.ts), so every category always has its own colour.
export const maxCategories = 10;
export const categoryLimitMessage = `Puoi creare al massimo ${maxCategories} categorie.`;

export function categoryNameError(name: string, categories: readonly Category[]): string | null {
  const label = normalizeCategoryName(name);
  if (!label) return 'Inserisci il nome della categoria.';
  if (Array.from(label).length > 40) return 'Usa al massimo 40 caratteri.';
  if (categories.some((category) => category.label.toLocaleLowerCase('it') === label.toLocaleLowerCase('it'))) {
    return 'Esiste già una categoria con questo nome.';
  }
  return null;
}

// Seeded only for a browser that has never stored categories.
export const defaultCategories: readonly { label: string; icon: CategoryIcon }[] = [
  { label: 'Spesa', icon: 'cart' },
  { label: 'Ristorazione', icon: 'pasta' },
  { label: 'Uscita', icon: 'popcorn' },
  { label: 'Shopping', icon: 'shirt' },
];
