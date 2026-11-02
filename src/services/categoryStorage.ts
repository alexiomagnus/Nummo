import { categoryNameError, normalizeCategoryName, type Category } from '../domain/category.ts';

export const categoryStorageKey = 'nummus.categories.v1';
type CategoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readCategories(storage: CategoryStorage): Category[] {
  const raw = storage.getItem(categoryStorageKey);
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
