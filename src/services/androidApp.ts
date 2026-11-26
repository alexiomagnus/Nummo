// Nummo's Android app (`android/`, 22 November, user's request): a WebView around the published site that exposes a small
// native bridge as `window.NummoAndroid`. It exists for what a page cannot do in Chrome: haptics through Android's touch
// feedback (`performHapticFeedback`, which keeps working on silent and in Do Not Disturb, unlike `navigator.vibrate`), the
// colour of the system bars (an installed web app gets the manifest's fixed `theme_color`), saving a file (a WebView has
// no downloads), the device's own unlock (`BiometricPrompt`: WebAuthn is not available in a WebView) and, from the app's
// version 0.2.0, Google sign-in (Credential Manager: Google refuses its sign-in page inside a WebView), for Advanced mode.
// Absent in every browser: each caller keeps its web path, unchanged. This is the only module that knows the bridge.

export type AndroidOutcome = 'ok' | 'cancelled' | 'unavailable' | 'error';

export type AndroidBridge = {
  haptic(kind: string): void;
  setSystemBars(color: string, dark: boolean): void;
  saveFile(name: string, mime: string, content: string): void;
  canAuthenticate(): boolean;
  authenticate(id: string): void;
  cancelAuthentication(id: string): void;
};

// Optional methods of later versions of the app: an older app without them stays recognised by the core above.
export type AndroidGoogleSignIn = {
  // The Firebase project whose OAuth clients the app is registered with: sign-in works only for that project.
  googleProject(): string;
  googleSignIn(id: string): void;
  googleSignOut(): void;
};

// Optional too (version 0.3.0): system notifications as local Android notifications (no Web Push in a WebView). The page
// sends the same reminder times as to the push service; the app shows them with the service worker's words.
export type AndroidNotifications = {
  notificationStatus(): string;
  requestNotifications(id: string): void;
  scheduleNotifications(lang: string, jobs: string): boolean;
  disableNotifications(): void;
  testNotification(lang: string, delaySeconds: number): void;
  takeSnoozes(): string;
  openNotificationSettings(): void;
};

const methods = ['haptic', 'setSystemBars', 'saveFile', 'canAuthenticate', 'authenticate', 'cancelAuthentication'] as const;
const signInMethods = ['googleProject', 'googleSignIn', 'googleSignOut'] as const;
const notificationMethods = ['notificationStatus', 'requestNotifications', 'scheduleNotifications', 'disableNotifications',
  'testNotification', 'takeSnoozes', 'openNotificationSettings'] as const;

type Scope = {
  NummoAndroid?: unknown;
  nummoAndroidResult?: (id: string, outcome: string, value?: unknown) => void;
  nummoAndroidUpdate?: (id: string, received: unknown, total: unknown) => void;
};

// The bridge only if every method is there (an older app, or a page object of that name, is ignored).
export function androidBridge(scope: unknown = globalThis): AndroidBridge | undefined {
  const value = (scope as Scope | null | undefined)?.NummoAndroid;
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return methods.every((name) => typeof record[name] === 'function') ? value as AndroidBridge : undefined;
}

export function inAndroidApp(scope: unknown = globalThis): boolean {
  return androidBridge(scope) !== undefined;
}

// Google sign-in of the app, only for the Firebase project it is registered with (`projectId` of the page's config): a
// project connected from «Collega il tuo Firebase» has no OAuth client for the app.
export function androidGoogleSignIn(projectId: string, scope: unknown = globalThis): (AndroidBridge & AndroidGoogleSignIn) | undefined {
  const bridge = androidBridge(scope);
  if (!bridge) return undefined;
  const record = bridge as unknown as Record<string, unknown>;
  if (!signInMethods.every((name) => typeof record[name] === 'function')) return undefined;
  const full = bridge as AndroidBridge & AndroidGoogleSignIn;
  try { return projectId !== '' && full.googleProject() === projectId ? full : undefined; } catch { return undefined; }
}

export function androidNotifications(scope: unknown = globalThis): (AndroidBridge & AndroidNotifications) | undefined {
  const bridge = androidBridge(scope);
  if (!bridge) return undefined;
  const record = bridge as unknown as Record<string, unknown>;
  return notificationMethods.every((name) => typeof record[name] === 'function') ? bridge as AndroidBridge & AndroidNotifications : undefined;
}

// Optional too (version 0.3.5): the app's version for the «Info» page. Only the APK has one to show; an app without the method
// (0.3.4 and earlier), a browser or an installed web app give null. Validated: a short dotted name and a positive build number.
export type AndroidAppVersion = { name: string; code: number };
export function androidAppVersion(scope: unknown = globalThis): AndroidAppVersion | null {
  const bridge = androidBridge(scope) as (AndroidBridge & { appVersion?: unknown }) | undefined;
  if (!bridge || typeof bridge.appVersion !== 'function') return null;
  try {
    const value: unknown = JSON.parse(String((bridge.appVersion as () => unknown).call(bridge)));
    const { name, code } = (value ?? {}) as { name?: unknown; code?: unknown };
    return typeof name === 'string' && /^\d{1,4}(\.\d{1,4}){0,3}$/.test(name) && Number.isSafeInteger(code) && (code as number) > 0
      ? { name, code: code as number } : null;
  } catch { return null; }
}

