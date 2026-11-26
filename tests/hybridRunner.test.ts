import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hybridEnvironment, lockConflictMessage, promoteArchive, validateArchive } from '../scripts/hybridRunner.ts';

const publicEnv: NodeJS.ProcessEnv = { NODE_ENV: 'development', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-hybrid-unit', EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-hybrid-unit.firebaseapp.com', EXPO_PUBLIC_FIREBASE_APP_ID: 'demo-app' };
function archive(path: string, value: string) {
  mkdirSync(join(path, 'firestore_export'), { recursive: true });
  writeFileSync(join(path, 'firebase-export-metadata.json'), JSON.stringify({ version: 'test', firestore: { metadata_file: 'firestore_export/data' } }));
  writeFileSync(join(path, 'firestore_export/data'), value);
}

test('hybrid: congela ambiente sviluppo per Expo/emulatore, senza leggere la produzione', () => {
  const root = mkdtempSync(join(tmpdir(), 'nummo-env-test-'));
  try {
    writeFileSync(join(root, '.env.local'), 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-from-local\n');
    writeFileSync(join(root, '.env.production.local'), 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=real-production\n');
    const env = hybridEnvironment(root, publicEnv);
    assert.equal(env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 'demo-from-local');
    assert.equal(env.EXPO_PUBLIC_NUMMO_BACKEND, 'hybrid');
    assert.equal(env.EXPO_NO_DOTENV, '1');
    assert.equal(env.EXPO_PUBLIC_FIRESTORE_EMULATOR, '127.0.0.1:8180');
    assert.throws(() => hybridEnvironment(root, { ...publicEnv, EXPO_PUBLIC_AUTH_EMULATOR: 'localhost:9099' }), /Auth reale/);
    writeFileSync(join(root, '.env.local'), 'EXPO_PUBLIC_NUMMO_BACKEND=cloud\n');
    assert.throws(() => hybridEnvironment(root, publicEnv), /rimuovi/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('hybrid: un archivio danneggiato non viene trattato come primo avvio vuoto', () => {
  const root = mkdtempSync(join(tmpdir(), 'nummo-archive-test-'));
  try {
    assert.equal(validateArchive(join(root, 'absent')), false);
    writeFileSync(join(root, 'unknown-data'), 'originale');
    assert.throws(() => validateArchive(root), /Originali conservati/);
    assert.equal(readFileSync(join(root, 'unknown-data'), 'utf8'), 'originale');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('hybrid: promuove solo export completi e conserva la versione precedente', () => {
  const root = mkdtempSync(join(tmpdir(), 'nummo-promote-test-'));
  const data = join(root, 'data'), stage = join(root, 'stage'), backup = join(root, 'previous');
  try {
    archive(data, 'vecchio');
    mkdirSync(stage);
    assert.throws(() => promoteArchive(data, stage, backup), /Export assente/);
    assert.equal(readFileSync(join(data, 'firestore_export/data'), 'utf8'), 'vecchio');
    assert.equal(existsSync(backup), false);
    archive(stage, 'nuovo');
    promoteArchive(data, stage, backup);
    assert.equal(readFileSync(join(data, 'firestore_export/data'), 'utf8'), 'nuovo');
    assert.equal(readFileSync(join(backup, 'firestore_export/data'), 'utf8'), 'vecchio');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('hybrid: metadati fuori dalla cartella export sono rifiutati', () => {
  const root = mkdtempSync(join(tmpdir(), 'nummo-containment-test-'));
  try {
    const stage = join(root, 'stage');
    mkdirSync(stage);
    writeFileSync(join(root, 'outside'), 'test');
    for (const file of ['../outside', join(root, 'outside'), '.']) {
      writeFileSync(join(stage, 'firebase-export-metadata.json'), JSON.stringify({ firestore: { metadata_file: file } }));
      assert.throws(() => validateArchive(stage), /Originali conservati/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('hybrid: il lock dice se la sessione è viva e quale cartella controllare', () => {
  const lock = JSON.stringify({ pid: 4242, project: 'demo-x', session: '/r/.firebase/hybrid-AbC', started: '2026-11-25T13:20:00.000Z' });
  const live = lockConflictMessage('/r/.firebase/hybrid.lock', lock, () => true);
  assert.match(live, /in corso \(PID 4242, avviata 2026-11-25T13:20:00.000Z\)/);
  assert.doesNotMatch(live, /rimuovi il lock/);
  const dead = lockConflictMessage('/r/.firebase/hybrid.lock', lock, () => false);
  assert.match(dead, /non è più attiva/);
  assert.match(dead, /Controlla \/r\/\.firebase\/hybrid-AbC/);
  // Locks from before the session folder was recorded, and unreadable ones.
  assert.match(lockConflictMessage('/l', JSON.stringify({ pid: 10069, project: 'p' }), () => false), /PID 10069\).*cartella non registrata/);
  assert.match(lockConflictMessage('/l', 'not json', () => true), /PID sconosciuto/);
});
