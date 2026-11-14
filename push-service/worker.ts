// Cloudflare Workers entry point: HTTP API + cron trigger, storage on D1 (see docs/notifiche-push.md).
import { deliverDue, handleRequest, removeStale, schema, type ServiceConfig, type Sql } from './service.ts';

type D1Statement = { bind(...values: unknown[]): D1Statement; run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> };
type D1Database = { prepare(sql: string): D1Statement; exec(sql: string): Promise<unknown> };
export type Env = { DB: D1Database; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string; ALLOWED_ORIGINS: string; PUSH_HOSTS?: string };
type Context = { waitUntil(promise: Promise<unknown>): void };

const d1 = (db: D1Database): Sql => ({
  async run(sql, ...params) { await db.prepare(sql).bind(...params).run(); },
  async all<T>(sql: string, ...params: unknown[]) { return (await db.prepare(sql).bind(...params).all<T>()).results; },
});
const config = (env: Env): ServiceConfig => ({
  vapid: { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT },
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  // Optional override, should a browser start using a push service host not listed in `defaultPushHosts`.
  ...(env.PUSH_HOSTS ? { pushHosts: env.PUSH_HOSTS.split(',').map((host) => host.trim()).filter(Boolean) } : {}),
});
let ready: Promise<void> | null = null;
const prepared = async (env: Env) => {
  ready ??= (async () => { for (const statement of schema) await env.DB.prepare(statement).run(); })();
  await ready;
  return d1(env.DB);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, await prepared(env), config(env));
  },
  async scheduled(_event: unknown, env: Env, context: Context): Promise<void> {
    context.waitUntil((async () => {
      const sql = await prepared(env);
      await deliverDue(sql, config(env));
      if (new Date().getUTCMinutes() === 0) await removeStale(sql);
    })());
  },
};
