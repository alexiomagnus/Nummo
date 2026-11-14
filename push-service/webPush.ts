// Web Push sending with WebCrypto only (no dependency): message encryption (RFC 8291, `aes128gcm` of RFC 8188) and
// VAPID authentication (RFC 8292). Runs unchanged in Node 22+, Deno and Cloudflare Workers.

export type PushSubscriptionKeys = Readonly<{ endpoint: string; p256dh: string; auth: string }>;
export type VapidKeys = Readonly<{ publicKey: string; privateKey: string; subject: string }>;

const encoder = new TextEncoder();
export const base64url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const fromBase64url = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};

// An uncompressed P-256 point (0x04 || x || y) and, optionally, its private scalar, as a WebCrypto key.
function jwk(publicRaw: Uint8Array, privateRaw?: Uint8Array): JsonWebKey {
  if (publicRaw.length !== 65 || publicRaw[0] !== 4) throw new Error('Chiave pubblica P-256 non valida');
  return { kty: 'EC', crv: 'P-256', x: base64url(publicRaw.slice(1, 33)), y: base64url(publicRaw.slice(33, 65)), ...(privateRaw ? { d: base64url(privateRaw) } : {}), ext: true };
}
const hkdf = async (salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), length * 8));

// Encrypts one push message for one subscription. `sender` and `salt` exist only for the RFC test vector: a fresh
// key pair and salt are generated for every message otherwise.
export async function encryptPayload(subscription: PushSubscriptionKeys, plaintext: Uint8Array,
  test?: { senderPrivate: Uint8Array; senderPublic: Uint8Array; salt: Uint8Array }): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = fromBase64url(subscription.p256dh);
  const authSecret = fromBase64url(subscription.auth);
  const ecdh = { name: 'ECDH', namedCurve: 'P-256' } as const;
  let senderPrivate: CryptoKey; let senderPublic: Uint8Array<ArrayBuffer>;
  if (test) {
    senderPrivate = await crypto.subtle.importKey('jwk', jwk(test.senderPublic, test.senderPrivate), ecdh, false, ['deriveBits']);
    senderPublic = new Uint8Array(test.senderPublic);
  } else {
    const pair = await crypto.subtle.generateKey(ecdh, true, ['deriveBits']) as CryptoKeyPair;
    senderPrivate = pair.privateKey;
    senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  }
  const salt = test ? new Uint8Array(test.salt) : crypto.getRandomValues(new Uint8Array(16));
  const receiver = await crypto.subtle.importKey('jwk', jwk(uaPublic), ecdh, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiver }, senderPrivate, 256));
  const ikm = await hkdf(authSecret, shared, concat(encoder.encode('WebPush: info\0'), uaPublic, senderPublic), 32);
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // One record: the plaintext followed by the 0x02 delimiter of the last record (no extra padding).
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(plaintext, Uint8Array.of(2))));
  const recordSize = 4096;
  const header = concat(salt, Uint8Array.of(recordSize >>> 24, (recordSize >>> 16) & 255, (recordSize >>> 8) & 255, recordSize & 255), Uint8Array.of(senderPublic.length), senderPublic);
  return concat(header, ciphertext);
}

// `Authorization` header value for one push service origin (valid 12 hours).
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const header = base64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64url(encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })));
  const key = await crypto.subtle.importKey('jwk', jwk(fromBase64url(vapid.publicKey), fromBase64url(vapid.privateKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto returns the raw r || s signature that JWS expects for ES256.
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${vapid.publicKey}`;
}

export type SendResult = 'sent' | 'gone' | 'failed';
// `topic` lets the push service replace a message of the same kind still waiting for an offline device (no pile-up).
export async function sendPush(subscription: PushSubscriptionKeys, payload: unknown, vapid: VapidKeys,
  options: { ttlSeconds: number; topic: string; urgency?: 'normal' | 'high' }, fetcher: typeof fetch = fetch): Promise<SendResult> {
  const body = await encryptPayload(subscription, encoder.encode(JSON.stringify(payload)));
  const response = await fetcher(subscription.endpoint, {
    method: 'POST', body,
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, vapid), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      TTL: String(options.ttlSeconds), Topic: options.topic, Urgency: options.urgency ?? 'normal',
    },
  });
  // 404/410: the subscription has expired or was revoked and must be forgotten.
  if (response.status === 404 || response.status === 410) return 'gone';
  return response.ok ? 'sent' : 'failed';
}

// A new VAPID key pair (public: raw point; private: scalar), both base64url.
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: base64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))), privateKey: privateJwk.d! };
}
