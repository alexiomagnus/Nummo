// App lock (22 November, on request): fingerprint, face or the device PIN through the browser's platform authenticator
// (WebAuthn, `services/platformLock.ts`). A screen over the app, not encryption: the data stays readable to whoever
// controls the browser profile; the lock keeps them off the screen. Settings live in this browser only
// (`nummo.appLock.v1`): never in the archive, in a backup or sent anywhere. Pure: no browser API here.

export const appLockKey = 'nummo.appLock.v1';

// Seconds away from the app (hidden) after which it locks again on return; 0 locks as soon as it is hidden.
export const lockDelays = [0, 60, 300, 900] as const;
export type LockDelay = (typeof lockDelays)[number];
export const defaultLockDelay: LockDelay = 60;

// PIN that turns the lock off from the lock screen in the Standard mode (22 November, on request: there is no account
// to sign in again with). Six digits, kept only as a salted PBKDF2-SHA-256 hash: a deterrent like the lock itself
// (six digits are few for whoever controls the browser profile and can try them offline).
export const pinLength = 6;
export type LockPin = Readonly<{ salt: string; hash: string }>;
export const isPin = (value: string) => new RegExp(`^\\d{${pinLength}}$`).test(value);
// What a PIN field accepts while typing: digits only, at most six.
export const pinInput = (value: string) => value.replace(/\D/g, '').slice(0, pinLength);
export const pinIterations = 200_000;

// `credentialId`: base64url of the credential created when the lock was turned on (not a secret: it only names it).
// `pin`: null when none was set (locks turned on before 22 November, or in the Advanced mode).
export type AppLockSettings = Readonly<{ enabled: boolean; credentialId: string | null; delay: LockDelay; pin: LockPin | null }>;
export const defaultAppLock: AppLockSettings = Object.freeze({ enabled: false, credentialId: null, delay: defaultLockDelay, pin: null });

const idPattern = /^[A-Za-z0-9_-]{16,1366}$/;
const saltPattern = /^[A-Za-z0-9_-]{22}$/;
const hashPattern = /^[A-Za-z0-9_-]{43}$/;

function parsePin(value: unknown): LockPin | null {
  if (typeof value !== 'object' || value === null) return null;
  const { salt, hash } = value as Record<string, unknown>;
  return typeof salt === 'string' && saltPattern.test(salt) && typeof hash === 'string' && hashPattern.test(hash) ? { salt, hash } : null;
}

// On only with a credential to ask for: a damaged value never leaves the app locked with nothing to unlock it.
export function parseAppLock(raw: string | null): AppLockSettings {
  if (!raw) return defaultAppLock;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return defaultAppLock; }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return defaultAppLock;
  const record = value as Record<string, unknown>;
  const credentialId = typeof record.credentialId === 'string' && idPattern.test(record.credentialId) ? record.credentialId : null;
  const delay = (lockDelays as readonly unknown[]).includes(record.delay) ? record.delay as LockDelay : defaultLockDelay;
  return { enabled: record.enabled === true && credentialId !== null, credentialId, delay, pin: parsePin(record.pin) };
}

// Locks again on return when the app stayed hidden at least the chosen delay (clock moved back: locks, to be safe).
export function lockOnReturn(hiddenAt: number | null, now: number, delay: LockDelay): boolean {
  if (hiddenAt === null) return false;
  const away = now - hiddenAt;
  return away < 0 || away >= delay * 1000;
}

export function toBase64Url(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const text = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  for (let index = 0; index < text.length; index++) bytes[index] = text.charCodeAt(index);
  return bytes;
}

// Authenticator data (WebAuthn §6.1): 32 bytes of RP ID hash, then the flags byte. UP (0x01) the user was present, UV
// (0x04) the user was verified (fingerprint, face, PIN). Unlocking needs both.
export function userVerified(authenticatorData: Uint8Array): boolean {
  const flags = authenticatorData[32];
  return flags !== undefined && (flags & 0x01) !== 0 && (flags & 0x04) !== 0;
}

// WebCrypto only (browser and Node alike). Salt: 16 random bytes; hash: 32 bytes; both base64url.
export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64Url(salt), iterations: pinIterations }, key, 256);
  return toBase64Url(new Uint8Array(bits));
}

export async function createPin(pin: string): Promise<LockPin> {
  if (!isPin(pin)) throw new Error('PIN non valido.');
  const salt = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await hashPin(pin, salt) };
}

export async function pinMatches(pin: string, saved: LockPin): Promise<boolean> {
  if (!isPin(pin)) return false;
  const hash = await hashPin(pin, saved.salt);
  let diff = hash.length ^ saved.hash.length;
  for (let index = 0; index < hash.length && index < saved.hash.length; index++) diff |= hash.charCodeAt(index) ^ saved.hash.charCodeAt(index);
  return diff === 0;
}
