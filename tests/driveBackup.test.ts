import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupVersion, makeBackup } from '../src/domain/backup.ts';
import {
  autoBackupDue, backupFileName, backupsToPrune, defaultDriveSettings, isBackupFileName, isEmptyArchive, keptBackups, parseDriveSettings, readBackup,
  frequencyLabels, type DriveFile, type DriveSettings,
} from '../src/domain/driveBackup.ts';
import { english } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/translate.ts';
import { describeSync } from '../src/features/workspace/syncStatus.ts';
import { createDriveClient, DriveError, driveErrorMessages } from '../src/services/googleDrive.ts';
import { driveScope, driveToken, googleClientId, isGoogleClientId, requestDriveAccess } from '../src/services/googleAuth.ts';
import { initialStorageMode, parseStorageMode, readStorageMode, storageModeKey, writeStorageMode } from '../src/services/storageMode.ts';
import { newerDatabase, readFailed, saveFailed, storageUnavailable } from '../src/services/localDatabase.ts';

const expense = { id: '00000000-0000-4000-8000-000000000001', amount_minor: 1250, currency: 'EUR' as const, description: 'Caffè', category_id: null, expense_date: '2026-01-31',
  recurrence: null, price_changes: [], status_changes: [], fund_id: null, list_id: null, list_items: [], source: 'web_app' as const, schema_version: 1 as const, created_at: '2026-01-31T12:00:00.000Z' };
const file = (n: number, extra: Partial<DriveFile> = {}): DriveFile => ({ id: `file-${n}`, name: `nummo-backup-202611${String(n).padStart(2, '0')}T100000Z.json`, createdTime: `2026-11-${String(n).padStart(2, '0')}T10:00:00.000Z`, size: 100, ...extra });
const connected: DriveSettings = { connected: true, auto: true, frequency: 'daily', lastBackupAt: '2026-11-10T10:00:00.000Z' };

// ---- Mode ----

test('modalità: solo valori noti, scelta salvata e ripristinata, storage negato tollerato', () => {
  assert.equal(parseStorageMode('standard'), 'standard');
  assert.equal(parseStorageMode('advanced'), 'advanced');
  for (const value of [null, '', 'firebase', 'STANDARD', '{"mode":"standard"}']) assert.equal(parseStorageMode(value), null);
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  assert.equal(readStorageMode(storage), null);
  writeStorageMode('standard', storage);
  assert.equal(data.get(storageModeKey), 'standard');
  assert.equal(readStorageMode(storage), 'standard');
  writeStorageMode(null, storage);
  assert.equal(readStorageMode(storage), null);
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
  assert.equal(readStorageMode(denied), null);
  assert.doesNotThrow(() => writeStorageMode('advanced', denied));
});

test('modalità iniziale: la scelta salvata prevale; un browser già in uso con Firebase resta Avanzata; gli altri scelgono', () => {
  assert.equal(initialStorageMode(null, null), null);
  assert.equal(initialStorageMode(null, 'cloud'), 'advanced');
  assert.equal(initialStorageMode(null, 'local'), 'advanced');
  assert.equal(initialStorageMode('standard', 'cloud'), 'standard');
  assert.equal(initialStorageMode('advanced', null), 'advanced');
});

test('stato dei dati: in locale mai «sincronizzato» né «offline», solo caricamento, errore o salvato sul dispositivo', () => {
  const local = { ready: true, online: false, pending: true, cached: true, error: null, local: true };
  assert.deepEqual([describeSync(local).kind, describeSync(local).label], ['synced', 'Sul dispositivo']);
  assert.equal(describeSync({ ...local, ready: false }).kind, 'loading');
  assert.equal(describeSync({ ...local, error: 'boom' }).kind, 'error');
  assert.doesNotMatch(JSON.stringify([describeSync(local), describeSync({ ...local, ready: false })]), /Firestore|sincronizz/i);
});

// ---- Settings and schedule ----

