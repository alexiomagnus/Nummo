// Presentation-only memory that the last visit ended signed in. It never grants access: the app still waits for
// Firebase Auth. It lets the first frames show the final screen layout (instead of a spinner on the sign-in shell)
// and lets index.html pre-open the connections the sign-in check needs. No identity is stored.
export const sessionHintKey = 'nummo.session.hint.v1';
// `cloud`: real Auth and Firestore (connections can be opened early); `local`: emulators involved.
export type SessionHint = 'cloud' | 'local';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const parseSessionHint = (raw: string | null): SessionHint | null => raw === 'cloud' || raw === 'local' ? raw : null;

export function readSessionHint(storage: Storage = localStorage): SessionHint | null {
  try { return parseSessionHint(storage.getItem(sessionHintKey)); } catch { return null; }
}
export function writeSessionHint(hint: SessionHint | null, storage: Storage = localStorage): void {
  try { if (hint) storage.setItem(sessionHintKey, hint); else storage.removeItem(sessionHintKey); } catch { /* storage denied: no hint */ }
}
