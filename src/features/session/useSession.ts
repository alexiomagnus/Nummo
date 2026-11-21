import { useEffect, useState } from 'react';
import { errorCode, signInWithGoogle, signOutUser, watchSession, type SessionUser } from '../../services/firebase';
import { writeSessionHint } from '../../services/sessionHint';
import { signInError } from './signInError';

export type Session =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signed-out'; error: string | null; signIn: () => void }
  | { status: 'signed-in'; user: SessionUser; signOut: (afterward?: () => void) => void; busy: boolean; error: string | null };

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
    // `afterward`: run once signed out, before a restart (e.g. forget the chosen mode, so the page opens on the mode choice).
    signOut: (afterward) => {
      if (busy) return;
      setBusy(true); setError(null);
      // With the on-disk cache, Firestore was stopped to delete it: the page restarts, signed out.
      // The hint goes first, whatever the cache: `afterward` may unmount the Advanced root before it sees «signed-out»,
      // and a hint left behind with no saved mode would reopen Advanced at the next load (`initialStorageMode`).
      signOutUser().then((restart) => { writeSessionHint(null); afterward?.(); if (restart) window.location.reload(); })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Uscita non riuscita. Riprova.')).finally(() => setBusy(false));
    },
  };
}