test('impostazioni Drive: valori non fidati ripiegano campo per campo, nessun token previsto', () => {
  assert.deepEqual(parseDriveSettings(null), defaultDriveSettings);
  assert.deepEqual(parseDriveSettings('{not json'), defaultDriveSettings);
  assert.deepEqual(parseDriveSettings(JSON.stringify({ connected: 'yes', auto: 1, frequency: 'hourly', lastBackupAt: 'ieri', access_token: 'x' })), defaultDriveSettings);
  assert.deepEqual(parseDriveSettings(JSON.stringify({ ...connected, access_token: 'x' })), connected);
  assert.deepEqual(Object.keys(defaultDriveSettings).sort(), ['auto', 'connected', 'frequency', 'lastBackupAt']);
});

test('backup automatico: solo se collegato, attivo, con dati cambiati dopo l’ultimo backup e intervallo trascorso', () => {
  const due = (change: Partial<Parameters<typeof autoBackupDue>[0]> = {}, settings: Partial<DriveSettings> = {}) =>
    autoBackupDue({ settings: { ...connected, ...settings }, lastChange: '2026-11-11T09:00:00.000Z', empty: false, now: new Date('2026-11-11T10:00:00.000Z'), ...change });
  assert.equal(due(), true);
  assert.equal(due({}, { connected: false }), false);
  assert.equal(due({}, { auto: false }), false);
  assert.equal(due({ empty: true }), false, 'un archivio vuoto non sovrascrive mai i backup');
  assert.equal(due({ lastChange: null }), false, 'dispositivo mai usato');
  assert.equal(due({ lastChange: '2026-11-10T09:00:00.000Z' }), false, 'nessuna modifica dopo il backup');
  assert.equal(due({ now: new Date('2026-11-11T09:59:00.000Z') }), false, 'intervallo giornaliero non trascorso');
  assert.equal(due({}, { frequency: 'weekly' }), false);
  assert.equal(due({ now: new Date('2026-11-17T10:00:00.000Z') }, { frequency: 'weekly' }), true);
  assert.equal(due({ now: new Date('2026-12-09T09:00:00.000Z') }, { frequency: 'monthly' }), false);
  assert.equal(due({ now: new Date('2026-12-10T10:00:00.000Z') }, { frequency: 'monthly' }), true);
  assert.equal(due({}, { lastBackupAt: null }), true, 'primo backup');
});

test('file su Drive: nome con data UTC, solo nomi propri riconosciuti, conservati i più recenti', () => {
  const name = backupFileName(new Date('2026-11-12T10:05:09.123Z'));
  assert.equal(name, 'nummo-backup-20261112T100509Z.json');
  assert.equal(isBackupFileName(name), true);
  for (const other of ['nummo-backup.json', 'altro.json', '../nummo-backup-20261112T100509Z.json', 42, null]) assert.equal(isBackupFileName(other), false);
  const files = [3, 1, 7, 5, 2, 6, 4].map((n) => file(n));
  assert.deepEqual(backupsToPrune(files).map((f) => f.id), ['file-2', 'file-1']);
  assert.equal(files.length - backupsToPrune(files).length, keptBackups);
  assert.deepEqual(backupsToPrune(files.slice(0, 3)), []);
  assert.equal(isEmptyArchive({ expenses: [], categories: [], funds: [], movements: [], lists: [], budget: [] }), true);
  assert.equal(isEmptyArchive({ expenses: [], categories: [], funds: [], movements: [], lists: [], budget: [{}] }), false);
});