// Optional too (version 0.3.11, 27 November, on request): Material You, the system's tonal palettes (Android 12+). Five palettes
// (accent 1, 2, 3, neutral 1, 2) of the thirteen tones of Android's resources, every value a #RRGGBB; anything else gives null
// (an older app, Android 11, a browser): the page then offers no Material You.
export const systemToneKeys = ['0', '10', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'] as const;
export const systemPaletteNames = ['a1', 'a2', 'a3', 'n1', 'n2'] as const;
export type SystemColors = Record<(typeof systemPaletteNames)[number], Record<(typeof systemToneKeys)[number], string>>;
export function androidSystemColors(scope: unknown = globalThis): SystemColors | null {
  const bridge = androidBridge(scope) as (AndroidBridge & { systemColors?: unknown }) | undefined;
  if (!bridge || typeof bridge.systemColors !== 'function') return null;
  try {
    const raw = String((bridge.systemColors as () => unknown).call(bridge));
    if (raw === '') return null;
    const value = JSON.parse(raw) as Record<string, Record<string, unknown> | undefined>;
    for (const name of systemPaletteNames) for (const tone of systemToneKeys) {
      const color = value[name]?.[tone];
      if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) return null;
    }
    return value as unknown as SystemColors;
  } catch { return null; }
}

// Optional too (version 0.3.6, 27 November, on request): updates of the app from the repository's GitHub Releases
// (Updater.kt). The app downloads the APK of a release (only from this repository's downloads), checks its SHA-256 when the
// release gives one, its package, its version and that it is signed with the same key as the installed app, then hands it to
// Android's installer, which always asks the user to confirm. Android's «install unknown apps» permission for Nummo is
// asked by opening its settings page. An older app (0.3.5) has none of this: the page opens the release on GitHub instead.
export type AndroidUpdater = {
  canInstallUpdates(): boolean;
  allowUpdateInstalls(id: string): void;
  updateDownload(id: string, url: string, sha256: string, sha256Url: string, size: number): void;
  updateCancel(id: string): void;
  updateInstall(id: string): void;
};
const updaterMethods = ['canInstallUpdates', 'allowUpdateInstalls', 'updateDownload', 'updateCancel', 'updateInstall'] as const;

export function androidUpdater(scope: unknown = globalThis): (AndroidBridge & AndroidUpdater) | undefined {
  const bridge = androidBridge(scope);
  if (!bridge) return undefined;
  const record = bridge as unknown as Record<string, unknown>;
  return updaterMethods.every((name) => typeof record[name] === 'function') ? bridge as AndroidBridge & AndroidUpdater : undefined;
}

// Why a download failed (Updater.kt): network, integrity (SHA-256 differs), signature (another key), package (another app),
// version (not newer than the installed one), storage (no room), or anything else.
export type UpdateFailure = 'network' | 'integrity' | 'signature' | 'package' | 'version' | 'storage' | 'error';
const failures: readonly UpdateFailure[] = ['network', 'integrity', 'signature', 'package', 'version', 'storage', 'error'];
export type UpdateDownloadResult = { outcome: 'ok' } | { outcome: 'cancelled' } | { outcome: 'error'; reason: UpdateFailure };
export type UpdateDownload = { url: string; sha256: string | null; sha256Url: string | null; size: number };

const progressListeners = new Map<string, (received: number, total: number) => void>();
function listenProgress(scope: unknown): void {
  const target = scope as Scope;
  target.nummoAndroidUpdate ??= (id, received, total) => {
    if (typeof received === 'number' && typeof total === 'number') progressListeners.get(id)?.(received, total);
  };
}

