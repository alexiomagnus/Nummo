import { categoryNameError, defaultCategoryLabels, normalizeCategoryName, type Category } from '../domain/category.ts';

export const categoryStorageKey = 'nummo.categories.v1';
// Written by builds named Nummus; read once so existing categories survive the rename.
export const legacyCategoryStorageKey = 'nummus.categories.v1';
type CategoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

function readRaw(storage: CategoryStorage): string | null {
  return storage.getItem(categoryStorageKey) ?? storage.getItem(legacyCategoryStorageKey);
}

export function readCategories(storage: CategoryStorage): Category[] {
  const raw = readRaw(storage);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Archivio categorie non valido.');
  const categories: Category[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id
      || typeof item.label !== 'string' || categoryNameError(item.label, categories)
      || categories.some((category) => category.id === item.id)) {
      throw new Error('Archivio categorie non valido.');
    }
    categories.push({ id: item.id, label: normalizeCategoryName(item.label) });
  }
  return categories;
}

// Seeds defaults only when nothing was ever stored: deleting every category is respected.
export function loadCategories(storage: CategoryStorage, createId: () => string): Category[] {
  if (readRaw(storage) !== null) return readCategories(storage);
  const defaults = defaultCategoryLabels.map((label) => ({ id: createId(), label }));
  if (new Set(defaults.map((category) => category.id)).size !== defaults.length || defaults.some((c) => !c.id)) {
    throw new Error('Identificativo categoria non valido.');
  }
  storage.setItem(categoryStorageKey, JSON.stringify(defaults));
  return defaults;
}

// Read before writing; never overwrite unreadable existing data.
export function storeCategory(storage: CategoryStorage, label: string, createId: () => string): Category[] {
  const categories = readCategories(storage);
  const error = categoryNameError(label, categories);
  if (error) throw new Error(error);
  const id = createId();
  if (!id || categories.some((category) => category.id === id)) throw new Error('Identificativo categoria non valido.');
  const updated = [...categories, { id, label: normalizeCategoryName(label) }];
  storage.setItem(categoryStorageKey, JSON.stringify(updated));
  return updated;
}

export function removeCategory(storage: CategoryStorage, id: string): Category[] {
  const categories = readCategories(storage);
  const updated = categories.filter((category) => category.id !== id);
  if (updated.length === categories.length) throw new Error('Categoria non trovata.');
  storage.setItem(categoryStorageKey, JSON.stringify(updated));
  return updated;
}