test('lettura del backup: data e conteggi per la conferma; file non validi, troppo grandi o di versione futura rifiutati', () => {
  const json = makeBackup({ expenses: [expense], categories: [{ id: '00000000-0000-4000-8000-000000000002', label: 'Casa', icon: 'house' }] }, new Date('2026-11-12T10:00:00.000Z'));
  const summary = readBackup(json);
  assert.deepEqual([summary.exportedAt, summary.version, summary.expenses, summary.categories, summary.funds, summary.movements, summary.lists],
    ['2026-11-12T10:00:00.000Z', backupVersion, 1, 1, 0, 0, 0]);
  assert.equal(summary.data.expenses[0]!.id, expense.id);
  assert.equal(readBackup(json.replace('2026-11-12T10:00:00.000Z', 'ieri')).exportedAt, null, 'data non valida: mostrata quella del file');
  assert.throws(() => readBackup('{non json'), /non è un backup JSON valido/);
  assert.throws(() => readBackup(JSON.stringify({ format: 'altro', version: 1 })), /Formato backup non riconosciuto/);
  assert.throws(() => readBackup(JSON.stringify({ ...JSON.parse(json), version: backupVersion + 1 })), /versione più recente/);
  assert.throws(() => readBackup(JSON.stringify({ ...JSON.parse(json), expenses: [{ ...expense, amount_minor: -1 }] })), /non valide/);
  assert.throws(() => readBackup(' '.repeat(5_000_001)), /troppo grande/);
});

// ---- Drive client ----

