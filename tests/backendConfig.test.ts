import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEndpoint } from '../src/services/backendConfig.ts';

test('indirizzo dell’emulatore Firestore: host:porta, altrimenti nessuno', () => {
  assert.deepEqual(parseEndpoint('127.0.0.1:5001'), { host: '127.0.0.1', port: 5001 });
  assert.deepEqual(parseEndpoint('localhost:6001'), { host: 'localhost', port: 6001 });
  for (const value of [undefined, '', '127.0.0.1', 'http://127.0.0.1:5001', '127.0.0.1:porta', 'localhost:0', 'localhost:65536']) {
    assert.equal(parseEndpoint(value), null, String(value));
  }
});

test('BYOF: due progetti configurabili senza cambiare sorgenti; demo indipendente dalla configurazione reale', async () => {
  const moduleUrl = new URL('../src/services/backendConfig.ts', import.meta.url).href;
  let sequence = 0;
  const inspect = async (extra: Record<string, string>) => {
    const saved = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('EXPO_PUBLIC_')));
    for (const key of Object.keys(saved)) delete process.env[key];
    Object.assign(process.env, extra);
    try {
      const c = await import(`${moduleUrl}?config-test=${++sequence}`);
      return { config: c.firebaseWebConfig, missing: c.missingFirebaseConfig, emulator: c.firestoreEmulator };
    } finally {
      for (const key of Object.keys(process.env)) if (key.startsWith('EXPO_PUBLIC_')) delete process.env[key];
      Object.assign(process.env, saved);
    }
  };
  for (const projectId of ['my-first-project', 'my-second-project']) {
    const result = await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'firebase', EXPO_PUBLIC_FIREBASE_API_KEY: 'public-key', EXPO_PUBLIC_FIREBASE_APP_ID: 'public-app', EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com` });
    assert.equal(result.config.projectId, projectId);
    assert.deepEqual(result.missing, []);
    assert.equal(result.emulator, null);
  }
  const demo = await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'emulator', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'not-demo' });
  assert.equal(demo.config.projectId, 'demo-nummo');
  assert.deepEqual(demo.missing, []);
  assert.ok((await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'firebase' })).missing.length > 0);
  assert.ok((await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'firebase', EXPO_PUBLIC_FUNCTIONS_EMULATOR: 'localhost:5001' })).missing.some((s: string) => s.includes('Sostituisci')));
  assert.ok((await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'firebase', EXPO_PUBLIC_FIRESTORE_EMULATOR: 'broken' })).missing.some((s: string) => s.includes('non valido')));
});
