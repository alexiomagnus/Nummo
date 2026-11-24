import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detailSpring, scrimOpacity, slideSpring, slideTimings } from '../src/theme/containerTransform.ts';
import { springEasing, springValue } from '../src/theme/themeTransition.ts';

const samplesOf = (spring: typeof detailSpring) => Array.from({ length: 1000 }, (_, i) => springValue(spring, i / 1000));
const reach = (samples: number[], value: number) => samples.findIndex((sample) => sample >= value);

test('entrata delle pagine: molla senza rimbalzo, risposta pronta, sotto i 500 ms', () => {
  const { duration, easing } = springEasing(detailSpring);
  assert.ok(duration >= 440 && duration <= 500, `durata ${duration}`);
  assert.match(easing, /^linear\(0, /);
  const samples = samplesOf(detailSpring);
  assert.ok(Math.max(...samples) < 1.0005, 'nessun rimbalzo');
  assert.ok(reach(samples, 0.5) <= 110, 'metà strada entro 110 ms');
  const ninety = reach(samples, 0.9);
  assert.ok(ninety >= 200 && ninety <= 250, `90 % in ${ninety} ms`);
});

test('schermi a scorrimento: salita morbida senza rimbalzo, discesa più rapida', () => {
  const { duration, easing } = springEasing(slideSpring, slideTimings.precision);
  assert.match(easing, /^linear\(0, /);
  assert.ok(duration >= 420 && duration <= 520, `salita in ${duration} ms`);
  const samples = samplesOf(slideSpring);
  assert.ok(Math.max(...samples) < 1.0005, 'nessun rimbalzo: lo schermo non supera il bordo superiore');
  const ninety = reach(samples, 0.9);
  assert.ok(ninety >= 220 && ninety <= 270, `90 % in ${ninety} ms`);
  // A fine corsa manca meno dello 0,5 %: l'ultimo tratto lineare è di pochi pixel anche su uno schermo alto.
  assert.ok(springValue(slideSpring, duration / 1000) >= 0.995);
  assert.ok(slideTimings.close < duration && slideTimings.close >= 200, 'la discesa è più breve della salita');
});

test('schermi a scorrimento: la pagina sotto arretra appena, il velo resta leggero', () => {
  assert.ok(slideTimings.pageScale >= 0.94 && slideTimings.pageScale < 1);
  assert.equal(slideTimings.corner, 28);
  assert.ok(scrimOpacity > 0 && scrimOpacity <= 0.4);
});
