// Google Drive REST client for the backups of the «Standard» mode. Only the hidden application folder
// (`appDataFolder`, scope `drive.appdata`): Nummo can neither see nor change the user's own files. No SDK: plain
// `fetch` with the access token of googleAuth.ts, both injectable so the client is tested without a network.
import { isUtcTimestamp } from '../domain/contract.ts';
import { isBackupFileName, maxBackupBytes, newestFirst, type DriveFile } from '../domain/driveBackup.ts';

// auth: access missing, expired or revoked (ask again) · offline: no connection · quota: Drive is full ·
// config: the Drive API is not enabled for the OAuth project · missing: the file no longer exists · failed: anything else.
export type DriveErrorKind = 'auth' | 'offline' | 'quota' | 'config' | 'missing' | 'failed';
export class DriveError extends Error {
  readonly kind: DriveErrorKind;
  constructor(kind: DriveErrorKind) { super(driveErrorMessages[kind]); this.name = 'DriveError'; this.kind = kind; }
}
export const driveErrorMessages: Record<DriveErrorKind, string> = {
  auth: 'L’autorizzazione a Google Drive è scaduta o è stata revocata: collega di nuovo Google Drive.',
  offline: 'Connessione assente: Google Drive non è raggiungibile. I dati sul dispositivo non sono cambiati.',
  quota: 'Spazio di Google Drive esaurito: libera spazio e riprova.',
  config: 'Google Drive non è abilitato per questa installazione di Nummo.',
  missing: 'Il backup non esiste più su Google Drive.',
  failed: 'Google Drive non ha completato l’operazione. Riprova più tardi.',
};

const api = 'https://www.googleapis.com/drive/v3/files';
const uploadApi = 'https://www.googleapis.com/upload/drive/v3/files';
const fields = 'id,name,createdTime,size';
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

function parseFile(value: unknown): DriveFile | null {
  const v = value as { id?: unknown; name?: unknown; createdTime?: unknown; size?: unknown } | null;
  const size = Number(v?.size);
  if (!v || typeof v.id !== 'string' || !/^[\w-]{1,200}$/.test(v.id) || !isBackupFileName(v.name) || !isUtcTimestamp(v.createdTime)
    || !Number.isSafeInteger(size) || size < 0) return null;
  return { id: v.id, name: v.name, createdTime: v.createdTime, size };
}

async function failure(response: Response): Promise<DriveError> {
  if (response.status === 401) return new DriveError('auth');
  if (response.status === 404) return new DriveError('missing');
  if (response.status === 403) {
    // Only the documented reason code is read; the message (which may carry account details) is never shown or logged.
    let reason = '';
    try { reason = String(((await response.json()) as { error?: { errors?: { reason?: unknown }[] } }).error?.errors?.[0]?.reason ?? ''); } catch { /* no body */ }
    if (reason === 'storageQuotaExceeded') return new DriveError('quota');
    if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED') return new DriveError('config');
    if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') return new DriveError('failed');
    return new DriveError('auth');
  }
  return new DriveError('failed');
}

// `token` returns the current access token, or null when access must be asked again.
export function createDriveClient(token: () => string | null, fetchImpl: Fetch = (url, init) => fetch(url, init)) {
  async function call(url: string, init: RequestInit = {}): Promise<Response> {
    const access = token();
    if (!access) throw new DriveError('auth');
    let response: Response;
    try { response = await fetchImpl(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${access}` } }); }
    catch { throw new DriveError('offline'); }
    if (!response.ok) throw await failure(response);
    return response;
  }
  return {
    // Backups in the application folder, newest first. Files with other names are ignored.
    async list(): Promise<DriveFile[]> {
      const query = new URLSearchParams({ spaces: 'appDataFolder', fields: `files(${fields})`, pageSize: '100', orderBy: 'createdTime desc' });
      let body: unknown;
      try { body = await (await call(`${api}?${query}`)).json(); } catch (reason) { throw reason instanceof DriveError ? reason : new DriveError('failed'); }
      const files = (body as { files?: unknown } | null)?.files;
      if (!Array.isArray(files)) throw new DriveError('failed');
      return newestFirst(files.flatMap((file) => parseFile(file) ?? []));
    },
    // A new file each time: an upload never replaces an earlier backup.
    async upload(name: string, content: string): Promise<DriveFile> {
      if (!isBackupFileName(name)) throw new DriveError('failed');
      const boundary = `nummo-${crypto.randomUUID()}`;
      const body = [`--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify({ name, parents: ['appDataFolder'], mimeType: 'application/json' }),
        `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', content, `--${boundary}--`, ''].join('\r\n');
      const response = await call(`${uploadApi}?uploadType=multipart&fields=${fields}`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
      let file: DriveFile | null = null;
      try { file = parseFile(await response.json()); } catch { /* reported below */ }
      if (!file) throw new DriveError('failed');
      return file;
    },
    async download(file: Pick<DriveFile, 'id' | 'size'>): Promise<string> {
      if (file.size > maxBackupBytes) throw new DriveError('failed');
      const response = await call(`${api}/${encodeURIComponent(file.id)}?alt=media`);
      try { return await response.text(); } catch { throw new DriveError('offline'); }
    },
    async remove(id: string): Promise<void> {
      await call(`${api}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}
export type DriveClient = ReturnType<typeof createDriveClient>;
