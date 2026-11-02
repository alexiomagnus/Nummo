import { useEffect, useState } from 'react';
import { errorCode, signInWithGoogle, signOutUser, watchSession, type SessionUser } from '../../services/firebase';

export type Session =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signed-out'; error: string | null; signIn: () => void }
  | { status: 'signed-in'; user: SessionUser; signOut: () => void };

const signInMessages: Record<string, string> = {
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di accesso: consentila e riprova.',
  'auth/unauthorized-domain': 'Questo indirizzo non è tra i domini autorizzati del progetto Firebase.',
  'auth/operation-not-allowed': 'L’accesso con Google non è abilitato nel progetto Firebase.',
  'auth/network-request-failed': 'Connessione assente: accesso non riuscito.',
  'auth/invalid-api-key': 'Configurazione Firebase non valida (apiKey).',
};

// `enabled` is fixed at build time (backend mode), so the hook order never changes.
export function useSession(enabled: boolean): Session {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => (enabled ? watchSession(setUser) : undefined), [enabled]);

  if (!enabled) return { status: 'disabled' };
  if (user === undefined) return { status: 'loading' };
  if (user === null) {
    return {
      status: 'signed-out', error,
      signIn: () => {
        setError(null);
        signInWithGoogle().catch((reason: unknown) => {
          const code = errorCode(reason);
          if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
          setError(signInMessages[code] ?? 'Accesso non riuscito. Riprova.');
        });
      },
    };
  }
  return {
    status: 'signed-in', user,
    signOut: () => { signOutUser().catch(() => setError('Uscita non riuscita. Riprova.')); },
  };
}
