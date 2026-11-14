import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureProtection, protectionKey, readProtection, retryDays, type KeyValueStore, type StorageManagerLike } from '../src/services/storageProtection.ts';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
};
const manager = (persisted: boolean, answer: boolean | Error) => {
  const calls = { persisted: 0, persist: 0 };
  const api: StorageManagerLike = {
    persisted: async () => { calls.persisted++; return persisted; },
    persist: async () => { calls.persist++; if (answer instanceof Error) throw answer; return answer; },
  };
  return { api, calls };
};

test('protezione: browser incompatibile o API in errore = non disponibile, senza richieste', async () => {
  assert.equal(await readProtection(undefined), 'unavailable');
  assert.equal(await readProtection({}), 'unavailable');
  assert.equal(await readProtection({ persisted: async () => true }), 'unavailable', 'senza persist non si può chiedere');
  assert.equal(await readProtection({ persisted: async () => { throw new Error('x'); }, persist: async () => true }), 'unavailable');
  const store = memory();
  assert.equal(await ensureProtection(undefined, store), 'unavailable');
  assert.equal(store.data.size, 0);
});

test('protezione: già concessa non chiede nulla', async () => {
  const { api, calls } = manager(true, true);
  const store = memory();
  assert.equal(await ensureProtection(api, store), 'protected');
  assert.equal(calls.persist, 0);
  assert.equal(store.data.size, 0);
});

test('protezione: una richiesta, registrata prima di chiedere, ripetuta solo dopo il periodo di attesa', async () => {
  const store = memory();
  const now = new Date('2026-11-14T10:00:00.000Z');
  const refused = manager(false, false);
  assert.equal(await ensureProtection(refused.api, store, now), 'unprotected');
  assert.equal(refused.calls.persist, 1);
  assert.deepEqual(JSON.parse(store.data.get(protectionKey)!), { requestedAt: now.toISOString() });
  // Nessun nuovo tentativo per i prossimi giorni (niente richieste ripetute o invadenti).
  assert.equal(await ensureProtection(refused.api, store, new Date('2026-11-20T10:00:00.000Z')), 'unprotected');
  assert.equal(refused.calls.persist, 1);
  const later = new Date(now.getTime() + retryDays * 86_400_000);
  const granted = manager(false, true);
  assert.equal(await ensureProtection(granted.api, store, later), 'protected');
  assert.equal(granted.calls.persist, 1);
  // Un orologio tornato indietro non blocca per sempre i tentativi.
  store.setItem(protectionKey, JSON.stringify({ requestedAt: '2030-01-01T00:00:00.000Z' }));
  const again = manager(false, true);
  assert.equal(await ensureProtection(again.api, store, now), 'protected');
});

test('protezione: errori della richiesta o della memoria del browser non interrompono l’app', async () => {
  const failing = manager(false, new Error('denied'));
  const store = memory();
  assert.equal(await ensureProtection(failing.api, store), 'unprotected');
  assert.ok(store.data.has(protectionKey), 'il tentativo fallito conta comunque');
  const broken: KeyValueStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  const granted = manager(false, true);
  assert.equal(await ensureProtection(granted.api, broken), 'protected');
  const corrupted = memory();
  corrupted.setItem(protectionKey, '{rotto');
  const retry = manager(false, false);
  assert.equal(await ensureProtection(retry.api, corrupted), 'unprotected');
  assert.equal(retry.calls.persist, 1);
});
