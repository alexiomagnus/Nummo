import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkHybridEndpoint } from '../scripts/hybridPreflight.ts';

test('hybrid: controlla endpoint predefinito e override prima di avviare Expo', async () => {
  const endpoints: unknown[] = [];
  const probe = async (endpoint: unknown) => { endpoints.push(endpoint); };
  await checkHybridEndpoint(undefined, probe);
  await checkHybridEndpoint('localhost:8280', probe);
  assert.deepEqual(endpoints, [{ host: '127.0.0.1', port: 8180 }, { host: 'localhost', port: 8280 }]);
});

test('hybrid: rifiuta endpoint invalidi o remoti senza contattarli', async () => {
  let calls = 0;
  for (const value of ['broken', 'localhost:0', 'https://localhost:8180', 'remote.example:8180']) {
    await assert.rejects(checkHybridEndpoint(value, async () => { calls++; }), /deve indicare/);
  }
  assert.equal(calls, 0);
});

test('hybrid: errore di rete o timeout produce istruzioni operative senza avviare servizi', async () => {
  for (const reason of ['ECONNREFUSED', 'Timeout']) {
    await assert.rejects(checkHybridEndpoint('127.0.0.1:8280', async () => { throw new Error(reason); }),
      (error: Error) => error.message.includes('127.0.0.1:8280')
        && error.message.includes('emulators:personal') && error.message.includes('config/owner')
        && error.message.includes('npm run dev'));
  }
});
