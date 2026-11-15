import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkFirebaseConfig, customFirebaseKey, parseFirebaseConfig, readCustomFirebase, sameFirebaseProject, writeCustomFirebase,
} from '../src/services/customFirebase.ts';
import { english } from '../src/i18n/en.ts';

const config = { apiKey: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q', authDomain: 'mio-nummo.firebaseapp.com', projectId: 'mio-nummo', appId: '1:123456789012:web:0a1b2c3d4e5f6a7b' };
const snippet = `// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "${config.apiKey}",
  authDomain: "${config.authDomain}",
  projectId: "${config.projectId}",
  storageBucket: "mio-nummo.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "${config.appId}",
  measurementId: "G-ABCDEF1234"
};
const app = initializeApp(firebaseConfig);`;

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); }, data };
};

test('configurazione incollata: snippet della Console, JSON e virgolette semplici; altre chiavi ignorate', () => {
  assert.deepEqual(parseFirebaseConfig(snippet, 'cloud'), { config });
  assert.deepEqual(parseFirebaseConfig(JSON.stringify({ ...config, storageBucket: 'x' }), 'cloud'), { config });
  const single = `{ 'apiKey': '${config.apiKey}', 'authDomain': '${config.authDomain}', 'projectId': '${config.projectId}', 'appId': '${config.appId}' }`;
  assert.deepEqual(parseFirebaseConfig(single, 'cloud'), { config });
});

test('configurazione incollata: errori comprensibili, mai valori grezzi', () => {
  assert.deepEqual(parseFirebaseConfig('ciao', 'cloud'), { error: 'Configurazione non riconosciuta: incolla il blocco firebaseConfig del tuo progetto.' });
  assert.deepEqual(parseFirebaseConfig(`apiKey: "${config.apiKey}", projectId: "${config.projectId}"`, 'cloud'),
    { error: 'Mancano nella configurazione: {p0}.', fields: 'authDomain, appId' });
  assert.deepEqual(parseFirebaseConfig(snippet.replace(config.appId, 'app'), 'cloud'), { error: 'Valori non validi nella configurazione: {p0}.', fields: 'appId' });
  assert.deepEqual(parseFirebaseConfig(snippet.replace(config.authDomain, 'https://x.y/'), 'cloud'), { error: 'Valori non validi nella configurazione: {p0}.', fields: 'authDomain' });
  assert.ok('error' in parseFirebaseConfig('x'.repeat(4001), 'cloud'));
  // Real projects in cloud builds, `demo-` projects only with the emulators.
  const demo = { ...config, projectId: 'demo-mio', authDomain: 'demo-mio.firebaseapp.com' };
  assert.ok('error' in checkFirebaseConfig(demo, 'cloud'));
  assert.deepEqual(checkFirebaseConfig(demo, 'demo'), { config: demo });
  assert.ok('error' in checkFirebaseConfig(config, 'demo'));
  for (const message of ['Configurazione non riconosciuta: incolla il blocco firebaseConfig del tuo progetto.', 'Mancano nella configurazione: {p0}.',
    'Valori non validi nella configurazione: {p0}.', 'I progetti demo- funzionano solo con gli emulatori locali.',
    'Nella demo locale si possono collegare solo progetti demo-.', 'Testo troppo lungo: incolla solo la configurazione del progetto.',
    'Il browser non permette di salvare la configurazione (dati dei siti bloccati?).', 'Questo progetto è già collegato.',
    'Copia non riuscita: apri il file e copialo a mano.', 'Copiato.']) {
    assert.ok(Object.hasOwn(english, message), message);
  }
});

test('configurazione salvata: solo le quattro chiavi valide, altrimenti si usa il progetto del sito', () => {
  const storage = memory();
  assert.equal(readCustomFirebase('cloud', storage), null);
  assert.equal(writeCustomFirebase(config, storage), true);
  assert.deepEqual(JSON.parse(storage.data.get(customFirebaseKey)!), config);
  assert.deepEqual(readCustomFirebase('cloud', storage), config);
  assert.equal(readCustomFirebase('demo', storage), null);
  for (const raw of ['{', '[]', 'null', JSON.stringify({ ...config, extra: 1 }), JSON.stringify({ ...config, projectId: 'X' })]) {
    storage.setItem(customFirebaseKey, raw);
    assert.equal(readCustomFirebase('cloud', storage), null, raw);
  }
  writeCustomFirebase(null, storage);
  assert.equal(storage.data.has(customFirebaseKey), false);
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => {} };
  assert.equal(readCustomFirebase('cloud', denied), null);
  assert.equal(writeCustomFirebase(config, denied), false);
  assert.equal(sameFirebaseProject(config, { ...config }), true);
  assert.equal(sameFirebaseProject(config, { ...config, appId: '1:1:web:ff' }), false);
});

test('regole offerte da copiare: copia statica identica a firestore.rules', () => {
  assert.equal(readFileSync('public/firestore.rules', 'utf8'), readFileSync('firestore.rules', 'utf8'));
});