// Downloads and verifies the APK; progress through `window.nummoAndroidUpdate(id, received, total)`, the end through
// `nummoAndroidResult(id, outcome, reason)`. Aborting cancels the download (the partial file is deleted by the app).
export function downloadUpdateOnDevice(bridge: AndroidUpdater, request: UpdateDownload, onProgress: (received: number, total: number) => void,
  signal?: AbortSignal, scope: unknown = globalThis): Promise<UpdateDownloadResult> {
  listen(scope);
  listenProgress(scope);
  if (signal?.aborted) return Promise.resolve({ outcome: 'cancelled' });
  counter += 1;
  const id = `update-${counter}`;
  return new Promise((resolve) => {
    const finish = (result: UpdateDownloadResult) => {
      progressListeners.delete(id);
      signal?.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = () => {
      if (!pending.delete(id)) return;
      try { bridge.updateCancel(id); } catch { /* already finished */ }
      finish({ outcome: 'cancelled' });
    };
    progressListeners.set(id, onProgress);
    pending.set(id, (outcome, value) => {
      if (outcome === 'ok') finish({ outcome: 'ok' });
      else if (outcome === 'cancelled') finish({ outcome: 'cancelled' });
      else finish({ outcome: 'error', reason: failures.includes(value as UpdateFailure) ? value as UpdateFailure : 'error' });
    });
    signal?.addEventListener('abort', abort);
    try { bridge.updateDownload(id, request.url, request.sha256 ?? '', request.sha256Url ?? '', request.size); }
    catch { pending.delete(id); finish({ outcome: 'error', reason: 'error' }); }
  });
}

// Android's settings page «install unknown apps» for Nummo: ok = allowed on the way back, cancelled = still not allowed.
export function allowUpdateInstallsOnDevice(bridge: AndroidUpdater, scope: unknown = globalThis): Promise<AndroidOutcome> {
  listen(scope);
  counter += 1;
  const id = `install-permission-${counter}`;
  return new Promise((resolve) => {
    pending.set(id, (outcome) => resolve(outcome));
    try { bridge.allowUpdateInstalls(id); } catch { pending.delete(id); resolve('error'); }
  });
}

// Hands the verified APK to Android's installer, which asks the user to confirm. A confirmed update replaces the app (and
// closes it): the page gets no answer then. cancelled = the user declined, unavailable = no permission or no verified file.
export function installUpdateOnDevice(bridge: AndroidUpdater, scope: unknown = globalThis): Promise<AndroidOutcome> {
  listen(scope);
  counter += 1;
  const id = `install-${counter}`;
  return new Promise((resolve) => {
    pending.set(id, (outcome) => resolve(outcome));
    try { bridge.updateInstall(id); } catch { pending.delete(id); resolve('error'); }
  });
}

// Bar colours: only a plain `#RRGGBB` reaches the app (the theme's backgrounds always are).
export function systemBarsColor(color: string): string | null {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null;
}

const outcomes: readonly AndroidOutcome[] = ['ok', 'cancelled', 'unavailable', 'error'];
let counter = 0;
const pending = new Map<string, (outcome: AndroidOutcome, value: unknown) => void>();

// Answers of the app arrive through one global function, by request ID; each request is answered once.
function listen(scope: unknown): void {
  const target = scope as Scope;
  target.nummoAndroidResult ??= (id, outcome, value) => {
    const resolve = pending.get(id);
    pending.delete(id);
    resolve?.(outcomes.includes(outcome as AndroidOutcome) ? outcome as AndroidOutcome : 'error', value);
  };
}

// The device's unlock (fingerprint, face, PIN), answered by the app through `window.nummoAndroidResult(id, outcome)`.
// One answer per request; an aborted request cancels the prompt and resolves as «cancelled».
export function authenticateOnDevice(bridge: AndroidBridge, signal?: AbortSignal, scope: unknown = globalThis): Promise<AndroidOutcome> {
  listen(scope);
  if (signal?.aborted) return Promise.resolve('cancelled');
  counter += 1;
  const id = `lock-${counter}`;
  return new Promise((resolve) => {
    const finish = (outcome: AndroidOutcome) => { signal?.removeEventListener('abort', abort); resolve(outcome); };
    const abort = () => {
      if (!pending.delete(id)) return;
      try { bridge.cancelAuthentication(id); } catch { /* prompt already gone */ }
      finish('cancelled');
    };
    pending.set(id, finish);
    signal?.addEventListener('abort', abort);
    try { bridge.authenticate(id); } catch { pending.delete(id); finish('error'); }
  });
}

// Google's ID token for the account the user picks (system sheet), to sign in to Firebase with it. `unavailable`: no Google
// account on the device (or the app is not registered with the project). A token is only ever a bounded JWT-shaped string.
export type GoogleSignInResult = { outcome: 'ok'; idToken: string } | { outcome: Exclude<AndroidOutcome, 'ok'> };

export function googleSignInOnDevice(bridge: AndroidGoogleSignIn, scope: unknown = globalThis): Promise<GoogleSignInResult> {
  listen(scope);
  counter += 1;
  const id = `google-${counter}`;
  return new Promise((resolve) => {
    pending.set(id, (outcome, value) => {
      if (outcome !== 'ok') { resolve({ outcome }); return; }
      const token = typeof value === 'string' && value.length <= 8192 && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value) ? value : null;
      resolve(token ? { outcome, idToken: token } : { outcome: 'error' });
    });
    try { bridge.googleSignIn(id); } catch { pending.delete(id); resolve({ outcome: 'error' }); }
  });
}

// The notification permission (Android 13+) asked by the app: ok = granted and turned on, cancelled = refused this
// time, unavailable = refused for good (only Android's settings can allow it now).
export function requestNotificationsOnDevice(bridge: AndroidNotifications, scope: unknown = globalThis): Promise<AndroidOutcome> {
  listen(scope);
  counter += 1;
  const id = `notifications-${counter}`;
  return new Promise((resolve) => {
    pending.set(id, (outcome) => resolve(outcome));
    try { bridge.requestNotifications(id); } catch { pending.delete(id); resolve('error'); }
  });
}
