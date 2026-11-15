import { doc, getDocFromServer, type Firestore } from 'firebase/firestore';

// Whether the signed-in Google account is the owner of this Nummo (Advanced mode only). The Rules let only the owner
// read `config/owner`: anyone else, and the owner too while the document or the Rules are missing, is refused.
// `unknown` (offline, timeout, any other failure) never blocks: the workspace shows its usual errors.
export type OwnerAccess = 'checking' | 'owner' | 'denied' | 'unknown';

export function ownerAccessFromError(code: string): Exclude<OwnerAccess, 'checking' | 'owner'> {
  return code === 'permission-denied' ? 'denied' : 'unknown';
}

const codeOf = (error: unknown): string =>
  error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown';

// One server read per session; the cache could only answer for an owner seen before.
export async function checkOwnerAccess(db: Firestore, uid: string): Promise<Exclude<OwnerAccess, 'checking'>> {
  try {
    const snapshot = await getDocFromServer(doc(db, 'config', 'owner'));
    return snapshot.exists() && snapshot.get('uid') === uid ? 'owner' : 'denied';
  } catch (error) {
    return ownerAccessFromError(codeOf(error));
  }
}
