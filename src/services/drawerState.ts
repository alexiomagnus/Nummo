// Whether the desktop drawer is folded to icons only (27 November, on request): a presentation preference of this browser,
// never data. Kept in its own key so a damaged value can only fall back to the open drawer.
export const drawerFoldedKey = 'nummo.drawer.v1';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export const parseDrawerFolded = (raw: string | null): boolean => raw === 'folded';

export function readDrawerFolded(storage: Storage = localStorage): boolean {
  try { return parseDrawerFolded(storage.getItem(drawerFoldedKey)); } catch { return false; }
}
export function writeDrawerFolded(folded: boolean, storage: Storage = localStorage): void {
  try { storage.setItem(drawerFoldedKey, folded ? 'folded' : 'open'); } catch { /* storage denied: lasts for the session */ }
}
