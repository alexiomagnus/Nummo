import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accents, buildScheme, dialogColors, positiveColors } from '../src/theme/palette.ts';
import { sizeClassOf, type Scheme } from '../src/theme/tokens.ts';

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const surfaces: (keyof Scheme)[] = ['background', 'surface', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest'];
// Text/background pairs actually used by the UI (AA: 4.5:1).
const textPairs: [keyof Scheme, keyof Scheme][] = [
  ['onPrimary', 'primary'], ['onPrimaryContainer', 'primaryContainer'], ['onSecondaryContainer', 'secondaryContainer'],
  ['onTertiaryContainer', 'tertiaryContainer'], ['onError', 'error'], ['onErrorContainer', 'errorContainer'],
  ['inverseOnSurface', 'inverseSurface'], ['onSurfaceVariant', 'surfaceVariant'],
];

for (const [accent, mode, name] of accents.flatMap((a) => (['mono', 'palette'] as const).flatMap((m) => (['light', 'dark'] as const).map((n) => [a, m, n] as const)))) {
  const scheme = buildScheme(accent, mode, name === 'dark');
  const label = `${accent}/${mode}/${name}`;
  test(`dialogo ${label}: testo leggibile e contorno distinguibile`, () => {
    const modal = dialogColors(scheme, name === 'dark');
    assert.notEqual(modal.dialog, scheme.background);
    for (const text of ['onSurface', 'onSurfaceVariant', 'primary', 'error'] as const) {
      assert.ok(contrast(scheme[text], modal.dialog) >= 4.5, `${text} sul dialogo`);
    }
    assert.ok(contrast(scheme.outline, modal.dialog) >= 3, 'contorno sul dialogo');
  });
  test(`tema ${label}: testo su superfici ≥ 4,5:1`, () => {
    for (const surface of surfaces) {
      for (const text of ['onSurface', 'onSurfaceVariant', 'primary', 'error'] as const) {
        assert.ok(contrast(scheme[text], scheme[surface]) >= 4.5, `${text} su ${surface}: ${contrast(scheme[text], scheme[surface]).toFixed(2)}`);
      }
    }
    for (const [text, background] of textPairs) {
      assert.ok(contrast(scheme[text], scheme[background]) >= 4.5, `${text} su ${background}: ${contrast(scheme[text], scheme[background]).toFixed(2)}`);
    }
  });
  test(`tema ${label}: bordi dei controlli ≥ 3:1`, () => {
    for (const surface of surfaces) {
      assert.ok(contrast(scheme.outline, scheme[surface]) >= 3, `outline su ${surface}: ${contrast(scheme.outline, scheme[surface]).toFixed(2)}`);
    }
  });
}

test('verde delle entrate: contrasto almeno 4,5:1 su ogni superficie, per ogni accento e tema', () => {
  for (const accent of accents) for (const mode of ['mono', 'palette'] as const) for (const dark of [false, true]) {
    const scheme = buildScheme(accent, mode, dark);
    const green = dark ? positiveColors.dark : positiveColors.light;
    for (const surface of ['background', 'surface', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh'] as const) {
      assert.ok(contrast(green, scheme[surface]) >= 4.5, `${accent}/${mode}/${dark ? 'scuro' : 'chiaro'} su ${surface}: ${contrast(green, scheme[surface]).toFixed(2)}`);
    }
  }
});

test('classi di finestra: compact < 600 ≤ medium < 1024 ≤ expanded', () => {
  assert.deepEqual([320, 599, 600, 1023, 1024, 1600].map(sizeClassOf), ['compact', 'compact', 'medium', 'medium', 'expanded', 'expanded']);
});
