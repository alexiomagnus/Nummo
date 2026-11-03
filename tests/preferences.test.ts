import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultPreferences, parsePreferences } from '../src/features/settings/preferences.ts';

test('preferenze: assenti o corrotte → predefinite', () => {
  assert.deepEqual(parsePreferences(null), defaultPreferences);
  assert.deepEqual(parsePreferences('{non json'), defaultPreferences);
  assert.deepEqual(parsePreferences('[1,2]'), defaultPreferences);
});

test('preferenze: campi validi mantenuti, invalidi sostituiti uno per uno', () => {
  const parsed = parsePreferences(JSON.stringify({ theme: 'dark', colorMode: 'palette', accent: 'neon', font: 'system' }));
  assert.deepEqual(parsed, { theme: 'dark', colorMode: 'palette', accent: defaultPreferences.accent, font: 'system' });
});
