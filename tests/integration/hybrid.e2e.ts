import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectHybridEmulator } from '../../scripts/hybridRunner.ts';
import { probeEndpoint } from '../../scripts/hybridPreflight.ts';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
async function freePort() {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((done) => server.close(() => done()));
  return port;
}
function digest(path: string): string {
  return createHash('sha256').update(readdirSync(path, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))
    .map((entry) => entry.name + ':' + (entry.isDirectory() ? digest(join(path, entry.name)) : readFileSync(join(path, entry.name)).toString('base64'))).join('|')).digest('hex');
}
function session(root: string, mode = '') {
  let output = '';
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('EXPO_PUBLIC_') || key === 'EXPO_NO_DOTENV') delete env[key];
  const child = spawn(process.execPath, [join(repo, 'tests/integration/hybrid-child.ts'), root, mode], { env, stdio: ['ignore','pipe','pipe'] });
  child.stdout.on('data', (data: Buffer) => { output += data.toString(); });
  child.stderr.on('data', (data: Buffer) => { output += data.toString(); });
  const done = new Promise<number | null>((resolve) => child.on('exit', resolve));
  return { child, done, get output() { return output; }, async waitFor(text: string) {
    const until = Date.now() + 100000;
    while (Date.now() < until) {
      if (output.includes(text)) return;
      if (child.exitCode !== null || child.signalCode) throw new Error(`Sessione terminata prima di ${text}:\n${output}`);
      await sleep(200);
    }
    throw new Error(`Timeout ${text}:\n${output}`);
  }, async stop() {
    child.kill('SIGINT');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([done, new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Timeout arresto:\n${output}`)),75000);})]); }
    finally { clearTimeout(timer); }
  } };
}

test('hybrid lifecycle: avvio, riuso, Ctrl+C, persistenza e guasti senza toccare il progetto personale', { timeout: 240000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'nummo-hybrid-e2e-'));
  const project = `demo-hybrid-${randomUUID().slice(0,8)}`;
  const port = await freePort();
  const firebase = JSON.parse(readFileSync(join(repo, 'firebase.json'),'utf8'));
  firebase.emulators = { singleProjectMode: true, firestore: { host:'127.0.0.1',port, websocketPort:await freePort() },
    hub: { host:'127.0.0.1',port:await freePort() }, logging: { host:'127.0.0.1',port:await freePort() }, ui: { enabled:false } };
  writeFileSync(join(root,'firebase.json'), JSON.stringify(firebase));
  cpSync(join(repo,'firestore.rules'),join(root,'firestore.rules'));
  const dotenv = `EXPO_PUBLIC_FIREBASE_PROJECT_ID=${project}\nEXPO_PUBLIC_FIREBASE_API_KEY=demo-key\nEXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${project}.firebaseapp.com\nEXPO_PUBLIC_FIREBASE_APP_ID=demo-app\n`;
  writeFileSync(join(root,'.env.local'), dotenv);
  writeFileSync(join(root,'endpoint'),String(port));
  const base = `http://127.0.0.1:${port}/v1/projects/${project}/databases/(default)/documents`;
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`${base}/${path}`, { method: body ? 'PATCH' : 'GET',
      headers: { Authorization:'Bearer owner', 'Content-Type':'application/json' }, ...(body ? { body:JSON.stringify(body) } : {}), signal:AbortSignal.timeout(3000) });
    assert.equal(response.status,200); return response.json();
  };
  let first: ReturnType<typeof session> | undefined;
  let second: ReturnType<typeof session> | undefined;
  try {
    await t.test('emulatore spento: avvio automatico e readiness prima di Expo', async () => {
      first = session(root); await first.waitFor('TEST_EXPO_READY');
      assert.ok(first.output.indexOf('Firestore pronto') < first.output.indexOf('TEST_EXPO_READY'));
      assert.equal(await inspectHybridEmulator(project,{host:'127.0.0.1',port}),true);
      await request('users/fixture-owner/categories/fixture-category', {fields:{label:{stringValue:'Persistente'},icon:{nullValue:null}}});
      await request('users/fixture-owner/expenses/fixture-expense', {fields:{amount_minor:{integerValue:'1250'},description:{stringValue:'Test persistenza'}}});
    });
    await t.test('emulatore esistente: riuso e Ctrl+C senza arrestarlo', async () => {
      second = session(root); await second.waitFor('TEST_EXPO_READY');
      assert.match(second.output,/riutilizzo Firestore/);
      assert.equal(await second.stop(),0); second=undefined;
      assert.equal(await inspectHybridEmulator(project,{host:'127.0.0.1',port}),true);
    });
    await t.test('progetto diverso: rifiuto del riuso e nessun arresto del servizio', async () => {
      writeFileSync(join(root,'.env.local'),dotenv.replaceAll(project,project+'-other'));
      try {
        second=session(root); assert.equal(await second.done,1);
        assert.match(second.output,/non è riconosciuto/); second=undefined;
        assert.equal(await inspectHybridEmulator(project,{host:'127.0.0.1',port}),true);
      } finally { writeFileSync(join(root,'.env.local'),dotenv); }
    });
    await t.test('Ctrl+C del proprietario: arresto, export e nessuna porta orfana', async () => {
      assert.equal(await first!.stop(),0); first=undefined;
      assert.equal(await inspectHybridEmulator(project,{host:'127.0.0.1',port}),false);
      assert.ok(existsSync(join(root,'emulator-data/firebase-export-metadata.json')));
      assert.equal(existsSync(join(root,'.firebase/hybrid.lock')),false);
    });
    await t.test('riavvio: categorie e spese precedenti restano identiche', async () => {
      first=session(root); await first.waitFor('TEST_EXPO_READY');
      assert.equal((await request('users/fixture-owner/categories/fixture-category')).fields.label.stringValue,'Persistente');
      assert.equal((await request('users/fixture-owner/expenses/fixture-expense')).fields.amount_minor.integerValue,'1250');
      assert.equal(await first.stop(),0); first=undefined;
    });
    await t.test('errore di avvio: messaggio, originali identici, nessuna porta/lock orfani', async () => {
      const before=digest(join(root,'emulator-data'));
      first=session(root,'failure'); assert.equal(await first.done,1);
      assert.match(first.output,/terminato durante l'avvio/); first=undefined;
      assert.equal(digest(join(root,'emulator-data')),before);
      assert.equal(await inspectHybridEmulator(project,{host:'127.0.0.1',port}),false);
      assert.equal(existsSync(join(root,'.firebase/hybrid.lock')),false);
      await assert.rejects(probeEndpoint({ host:'127.0.0.1', port:Number(readFileSync(join(root,'orphan-port'),'utf8')) }));
    });
    await t.test('servizio sconosciuto sulla porta: rifiuto senza arrestarlo o toccare i dati', async () => {
      const server=createHttpServer((_req,res)=>res.end('{}'));
      await new Promise<void>((done)=>server.listen(port,'127.0.0.1',done));
      try {
        const before=digest(join(root,'emulator-data'));
        first=session(root); assert.equal(await first.done,1);
        assert.match(first.output,/non è riconosciuto/); first=undefined;
        assert.equal(server.listening,true);
        assert.equal(digest(join(root,'emulator-data')),before);
      } finally { await new Promise<void>((done)=>server.close(()=>done())); }
    });
  } finally {
    if (second && second.child.exitCode===null) await second.stop();
    if (first && first.child.exitCode===null) await first.stop();
    rmSync(root,{recursive:true,force:true});
  }
});
