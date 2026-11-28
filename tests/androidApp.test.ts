import assert from 'node:assert/strict';
import { test } from 'node:test';
import { androidAppVersion, androidBridge, androidGoogleSignIn, androidNotifications, authenticateOnDevice, googleSignInOnDevice, inAndroidApp, requestNotificationsOnDevice, systemBarsColor, type AndroidBridge } from '../src/services/androidApp.ts';
import { pushSupport } from '../src/services/pushNotifications.ts';
import { signInError } from '../src/features/session/signInError.ts';
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

test('app Android: vibrazione nativa, un solo effetto, stesso intervallo minimo, mai un errore', () => {
  const { bridge, calls } = fakeBridge();
  let clock = 0;
  assert.equal(hasHaptics(bridge), true);
  const haptics = createHaptics(bridge, () => clock);
  assert.equal(haptics(true), true);
  clock += hapticGap - 1;
  assert.equal(haptics(true), false, 'troppo vicino al precedente');
  clock += 1;
  assert.equal(haptics(true), true);
  clock += hapticGap;
  assert.equal(haptics(false), false, 'interruttore spento');
  assert.deepEqual(calls, [['haptic', 'tap'], ['haptic', 'tap']]);
  const broken = createHaptics(fakeBridge({ haptic: () => { throw new Error('gone'); } }).bridge, () => 0);
  assert.equal(broken(true), false);
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
  for (const key of ["Una breve vibrazione quando tocchi l'app.",
    "Questa versione dell'app Android offre solo la modalità Standard: aggiornala o usa Nummo nel browser.",
    "Nessun account Google su questo telefono: aggiungine uno nelle impostazioni di Android e riprova."]) {
    assert.ok(Object.hasOwn(english, key), key);
  }
});

test('app Android: accesso Google solo con un\'app che lo offre e per il suo progetto', () => {
  const { bridge } = fakeBridge();
  assert.equal(androidGoogleSignIn('nummo-6b6e2', { NummoAndroid: bridge }), undefined, 'app 0.1.0: niente accesso, ma resta l\'app');
  assert.equal(inAndroidApp({ NummoAndroid: bridge }), true);
  const full = { ...bridge, googleProject: () => 'nummo-6b6e2', googleSignIn: () => {}, googleSignOut: () => {} };
  assert.equal(androidGoogleSignIn('nummo-6b6e2', { NummoAndroid: full }), full);
  assert.equal(androidGoogleSignIn('altro-progetto', { NummoAndroid: full }), undefined, 'Firebase collegato: nessun client OAuth dell\'app');
  assert.equal(androidGoogleSignIn('', { NummoAndroid: { ...full, googleProject: () => '' } }), undefined);
  assert.equal(androidGoogleSignIn('nummo-6b6e2', { NummoAndroid: { ...full, googleProject: () => { throw new Error('x'); } } }), undefined);
  assert.equal(androidGoogleSignIn('nummo-6b6e2', {}), undefined);
});

test('app Android: token Google solo se ha la forma di un JWT, esiti tradotti in codici di accesso', async () => {
  const scope: { nummoAndroidResult?: (id: string, outcome: string, value?: unknown) => void } = {};
  const ids: string[] = [];
  const bridge = { googleProject: () => 'p', googleSignIn: (id: string) => { ids.push(id); }, googleSignOut: () => {} };
  const ask = async (outcome: string, value?: unknown) => {
    const result = googleSignInOnDevice(bridge, scope);
    scope.nummoAndroidResult!(ids.at(-1)!, outcome, value);
    return result;
  };
  assert.deepEqual(await ask('ok', 'aaa.bbb.ccc'), { outcome: 'ok', idToken: 'aaa.bbb.ccc' });
  assert.deepEqual(await ask('ok', 'non un token'), { outcome: 'error' });
  assert.deepEqual(await ask('ok', undefined), { outcome: 'error' });
  assert.deepEqual(await ask('ok', `a.${'b'.repeat(9000)}.c`), { outcome: 'error' });
  assert.deepEqual(await ask('cancelled'), { outcome: 'cancelled' });
  assert.deepEqual(await ask('unavailable'), { outcome: 'unavailable' });
  const throwing = { ...bridge, googleSignIn: () => { throw new Error('gone'); } };
  assert.deepEqual(await googleSignInOnDevice(throwing, scope), { outcome: 'error' });
  // The codes firebase.ts uses for them: a dismissed sheet is silent, no account says what to do.
  assert.equal(signInError('auth/popup-closed-by-user'), null);
  assert.match(signInError('auth/app-no-google-account')!, /Nessun account Google/);
  assert.equal(signInError('auth/app-sign-in-failed'), 'Accesso non riuscito (auth/app-sign-in-failed). Riprova.');
});

