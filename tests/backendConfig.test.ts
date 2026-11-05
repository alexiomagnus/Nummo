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
  const real = (projectId: string) => ({ EXPO_PUBLIC_FIREBASE_API_KEY: 'public-key', EXPO_PUBLIC_FIREBASE_APP_ID: 'public-app', EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com` });
  for (const projectId of ['my-first-project', 'my-second-project']) {
    const result = await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'cloud', ...real(projectId) });
    assert.equal(result.config.projectId, projectId);
    assert.deepEqual(result.missing, []);
    assert.equal(result.emulator, null);
  }
  const hybrid = await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid', EXPO_PUBLIC_FIRESTORE_EMULATOR: '127.0.0.1:8180', ...real('mine') });
  assert.deepEqual(hybrid.missing, []);
  assert.deepEqual(hybrid.emulator, { host: '127.0.0.1', port: 8180 });
  const demo = await inspect({ EXPO_PUBLIC_NUMMO_BACKEND: 'emulator', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'not-demo' });
  assert.equal(demo.config.projectId, 'demo-nummo');
  assert.deepEqual(demo.missing, []);
  const bad = async (extra: Record<string, string>, text: string) =>
    assert.ok((await inspect(extra)).missing.some((s: string) => s.includes(text)), text);
  // No fallback: unknown/absent/legacy mode and mixed configurations are errors.
  await bad({ ...real('p') }, 'mancante');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'firebase', ...real('p') }, 'non è più valido');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'prod', ...real('p') }, 'non valido');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'cloud' }, 'EXPO_PUBLIC_FIREBASE_API_KEY');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'cloud', EXPO_PUBLIC_FIRESTORE_EMULATOR: '127.0.0.1:8180', ...real('p') }, 'non è ammesso con cloud');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'cloud', EXPO_PUBLIC_AUTH_EMULATOR: '127.0.0.1:9099', ...real('p') }, 'AUTH_EMULATOR');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid', ...real('p') }, 'per hybrid');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid', EXPO_PUBLIC_FIRESTORE_EMULATOR: 'broken', ...real('p') }, 'per hybrid');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid', EXPO_PUBLIC_FIRESTORE_EMULATOR: '127.0.0.1:8180', EXPO_PUBLIC_FUNCTIONS_EMULATOR: 'localhost:5001', ...real('p') }, 'FUNCTIONS_EMULATOR');
  await bad({ EXPO_PUBLIC_NUMMO_BACKEND: 'emulator', EXPO_PUBLIC_FIRESTORE_EMULATOR: 'broken' }, 'non valido');
});
