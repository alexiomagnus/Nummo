import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverDue, handleRequest, removeStale } from '../push-service/service.ts';
import { openSqlite } from '../push-service/sqlite.ts';
import { base64url, generateVapidKeys } from '../push-service/webPush.ts';

const origin = 'https://nummo.example';
const day = 86_400_000;
const t0 = Date.UTC(2026, 10, 14, 10);

async function setup(status = 201) {
  const sql = openSqlite();
  const sends: { endpoint: string; topic: string; ttl: string }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    sends.push({ endpoint: url, topic: headers.Topic!, ttl: headers.TTL! });
    return new Response(null, { status });
  }) as unknown as typeof fetch;
  const config = { vapid: { ...(await generateVapidKeys()), subject: origin }, allowedOrigins: [origin], fetcher };
  const device = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', keys: {
    p256dh: base64url(new Uint8Array(await crypto.subtle.exportKey('raw', device.publicKey))), auth: base64url(crypto.getRandomValues(new Uint8Array(16))) } };
  const call = (method: string, path: string, body: unknown, now = t0, from = origin) => handleRequest(new Request(`https://push.example${path}`, {
    method, headers: { Origin: from, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), sql, config, now);
  const jobs = () => sql.all<{ kind: string; due_at: number; key: string }>(`SELECT kind, due_at, key FROM jobs ORDER BY kind`);
  return { sql, sends, config, subscription, call, jobs };
}
const backup = (at: number) => ({ kind: 'backup', at: new Date(at).toISOString(), key: 'backup', repeatDays: 7 });
const summary = (at: number, from = '2026-11-16', to = '2026-11-22') => ({ kind: 'summary', at: new Date(at).toISOString(), key: `summary:${to}`, from, to });

test('push: solo l’origine dell’app registra; endpoint fuori dai servizi push o chiavi malformate rifiutati', async () => {
  const { call, subscription, sql } = await setup();
  assert.equal((await call('PUT', '/v1/subscription', { subscription, jobs: [] }, t0, 'https://evil.example')).status, 403);
  assert.equal((await call('PUT', '/v1/subscription', { subscription: { ...subscription, endpoint: 'https://127.0.0.1/x' }, jobs: [] })).status, 400);
  assert.equal((await call('PUT', '/v1/subscription', { subscription: { ...subscription, endpoint: 'https://accounts.google.com/x' }, jobs: [] })).status, 400);
  assert.equal((await call('PUT', '/v1/subscription', { subscription: { ...subscription, endpoint: 'https://fcm.googleapis.com.evil.example/x' }, jobs: [] })).status, 400);
  for (const host of ['jmt17.google.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns2-db5p.notify.windows.com']) {
    assert.equal((await call('PUT', '/v1/subscription', { subscription: { ...subscription, endpoint: `https://${host}/x` }, jobs: [] })).status, 200, host);
    await call('DELETE', '/v1/subscription', { subscription: { ...subscription, endpoint: `https://${host}/x` } });
  }
  assert.equal((await call('PUT', '/v1/subscription', { subscription: { ...subscription, keys: { p256dh: 'x', auth: 'y' } }, jobs: [] })).status, 400);
  assert.equal((await call('PUT', '/v1/subscription', { subscription, jobs: [backup(t0), backup(t0)] })).status, 400);
  assert.equal((await call('PUT', '/v1/subscription', { subscription, jobs: [{ ...summary(t0), key: 'summary:2026-01-01' }] })).status, 400);
  assert.equal((await sql.all(`SELECT id FROM subscriptions`)).length, 0);
  const ok = await call('PUT', '/v1/subscription', { subscription, jobs: [], lang: 'en' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), origin);
  // Nothing personal is stored: endpoint, keys, language and the times only.
  const [row] = await sql.all<Record<string, unknown>>(`SELECT * FROM subscriptions`);
  assert.deepEqual(Object.keys(row!).sort(), ['auth', 'endpoint', 'id', 'lang', 'last_test_at', 'p256dh', 'updated_at']);
});

test('push: invio all’orario, una sola volta per periodo, nessun duplicato al nuovo invio della pianificazione', async () => {
  const { call, subscription, sends, config, sql, jobs } = await setup();
  await call('PUT', '/v1/subscription', { subscription, jobs: [summary(t0 + day)] });
  assert.deepEqual(await deliverDue(sql, config, t0 + day - 1), { sent: 0, gone: 0, failed: 0 });
  assert.deepEqual(await deliverDue(sql, config, t0 + day), { sent: 1, gone: 0, failed: 0 });
  assert.equal(sends[0]!.topic, 'summary');
  assert.deepEqual(await jobs(), []);
  // The app, opened later, sends the same period again: it is not delivered twice.
  await call('PUT', '/v1/subscription', { subscription, jobs: [summary(t0 + day)] }, t0 + day + 1);
  assert.deepEqual(await jobs(), []);
  // The next period is scheduled normally.
  await call('PUT', '/v1/subscription', { subscription, jobs: [summary(t0 + 8 * day, '2026-11-23', '2026-11-29')] }, t0 + day + 2);
  assert.equal((await jobs()).length, 1);
});

test('push: promemoria backup ripetuto a ogni intervallo, mai anticipato da una pianificazione già consegnata, annullato dall’app', async () => {
  const { call, subscription, sends, config, sql, jobs } = await setup();
  await call('PUT', '/v1/subscription', { subscription, jobs: [backup(t0)] });
  await deliverDue(sql, config, t0);
  assert.equal((await jobs())[0]!.due_at, t0 + 7 * day);
  // Same due time sent again by the app after delivery: postponed by one interval, not repeated at once.
  await call('PUT', '/v1/subscription', { subscription, jobs: [backup(t0)] }, t0 + 3600_000);
  assert.equal((await jobs())[0]!.due_at, t0 + 7 * day);
  assert.deepEqual(await deliverDue(sql, config, t0 + 2 * day), { sent: 0, gone: 0, failed: 0 });
  // Backup confirmed in the app: the reminder disappears.
  await call('PUT', '/v1/subscription', { subscription, jobs: [] }, t0 + 2 * day);
  assert.deepEqual(await jobs(), []);
  assert.equal(sends.length, 1);
});

test('push: sottoscrizione scaduta (410) dimenticata; errori temporanei ritentati al massimo 5 volte', async () => {
  const gone = await setup(410);
  await gone.call('PUT', '/v1/subscription', { subscription: gone.subscription, jobs: [backup(t0)] });
  assert.deepEqual(await deliverDue(gone.sql, gone.config, t0), { sent: 0, gone: 1, failed: 0 });
  assert.equal((await gone.sql.all(`SELECT id FROM subscriptions`)).length, 0);
  const down = await setup(503);
  await down.call('PUT', '/v1/subscription', { subscription: down.subscription, jobs: [backup(t0)] });
  let now = t0;
  for (let i = 0; i < 5; i++) { await deliverDue(down.sql, down.config, now); now += 16 * 60_000; }
  assert.equal(down.sends.length, 5);
  assert.deepEqual(await down.jobs(), []);
});

test('push: prova immediata e prova differita per l’app chiusa, limitate nel tempo; revoca e pulizia', async () => {
  const { call, subscription, sends, config, sql, jobs } = await setup();
  assert.equal((await call('POST', '/v1/test', { subscription, delaySeconds: 0 })).status, 200);
  assert.equal(sends.length, 1);
  assert.equal(sends[0]!.ttl, '600');
  assert.equal((await call('POST', '/v1/test', { subscription, delaySeconds: 30 }, t0 + 5_000)).status, 429);
  assert.equal((await call('POST', '/v1/test', { subscription, delaySeconds: 500 }, t0 + 30_000)).status, 400);
  assert.equal((await call('POST', '/v1/test', { subscription, delaySeconds: 30 }, t0 + 30_000)).status, 202);
  await deliverDue(sql, config, t0 + 59_000);
  assert.equal(sends.length, 1);
  await deliverDue(sql, config, t0 + 60_000);
  assert.equal(sends.length, 2);
  await call('PUT', '/v1/subscription', { subscription, jobs: [backup(t0 + day)] }, t0 + 61_000);
  assert.equal((await call('DELETE', '/v1/subscription', { subscription })).status, 200);
  assert.deepEqual(await jobs(), []);
  await call('PUT', '/v1/subscription', { subscription, jobs: [] }, t0);
  assert.equal(await removeStale(sql, t0 + 121 * day), 1);
});

test('push: per ogni promemoria il servizio conserva solo tipo, orario e date del periodo', async () => {
  const { call, subscription, sql } = await setup();
  await call('PUT', '/v1/subscription', { subscription, jobs: [summary(t0)], lang: 'en' });
  const [row] = await sql.all<Record<string, unknown>>(`SELECT * FROM jobs`);
  assert.deepEqual(Object.keys(row!).sort(), ['attempts', 'due_at', 'key', 'kind', 'period_from', 'period_to', 'repeat_days', 'subscription_id']);
});

test('push: rinvio di 3 giorni dalla notifica e rinnovo della sottoscrizione senza perdere i promemoria', async () => {
  const { call, subscription, sql, jobs } = await setup();
  await call('PUT', '/v1/subscription', { subscription, jobs: [backup(t0), summary(t0 + day)] });
  await call('POST', '/v1/snooze', { subscription }, t0 + 1000);
  assert.equal((await jobs()).find((job) => job.kind === 'backup')!.due_at, t0 + 1000 + 3 * day);
  const renewed = { ...subscription, endpoint: 'https://fcm.googleapis.com/fcm/send/device-2' };
  assert.equal((await call('POST', '/v1/renew', { subscription: renewed, old: { endpoint: 'https://fcm.googleapis.com/fcm/send/unknown' } })).status, 404);
  assert.equal((await call('POST', '/v1/renew', { subscription: renewed, old: { endpoint: subscription.endpoint } })).status, 200);
  const rows = await sql.all<{ endpoint: string }>(`SELECT endpoint FROM subscriptions`);
  assert.deepEqual(rows.map((row) => row.endpoint), [renewed.endpoint]);
  assert.equal((await jobs()).length, 2);
});
