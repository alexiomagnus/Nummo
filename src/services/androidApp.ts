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

const methods = ['haptic', 'setSystemBars', 'saveFile', 'canAuthenticate', 'authenticate', 'cancelAuthentication'] as const;
const signInMethods = ['googleProject', 'googleSignIn', 'googleSignOut'] as const;

type Scope = { NummoAndroid?: unknown; nummoAndroidResult?: (id: string, outcome: string, value?: unknown) => void };

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
