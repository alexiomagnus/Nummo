import { fromBase64Url, toBase64Url, userVerified } from '../domain/appLock';

// The device's own screen lock (fingerprint, face, PIN) through WebAuthn with the platform authenticator. No server:
// the browser itself checks the user, and the flags of its answer say whether it did (`userVerified`). The signature is
// not verified, since there is no secret here to protect it with (see `domain/appLock.ts`: a screen, not encryption).

export type LockOutcome = 'ok' | 'cancelled' | 'unavailable' | 'error';

const timeout = 60_000;

export async function platformLockAvailable(): Promise<boolean> {
  try {
    const api = globalThis.PublicKeyCredential;
    return !!api && !!navigator.credentials && await api.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)));
}

function outcomeOf(reason: unknown): LockOutcome {
  const name = reason instanceof DOMException || reason instanceof Error ? reason.name : '';
  // Dismissed, timed out, or the page lost the focus: Chrome and Safari do not tell them apart.
  if (name === 'NotAllowedError' || name === 'AbortError') return 'cancelled';
  // No authenticator, an address WebAuthn refuses (an IP address), an insecure page.
  if (name === 'NotSupportedError' || name === 'SecurityError' || name === 'InvalidStateError') return 'unavailable';
  return 'error';
}

// Creates the credential that the lock will ask for; the device verifies the user while creating it. Turning the lock on
// again first tries the previous credential (`AppLockCard`), so the device's passkey list does not fill up.
export async function createLockCredential(name: string): Promise<{ outcome: 'ok'; credentialId: string } | { outcome: Exclude<LockOutcome, 'ok'> }> {
  try {
    const credential = await navigator.credentials.create({ publicKey: {
      rp: { name: 'Nummo' },
      user: { id: random(16), name, displayName: name },
      challenge: random(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout,
    } });
    if (!(credential instanceof PublicKeyCredential)) return { outcome: 'error' };
    return { outcome: 'ok', credentialId: toBase64Url(new Uint8Array(credential.rawId)) };
  } catch (reason) {
    const outcome = outcomeOf(reason);
    return { outcome: outcome === 'ok' ? 'error' : outcome };
  }
}

// Asks the device to verify the user with the credential of the lock.
export async function verifyLockCredential(credentialId: string, signal?: AbortSignal): Promise<LockOutcome> {
  try {
    const credential = await navigator.credentials.get({ signal, publicKey: {
      challenge: random(32),
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId), transports: ['internal'] }],
      userVerification: 'required',
      timeout,
    } });
    if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAssertionResponse)) return 'error';
    if (toBase64Url(new Uint8Array(credential.rawId)) !== credentialId) return 'error';
    return userVerified(new Uint8Array(credential.response.authenticatorData)) ? 'ok' : 'error';
  } catch (reason) { return outcomeOf(reason); }
}
