import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  availableUpdate, compareVersions, downloadProgress, parseVersion, readRelease, readReleases, readUpdateCheckState,
  releaseNoteBlocks, releaseSummary, updateCheckDue, updateCheckInterval,
} from '../src/domain/appUpdate.ts';
import { fetchReleases, lastUpdateCheck, ReleasesError, saveUpdateCheck } from '../src/services/appUpdate.ts';
import {
  allowUpdateInstallsOnDevice, androidUpdater, downloadUpdateOnDevice, installUpdateOnDevice, type AndroidBridge, type AndroidUpdater,
} from '../src/services/androidApp.ts';

const base = 'https://github.com/alexiomagnus/Nummo/releases/download';
const hash = 'af4d10f947621e5149f0d9782e5762f4b34ea9baba2ddaea18d5d5f633487e8e';

// The shape of GitHub's API (releases list), reduced to the fields read.
function apiRelease(version: string, overrides: Record<string, unknown> = {}, apk: Record<string, unknown> = {}) {
  const tag = `android-v${version}`;
  return {
    tag_name: tag, name: `Nummo Android ${version}`, draft: false, prerelease: false,
    html_url: `https://github.com/alexiomagnus/Nummo/releases/tag/${tag}`, published_at: '2026-11-26T11:47:52Z',
    body: `## Novità della ${version}\n- **Uno:** due`,
    assets: [
      { name: `nummo-${version}.apk`, size: 9_221_900, digest: `sha256:${hash}`, browser_download_url: `${base}/${tag}/nummo-${version}.apk`, ...apk },
      { name: `nummo-${version}.apk.sha256`, size: 82, browser_download_url: `${base}/${tag}/nummo-${version}.apk.sha256` },
    ],
    ...overrides,
  };
}

test('aggiornamenti: versioni confrontate per numero, parte per parte', () => {
  assert.deepEqual(parseVersion('0.3.10'), [0, 3, 10]);
  assert.equal(parseVersion('v0.3'), null);
  assert.equal(parseVersion('0.3.5-beta'), null);
  assert.equal(compareVersions('0.3.10', '0.3.9'), 1, 'non in ordine alfabetico');
  assert.equal(compareVersions('0.3', '0.3.0'), 0);
  assert.equal(compareVersions('0.3.5', '0.4.0'), -1);
  assert.equal(compareVersions('1.0.0', '0.99.99'), 1);
});

test('aggiornamenti: release valida con APK, digest e file .sha256 del repository', () => {
  const release = readRelease(apiRelease('0.3.6'));
  assert.ok(release);
  assert.equal(release.version, '0.3.6');
  assert.equal(release.apk.url, `${base}/android-v0.3.6/nummo-0.3.6.apk`);
  assert.equal(release.apk.sha256, hash);
  assert.equal(release.apk.sha256Url, `${base}/android-v0.3.6/nummo-0.3.6.apk.sha256`);
  assert.equal(release.apk.size, 9_221_900);
  assert.equal(release.publishedAt, '2026-11-26T11:47:52Z');
  // Senza digest resta il file .sha256; senza entrambi nessuna verifica del contenuto (la firma è comunque controllata dall'app).
  const plain = readRelease(apiRelease('0.3.6', {}, { digest: undefined }));
  assert.equal(plain?.apk.sha256, null);
  assert.ok(plain?.apk.sha256Url);
});

test('aggiornamenti: scartate bozze, anteprime, altri tag, APK mancanti o di altri indirizzi', () => {
  assert.equal(readRelease(apiRelease('0.3.6', { draft: true })), null);
  assert.equal(readRelease(apiRelease('0.3.6', { prerelease: true })), null);
  assert.equal(readRelease(apiRelease('0.3.6', { tag_name: 'v0.3.6' })), null);
  assert.equal(readRelease(apiRelease('0.3.6', { tag_name: 'android-vlatest' })), null);
  assert.equal(readRelease(apiRelease('0.3.6', { assets: [] })), null);
  assert.equal(readRelease(apiRelease('0.3.6', {}, { browser_download_url: 'https://example.com/nummo-0.3.6.apk' })), null, 'solo i download del repository');
  assert.equal(readRelease(apiRelease('0.3.6', {}, { browser_download_url: `${base}/android-v0.3.5/nummo-0.3.6.apk` })), null, 'tag diverso');
  assert.equal(readRelease(apiRelease('0.3.6', {}, { size: 0 })), null);
  assert.equal(readRelease(apiRelease('0.3.6', {}, { size: 500 * 1024 * 1024 })), null);
  assert.equal(readRelease(apiRelease('0.3.6', {}, { digest: 'sha256:xyz' }))?.apk.sha256, null, 'digest non valido ignorato');
  assert.equal(readRelease(apiRelease('0.3.6', { html_url: 'https://evil.example/x' }))?.pageUrl,
    'https://github.com/alexiomagnus/Nummo/releases/tag/android-v0.3.6');
  assert.deepEqual(readReleases({ message: 'Not Found' }), []);
});

