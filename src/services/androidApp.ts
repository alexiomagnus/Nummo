// Nummo's Android app (`android/`, 22 November, user's request): a WebView around the published site that exposes a small
// native bridge as `window.NummoAndroid`. It exists for what a page cannot do in Chrome: haptics through Android's touch
// feedback (`performHapticFeedback`, which keeps working on silent and in Do Not Disturb, unlike `navigator.vibrate`), the
// colour of the system bars (an installed web app gets the manifest's fixed `theme_color`), saving a file (a WebView has
// no downloads) and the device's own unlock (`BiometricPrompt`: WebAuthn is not available in a WebView).
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

const methods = ['haptic', 'setSystemBars', 'saveFile', 'canAuthenticate', 'authenticate', 'cancelAuthentication'] as const;

type Scope = { NummoAndroid?: unknown; nummoAndroidResult?: (id: string, outcome: string) => void };

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

// Bar colours: only a plain `#RRGGBB` reaches the app (the theme's backgrounds always are).
export function systemBarsColor(color: string): string | null {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null;
}

const outcomes: readonly AndroidOutcome[] = ['ok', 'cancelled', 'unavailable', 'error'];
let counter = 0;
const pending = new Map<string, (outcome: AndroidOutcome) => void>();

// The device's unlock (fingerprint, face, PIN), answered by the app through `window.nummoAndroidResult(id, outcome)`.
// One answer per request; an aborted request cancels the prompt and resolves as «cancelled».
export function authenticateOnDevice(bridge: AndroidBridge, signal?: AbortSignal, scope: unknown = globalThis): Promise<AndroidOutcome> {
  const target = scope as Scope;
  target.nummoAndroidResult ??= (id, outcome) => {
    const resolve = pending.get(id);
    pending.delete(id);
    resolve?.(outcomes.includes(outcome as AndroidOutcome) ? outcome as AndroidOutcome : 'error');
  };
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
