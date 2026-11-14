import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUNDLE_FORBIDDEN, cloudEnvProblems, conflictProblems, devFileProblems } from '../scripts/envPolicy.ts';

const cloud = {
  EXPO_PUBLIC_NUMMO_BACKEND: 'cloud', EXPO_PUBLIC_FIREBASE_API_KEY: 'k', EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'p.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'p', EXPO_PUBLIC_FIREBASE_APP_ID: 'a',
};

test('build cloud: configurazione valida, e ogni miscela è respinta', () => {
  assert.deepEqual(cloudEnvProblems(cloud), []);
  assert.deepEqual(cloudEnvProblems({ ...cloud, EXPO_PUBLIC_FIRESTORE_CACHE: 'persistent' }), []);
  const rejected: Record<string, Record<string, string | undefined>> = {
    'backend assente': { EXPO_PUBLIC_NUMMO_BACKEND: undefined },
    'backend hybrid': { EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid' },
    'backend emulator': { EXPO_PUBLIC_NUMMO_BACKEND: 'emulator' },
    'chiave mancante': { EXPO_PUBLIC_FIREBASE_API_KEY: ' ' },
    'emulatore Firestore': { EXPO_PUBLIC_FIRESTORE_EMULATOR: '127.0.0.1:8180' },
    'emulatore Auth': { EXPO_PUBLIC_AUTH_EMULATOR: '127.0.0.1:9099' },
    'functions': { EXPO_PUBLIC_FUNCTIONS_EMULATOR: 'x:1' },
    'progetto demo': { EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-nummo' },
    'dominio locale': { EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost' },
    'cache non valida': { EXPO_PUBLIC_FIRESTORE_CACHE: 'memory' },
    // Il backup su Google Drive è stato rimosso: la variabile del vecchio client OAuth non è più ammessa.
    'client Google del backup Drive rimosso': { EXPO_PUBLIC_GOOGLE_CLIENT_ID: '1234-abc.apps.googleusercontent.com' },
  };
  for (const [label, change] of Object.entries(rejected)) assert.ok(cloudEnvProblems({ ...cloud, ...change }).length > 0, label);
});

test('sviluppo: i file .env non possono scegliere backend o emulatori; i problemi non mostrano valori', () => {
  assert.deepEqual(devFileProblems('.env.local', { EXPO_PUBLIC_FIREBASE_API_KEY: 'k' }), []);
  const problems = devFileProblems('.env.local', { EXPO_PUBLIC_NUMMO_BACKEND: 'cloud', EXPO_PUBLIC_FIRESTORE_EMULATOR: 'secret-host:1', EXPO_PUBLIC_AUTH_EMULATOR: 'x:2' });
  assert.equal(problems.length, 3);
  assert.ok(problems.every((line) => !line.includes('secret-host')));
});

test('scansione del bundle: riconosce endpoint locali e chiavi demo', () => {
  const hit = (text: string) => BUNDLE_FORBIDDEN.some(({ pattern }) => new RegExp(pattern.source).test(text));
  assert.ok(hit('connect("127.0.0.1:8180")'));
  assert.ok(hit('http://localhost:9099'));
  assert.ok(!hit('https://p.firebaseapp.com'));
});

test('build cloud: file di produzione e shell non possono contraddirsi', () => {
  assert.deepEqual(conflictProblems({ A: '1', B: '2' }, { A: '1', C: '3' }), []);
  const problems = conflictProblems({ EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'secret-a' }, { EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'secret-b' });
  assert.equal(problems.length, 1);
  assert.ok(!problems[0]!.includes('secret'));
});
