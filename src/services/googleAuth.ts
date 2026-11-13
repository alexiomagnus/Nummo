// Google authorisation for the Drive backups of the «Standard» mode: Google Identity Services, token model for
// browser apps. No client secret exists or is needed; the client ID is a public identifier set at build time.
// The access token (about one hour) lives only in this module's memory: never in localStorage, IndexedDB or a URL.
// When it expires access is simply asked again. Google's script is loaded only when the user links Drive.
import { DriveError } from './googleDrive.ts';

export const driveScope = 'https://www.googleapis.com/auth/drive.appdata';
const scriptUrl = 'https://accounts.google.com/gsi/client';
const clientIdPattern = /^[\w-]+\.apps\.googleusercontent\.com$/;
const configured = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
// Empty = this build has no Google OAuth client: Drive is shown as not available, never simulated.
export const googleClientId = clientIdPattern.test(configured) ? configured : '';
export const isGoogleClientId = (value: string): boolean => clientIdPattern.test(value);

type TokenResponse = { access_token?: string; expires_in?: number | string; error?: string };
type TokenClient = { requestAccessToken(options?: { prompt?: string }): void };
type GoogleOAuth = {
  initTokenClient(config: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback?: (error: { type?: string }) => void }): TokenClient;
  hasGrantedAllScopes(response: TokenResponse, scope: string): boolean;
  revoke(token: string, done?: () => void): void;
};
const oauth = (): GoogleOAuth | undefined => (globalThis as { google?: { accounts?: { oauth2?: GoogleOAuth } } }).google?.accounts?.oauth2;

let loading: Promise<void> | undefined;
function loadScript(): Promise<void> {
  if (oauth()) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl; script.async = true;
    script.onload = () => (oauth() ? resolve() : reject(new DriveError('failed')));
    script.onerror = () => { script.remove(); loading = undefined; reject(new DriveError('offline')); };
    document.head.appendChild(script);
  });
  return loading;
}

// Fetches Google's script ahead of a press, so that the account window opens within the browser's click allowance.
export function preloadDriveAuth(): void { if (googleClientId) loadScript().catch(() => { /* reported at the press */ }); }

let current: { token: string; expiresAt: number } | null = null;
// The token while it is still good for at least a minute; otherwise null (access must be asked again).
export function driveToken(): string | null {
  if (current && current.expiresAt - Date.now() < 60_000) current = null;
  return current?.token ?? null;
}

// Only from a button press: Google opens its account window (browsers block it otherwise) and shows the consent
// screen the first time; later it closes by itself while the Google session and the consent are still valid.
// There is no silent or background renewal in a browser-only app: that would need a server holding a refresh token.
export async function requestDriveAccess(): Promise<void> {
  if (!googleClientId) throw new DriveError('config');
  if (driveToken()) return;
  await loadScript();
  const google = oauth()!;
  await new Promise<void>((resolve, reject) => {
    const client = google.initTokenClient({
      client_id: googleClientId, scope: driveScope,
      callback: (response) => {
        const seconds = Number(response.expires_in);
        // Refused, or the Drive permission was unticked on Google's consent screen.
        if (response.error || !response.access_token || !Number.isFinite(seconds) || !google.hasGrantedAllScopes(response, driveScope)) { reject(new DriveError('auth')); return; }
        current = { token: response.access_token, expiresAt: Date.now() + seconds * 1000 };
        resolve();
      },
      // Popup closed or blocked.
      error_callback: () => reject(new DriveError('auth')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}
// After Drive refused the token (expired early or revoked from the Google account).
export function forgetDriveAccess(): void { current = null; }

// Forgets the token and asks Google to revoke the permission granted to Nummo (best effort: offline it only forgets).
export function revokeDriveAccess(): void {
  const token = current?.token;
  current = null;
  if (token) try { oauth()?.revoke(token); } catch { /* forgotten locally anyway */ }
}
