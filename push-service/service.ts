// Nummo push service (platform-neutral): HTTP API used by the app and the periodic sender. The app computes WHEN each
// reminder is due (it alone sees the data); this service only stores the subscription and those times, and sends
// a generic message at the right moment. Storage is plain SQL (Cloudflare D1 in production, node:sqlite locally).
import { sendPush, type SendResult, type VapidKeys } from './webPush.ts';

export type Sql = {
  run(sql: string, ...params: unknown[]): Promise<void>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
};
export type ServiceConfig = Readonly<{
  vapid: VapidKeys;
  allowedOrigins: readonly string[];
  // Push services accepted as endpoints (host suffixes): nothing else is ever contacted.
  pushHosts?: readonly string[];
  fetcher?: typeof fetch;
}>;

// Chrome/Edge on Android and desktop (FCM: fcm.googleapis.com, jmt17.google.com, legacy android.googleapis.com),
// Firefox (Mozilla autopush), Safari and iOS (Apple), legacy Edge (WNS). Exact hosts or their subdomains.
export const defaultPushHosts = ['fcm.googleapis.com', 'jmt17.google.com', 'android.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
export const jobKinds = ['backup', 'summary'] as const;
type JobKind = (typeof jobKinds)[number] | 'test';
const day = 86_400_000;
const maxBody = 8 * 1024;
const retryDelay = 15 * 60_000;
const maxAttempts = 5;
const staleAfter = 120 * day;
const testInterval = 20_000;
const snoozeDays = 3;

export const schema = [
  `CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, lang TEXT NOT NULL, updated_at INTEGER NOT NULL, last_test_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS jobs (subscription_id TEXT NOT NULL, kind TEXT NOT NULL, due_at INTEGER NOT NULL, key TEXT NOT NULL, repeat_days INTEGER, period_from TEXT, period_to TEXT, attempts INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (subscription_id, kind))`,
  `CREATE INDEX IF NOT EXISTS jobs_due ON jobs (due_at)`,
  `CREATE TABLE IF NOT EXISTS sent (subscription_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, sent_at INTEGER NOT NULL, PRIMARY KEY (subscription_id, kind))`,
];

// ---- validation of untrusted input ----------------------------------------------------------------------------
type Subscription = { endpoint: string; p256dh: string; auth: string };
type Job = { kind: 'backup' | 'summary'; at: number; key: string; repeatDays: number | null; from: string | null; to: string | null };
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const b64 = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && value.length >= min && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);
const civil = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseSubscription(value: unknown, hosts: readonly string[]): Subscription | null {
  if (!isObject(value) || typeof value.endpoint !== 'string' || value.endpoint.length > 1024 || !isObject(value.keys)) return null;
  let url: URL;
  try { url = new URL(value.endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
  const { p256dh, auth } = value.keys;
  return b64(p256dh, 86, 88) && b64(auth, 16, 24) ? { endpoint: value.endpoint, p256dh, auth } : null;
}
function parseJobs(value: unknown, now: number): Job[] | null {
  if (!Array.isArray(value) || value.length > jobKinds.length) return null;
  const jobs: Job[] = [];
  for (const item of value) {
    if (!isObject(item) || !(jobKinds as readonly unknown[]).includes(item.kind) || jobs.some((job) => job.kind === item.kind)) return null;
    const at = typeof item.at === 'string' ? Date.parse(item.at) : NaN;
    if (!Number.isFinite(at) || at > now + 400 * day) return null;
    if (item.kind === 'backup') {
      if (item.key !== 'backup' || ![7, 14, 30].includes(item.repeatDays as number)) return null;
      jobs.push({ kind: 'backup', at, key: 'backup', repeatDays: item.repeatDays as number, from: null, to: null });
    } else {
      if (!civil(item.from) || !civil(item.to) || item.from > item.to || item.key !== `summary:${item.to}`) return null;
      jobs.push({ kind: 'summary', at, key: item.key, repeatDays: null, from: item.from, to: item.to });
    }
  }
  return jobs;
}

async function subscriptionId(endpoint: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---- storage ---------------------------------------------------------------------------------------------------
async function upsertSubscription(sql: Sql, id: string, s: Subscription, lang: string, now: number) {
  await sql.run(`INSERT INTO subscriptions (id, endpoint, p256dh, auth, lang, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang, updated_at = excluded.updated_at`, id, s.endpoint, s.p256dh, s.auth, lang, now);
}
async function forget(sql: Sql, id: string) {
  await sql.run(`DELETE FROM jobs WHERE subscription_id = ?`, id);
  await sql.run(`DELETE FROM sent WHERE subscription_id = ?`, id);
  await sql.run(`DELETE FROM subscriptions WHERE id = ?`, id);
}

// Replaces the reminders of one subscription with what the app computed now. Never twice for the same moment: a
// summary already delivered for that period is dropped, a backup reminder due before its last delivery waits one
// more interval (the app cannot know the reminder already went out).
export async function replaceJobs(sql: Sql, id: string, jobs: readonly Job[]) {
  const sent = new Map((await sql.all<{ kind: string; key: string; sent_at: number }>(`SELECT kind, key, sent_at FROM sent WHERE subscription_id = ?`, id)).map((row) => [row.kind, row]));
  await sql.run(`DELETE FROM jobs WHERE subscription_id = ? AND kind != 'test'`, id);
  for (const job of jobs) {
    const last = sent.get(job.kind);
    let at = job.at;
    if (job.kind === 'summary' && last?.key === job.key) continue;
    if (job.kind === 'backup' && last && at <= last.sent_at) at = last.sent_at + job.repeatDays! * day;
    await sql.run(`INSERT INTO jobs (subscription_id, kind, due_at, key, repeat_days, period_from, period_to) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, job.kind, at, job.key, job.repeatDays, job.from, job.to);
  }
}

// ---- HTTP API --------------------------------------------------------------------------------------------------
const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export async function handleRequest(request: Request, sql: Sql, config: ServiceConfig, now = Date.now()): Promise<Response> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = config.allowedOrigins.includes(origin);
  const cors: Record<string, string> = allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {};
  const path = new URL(request.url).pathname;
  if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
  if (request.method === 'GET' && path === '/v1/health') return json(200, { ok: true, publicKey: config.vapid.publicKey }, cors);
  // Only the app's own pages may register a device (the browser enforces the Origin header).
  if (!allowed) return json(403, { error: 'origin' }, cors);
  const text = await request.text();
  if (text.length > maxBody) return json(413, { error: 'size' }, cors);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json(400, { error: 'json' }, cors); }
  if (!isObject(body)) return json(400, { error: 'body' }, cors);
  const subscription = parseSubscription(body.subscription, config.pushHosts ?? defaultPushHosts);
  if (!subscription) return json(400, { error: 'subscription' }, cors);
  const id = await subscriptionId(subscription.endpoint);
  const lang = body.lang === 'en' ? 'en' : 'it';

  if (request.method === 'PUT' && path === '/v1/subscription') {
    const jobs = parseJobs(body.jobs, now);
    if (!jobs) return json(400, { error: 'jobs' }, cors);
    await upsertSubscription(sql, id, subscription, lang, now);
    await replaceJobs(sql, id, jobs);
    return json(200, { ok: true }, cors);
  }
  if (request.method === 'DELETE' && path === '/v1/subscription') {
    await forget(sql, id);
    return json(200, { ok: true }, cors);
  }
  // «Ricordamelo dopo» pressed on the notification itself: the backup reminder moves 3 days ahead (the app records the
  // same postponement locally, so its next update agrees).
  if (request.method === 'POST' && path === '/v1/snooze') {
    await sql.run(`UPDATE jobs SET due_at = ?, attempts = 0 WHERE subscription_id = ? AND kind = 'backup'`, now + snoozeDays * day, id);
    return json(200, { ok: true }, cors);
  }
  // The browser replaced the subscription (`pushsubscriptionchange`): reminders move to the new one.
  if (request.method === 'POST' && path === '/v1/renew') {
    const old = isObject(body.old) && typeof body.old.endpoint === 'string' ? await subscriptionId(body.old.endpoint) : null;
    const known = old ? await sql.all<{ lang: string }>(`SELECT lang FROM subscriptions WHERE id = ?`, old) : [];
    if (!old || !known[0] || old === id) return json(404, { error: 'unknown' }, cors);
    await upsertSubscription(sql, id, subscription, known[0].lang, now);
    await sql.run(`DELETE FROM jobs WHERE subscription_id = ?`, id);
    await sql.run(`DELETE FROM sent WHERE subscription_id = ?`, id);
    await sql.run(`UPDATE jobs SET subscription_id = ? WHERE subscription_id = ?`, id, old);
    await sql.run(`UPDATE sent SET subscription_id = ? WHERE subscription_id = ?`, id, old);
    await sql.run(`DELETE FROM subscriptions WHERE id = ?`, old);
    return json(200, { ok: true }, cors);
  }
  if (request.method === 'POST' && path === '/v1/test') {
    const delay = body.delaySeconds;
    if (typeof delay !== 'number' || !Number.isInteger(delay) || delay < 0 || delay > 120) return json(400, { error: 'delay' }, cors);
    const known = await sql.all<{ last_test_at: number | null }>(`SELECT last_test_at FROM subscriptions WHERE id = ?`, id);
    if (known[0]?.last_test_at && now - known[0].last_test_at < testInterval) return json(429, { error: 'rate' }, cors);
    await upsertSubscription(sql, id, subscription, lang, now);
    await sql.run(`UPDATE subscriptions SET last_test_at = ? WHERE id = ?`, now, id);
    await sql.run(`INSERT INTO jobs (subscription_id, kind, due_at, key) VALUES (?, 'test', ?, 'test') ON CONFLICT (subscription_id, kind) DO UPDATE SET due_at = excluded.due_at, attempts = 0`, id, now + delay * 1000);
    if (delay === 0) {
      const outcome = await deliverDue(sql, config, now, id);
      return json(outcome.sent > 0 ? 200 : outcome.gone > 0 ? 410 : 502, { ok: outcome.sent > 0 }, cors);
    }
    return json(202, { ok: true, at: new Date(now + delay * 1000).toISOString() }, cors);
  }
  return json(404, { error: 'route' }, cors);
}

// ---- periodic sender -------------------------------------------------------------------------------------------
type DueRow = { subscription_id: string; kind: JobKind; due_at: number; key: string; repeat_days: number | null; period_from: string | null; period_to: string | null;
  attempts: number; endpoint: string; p256dh: string; auth: string; lang: string };

// What the device receives: the kind of reminder and, for a summary, its dates. The text is written by the app's
// service worker from these fields, never by this service.
export type PushPayload = { kind: JobKind; lang: string; from?: string; to?: string };

export async function deliverDue(sql: Sql, config: ServiceConfig, now = Date.now(), onlyId?: string) {
  const rows = await sql.all<DueRow>(`SELECT j.*, s.endpoint, s.p256dh, s.auth, s.lang FROM jobs j JOIN subscriptions s ON s.id = j.subscription_id
    WHERE j.due_at <= ? ${onlyId ? 'AND j.subscription_id = ?' : ''} ORDER BY j.due_at LIMIT 500`, ...(onlyId ? [now, onlyId] : [now]));
  const outcome = { sent: 0, gone: 0, failed: 0 };
  for (const row of rows) {
    const payload: PushPayload = { kind: row.kind, lang: row.lang, ...(row.period_from && row.period_to ? { from: row.period_from, to: row.period_to } : {}) };
    let result: SendResult;
    try {
      result = await sendPush(row, payload, config.vapid, { ttlSeconds: row.kind === 'test' ? 600 : 86_400, topic: row.kind, urgency: row.kind === 'test' ? 'high' : 'normal' }, config.fetcher);
    } catch { result = 'failed'; }
    if (result === 'gone') { await forget(sql, row.subscription_id); outcome.gone++; continue; }
    if (result === 'failed') {
      outcome.failed++;
      if (row.attempts + 1 >= maxAttempts) await sql.run(`DELETE FROM jobs WHERE subscription_id = ? AND kind = ?`, row.subscription_id, row.kind);
      else await sql.run(`UPDATE jobs SET attempts = attempts + 1, due_at = ? WHERE subscription_id = ? AND kind = ?`, now + retryDelay, row.subscription_id, row.kind);
      continue;
    }
    outcome.sent++;
    if (row.kind !== 'test') await sql.run(`INSERT INTO sent (subscription_id, kind, key, sent_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (subscription_id, kind) DO UPDATE SET key = excluded.key, sent_at = excluded.sent_at`, row.subscription_id, row.kind, row.key, now);
    if (row.repeat_days) {
      let next = row.due_at + row.repeat_days * day;
      while (next <= now) next += row.repeat_days * day;
      await sql.run(`UPDATE jobs SET due_at = ?, attempts = 0 WHERE subscription_id = ? AND kind = ?`, next, row.subscription_id, row.kind);
    } else await sql.run(`DELETE FROM jobs WHERE subscription_id = ? AND kind = ?`, row.subscription_id, row.kind);
  }
  return outcome;
}

// Devices that stopped contacting the service (app uninstalled, browser data cleared) are forgotten.
export async function removeStale(sql: Sql, now = Date.now()) {
  const stale = await sql.all<{ id: string }>(`SELECT id FROM subscriptions WHERE updated_at < ?`, now - staleAfter);
  for (const { id } of stale) await forget(sql, id);
  return stale.length;
}
