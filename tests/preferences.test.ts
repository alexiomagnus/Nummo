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
  assert.deepEqual(parsed, { ...defaultPreferences, theme: 'dark', colorMode: 'palette', font: 'system' });
});

test('lingua: inglese persistito, vecchie preferenze e valori invalidi restano italiani', () => {
  assert.equal(parsePreferences('{"language":"en"}').language, 'en');
  assert.equal(parsePreferences('{"language":"it"}').language, 'it');
  assert.equal(parsePreferences('{"language":"fr","theme":"dark"}').language, 'it');
  assert.equal(parsePreferences('{"theme":"dark"}').language, 'it');
});

test('dashboard: vecchie preferenze usano ciambella e mese corrente', () => {
  const parsed = parsePreferences('{"theme":"dark","language":"en"}');
  assert.equal(parsed.dashboardChart, 'donut');
  assert.equal(parsed.dashboardPeriod, 'month');
  assert.equal(parsed.theme, 'dark');
  assert.equal(parsed.language, 'en');
});
test('dashboard: grafico e periodi sopravvivono al salvataggio e alla rilettura', () => {
  for (const dashboardChart of ['donut', 'blocks', 'bars'] as const) {
    for (const dashboardPeriod of ['month', 'previous-month', 'quarter', 'year'] as const) {
      const saved = { ...defaultPreferences, language: 'en', dashboardChart, dashboardPeriod };
      assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
    }
  }
  // «Ultimi 6 mesi» was removed on 15 November: a saved choice falls back to the default period.
  assert.equal(parsePreferences(JSON.stringify({ ...defaultPreferences, dashboardPeriod: 'half-year' })).dashboardPeriod, defaultPreferences.dashboardPeriod);
});
test('dashboard: valori corrotti ripristinati separatamente senza perdere le altre scelte', () => {
  const invalidChart = parsePreferences('{"dashboardChart":"pie","dashboardPeriod":"year","accent":"amber"}');
  assert.equal(invalidChart.dashboardChart, 'donut');
  assert.equal(invalidChart.dashboardPeriod, 'year');
  assert.equal(invalidChart.accent, 'amber');
  const invalidPeriod = parsePreferences('{"dashboardChart":"blocks","dashboardPeriod":null}');
  assert.equal(invalidPeriod.dashboardChart, 'blocks');
  assert.equal(invalidPeriod.dashboardPeriod, 'month');
});


test('dashboard: scelte Blocchi già salvate conservate, Barre selezionabile senza cambiare periodo o lingua', () => {
  const blocks = parsePreferences('{"dashboardChart":"blocks","dashboardPeriod":"quarter","language":"en"}');
  assert.equal(blocks.dashboardChart, 'blocks');
  const bars = parsePreferences(JSON.stringify({ ...blocks, dashboardChart: 'bars' }));
  assert.equal(bars.dashboardChart, 'bars');
  assert.equal(bars.dashboardPeriod, 'quarter');
  assert.equal(bars.language, 'en');
});

test('icone: predefinito colorato, valori invalidi tornano colorato, una scelta salvata resta', () => {
  assert.equal(defaultPreferences.iconStyle, 'colorful');
  assert.equal(parsePreferences('{"theme":"dark","language":"en"}').iconStyle, 'colorful');
  assert.equal(parsePreferences('{"iconStyle":"neon","theme":"dark"}').iconStyle, 'colorful');
  assert.equal(parsePreferences('{"iconStyle":null}').iconStyle, 'colorful');
  assert.equal(parsePreferences('{"iconStyle":"minimal"}').iconStyle, 'minimal');
});
test('icone: lo stile colorato sopravvive al salvataggio e non altera le altre scelte', () => {
  const saved = { ...defaultPreferences, iconStyle: 'colorful' as const, theme: 'dark' as const, language: 'en' as const, dashboardChart: 'bars' as const };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
  assert.equal(parsePreferences('{"iconStyle":"colorful","accent":"nope"}').accent, defaultPreferences.accent);
});

test('dashboard: preferenza Classifica migra a Barre', () => {
  assert.equal(parsePreferences('{"dashboardChart":"ranking","dashboardPeriod":"year"}').dashboardChart, 'bars');
});

test('dashboard: andamento visibile di base, scelta booleana conservata, valori non validi ripristinati', () => {
  assert.equal(defaultPreferences.dashboardTrend, true);
  assert.equal(parsePreferences('{"theme":"dark"}').dashboardTrend, true);
  assert.equal(parsePreferences('{"dashboardTrend":false}').dashboardTrend, false);
  for (const bad of ['"false"', '0', 'null', '[]']) assert.equal(parsePreferences(`{"dashboardTrend":${bad},"accent":"amber"}`).dashboardTrend, true);
  const saved = { ...defaultPreferences, dashboardTrend: false, dashboardChart: 'bars' as const };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
});

test('budget sempre visibili: la vecchia scelta «showGeneralBudget» salvata viene ignorata', () => {
  const parsed = parsePreferences('{"showGeneralBudget":false,"dashboardTrend":false}');
  assert.equal('showGeneralBudget' in parsed, false);
  assert.equal(parsed.dashboardTrend, false);
});

