import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownerAccessFromError } from '../src/services/ownerAccess.ts';

test('accesso del proprietario: solo un rifiuto delle Rules blocca, il resto non decide', () => {
  assert.equal(ownerAccessFromError('permission-denied'), 'denied');
  for (const code of ['unavailable', 'deadline-exceeded', 'unauthenticated', 'unknown', 'internal']) assert.equal(ownerAccessFromError(code), 'unknown', code);
});
