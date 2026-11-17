import { useEffect, useState } from 'react';
import { errorCode, signInWithGoogle, signOutUser, watchSession, type SessionUser } from '../../services/firebase';
import { writeSessionHint } from '../../services/sessionHint';
import { signInError } from './signInError';

export type Session =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signed-out'; error: string | null; signIn: () => void }
  | { status: 'signed-in'; user: SessionUser; signOut: () => void; busy: boolean; error: string | null };

// `enabled` is fixed at build time (backend mode), so the hook order never changes.
export function useSession(enabled: boolean): Session {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try { return watchSession(setUser); } catch { setError('Configurazione Firebase non valida.'); setUser(null); }
  }, [enabled]);

  if (!enabled) return { status: 'disabled' };
  if (user === undefined) return { status: 'loading' };
  if (user === null) {
    return {
      status: 'signed-out', error,
      signIn: () => {
        setError(null);
        signInWithGoogle().catch((reason: unknown) => {
          setError(signInError(errorCode(reason)));
        });
      },
    };
  }
  return {
    status: 'signed-in', user, busy, error,
    signOut: () => {
      if (busy) return;
      setBusy(true); setError(null);
      // With the on-disk cache, Firestore was stopped to delete it: the page restarts, signed out.
      signOutUser().then((restart) => { if (restart) { writeSessionHint(null); window.location.reload(); } })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Uscita non riuscita. Riprova.')).finally(() => setBusy(false));
    },
  };
}
