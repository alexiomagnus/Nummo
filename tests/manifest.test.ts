import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Chrome on Android colours the navigation bar of an installed web app (WebAPK, not edge-to-edge) with the manifest
// `theme_color` only: one static value, fixed in the WebAPK, which neither the page's meta theme-color nor the theme
// chosen in Nummo can change, and whose dark variant Chrome's manifest parser does not read. Dark fallback: #121212.
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as Record<string, unknown>;
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

test('manifest: barra di navigazione Android dell’app installata scura in ogni tema', () => {
  assert.equal(manifest.theme_color, '#121212');
  for (const key of ['theme_color', 'background_color']) {
    const value = manifest[key];
    assert.match(String(value), /^#[0-9A-F]{6}$/i, key);
    // White navigation buttons need a dark bar (contrast ≥ 4.5:1 against white).
    assert.ok((1.05) / (luminance(String(value)) + 0.05) >= 4.5, `${key} troppo chiaro`);
  }
  // Fields Chrome does not read for installed apps must not be relied upon for this.
  assert.equal('user_preferences' in manifest, false);
});

test('pagina: theme-color iniziale per schema, poi aggiornato dal tema scelto (barra di stato)', () => {
  const html = readFileSync('public/index.html', 'utf8');
  assert.match(html, /<meta name="theme-color" content="#[0-9A-F]{6}" media="\(prefers-color-scheme: light\)" \/>/i);
  assert.match(html, /<meta name="theme-color" content="#[0-9A-F]{6}" media="\(prefers-color-scheme: dark\)" \/>/i);
  assert.match(html, /viewport-fit=cover/);
});
