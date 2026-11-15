import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHour } from '../src/domain/timeFormat.ts';
import { defaultPreferences, parsePreferences } from '../src/features/settings/preferences.ts';

test('ora: 24 ore o 12 ore con AM/PM', () => {
  assert.equal(formatHour(9, '24h'), '9:00');
  assert.equal(formatHour(21, '24h'), '21:00');
  assert.equal(formatHour(9, '12h'), '9:00 AM');
  assert.equal(formatHour(12, '12h'), '12:00 PM');
  assert.equal(formatHour(13, '12h'), '1:00 PM');
  assert.equal(formatHour(21, '12h'), '9:00 PM');
  assert.equal(formatHour(0, '12h'), '12:00 AM');
});

test('preferenze: formato dell’ora predefinito 24 ore, valori non validi ignorati', () => {
  assert.equal(defaultPreferences.timeFormat, '24h');
  assert.equal(parsePreferences('{"timeFormat":"12h"}').timeFormat, '12h');
  for (const bad of ['"am"', '12', 'null', '{}']) assert.equal(parsePreferences(`{"timeFormat":${bad}}`).timeFormat, '24h');
});
