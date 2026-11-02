import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEndpoint } from '../src/services/backendConfig.ts';

test('indirizzo dell’emulatore delle Functions: host:porta, altrimenti nessuno', () => {
  assert.deepEqual(parseEndpoint('127.0.0.1:5001'), { host: '127.0.0.1', port: 5001 });
  assert.deepEqual(parseEndpoint('localhost:6001'), { host: 'localhost', port: 6001 });
  for (const value of [undefined, '', '127.0.0.1', 'http://127.0.0.1:5001', '127.0.0.1:porta']) {
    assert.equal(parseEndpoint(value), null, String(value));
  }
});
