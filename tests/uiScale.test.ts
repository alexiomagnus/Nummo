import assert from 'node:assert/strict';
import test from 'node:test';
import { appIcons, appIconColors, parseAppIcon } from '../src/domain/appIcons.ts';
import { defaultPreferences, parsePreferences } from '../src/features/settings/preferences.ts';
import { androidAppIcons } from '../src/services/androidApp.ts';
import { applyUiScale, parseUiScale, viewportContent } from '../src/theme/uiScale.ts';

test('scala dell’interfaccia: passo di 5, limiti 75–125, il resto vale 100', () => {
  assert.equal(parseUiScale(100), 100);
  assert.equal(parseUiScale(112), 110);
  assert.equal(parseUiScale(10), 75);
  assert.equal(parseUiScale(300), 125);
  for (const bad of [undefined, null, '110', NaN, Infinity, {}]) assert.equal(parseUiScale(bad), 100);
  assert.equal(parsePreferences('{"uiScale":120}').uiScale, 120);
  assert.equal(parsePreferences('{"uiScale":"x"}').uiScale, defaultPreferences.uiScale);
  assert.equal(parsePreferences(null).uiScale, 100);
});

test('scala dell’interfaccia: il tag viewport dichiara larghezza e scala insieme, al 100 % resta quello della pagina', () => {
  assert.match(viewportContent(100, 411), /^width=device-width, initial-scale=1, maximum-scale=1, /);
  const big = viewportContent(125, 400);
  assert.match(big, /^width=320, initial-scale=1\.25, minimum-scale=1\.25, maximum-scale=1\.25, user-scalable=no/);
  assert.match(viewportContent(75, 390), /^width=520, initial-scale=0\.75, /);
  assert.match(viewportContent(125, 0), /^width=device-width/, 'senza larghezza nota non si inventa nulla');
  let content = '';
  applyUiScale({ querySelector: () => ({ setAttribute: (name, value) => { assert.equal(name, 'content'); content = value; } }) }, 110, 440);
  assert.match(content, /^width=400, initial-scale=1\.1,/);
  assert.doesNotThrow(() => applyUiScale({ querySelector: () => null }, 110, 440));
});

test('icona dell’app: tre icone, la predefinita è quella installata; il ponte è riconosciuto solo con i due metodi', () => {
  assert.deepEqual([...appIcons], ['default', 'light', 'original']);
  assert.equal(appIconColors.default.background, '#171717');
  assert.equal(appIconColors.light.background, '#FAFAF7');
  assert.equal(appIconColors.original.background, '#0F1512');
  assert.equal(parseAppIcon('light'), 'light');
  assert.equal(parseAppIcon('green'), null);
  assert.equal(parseAppIcon(3), null);
  const base = { haptic() {}, setSystemBars() {}, saveFile() {}, canAuthenticate() {}, authenticate() {}, cancelAuthentication() {} };
  assert.equal(androidAppIcons({ NummoAndroid: base }), undefined);
  assert.equal(androidAppIcons({ NummoAndroid: { ...base, appIcon: () => 'default' } }), undefined);
  assert.ok(androidAppIcons({ NummoAndroid: { ...base, appIcon: () => 'default', setAppIcon() {} } }));
});
