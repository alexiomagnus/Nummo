import assert from 'node:assert/strict';
import test from 'node:test';
import { activeCategoryIcons, retiredCategoryIcons } from '../src/domain/category.ts';
import { categoryGlyphs } from '../src/components/categoryGlyphs.ts';
import { categoryColorGlyphs } from '../src/components/categoryColorGlyphs.ts';
import { categoryPixelGlyphs } from '../src/components/categoryPixelGlyphs.ts';
import { avatarIcons, maxPhotoLength, noProfileImage, parseProfileImage, serializeProfileImage } from '../src/features/settings/profileImage.ts';

const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwc=';

test('immagine del profilo: assente, corrotta o sconosciuta → nessuna', () => {
  assert.deepEqual(parseProfileImage(null), noProfileImage);
  assert.deepEqual(parseProfileImage('{non json'), noProfileImage);
  assert.deepEqual(parseProfileImage('[]'), noProfileImage);
  assert.deepEqual(parseProfileImage('{"kind":"icon","icon":"tag"}'), noProfileImage);
  assert.deepEqual(parseProfileImage('{"kind":"icon","icon":"sofa"}'), noProfileImage);
  assert.deepEqual(parseProfileImage('{"kind":"wallpaper"}'), noProfileImage);
});

test('immagine del profilo: icona e foto valide lette e riscritte uguali', () => {
  for (const image of [{ kind: 'icon', icon: 'paw' }, { kind: 'photo', photo }] as const) {
    assert.deepEqual(parseProfileImage(serializeProfileImage(image)), image);
  }
  assert.equal(serializeProfileImage(noProfileImage), null);
});

test('immagine del profilo: solo data URL di immagini base64 entro il limite', () => {
  const bad = ['https://example.com/a.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'data:image/jpeg;base64,<script>',
    `data:image/jpeg;base64,${'A'.repeat(maxPhotoLength)}`];
  for (const value of bad) assert.deepEqual(parseProfileImage(JSON.stringify({ kind: 'photo', photo: value })), noProfileImage, value);
});

test('immagine del profilo: icone attive, non ritirate, con i tre disegni, senza ripetizioni', () => {
  assert.equal(new Set(avatarIcons).size, avatarIcons.length);
  for (const icon of avatarIcons) {
    assert.ok((activeCategoryIcons as readonly string[]).includes(icon), icon);
    assert.ok(!retiredCategoryIcons.includes(icon), icon);
    for (const drawings of [categoryGlyphs, categoryColorGlyphs, categoryPixelGlyphs]) assert.ok(Object.hasOwn(drawings, icon), icon);
  }
});
