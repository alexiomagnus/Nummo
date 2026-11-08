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
    for (const dashboardPeriod of ['month', 'previous-month', 'quarter', 'half-year', 'year'] as const) {
      const saved = { ...defaultPreferences, language: 'en', dashboardChart, dashboardPeriod };
      assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
    }
  }
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

test('icone: predefinito minimale, vecchie preferenze e valori invalidi tornano minimale', () => {
  assert.equal(defaultPreferences.iconStyle, 'minimal');
  assert.equal(parsePreferences('{"theme":"dark","language":"en"}').iconStyle, 'minimal');
  assert.equal(parsePreferences('{"iconStyle":"neon","theme":"dark"}').iconStyle, 'minimal');
  assert.equal(parsePreferences('{"iconStyle":null}').iconStyle, 'minimal');
});
test('icone: lo stile colorato sopravvive al salvataggio e non altera le altre scelte', () => {
  const saved = { ...defaultPreferences, iconStyle: 'colorful' as const, theme: 'dark' as const, language: 'en' as const, dashboardChart: 'bars' as const };
  assert.deepEqual(parsePreferences(JSON.stringify(saved)), saved);
  assert.equal(parsePreferences('{"iconStyle":"colorful","accent":"nope"}').accent, defaultPreferences.accent);
});

test('dashboard: preferenza Classifica migra a Barre', () => {
  assert.equal(parsePreferences('{"dashboardChart":"ranking","dashboardPeriod":"year"}').dashboardChart, 'bars');
});
