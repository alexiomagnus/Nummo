// Single-user register: only the configured UID, signed in with Google, may read or write.
export type CallerAuth = { uid: string; token: { firebase?: { sign_in_provider?: string } } } | undefined;

export function authorize(auth: CallerAuth, allowedUid: string): 'ok' | 'unauthenticated' | 'permission-denied' {
  if (!auth) return 'unauthenticated';
  if (!allowedUid || auth.uid !== allowedUid || auth.token.firebase?.sign_in_provider !== 'google.com') {
    return 'permission-denied';
  }
  return 'ok';
}
