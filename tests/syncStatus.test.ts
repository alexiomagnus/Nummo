import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeSync } from '../src/features/workspace/syncStatus.ts';

const ok = { ready: true, online: true, pending: false, cached: false, error: null };

test('synced only when ready, online, confirmed and not from cache', () => {
  assert.equal(describeSync(ok).kind, 'synced');
  assert.notEqual(describeSync({ ...ok, ready: false }).kind, 'synced');
  assert.notEqual(describeSync({ ...ok, cached: true }).kind, 'synced');
  assert.notEqual(describeSync({ ...ok, online: false }).kind, 'synced');
  assert.notEqual(describeSync({ ...ok, pending: true }).kind, 'synced');
});

test('errors and pending writes take precedence', () => {
  assert.deepEqual(describeSync({ ...ok, error: 'boom', pending: true, online: false }).kind, 'error');
  assert.equal(describeSync({ ...ok, pending: true, online: false }).kind, 'pending');
  assert.equal(describeSync({ ...ok, online: false, cached: true }).kind, 'offline');
  assert.equal(describeSync({ ...ok, ready: false, cached: true }).kind, 'loading');
});
