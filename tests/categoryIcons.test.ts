import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryIcons, isCategoryIcon, retiredCategoryIcons, selectableCategoryIcons } from '../src/domain/category.ts';
import { categoryGlyphs } from '../src/components/categoryGlyphs.ts';
import { categoryColorGlyphs } from '../src/components/categoryColorGlyphs.ts';
import { categoryPixelGlyphs, detailGrid, pixelGrid, pixelSprites, snapPixelSize, spriteMarkup } from '../src/components/categoryPixelGlyphs.ts';
import { colorfulZoom, defaultIconStyle, glyphSize, iconStyles, resolveCategoryGlyph } from '../src/components/categoryIconSets.ts';
import { iconHues, iconRamp } from '../src/theme/iconPalette.ts';
import { accents, buildScheme } from '../src/theme/palette.ts';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

test('icone: ogni categoria ha un disegno colorato e viceversa, con una tinta della palette', () => {
  assert.deepEqual(Object.keys(categoryColorGlyphs).sort(), [...categoryIcons].sort());
  for (const [name, glyph] of Object.entries(categoryColorGlyphs)) assert.ok((iconHues as readonly string[]).includes(glyph.hue), name);
});

test('icone: il markup colorato è composto solo da forme chiuse e da ruoli colore noti', () => {
  for (const [name, glyph] of Object.entries(categoryColorGlyphs)) {
    assert.match(glyph.shape, /^(<(path|circle|rect)\b[^<>]*\/>)+$/, name);
    const roles = [...glyph.shape.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    assert.ok(roles.length > 0 && roles.every((role) => 'btiol'.includes(role!) && role!.length === 1), `${name}: ${roles}`);
    assert.doesNotMatch(glyph.shape, /#[0-9a-f]{3,6}|rgb/i, `${name}: colori solo dai ruoli`);
  }
});

test('stile minimale: identico al set originale, il colore resta a chi disegna', () => {
  assert.equal(defaultIconStyle, 'minimal');
  assert.deepEqual([...iconStyles], ['minimal', 'colorful', 'pixel']);
  for (const icon of categoryIcons) for (const dark of [false, true]) {
    assert.deepEqual(resolveCategoryGlyph('minimal', icon, dark), { shape: categoryGlyphs[icon], color: null }, icon);
  }
});

test('stile colorato: ruoli sostituiti per tema, stesso soggetto, nessun segnaposto rimasto', () => {
  for (const icon of categoryIcons) {
    const light = resolveCategoryGlyph('colorful', icon, false)!;
    const dark = resolveCategoryGlyph('colorful', icon, true)!;
    const hue = categoryColorGlyphs[icon].hue;
    assert.equal(light.color, iconRamp(hue, false).i, icon);
    assert.equal(dark.color, iconRamp(hue, true).i, icon);
    assert.doesNotMatch(light.shape + dark.shape, /[{}]/, icon);
    assert.notEqual(light.shape, dark.shape, icon);
    assert.notEqual(light.shape, categoryGlyphs[icon], icon);
  }
});

test('stile pixel: ogni categoria ha uno sprite valido, centrato su una griglia 12×12 e con la stessa tinta del colorato', () => {
  assert.deepEqual(Object.keys(pixelSprites).sort(), [...categoryIcons].sort());
  for (const [name, sprite] of Object.entries(pixelSprites)) {
    const width = sprite.rows[0]!.length;
    const grid = sprite.grid ?? pixelGrid;
    assert.ok(width > 0 && width <= grid && sprite.rows.length > 0 && sprite.rows.length <= grid, `${name}: dimensioni`);
    for (const row of sprite.rows) assert.match(row, new RegExp(`^[.ibto]{${width}}$`), `${name}: righe rettangolari e caratteri ammessi`);
    const cells = sprite.rows.join('');
    assert.ok((cells.match(/[bt]/g) ?? []).length >= 10, `${name}: riempimento sufficiente (i soli contorni scuri spariscono nel tema scuro)`);
    assert.ok(cells.includes('b') || cells.includes('t'), name);
    assert.equal(sprite.hue, categoryColorGlyphs[name as keyof typeof categoryColorGlyphs].hue, `${name}: stessa tinta per significato`);
  }
});

test('stile pixel: markup a celle intere, senza colori letterali, ruoli sostituiti per tema', () => {
  // 2×2 sprite centred on the 12×12 canvas (offset 5,5); runs of equal cells are merged, paths ordered tint, base, on-base, ink.
  assert.equal(spriteMarkup(['b.', '.t']), '<g transform="scale(2)" stroke="none" shape-rendering="crispEdges"><path fill="{t}" d="M6 6h1v1h-1z"/><path fill="{b}" d="M5 5h1v1h-1z"/></g>');
  assert.match(spriteMarkup(['bbb']), /d="M4 5h3v1h-3z"/);
  for (const [name, glyph] of Object.entries(categoryPixelGlyphs)) {
    assert.match(glyph.shape, /^<g transform="scale\([12]\)" stroke="none" shape-rendering="crispEdges">(<path fill="\{[btio]\}" d="[Mhvz\d -]+"\/>)+<\/g>$/, name);
    assert.doesNotMatch(glyph.shape, /#[0-9a-f]{3,6}|rgb/i, name);
  }
  for (const icon of categoryIcons) {
    const light = resolveCategoryGlyph('pixel', icon, false)!;
    const dark = resolveCategoryGlyph('pixel', icon, true)!;
    assert.doesNotMatch(light.shape + dark.shape, /[{}]/, icon);
    assert.notEqual(light.shape, dark.shape, icon);
    assert.notEqual(light.shape, resolveCategoryGlyph('colorful', icon, false)!.shape, icon);
    assert.equal(light.color, iconRamp(categoryColorGlyphs[icon].hue, false).i, icon);
  }
});

test('stile pixel: la dimensione si aggancia a multipli della griglia, gli altri stili no', () => {
  assert.deepEqual([8, 12, 17, 20, 24, 26, 30, 36, 48].map(snapPixelSize), [12, 12, 12, 24, 24, 24, 36, 36, 48]);
  assert.equal(glyphSize('pixel', 20), 24);
  assert.equal(glyphSize('minimal', 20), 20);
  assert.equal(glyphSize('colorful', 26), 26);
});

test('fallback: pixel mancante → colorato → contorno; icona colorata mancante → contorno, mancante ovunque, assente o ereditata → null', () => {
  const only = { outline: { cart: '<path d="M0 0"/>' }, color: {} };
  assert.deepEqual(resolveCategoryGlyph('colorful', 'cart', false, only), { shape: '<path d="M0 0"/>', color: null });
  assert.equal(resolveCategoryGlyph('colorful', 'sconosciuta', false, only), null);
  assert.deepEqual(resolveCategoryGlyph('pixel', 'cart', false, only), { shape: '<path d="M0 0"/>', color: null });
  const colour = { hue: 'green', shape: '<path fill="{b}" d="M0 0"/>' } as const;
  assert.equal(resolveCategoryGlyph('pixel', 'cart', false, { outline: {}, color: { cart: colour } })!.color, iconRamp('green', false).i);
  assert.equal(resolveCategoryGlyph('pixel', 'cart', true, { outline: {}, color: {}, pixel: { cart: { hue: 'red', shape: '<path fill="{t}" d="M0 0"/>' } } })!.shape, `<path fill="${iconRamp('red', true).t}" d="M0 0"/>`);
  for (const style of iconStyles) for (const value of [null, undefined, '', 'sconosciuta', 'constructor', '__proto__', 'toString']) {
    assert.equal(resolveCategoryGlyph(style, value, false), null, `${style}:${String(value)}`);
  }
});

test('palette icone: contrasto di tinte e dettagli sulle superfici reali di ogni accento', () => {
  for (const hue of iconHues) for (const dark of [false, true]) {
    const ramp = iconRamp(hue, dark);
    assert.ok(contrast(ramp.i, ramp.t) >= 4.5, `${hue} ${dark}: inchiostro su tinta`);
    assert.ok(contrast(ramp.o, ramp.b) >= 3, `${hue} ${dark}: dettagli su base`);
    for (const accent of accents) for (const mode of ['mono', 'palette'] as const) {
      const surface = buildScheme(accent, mode, dark).surface;
      assert.ok(contrast(ramp.b, surface) >= 3, `${hue} ${dark} ${accent}: base sulla pagina`);
      assert.ok(contrast(ramp.l, surface) >= 3, `${hue} ${dark} ${accent}: linee libere sulla pagina`);
    }
  }
  assert.equal(new Set(iconHues.map((hue) => iconRamp(hue, false).b)).size, iconHues.length);
});

test('stile pixel: nessuno sprite coincide con un altro, nemmeno a meno della tinta (issue #11)', () => {
  const shapes = Object.entries(pixelSprites).map(([name, sprite]) => [name, sprite.rows.join('/')] as const);
  const seen = new Map<string, string>();
  for (const [name, shape] of shapes) {
    assert.equal(seen.get(shape), undefined, `${name} uguale a ${seen.get(shape)}`);
    seen.set(shape, name);
  }
});


test('icone rimosse: stella, istruzione e birra non sono selezionabili né disegnate in alcuno stile', () => {
  for (const icon of ['star', 'graduation', 'beer']) {
    assert.equal(isCategoryIcon(icon), false);
    for (const style of iconStyles) for (const dark of [false, true]) {
      assert.equal(resolveCategoryGlyph(style, icon, dark), null, `${style}:${icon}`);
    }
  }
});

test('popcorn: cartone rosso, strisce bianche e chicchi gialli nei due stili e temi', () => {
  for (const dark of [false, true]) {
    const ramp = iconRamp('popcorn', dark);
    assert.equal(ramp.o, '#FFFFFF');
    // The red channel dominates the carton; kernels keep red and green above blue.
    const rgb = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const [r, g, b] = rgb(ramp.b);
    assert.ok(r! > g! * 2 && r! > b! * 2);
    const [kr, kg, kb] = rgb(ramp.t);
    assert.ok(kr! > kb! && kg! > kb!);
    for (const style of ['colorful', 'pixel'] as const) {
      const glyph = resolveCategoryGlyph(style, 'popcorn', dark)!;
      for (const color of [ramp.b, ramp.t, ramp.o]) assert.ok(glyph.shape.includes(color));
    }
  }
});

test('chiave: disponibile e selezionabile in tutti e tre gli stili e temi', () => {
  assert.ok(isCategoryIcon('key'));
  assert.ok(selectableCategoryIcons.includes('key'));
  for (const style of iconStyles) for (const dark of [false, true]) assert.ok(resolveCategoryGlyph(style, 'key', dark), `${style}:${dark}`);
});

test('divano ritirato: non più selezionabile, ma ancora valido e disegnato per le categorie e i backup esistenti', () => {
  assert.deepEqual([...retiredCategoryIcons], ['sofa']);
  assert.equal(selectableCategoryIcons.includes('sofa'), false);
  assert.ok(isCategoryIcon('sofa'));
  for (const style of iconStyles) for (const dark of [false, true]) assert.ok(resolveCategoryGlyph(style, 'sofa', dark), `${style}:${dark}`);
  assert.equal(selectableCategoryIcons.length, categoryIcons.length - retiredCategoryIcons.length);
});

test('stile pixel: alta definizione solo dove serve (moneta), a celle intere sul 24×24 e con il € bianco al centro', () => {
  assert.deepEqual(Object.entries(pixelSprites).filter(([, sprite]) => sprite.grid).map(([name]) => name), ['coin']);
  assert.equal(spriteMarkup(['b'], detailGrid), '<g transform="scale(1)" stroke="none" shape-rendering="crispEdges"><path fill="{b}" d="M11 11h1v1h-1z"/></g>');
  const rows = pixelSprites.coin.rows;
  assert.equal(rows.length, detailGrid);
  const cells = rows.flatMap((row, y) => [...row].map((c, x) => ({ c, x, y }))).filter((cell) => cell.c === 'o');
  const mid = (values: number[]) => (Math.min(...values) + Math.max(...values) + 1) / 2;
  assert.ok(Math.abs(mid(cells.map((cell) => cell.x)) - 12) <= 0.5 && Math.abs(mid(cells.map((cell) => cell.y)) - 12) <= 0.5, 'simbolo centrato');
  for (const dark of [false, true]) assert.equal(iconRamp('gold', dark).o, '#FFFFFF');
});

test('regalo: viola e bianco in entrambi gli stili e temi (dettagli bianchi anche nel tema scuro)', () => {
  assert.equal(categoryColorGlyphs.gift.hue, 'purple');
  assert.equal(pixelSprites.gift.hue, 'purple');
  for (const dark of [false, true]) assert.equal(iconRamp('purple', dark).o, '#FFFFFF');
  for (const style of ['colorful', 'pixel'] as const) assert.match(resolveCategoryGlyph(style, 'gift', true)!.shape, /#FFFFFF/i, style);
});

test('stile colorato: ingrandito attorno al centro, il pixel mai (servono celle intere)', () => {
  assert.ok(colorfulZoom > 1 && colorfulZoom <= 1.15);
  for (const icon of categoryIcons) {
    assert.match(resolveCategoryGlyph('colorful', icon, false)!.shape, new RegExp(`^<g transform="translate\\(12 12\\) scale\\(${colorfulZoom}\\) translate\\(-12 -12\\)">`), icon);
    assert.doesNotMatch(resolveCategoryGlyph('pixel', icon, false)!.shape, /translate\(12 12\)/, icon);
  }
});