type Call = { url: string; init: RequestInit };
function fakeDrive(answer: (call: Call) => Response | Promise<Response>, token: string | null = 'token-1') {
  const calls: Call[] = [];
  const client = createDriveClient(() => token, async (url, init = {}) => { const call = { url, init }; calls.push(call); return answer(call); });
  return { client, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const kind = (expected: string) => (reason: unknown) => reason instanceof DriveError && reason.kind === expected && reason.message === driveErrorMessages[reason.kind];

test('Drive: solo la cartella riservata all’app, token nell’intestazione e mai nell’URL, risposta validata', async () => {
  const { client, calls } = fakeDrive(() => json({ files: [file(1), file(3), { id: 'x', name: 'documento-personale.pdf', createdTime: file(2).createdTime, size: '9' },
    { ...file(2), size: '120' }, { id: '../etc', name: file(4).name, createdTime: file(4).createdTime, size: 1 }, null] }));
  const files = await client.list();
  assert.deepEqual(files.map((f) => f.id), ['file-3', 'file-2', 'file-1'], 'più recenti prima, file estranei o malformati ignorati');
  assert.equal(files[1]!.size, 120);
  const url = new URL(calls[0]!.url);
  assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/drive/v3/files');
  assert.equal(url.searchParams.get('spaces'), 'appDataFolder');
  assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, 'Bearer token-1');
  assert.ok(!calls[0]!.url.includes('token-1'));
  assert.equal(driveScope, 'https://www.googleapis.com/auth/drive.appdata');
});

test('Drive: caricamento come nuovo file nella cartella dell’app, scaricamento ed eliminazione', async () => {
  const content = makeBackup({ expenses: [expense], categories: [] });
  const { client, calls } = fakeDrive(({ url, init }) => init.method === 'POST' ? json(file(5)) : init.method === 'DELETE' ? new Response(null, { status: 204 })
    : url.includes('alt=media') ? new Response(content) : json({ files: [] }));
  const saved = await client.upload(file(5).name, content);
  assert.equal(saved.id, 'file-5');
  const upload = calls[0]!;
  assert.match(upload.url, /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?uploadType=multipart/);
  assert.equal(upload.init.method, 'POST');
  const body = String(upload.init.body);
  const boundary = /boundary=(.+)$/.exec((upload.init.headers as Record<string, string>)['Content-Type']!)![1]!;
  const parts = body.split(`--${boundary}`);
  assert.equal(parts.length, 4);
  assert.deepEqual(JSON.parse(parts[1]!.split('\r\n\r\n')[1]!), { name: file(5).name, parents: ['appDataFolder'], mimeType: 'application/json' });
  assert.equal(parts[2]!.split('\r\n\r\n')[1]!.replace(/\r\n$/, ''), content);
  await assert.rejects(client.upload('nummo-backup.json', content), kind('failed'), 'nome non riconosciuto');

  assert.equal(await client.download(saved), content);
  assert.match(calls.at(-1)!.url, /\/files\/file-5\?alt=media$/);
  await assert.rejects(client.download({ id: 'file-5', size: 5_000_001 }), kind('failed'));
  await client.remove('file-5');
  assert.equal(calls.at(-1)!.init.method, 'DELETE');
});

test('Drive: errori distinti per autorizzazione scaduta, rete assente, spazio esaurito, API non abilitata e file mancante', async () => {
  const forbidden = (reason: string) => json({ error: { errors: [{ reason }], message: 'dettaglio riservato utente@example.com' } }, 403);
  const cases: [string, () => Response | Promise<Response>][] = [
    ['auth', () => json({}, 401)], ['auth', () => forbidden('insufficientPermissions')], ['quota', () => forbidden('storageQuotaExceeded')],
    ['config', () => forbidden('accessNotConfigured')], ['failed', () => forbidden('userRateLimitExceeded')], ['missing', () => json({}, 404)],
    ['failed', () => json({}, 500)], ['offline', () => { throw new TypeError('Failed to fetch'); }], ['failed', () => json({ files: 'no' })],
    ['failed', () => new Response('<html>', { status: 200 })],
  ];
  for (const [expected, answer] of cases) {
    await assert.rejects(fakeDrive(answer).client.list(), (reason: unknown) => {
      assert.ok(kind(expected)(reason), `${expected}: ${String(reason)}`);
      assert.doesNotMatch((reason as Error).message, /example\.com|token/);
      return true;
    });
  }
  // No token (never granted, expired): nothing is sent.
  const without = fakeDrive(() => json({ files: [] }), null);
  await assert.rejects(without.client.list(), kind('auth'));
  await assert.rejects(without.client.upload(file(1).name, '{}'), kind('auth'));
  assert.equal(without.calls.length, 0);
  await assert.rejects(fakeDrive(() => json({ id: 'x' })).client.upload(file(1).name, '{}'), kind('failed'), 'risposta di caricamento non valida');
});

test('Google OAuth: senza ID client nulla viene simulato; solo ID client web, mai un segreto', async () => {
  assert.equal(googleClientId, '', 'i test non hanno un client configurato');
  assert.equal(driveToken(), null);
  await assert.rejects(requestDriveAccess(), kind('config'));
  assert.equal(isGoogleClientId('123456789-abc_def.apps.googleusercontent.com'), true);
  for (const value of ['', 'GOCSPX-segreto', 'https://x.apps.googleusercontent.com', 'abc.apps.googleusercontent.com.evil.example']) assert.equal(isGoogleClientId(value), false);
});

test('messaggi: errori di Drive, del dispositivo, frequenze e modalità tradotti in inglese', () => {
  for (const text of [...Object.values(driveErrorMessages), ...Object.values(frequencyLabels), storageUnavailable, newerDatabase, saveFailed, readFailed,
    'Standard', 'Avanzata', 'Consigliata', 'Archiviazione e backup', 'Cambia modalità', 'Sul dispositivo',
    'Utilizza Nummo immediatamente. I dati vengono salvati sul dispositivo e puoi proteggerli con backup su Google Drive.',
    'Collega il tuo progetto Firebase per salvare e sincronizzare i dati nel cloud.', 'I dati sono cambiati in un’altra scheda. Riapri la modifica e riprova.']) {
    assert.ok(Object.hasOwn(english, text), `Traduzione mancante: ${text}`);
    assert.equal(translate('it', text), text);
  }
  assert.equal(translate('en', 'Backup del {p0}', { p0: '12 Nov 2026, 10:00' }), 'Backup of 12 Nov 2026, 10:00');
  assert.equal(translate('en', 'Archiviazione e backup'), 'Storage and backup');
});
