export type Category = Readonly<{ id: string; label: string }>;

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
export const defaultCategoryLabels = [
  'Spesa alimentare', 'Ristorazione', 'Salute', 'Uscita', 'Shopping online',
] as const;
