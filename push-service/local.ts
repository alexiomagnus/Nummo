// Local push service for development and for the real delivery test on this computer: same code as the Worker, on
// Node's HTTP server and SQLite. Keys and data in push-service/.local/ (ignored by Git), never in the repository.
//   node push-service/local.ts            → http://127.0.0.1:8790
// Env: PUSH_PORT, PUSH_ALLOWED_ORIGINS (comma separated; default the Expo dev/serve ports on localhost).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { deliverDue, handleRequest, removeStale } from './service.ts';
import { openSqlite } from './sqlite.ts';
import { generateVapidKeys } from './webPush.ts';

const dir = new URL('./.local/', import.meta.url);
mkdirSync(dir, { recursive: true });
const keyFile = new URL('vapid.json', dir);
if (!existsSync(keyFile)) writeFileSync(keyFile, JSON.stringify(await generateVapidKeys(), null, 2) + '\n', { mode: 0o600 });
const keys = JSON.parse(readFileSync(keyFile, 'utf8')) as { publicKey: string; privateKey: string };
const port = Number(process.env.PUSH_PORT ?? 8790);
const origins = (process.env.PUSH_ALLOWED_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map((origin: string) => origin.trim()).filter(Boolean);
const sql = openSqlite(new URL('push.sqlite', dir).pathname);
const config = { vapid: { ...keys, subject: 'https://nummo.invalid' }, allowedOrigins: origins };

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
    method: req.method, headers: req.headers as Record<string, string>, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '') ? undefined : Buffer.concat(chunks),
  });
  const response = await handleRequest(request, sql, config);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => {
  console.log(`Servizio push locale su http://127.0.0.1:${port} (origini: ${origins.join(', ')})`);
  console.log(`Chiave pubblica VAPID (EXPO_PUBLIC_NUMMO_PUSH_KEY): ${keys.publicKey}`);
});
setInterval(() => {
  deliverDue(sql, config).then((o) => { if (o.sent || o.gone || o.failed) console.log(`invii: ${o.sent} riusciti, ${o.gone} scaduti, ${o.failed} da ritentare`); }, (e) => console.error(e));
  removeStale(sql).catch(() => {});
}, 10_000);
