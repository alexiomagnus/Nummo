import assert from 'node:assert/strict';
import test from 'node:test';
import { base64url, encryptPayload, fromBase64url, generateVapidKeys, sendPush, vapidAuthorization } from '../push-service/webPush.ts';

// RFC 8291, Appendix A.
test('web push: cifratura identica al vettore di prova RFC 8291', async () => {
  const body = await encryptPayload(
    { endpoint: 'https://push.example.net/x', p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
    new TextEncoder().encode('When I grow up, I want to be a watermelon'),
    { senderPrivate: fromBase64url('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'),
      senderPublic: fromBase64url('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'), salt: fromBase64url('DGv6ra1nlYgDCS1FRnbzlw') });
  assert.equal(base64url(body), 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
});

test('web push: firma VAPID ES256 verificabile con la chiave pubblica, pubblico = origine del servizio', async () => {
  const keys = await generateVapidKeys();
  const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', { ...keys, subject: 'https://nummo.example' }, Date.UTC(2026, 10, 14));
  const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
  assert.ok(match);
  const claims = JSON.parse(new TextDecoder().decode(fromBase64url(match[2]!)));
  assert.deepEqual(claims, { aud: 'https://fcm.googleapis.com', exp: Date.UTC(2026, 10, 14) / 1000 + 43200, sub: 'https://nummo.example' });
  assert.equal(match[4], keys.publicKey);
  const publicKey = await crypto.subtle.importKey('raw', fromBase64url(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64url(match[3]!), new TextEncoder().encode(`${match[1]}.${match[2]}`)));
});

test('web push: il messaggio cifrato si decifra con le chiavi del dispositivo; 410 = sottoscrizione da dimenticare', async () => {
  // A simulated device: its own key pair and auth secret, decrypting as a browser would (RFC 8291 receiver side).
  const ecdh = { name: 'ECDH', namedCurve: 'P-256' } as const;
  const device = await crypto.subtle.generateKey(ecdh, true, ['deriveBits']) as CryptoKeyPair;
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', device.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const subscription = { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/x', p256dh: base64url(uaPublic), auth: base64url(auth) };
  const vapid = { ...(await generateVapidKeys()), subject: 'https://nummo.example' };
  let captured: { body: Uint8Array<ArrayBuffer>; headers: Record<string, string> } | null = null;
  const result = await sendPush(subscription, { kind: 'test' }, vapid, { ttlSeconds: 60, topic: 'test' }, (async (_url: string, init: RequestInit) => {
    captured = { body: init.body as Uint8Array<ArrayBuffer>, headers: init.headers as Record<string, string> };
    return new Response(null, { status: 201 });
  }) as typeof fetch);
  assert.equal(result, 'sent');
  const { body, headers } = captured!;
  assert.equal(headers['Content-Encoding'], 'aes128gcm');
  assert.equal(headers.TTL, '60');
  const salt = body.slice(0, 16); const idlen = body[20]!; const senderPublic = body.slice(21, 21 + idlen); const ciphertext = body.slice(21 + idlen);
  const sender = await crypto.subtle.importKey('raw', senderPublic, ecdh, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: sender }, device.privateKey, 256));
  const derive = async (s: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, n: number) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const te = new TextEncoder();
  const info = new Uint8Array([...te.encode('WebPush: info\0'), ...uaPublic, ...senderPublic]);
  const ikm = await derive(auth, shared, info, 32);
  const cek = await crypto.subtle.importKey('raw', await derive(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: await derive(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12) }, cek, ciphertext));
  assert.equal(plain.at(-1), 2);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(plain.slice(0, -1))), { kind: 'test' });
  const gone = await sendPush(subscription, {}, vapid, { ttlSeconds: 60, topic: 't' }, (async () => new Response(null, { status: 410 })) as unknown as typeof fetch);
  assert.equal(gone, 'gone');
});
