import assert from 'node:assert/strict';
import { test } from 'node:test';
import { androidBridge, authenticateOnDevice, inAndroidApp, systemBarsColor, type AndroidBridge } from '../src/services/androidApp.ts';
import { createHaptics, hapticGap, hasHaptics } from '../src/theme/haptics.ts';
import { applyDocumentTheme } from '../src/theme/bootTheme.ts';
import { english } from '../src/i18n/en.ts';

function fakeBridge(overrides: Partial<AndroidBridge> = {}) {
  const calls: unknown[][] = [];
  const bridge: AndroidBridge = {
    haptic: (kind) => { calls.push(['haptic', kind]); },
    setSystemBars: (color, dark) => { calls.push(['setSystemBars', color, dark]); },
    saveFile: (name, mime, content) => { calls.push(['saveFile', name, mime, content]); },
    canAuthenticate: () => true,
    authenticate: (id) => { calls.push(['authenticate', id]); },
    cancelAuthentication: (id) => { calls.push(['cancelAuthentication', id]); },
    ...overrides,
  };
  return { bridge, calls };
}

test('app Android: il ponte vale solo con tutti i metodi, mai nel browser', () => {
  const { bridge } = fakeBridge();
  assert.equal(androidBridge({ NummoAndroid: bridge }), bridge);
  assert.equal(inAndroidApp({ NummoAndroid: bridge }), true);
  assert.equal(androidBridge({}), undefined);
  assert.equal(androidBridge(undefined), undefined);
  assert.equal(androidBridge({ NummoAndroid: 'x' }), undefined);
  assert.equal(androidBridge({ NummoAndroid: { haptic: () => {} } }), undefined, 'app più vecchia o oggetto della pagina: ignorato');
  assert.equal(inAndroidApp(), false, 'nei test (e nel browser) non c’è');
});

test('app Android: vibrazione nativa senza durate, stesso intervallo minimo, mai un errore', () => {
  const { bridge, calls } = fakeBridge();
  let clock = 0;
  const desktop = () => ({ matches: false });
  // Even without the Vibration API and with no coarse pointer reported, the app has haptics.
  assert.equal(hasHaptics(undefined, desktop, bridge), true);
  const haptics = createHaptics(undefined, () => clock, desktop, bridge);
  assert.equal(haptics('tap', true), true);
  clock += hapticGap - 1;
  assert.equal(haptics('tick', true), false, 'troppo vicino al precedente');
  clock += 1;
  assert.equal(haptics('tick', true), true);
  clock += hapticGap;
  assert.equal(haptics('tap', false), false, 'interruttore spento');
  assert.deepEqual(calls, [['haptic', 'tap'], ['haptic', 'tick']]);
  const vibrations: unknown[] = [];
  const both = createHaptics({ vibrate: (p) => { vibrations.push(p); return true; } }, () => 0, desktop, bridge);
  assert.equal(both('tap', true), true);
  assert.deepEqual(vibrations, [], 'nell’app mai navigator.vibrate');
  const broken = createHaptics(undefined, () => 0, desktop, fakeBridge({ haptic: () => { throw new Error('gone'); } }).bridge);
  assert.equal(broken('tap', true), false);
});

test('app Android: barre di sistema col colore di sfondo del tema, solo #RRGGBB', () => {
  assert.equal(systemBarsColor('#0F1511'), '#0F1511');
  for (const value of ['red', '#fff', 'rgb(0,0,0)', '#0F151180', '']) assert.equal(systemBarsColor(value), null);
  const { bridge, calls } = fakeBridge();
  const style = { colorScheme: '', backgroundColor: '', setProperty: () => {} };
  const meta = { content: '', removeAttribute: () => {}, remove: () => {} };
  const doc = { documentElement: { style }, head: { querySelectorAll: () => [meta] }, defaultView: { NummoAndroid: bridge } };
  applyDocumentTheme(doc as unknown as Document, '#FAFDF9', false);
  applyDocumentTheme(doc as unknown as Document, '#101411', true);
  applyDocumentTheme(doc as unknown as Document, 'transparent', true);
  assert.deepEqual(calls, [['setSystemBars', '#FAFDF9', false], ['setSystemBars', '#101411', true]]);
  const failing = { ...doc, defaultView: { NummoAndroid: fakeBridge({ setSystemBars: () => { throw new Error('gone'); } }).bridge } };
  assert.doesNotThrow(() => applyDocumentTheme(failing as unknown as Document, '#101411', true));
});

test('app Android: sblocco del dispositivo, una risposta per richiesta, annullabile', async () => {
  const scope: { nummoAndroidResult?: (id: string, outcome: string) => void } = {};
  const { bridge, calls } = fakeBridge();
  const first = authenticateOnDevice(bridge, undefined, scope);
  const second = authenticateOnDevice(bridge, undefined, scope);
  const [a, b] = calls.map((call) => call[1] as string);
  assert.ok(a && b && a !== b, 'un identificativo per richiesta');
  scope.nummoAndroidResult!(b!, 'cancelled');
  scope.nummoAndroidResult!(a!, 'ok');
  scope.nummoAndroidResult!(a!, 'error');
  assert.equal(await first, 'ok');
  assert.equal(await second, 'cancelled');
  const strange = authenticateOnDevice(bridge, undefined, scope);
  scope.nummoAndroidResult!(calls.at(-1)![1] as string, 'boh');
  assert.equal(await strange, 'error', 'risposta sconosciuta = errore');
  const controller = new AbortController();
  const aborted = authenticateOnDevice(bridge, controller.signal, scope);
  const id = calls.at(-1)![1];
  controller.abort();
  assert.equal(await aborted, 'cancelled');
  assert.deepEqual(calls.at(-1), ['cancelAuthentication', id]);
  assert.equal(await authenticateOnDevice(bridge, AbortSignal.abort(), scope), 'cancelled');
  const throwing = fakeBridge({ authenticate: () => { throw new Error('gone'); } }).bridge;
  assert.equal(await authenticateOnDevice(throwing, undefined, scope), 'error');
});

test('app Android: testi della vibrazione e della sola modalità Standard tradotti', () => {
  for (const key of ["Una breve vibrazione quando interagisci con l'app. Segue le impostazioni di vibrazione di Android.",
    "Nell'app Android per ora c'è solo la modalità Standard. Per l'Avanzata usa Nummo nel browser."]) {
    assert.ok(Object.hasOwn(english, key), key);
  }
});
