import assert from 'node:assert/strict';
import test from 'node:test';
import { profileImageKeyFor, maxPhotoLength, noProfileImage, parseProfileImage, parseProfileRing, profileRingColor, profileRingKeyFor, profileRings, serializeProfileImage, serializeProfileRing } from '../src/features/settings/profileImage.ts';
import { buildScheme } from '../src/theme/palette.ts';
import { profileAvatarHue, profileAvatarLabels, profileAvatarRoles, profileAvatars, profileAvatarSvg } from '../src/features/settings/profileAvatars.ts';

const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwc=';

test('immagine del profilo: assente, corrotta o sconosciuta → nessuna', () => {
  assert.deepEqual(parseProfileImage(null), noProfileImage);
  assert.deepEqual(parseProfileImage('{non json'), noProfileImage);
  assert.deepEqual(parseProfileImage('[]'), noProfileImage);
  assert.deepEqual(parseProfileImage('{"kind":"avatar","avatar":"tag"}'), noProfileImage);
  // The category icons offered before the avatars (22 November) read as no picture.
  assert.deepEqual(parseProfileImage('{"kind":"icon","icon":"paw"}'), noProfileImage);
  assert.deepEqual(parseProfileImage('{"kind":"wallpaper"}'), noProfileImage);
});

test('immagine del profilo: icona e foto valide lette e riscritte uguali', () => {
  for (const image of [{ kind: 'avatar', avatar: 'orbits' }, { kind: 'photo', photo }] as const) {
    assert.deepEqual(parseProfileImage(serializeProfileImage(image)), image);
  }
  assert.equal(serializeProfileImage(noProfileImage), null);
});

test('immagine del profilo: solo data URL di immagini base64 entro il limite', () => {
  const bad = ['https://example.com/a.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'data:image/jpeg;base64,<script>',
    `data:image/jpeg;base64,${'A'.repeat(maxPhotoLength)}`];
  for (const value of bad) assert.deepEqual(parseProfileImage(JSON.stringify({ kind: 'photo', photo: value })), noProfileImage, value);
});

function luminance(color: string): number {
  const channel = (index: number) => {
    const value = parseInt(color.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

test('avatar: cinque, ognuno con nome, tinta propria e disegno valido', () => {
  assert.equal(profileAvatars.length, 5);
  assert.equal(new Set(profileAvatars.map(profileAvatarHue)).size, 5);
  assert.equal(new Set(Object.values(profileAvatarLabels)).size, 5);
  for (const avatar of profileAvatars) {
    for (const dark of [false, true]) {
      const svg = profileAvatarSvg(avatar, dark);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#[0-9A-F]{6}"\/>/, avatar);
      assert.ok(svg.endsWith('</svg>'), avatar);
      // Only colours of the palette: every fill and stroke is one of the three roles.
      const roles = Object.values(profileAvatarRoles(avatar, dark));
      for (const [, color] of svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)) assert.ok(roles.includes(color!), `${avatar} ${color}`);
      assert.ok(!/<(?:script|image|foreignObject)|href=|on\w+=/i.test(svg), avatar);
    }
  }
});

test('avatar: forma principale e accento leggibili sullo sfondo, in tema chiaro e scuro', () => {
  for (const avatar of profileAvatars) {
    for (const dark of [false, true]) {
      const { bg, main, accent } = profileAvatarRoles(avatar, dark);
      assert.ok(contrast(main, bg) >= 3, `${avatar} ${dark} main ${contrast(main, bg).toFixed(2)}`);
      assert.ok(contrast(accent, bg) >= 4.5, `${avatar} ${dark} accent ${contrast(accent, bg).toFixed(2)}`);
    }
  }
});

test('avatar: scelta salvata e riletta uguale per ognuno dei cinque', () => {
  for (const avatar of profileAvatars) {
    const image = { kind: 'avatar', avatar } as const;
    assert.deepEqual(parseProfileImage(serializeProfileImage(image)), image);
  }
});

test('immagine del profilo: una chiave per la Standard e una per account in Avanzata', () => {
  assert.equal(profileImageKeyFor('local'), 'nummo.profile.v1');
  assert.equal(profileImageKeyFor('uid-A'), 'nummo.profile.v1.uid-A');
  assert.notEqual(profileImageKeyFor('uid-A'), profileImageKeyFor('uid-B'));
});

test('anello dell’Avanzata: colore dell’app di base, sei colori, valori estranei ignorati', () => {
  assert.equal(profileRingKeyFor('uid-1'), 'nummo.profileRing.v1.uid-1');
  assert.deepEqual(profileRings, ['app', 'blue', 'mint', 'violet', 'rose', 'amber', 'graphite']);
  assert.equal(parseProfileRing(null), 'app');
  assert.equal(parseProfileRing('rose'), 'rose');
  for (const raw of ['', 'red', '"rose"', '#ff0000', 'APP']) assert.equal(parseProfileRing(raw), 'app', raw);
  assert.equal(serializeProfileRing('app'), null, 'il valore predefinito non si salva');
  assert.equal(serializeProfileRing('blue'), 'blue');
  assert.equal(profileRingColor('app', '#123456', true), '#123456', 'segue il colore principale dell’app');
  assert.equal(profileRingColor('rose', '#123456', true), buildScheme('rose', 'mono', true).primary);
  assert.notEqual(profileRingColor('rose', '#123456', false), profileRingColor('rose', '#123456', true), 'tema chiaro e scuro');
});
