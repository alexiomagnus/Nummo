// Pure rule for the first-use default categories. Only server snapshots can establish that an archive is empty
// (an empty cache proves nothing), and any error or pending write postpones the decision.
export type SeedInput = {
  online: boolean; error: string | null;
  categories: { ready: boolean; count: number; fromCache: boolean; pending: boolean };
  expenses: { ready: boolean; count: number; fromCache: boolean; pending: boolean };
};

export function shouldSeedDefaultCategories({ online, error, categories, expenses }: SeedInput): boolean {
  if (!online || error) return false;
  return [categories, expenses].every((part) => part.ready && !part.fromCache && !part.pending) &&
    categories.count === 0 && expenses.count === 0;
}

// One attempt per account and browser: deleting the defaults later must not bring them back.
export const seededKey = (uid: string) => `nummo.defaultCategories.v1.${uid}`;
