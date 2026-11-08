import assert from 'node:assert/strict';
import { test } from 'node:test';
import { donutMaxAmountFont, donutMaxSize, donutMetrics } from '../src/features/dashboard/donutLayout.ts';

test('ciambella: raggi validi anche con superfici più strette dello spessore originale', () => {
  for (const width of [0, 1, 32, 59, 96, 136, 240, 340, 600]) {
    const metrics = donutMetrics(width, '20,00 €');
    assert.ok(metrics.inner >= 0 && metrics.inner <= metrics.outer);
    assert.ok(metrics.size <= width && metrics.size <= donutMaxSize);
    assert.ok(metrics.centerSide * Math.SQRT2 / 2 <= metrics.inner);
    assert.ok(metrics.amountFontSize <= donutMaxAmountFont);
  }
});

test('ciambella: il totale lungo riduce il font senza allargare il riquadro nel foro', () => {
  const short = donutMetrics(340, '20,00 €');
  const long = donutMetrics(340, '999.999.999,99 €');
  assert.equal(long.centerSide, short.centerSide);
  assert.ok(long.amountFontSize < short.amountFontSize);
  assert.ok(long.amountFontSize * Array.from('999.999.999,99 €').length * 0.7 <= long.centerSide);
});

test('ciambella: misure assenti o invalide non producono geometria SVG negativa o NaN', () => {
  for (const width of [-20, NaN, Infinity]) {
    const metrics = donutMetrics(width, '');
    assert.equal(metrics.size, 0);
    assert.ok(Object.values(metrics).every(Number.isFinite));
  }
});
