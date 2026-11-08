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
  assert.deepEqual(parsed, { theme: 'dark', colorMode: 'palette', accent: defaultPreferences.accent, font: 'system', language: 'it' });
});

test('lingua: inglese persistito, vecchie preferenze e valori invalidi restano italiani', () => {
  assert.equal(parsePreferences('{"language":"en"}').language, 'en');
  assert.equal(parsePreferences('{"language":"it"}').language, 'it');
  assert.equal(parsePreferences('{"language":"fr","theme":"dark"}').language, 'it');
  assert.equal(parsePreferences('{"theme":"dark"}').language, 'it');
});