test('aggiornamenti: la più recente sopra la versione installata, mai una precedente', () => {
  const releases = readReleases([apiRelease('0.3.5'), apiRelease('0.3.10'), apiRelease('0.3.6'), { junk: true }]);
  assert.deepEqual(releases.map((release) => release.version), ['0.3.10', '0.3.6', '0.3.5']);
  assert.equal(availableUpdate('0.3.5', releases)?.version, '0.3.10');
  assert.equal(availableUpdate('0.3.10', releases), null, 'già aggiornata');
  assert.equal(availableUpdate('0.4.0', releases), null, 'più nuova della release (build locale)');
  assert.equal(availableUpdate('x', releases), null);
  assert.equal(availableUpdate('0.3.5', []), null);
});

test('aggiornamenti: controllo automatico al massimo ogni 24 ore', () => {
  const now = Date.parse('2026-11-27T09:00:00Z');
  assert.equal(updateCheckDue(null, now), true, 'mai controllato');
  assert.equal(updateCheckDue(now - updateCheckInterval + 1, now), false);
  assert.equal(updateCheckDue(now - updateCheckInterval, now), true);
  assert.equal(updateCheckDue(now + 60_000, now), true, 'orologio spostato indietro: non blocca per sempre');
  assert.deepEqual(readUpdateCheckState('{"checkedAt":5}'), { checkedAt: 5 });
  assert.deepEqual(readUpdateCheckState('{"checkedAt":"x"}'), { checkedAt: null });
  assert.deepEqual(readUpdateCheckState('rotto'), { checkedAt: null });
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  assert.equal(lastUpdateCheck(storage), null);
  saveUpdateCheck(now, storage);
  assert.equal(lastUpdateCheck(storage), now);
  assert.deepEqual([...store.keys()], ['nummo.appUpdate.v1']);
});

test('aggiornamenti: note di rilascio in blocchi, link e HTML come testo', () => {
  const blocks = releaseNoteBlocks('Intro su\ndue righe.\n\n## Novità\n- **Versione:** in `Info`\n1. Scarica [il file](https://x)\n---\n<b>x</b>');
  assert.deepEqual(blocks.map((block) => block.kind), ['paragraph', 'heading', 'bullet', 'number', 'paragraph']);
  assert.deepEqual(blocks[0]?.spans, [{ text: 'Intro su due righe.' }]);
  assert.deepEqual(blocks[2]?.spans, [{ text: 'Versione:', bold: true }, { text: ' in ' }, { text: 'Info', code: true }]);
  assert.equal(blocks[3]?.marker, '1.');
  assert.deepEqual(blocks[3]?.spans, [{ text: 'Scarica il file' }]);
  assert.deepEqual(blocks[4]?.spans, [{ text: '<b>x</b>' }]);
  assert.deepEqual(releaseNoteBlocks(''), []);
});

test('aggiornamenti: avanzamento del download', () => {
  assert.equal(downloadProgress(50, 200), 0.25);
  assert.equal(downloadProgress(300, 200), 1);
  assert.equal(downloadProgress(10, 0), null);
});

test('aggiornamenti: lettura delle release da GitHub, errori distinti', async () => {
  let asked = '';
  const ok = (async (url: string) => { asked = url; return new Response(JSON.stringify([apiRelease('0.3.6')]), { status: 200 }); }) as typeof fetch;
  const releases = await fetchReleases(undefined, ok);
  assert.equal(asked, 'https://api.github.com/repos/alexiomagnus/Nummo/releases?per_page=20');
  assert.equal(releases[0]?.version, '0.3.6');
  const failing = (status: number) => (async () => new Response('{}', { status })) as typeof fetch;
  await assert.rejects(fetchReleases(undefined, failing(403)), (error) => error instanceof ReleasesError && error.reason === 'limited');
  await assert.rejects(fetchReleases(undefined, failing(500)), (error) => error instanceof ReleasesError && error.reason === 'unavailable');
  const offline = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
  await assert.rejects(fetchReleases(undefined, offline), (error) => error instanceof ReleasesError && error.reason === 'offline');
});

