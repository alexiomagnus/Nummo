import assert from 'node:assert/strict';
import test from 'node:test';
import { createPin, defaultAppLock, fromBase64Url, isPin, lockOnReturn, parseAppLock, pinInput, pinMatches, toBase64Url, userVerified } from '../src/domain/appLock.ts';

const id = 'AbCdEfGhIjKlMnOpQrStUv_-0123';

test('blocco: impostazioni assenti, corrotte o senza credenziale → spento', () => {
  assert.deepEqual(parseAppLock(null), defaultAppLock);
  assert.deepEqual(parseAppLock('{non json'), defaultAppLock);
  assert.deepEqual(parseAppLock('[true]'), defaultAppLock);
  // On without a credential would lock the app with nothing to unlock it.
  assert.equal(parseAppLock(JSON.stringify({ enabled: true })).enabled, false);
  assert.equal(parseAppLock(JSON.stringify({ enabled: true, credentialId: 'corto' })).enabled, false);
  assert.equal(parseAppLock(JSON.stringify({ enabled: true, credentialId: 'non/base64url+' + 'x'.repeat(20) })).enabled, false);
  assert.equal(parseAppLock(JSON.stringify({ enabled: 'true', credentialId: id })).enabled, false);
});

test('blocco: impostazioni valide lette; ritardo sconosciuto → 1 minuto', () => {
  assert.deepEqual(parseAppLock(JSON.stringify({ enabled: true, credentialId: id, delay: 300 })), { enabled: true, credentialId: id, delay: 300, pin: null });
  assert.deepEqual(parseAppLock(JSON.stringify({ enabled: false, credentialId: id, delay: 0 })), { enabled: false, credentialId: id, delay: 0, pin: null });
  assert.equal(parseAppLock(JSON.stringify({ enabled: true, credentialId: id, delay: 42 })).delay, 60);
});

test('blocco: al ritorno solo dopo il ritardo scelto; orologio all’indietro blocca', () => {
  assert.equal(lockOnReturn(null, 1_000_000, 60), false);
  assert.equal(lockOnReturn(1_000_000, 1_059_999, 60), false);
  assert.equal(lockOnReturn(1_000_000, 1_060_000, 60), true);
  assert.equal(lockOnReturn(1_000_000, 1_000_001, 0), true);
  assert.equal(lockOnReturn(1_000_000, 1_000_000 + 899_000, 900), false);
  assert.equal(lockOnReturn(1_000_000, 999_000, 300), true);
});

test('blocco: base64url andata e ritorno, senza + / =', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 62, 63]);
  const text = toBase64Url(bytes);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual([...fromBase64Url(text)], [...bytes]);
  for (let length = 0; length < 6; length++) {
    const sample = new Uint8Array(length).map((_, index) => index * 37 + 200);
    assert.deepEqual([...fromBase64Url(toBase64Url(sample))], [...sample]);
  }
});

test('blocco: sblocca solo con utente presente e verificato (flag UP e UV)', () => {
  const data = (flags: number) => { const bytes = new Uint8Array(37); bytes[32] = flags; return bytes; };
  assert.equal(userVerified(data(0x05)), true);
  assert.equal(userVerified(data(0x45)), true);
  assert.equal(userVerified(data(0x01)), false); // presence only, no fingerprint/face/PIN
  assert.equal(userVerified(data(0x04)), false);
  assert.equal(userVerified(new Uint8Array(32)), false);
});

test('PIN del blocco: sei cifre, solo hash con sale, verifica e valori salvati validati', async () => {
  assert.equal(isPin('123456'), true);
  for (const bad of ['12345', '1234567', '12345a', ' 123456', '']) assert.equal(isPin(bad), false);
  assert.equal(pinInput('12-34 5x678'), '123456');
  const pin = await createPin('482913');
  assert.ok(!JSON.stringify(pin).includes('482913'), 'mai il PIN in chiaro');
  assert.equal(await pinMatches('482913', pin), true);
  assert.equal(await pinMatches('482914', pin), false);
  assert.equal(await pinMatches('48291', pin), false);
  // Same PIN, new salt: a different hash.
  assert.notEqual((await createPin('482913')).hash, pin.hash);
  await assert.rejects(createPin('1234'), /PIN non valido/);
  const saved = parseAppLock(JSON.stringify({ enabled: true, credentialId: id, delay: 60, pin }));
  assert.deepEqual(saved.pin, pin);
  // A damaged PIN is dropped (the lock screen falls back to the confirmation), the lock stays on.
  const damaged = parseAppLock(JSON.stringify({ enabled: true, credentialId: id, delay: 60, pin: { salt: 'x', hash: pin.hash } }));
  assert.equal(damaged.pin, null);
  assert.equal(damaged.enabled, true);
});