test('liste archiviate: visibili di base, solo booleani accettati, scelta conservata', () => {
  assert.equal(defaultPreferences.showArchivedLists, true);
  assert.equal(parsePreferences('{"dashboardTrend":false}').showArchivedLists, true); // preferenze salvate prima della scelta
  assert.equal(parsePreferences('{"showArchivedLists":false}').showArchivedLists, false);
  for (const bad of ['"false"', '0', 'null']) assert.equal(parsePreferences(`{"showArchivedLists":${bad}}`).showArchivedLists, true);
  const saved = { ...defaultPreferences, showArchivedLists: false };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
});

test('fondi archiviati: visibili di base, solo booleani accettati, scelta conservata', () => {
  assert.equal(defaultPreferences.showArchivedFunds, true);
  assert.equal(parsePreferences('{"showArchivedLists":false}').showArchivedFunds, true); // preferenze salvate prima della scelta
  assert.equal(parsePreferences('{"showArchivedFunds":false}').showArchivedFunds, false);
  // «Filtra per fondo» was removed (the filter is always there): a saved value is ignored.
  assert.equal('showFundFilter' in parsePreferences('{"showFundFilter":false}'), false);
  for (const bad of ['"false"', '0', 'null']) assert.equal(parsePreferences(`{"showArchivedFunds":${bad}}`).showArchivedFunds, true);
  const saved = { ...defaultPreferences, showArchivedFunds: false };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
});

test('preferenze: vibrazione accesa di base, solo booleani, scelta conservata', () => {
  assert.equal(defaultPreferences.haptics, true);
  assert.equal(parsePreferences('{}').haptics, true);
  for (const bad of ['"false"', '0', 'null']) assert.equal(parsePreferences(`{"haptics":${bad}}`).haptics, true);
  assert.equal(parsePreferences('{"haptics":false}').haptics, false);
  const saved = { ...defaultPreferences, haptics: false };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
});

test('preferenze: l’anello dell’avatar non è più una preferenza, un valore salvato si ignora', () => {
  assert.equal('avatarRing' in defaultPreferences, false);
  assert.equal('avatarRing' in parsePreferences('{"avatarRing":true}'), false);
});

test('preferenze: «Material You» predefinito dal 27 novembre (senza i colori di sistema vale «Palette»), una scelta salvata resta', () => {
  assert.equal(defaultPreferences.colorMode, 'system');
  assert.equal(parsePreferences('{}').colorMode, 'system');
  assert.equal(parsePreferences('{"colorMode":"palette"}').colorMode, 'palette');
  assert.equal(parsePreferences('{"colorMode":"mono"}').colorMode, 'mono');
});

test('«Apri a metà schermo» tolto: un valore salvato si ignora', () => {
  assert.equal('halfScreens' in defaultPreferences, false);
  assert.equal('halfScreens' in parsePreferences(JSON.stringify({ halfScreens: true })), false);
});

test('animazione dello sfondo: sei scelte, «Cerchi» di base, il vecchio interruttore spento vale «Nessuna»', async () => {
  const { parseBackground, backgrounds } = await import('../src/theme/background.ts');
  assert.deepEqual(backgrounds, ['circles', 'rings', 'space', 'snow', 'particles', 'none']);
  assert.equal(parseBackground(undefined, undefined), 'circles');
  assert.equal(parseBackground('snow', true), 'snow');
  assert.equal(parseBackground(undefined, false), 'none');
  assert.equal(parseBackground('rain', undefined), 'circles');
});

test('Material You: palette di sistema validate, schema dai toni, senza palette vale «Palette» con «Grigio»', async () => {
  const { androidSystemColors, systemPaletteNames, systemToneKeys } = await import('../src/services/androidApp.ts');
  const { buildScheme, accentSwatches, setSystemColors, hasSystemColors, contrastRatio } = await import('../src/theme/palette.ts');
  const tones = Object.fromEntries(systemToneKeys.map((key, i) => [key, `#${(i * 20).toString(16).padStart(2, '0').repeat(3)}`]));
  const palettes = Object.fromEntries(systemPaletteNames.map((name) => [name, tones]));
  const bridge = (json: string) => ({ NummoAndroid: { haptic() {}, setSystemBars() {}, saveFile() {}, canAuthenticate() {}, authenticate() {}, cancelAuthentication() {}, systemColors: () => json } });
  assert.ok(androidSystemColors(bridge(JSON.stringify(palettes))));
  assert.equal(androidSystemColors(bridge('')), null);
  assert.equal(androidSystemColors(bridge(JSON.stringify({ ...palettes, a1: { ...tones, 500: 'red' } }))), null);
  assert.equal(androidSystemColors({}), null);
  // Without system palettes «Material You» is «Palette» and keeps the accent the user picked (28 November: it was forced to
  // graphite, so every dot was grey and choosing a colour did nothing).
  assert.deepEqual(buildScheme('mint', 'system', true), buildScheme('mint', 'palette', true));
  assert.deepEqual(accentSwatches('mint', 'system', true), accentSwatches('mint', 'palette', true));
  assert.equal(accentSwatches('mint', 'system', true).length, 3);
  const fallback = buildScheme('graphite', 'palette', true);
  setSystemColors(androidSystemColors(bridge(JSON.stringify(palettes))));
  try {
    assert.equal(hasSystemColors(), true);
    for (const dark of [false, true]) {
      const scheme = buildScheme('graphite', 'system', dark);
      assert.notDeepEqual(scheme, fallback);
      assert.ok(contrastRatio(scheme.onSurface, scheme.surface) >= 4.5);
    }
  } finally { setSystemColors(null); }
});