test('app Android: notifiche di sistema dall\'app (0.3.0), senza servizio push né service worker', async () => {
  const { bridge } = fakeBridge();
  const asked: string[] = [];
  const notifications = { ...bridge, notificationStatus: () => 'off', requestNotifications: (id: string) => { asked.push(id); },
    scheduleNotifications: () => true, disableNotifications: () => {}, testNotification: () => {}, takeSnoozes: () => '[]', openNotificationSettings: () => {} };
  assert.equal(androidNotifications({ NummoAndroid: bridge }), undefined, 'app più vecchia: notifiche come nel browser (assenti)');
  assert.equal(androidNotifications({ NummoAndroid: notifications }), notifications);
  // Supported in the app even where the browser has no Web Push and no push service is configured.
  const win = { NummoAndroid: notifications } as unknown as Window & typeof globalThis;
  assert.equal(pushSupport({ window: win, navigator: {} as Navigator }, false), 'supported');
  assert.equal(pushSupport({ window: {} as Window & typeof globalThis, navigator: { userAgent: '' } as Navigator }, false), 'unsupported');
  // iPhone: only from the app added to the Home Screen, even if a Safari tab exposes the push objects.
  const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', maxTouchPoints: 5, serviceWorker: {} } as unknown as Navigator;
  const tab = { PushManager: {}, Notification: {}, isSecureContext: true, matchMedia: () => ({ matches: false }) } as unknown as Window & typeof globalThis;
  const home = { ...tab, matchMedia: () => ({ matches: true }) } as unknown as Window & typeof globalThis;
  assert.equal(pushSupport({ window: tab, navigator: iphone }, true), 'needs-install');
  assert.equal(pushSupport({ window: home, navigator: iphone }, true), 'supported');
  assert.equal(pushSupport({ window: tab, navigator: { ...iphone, standalone: true } as Navigator }, true), 'supported');
  const scope: { nummoAndroidResult?: (id: string, outcome: string) => void } = {};
  for (const outcome of ['ok', 'cancelled', 'unavailable'] as const) {
    const result = requestNotificationsOnDevice(notifications, scope);
    scope.nummoAndroidResult!(asked.at(-1)!, outcome);
    assert.equal(await result, outcome);
  }
});

test('app Android: versione dell’app solo dal ponte 0.3.5, validata; altrove nessuna', () => {
  const withVersion = (value: unknown) => ({ NummoAndroid: { ...fakeBridge().bridge, appVersion: () => value } });
  assert.deepEqual(androidAppVersion(withVersion('{"name":"0.3.5","code":8}')), { name: '0.3.5', code: 8 });
  assert.equal(androidAppVersion({ NummoAndroid: fakeBridge().bridge }), null, 'app 0.3.4 e precedenti: nessun metodo');
  assert.equal(androidAppVersion({}), null, 'browser e web app installata');
  assert.equal(androidAppVersion(withVersion('{"name":"<b>1</b>","code":8}')), null);
  assert.equal(androidAppVersion(withVersion('{"name":"0.3.5","code":0}')), null);
  assert.equal(androidAppVersion(withVersion('non json')), null);
  assert.equal(androidAppVersion({ NummoAndroid: { ...fakeBridge().bridge, appVersion: () => { throw new Error('x'); } } }), null);
});

test('top inset of the app: validated, 0 without the method or outside the app', async () => {
  const { androidTopInset, parseTopInset } = await import('../src/services/androidApp.ts');
  assert.equal(parseTopInset(24), 24);
  assert.equal(parseTopInset(-1), 0);
  assert.equal(parseTopInset(NaN), 0);
  assert.equal(parseTopInset('24'), 0);
  assert.equal(androidTopInset({}), 0);
  const full = { haptic() {}, setSystemBars() {}, saveFile() {}, canAuthenticate: () => false, authenticate() {}, cancelAuthentication() {} };
  assert.equal(androidTopInset({ NummoAndroid: full }), 0);
  assert.equal(androidTopInset({ NummoAndroid: { ...full, topInset: () => 28.5 } }), 28.5);
  assert.equal(androidTopInset({ NummoAndroid: { ...full, topInset: () => { throw new Error('x'); } } }), 0);
});