function updaterBridge() {
  const calls: unknown[][] = [];
  const core: AndroidBridge = { haptic() {}, setSystemBars() {}, saveFile() {}, canAuthenticate: () => false, authenticate() {}, cancelAuthentication() {} };
  const updater: AndroidUpdater = {
    canInstallUpdates: () => false,
    allowUpdateInstalls: (id) => { calls.push(['allow', id]); },
    updateDownload: (id, url, sha256, sha256Url, size) => { calls.push(['download', id, url, sha256, sha256Url, size]); },
    updateCancel: (id) => { calls.push(['cancel', id]); },
    updateInstall: (id) => { calls.push(['install', id]); },
  };
  return { bridge: { ...core, ...updater }, calls };
}

test('app Android: aggiornamento solo con tutti i metodi (dalla 0.3.6), la 0.3.5 resta riconosciuta senza', () => {
  const { bridge } = updaterBridge();
  assert.equal(androidUpdater({ NummoAndroid: bridge }), bridge);
  const { updateInstall: _dropped, ...older } = bridge;
  assert.equal(androidUpdater({ NummoAndroid: older }), undefined);
  assert.equal(androidUpdater({}), undefined);
});

test('app Android: download con avanzamento, esito e motivo; annullabile', async () => {
  const { bridge, calls } = updaterBridge();
  const scope: Record<string, unknown> = { NummoAndroid: bridge };
  const seen: number[] = [];
  const request = { url: `${base}/android-v0.3.6/nummo-0.3.6.apk`, sha256: hash, sha256Url: null, size: 100 };
  const done = downloadUpdateOnDevice(bridge, request, (received) => seen.push(received), undefined, scope);
  const id = calls[0]?.[1] as string;
  assert.deepEqual(calls[0], ['download', id, request.url, hash, '', 100]);
  (scope.nummoAndroidUpdate as (id: string, received: number, total: number) => void)(id, 40, 100);
  (scope.nummoAndroidUpdate as (id: string, received: unknown, total: unknown) => void)(id, 'x', 100);
  (scope.nummoAndroidResult as (id: string, outcome: string, value?: unknown) => void)(id, 'ok');
  assert.deepEqual(await done, { outcome: 'ok' });
  assert.deepEqual(seen, [40]);

  const failed = downloadUpdateOnDevice(bridge, request, () => {}, undefined, scope);
  (scope.nummoAndroidResult as (id: string, outcome: string, value?: unknown) => void)(calls[1]?.[1] as string, 'error', 'integrity');
  assert.deepEqual(await failed, { outcome: 'error', reason: 'integrity' });
  const odd = downloadUpdateOnDevice(bridge, request, () => {}, undefined, scope);
  (scope.nummoAndroidResult as (id: string, outcome: string, value?: unknown) => void)(calls[2]?.[1] as string, 'error', 'boh');
  assert.deepEqual(await odd, { outcome: 'error', reason: 'error' });

  const controller = new AbortController();
  const cancelled = downloadUpdateOnDevice(bridge, request, () => {}, controller.signal, scope);
  controller.abort();
  assert.deepEqual(await cancelled, { outcome: 'cancelled' });
  assert.equal(calls.at(-1)?.[0], 'cancel');
});

test('app Android: permesso di installare e installazione, una risposta per richiesta', async () => {
  const { bridge, calls } = updaterBridge();
  const scope: Record<string, unknown> = { NummoAndroid: bridge };
  const allowed = allowUpdateInstallsOnDevice(bridge, scope);
  (scope.nummoAndroidResult as (id: string, outcome: string) => void)(calls[0]?.[1] as string, 'ok');
  assert.equal(await allowed, 'ok');
  const installed = installUpdateOnDevice(bridge, scope);
  assert.equal(calls[1]?.[0], 'install');
  (scope.nummoAndroidResult as (id: string, outcome: string) => void)(calls[1]?.[1] as string, 'cancelled');
  assert.equal(await installed, 'cancelled');
  const throwing = { ...bridge, updateInstall: () => { throw new Error('x'); } };
  assert.equal(await installUpdateOnDevice(throwing, scope), 'error');
});

test('the short «Novità» skips an introductory paragraph and stops at the second heading', () => {
  const notes = 'Intro line.\n\n## Novità\n- one\n- two\n- three\n- four\n\n## Già presenti\n- old';
  assert.deepEqual(releaseSummary(releaseNoteBlocks(notes)).map((block) => block.spans[0]?.text), ['one', 'two', 'three']);
  assert.deepEqual(releaseSummary(releaseNoteBlocks('## Novità\n- a\n## Altro\n- b')).map((block) => block.spans[0]?.text), ['a']);
  assert.deepEqual(releaseSummary(releaseNoteBlocks('- x\n- y')).map((block) => block.spans[0]?.text), ['x', 'y']);
  assert.deepEqual(releaseSummary(releaseNoteBlocks('Only text.')), []);
});
