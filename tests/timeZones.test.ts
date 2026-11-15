import assert from 'node:assert/strict';
import test from 'node:test';
import { autoTimeZone, commonTimeZones, isTimeZone, parseTimeZoneChoice, timeZoneChoices, timeZoneLabel } from '../src/domain/timeZones.ts';
import { deviceTimeZone, resolveTimeZone } from '../src/domain/pushSchedule.ts';
import { defaultPreferences, parsePreferences } from '../src/features/settings/preferences.ts';

test('fuso: nomi IANA validi, «auto» e testi non validi ricadono su «auto»', () => {
  assert.equal(isTimeZone('Europe/London'), true);
  for (const bad of ['', 'auto', 'Mars/Olympus', 'Europe', 12, null, undefined]) assert.equal(isTimeZone(bad), false);
  assert.equal(parseTimeZoneChoice('America/New_York'), 'America/New_York');
  for (const bad of ['Mars/Olympus', 7, null, 'auto']) assert.equal(parseTimeZoneChoice(bad), autoTimeZone);
  assert.equal(defaultPreferences.timeZone, autoTimeZone);
  assert.equal(parsePreferences('{"timeZone":"Asia/Tokyo"}').timeZone, 'Asia/Tokyo');
  assert.equal(parsePreferences('{"timeZone":"nope"}').timeZone, autoTimeZone);
});

test('fuso: «auto» segue il dispositivo, un nome scelto vale com’è', () => {
  assert.equal(resolveTimeZone(autoTimeZone), deviceTimeZone());
  assert.equal(resolveTimeZone('Asia/Tokyo'), 'Asia/Tokyo');
});

test('fuso: elenco da ovest a est con città e scarto, con ora legale', () => {
  assert.ok(commonTimeZones.every((zone) => isTimeZone(zone)));
  assert.equal(timeZoneLabel('Europe/London', new Date('2026-11-16T12:00:00Z')), 'London (GMT)');
  assert.equal(timeZoneLabel('Europe/London', new Date('2026-07-06T12:00:00Z')), 'London (GMT+1)');
  assert.equal(timeZoneLabel('America/Argentina/Buenos_Aires', new Date('2026-11-16T12:00:00Z')), 'Buenos Aires (GMT-3)');
  assert.equal(timeZoneLabel('UTC'), 'UTC');
  const at = new Date('2026-11-16T12:00:00Z');
  const choices = timeZoneChoices(['Europe/Rome', 'Africa/Casablanca'], at);
  assert.equal(choices.filter((choice) => choice.value === 'Europe/Rome').length, 1); // no duplicates
  assert.ok(choices.some((choice) => choice.value === 'Africa/Casablanca')); // the device's own zone is always offered
  assert.equal(choices[0]!.value, 'Pacific/Honolulu');
  assert.equal(choices.at(-1)!.value, 'Pacific/Auckland');
});
