export type Category = Readonly<{ id: string; label: string; icon: CategoryIcon | null }>;

// Stable IDs of the outline glyphs in src/components/categoryGlyphs.ts (kept in sync by tests).
export const categoryIconLabels = {
  cart: 'carrello', burger: 'hamburger', pizza: 'pizza', pasta: 'piatto di pasta', popcorn: 'popcorn',
  coffee: 'caffè', heart: 'cuore',
  pill: 'medicina', star: 'stella', gamepad: 'videogioco', bag: 'borsa della spesa', box: 'pacco',
  house: 'casa', bulb: 'lampadina', car: 'auto', gift: 'regalo', book: 'libro', shirt: 'maglietta',
  paw: 'zampa', dumbbell: 'manubrio', phone: 'telefono', coin: 'moneta',
  train: 'treno',
  plane: 'aereo',
  bus: 'autobus',
  bike: 'bicicletta',
  fuel: 'carburante',
  wifi: 'internet',
  music: 'musica',
  film: 'cinema',
  camera: 'fotocamera',
  scissors: 'forbici',
  wrench: 'chiave inglese',
  graduation: 'istruzione',
  briefcase: 'lavoro',
  baby: 'bambino',
  sofa: 'divano',
  droplet: 'acqua',
  flame: 'gas',
  wine: 'vino',
  beer: 'birra',
  cake: 'dolce',
  umbrella: 'ombrello',
  leaf: 'pianta',
  laptop: 'computer',
  receipt: 'ricevuta',
  piggy: 'risparmio',
  shield: 'assicurazione',
  ticket: 'biglietto',
  cross: 'salute',
  bed: 'viaggi e hotel',
  tree: 'natura',
  sparkles: 'svago',
  tv: 'televisione',
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

// Seeded only for a browser that has never stored categories.
export const defaultCategories: readonly { label: string; icon: CategoryIcon }[] = [
  { label: 'Spesa', icon: 'cart' },
  { label: 'Ristorazione', icon: 'pasta' },
  { label: 'Uscita', icon: 'popcorn' },
  { label: 'Shopping', icon: 'shirt' },
];
