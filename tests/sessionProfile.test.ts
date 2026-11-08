import assert from 'node:assert/strict';
import { test } from 'node:test';
import { profilePhotoURL } from '../src/services/sessionProfile.ts';

test('foto profilo: Google ha precedenza sulla foto generica Firebase', () => {
  assert.equal(profilePhotoURL({ photoURL: 'https://example.com/old.png', providerData: [
    { providerId: 'other', photoURL: 'https://example.com/other.png' },
    { providerId: 'google.com', photoURL: ' https://example.com/google.png ' },
  ] }), 'https://example.com/google.png');
});

test('foto profilo: stringhe vuote non nascondono la sorgente alternativa', () => {
  assert.equal(profilePhotoURL({ photoURL: '', providerData: [{ providerId: 'google.com', photoURL: 'https://example.com/google.png' }] }), 'https://example.com/google.png');
  assert.equal(profilePhotoURL({ photoURL: ' https://example.com/profile.png ', providerData: [{ providerId: 'google.com', photoURL: '  ' }] }), 'https://example.com/profile.png');
});

test('foto profilo: dati assenti restituiscono null per mostrare l’iniziale', () => {
  assert.equal(profilePhotoURL({ photoURL: null, providerData: [] }), null);
  assert.equal(profilePhotoURL({ photoURL: ' ', providerData: [{ providerId: 'google.com', photoURL: null }] }), null);
});
