import type { FirebaseWebConfig } from '../../services/backendConfig';
import { writeCustomFirebase } from '../../services/customFirebase';
import { signOutUser } from '../../services/firebase';
import { writeSessionHint } from '../../services/sessionHint';

// Connects this browser to another Firebase project (`null`: back to the site's one). The SDK starts once per page, so
// the page reloads with the new configuration. A signed-in account is signed out first (after its pending writes): the
// session belongs to the previous project. Returns an error message (source language) when nothing changed.
export async function switchFirebase(config: FirebaseWebConfig | null, signedIn: boolean): Promise<string | null> {
  if (signedIn) {
    try { await signOutUser(); } catch (reason) { return reason instanceof Error ? reason.message : 'Uscita non riuscita. Riprova.'; }
  }
  if (!writeCustomFirebase(config)) return 'Il browser non permette di salvare la configurazione (dati dei siti bloccati?).';
  writeSessionHint(null);
  window.location.reload();
  return null;
}

// The Rules of this version of Nummo, served as a static copy (public/firestore.rules, kept identical by the tests).
export const rulesUrl = (): string => new URL('firestore.rules', window.location.origin + '/').href;
export const firebaseConsoleUrl = 'https://console.firebase.google.com/';
export const openExternal = (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); };

// Clipboard needs a secure context and, on some browsers, a recent gesture: callers copy text they already hold.
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
