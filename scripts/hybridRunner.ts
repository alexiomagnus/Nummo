import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProjectEnv } from '@expo/env';
import { FIREBASE_KEYS, devFileProblems } from './envPolicy.ts';
import { hybridEndpoint, probeEndpoint, checkHybridEndpoint } from './hybridPreflight.ts';
import type { Endpoint } from '../src/services/backendConfig.ts';
import { parseEnv } from 'node:util';

const toolRoot = fileURLToPath(new URL('..', import.meta.url));
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const localHost = (host: string) => host === 'localhost' || host === '127.0.0.1';

export function hybridEnvironment(root: string, shell: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const files = ['.env', '.env.local', '.env.development', '.env.development.local'];
  const problems = files.filter((file) => existsSync(join(root, file)))
    .flatMap((file) => devFileProblems(file, parseEnv(readFileSync(join(root, file), 'utf8'))));
  if (problems.length) throw new Error(problems.join('\n'));
  // Use Expo's existing parser (including expansion and file precedence), then freeze
  // the same configuration for Expo and the emulator. Never load production dotenv.
  const loaded = parseProjectEnv(root, { mode: 'development', systemEnv: { ...shell } }).env;
  const env: NodeJS.ProcessEnv = { ...shell, ...loaded, NODE_ENV: 'development', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_NUMMO_BACKEND: 'hybrid' };
  for (const key of FIREBASE_KEYS) if (!env[key]?.trim()) throw new Error(`${key} mancante: configura .env.local.`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!)) throw new Error('ID progetto Firebase non valido.');
  if (env.EXPO_PUBLIC_AUTH_EMULATOR || env.EXPO_PUBLIC_FUNCTIONS_EMULATOR) throw new Error('Hybrid richiede Auth reale, senza emulatori Auth/Functions.');
  const endpoint = hybridEndpoint(env.EXPO_PUBLIC_FIRESTORE_EMULATOR);
  env.EXPO_PUBLIC_FIRESTORE_EMULATOR = `${endpoint.host}:${endpoint.port}`;
  return env;
}

async function localJson(url: string): Promise<any> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' || !localHost(parsed.hostname) || parsed.username || parsed.password) throw new Error('Hub non locale.');
  const response = await fetch(parsed, { signal: AbortSignal.timeout(1500), redirect: 'error' });
  if (!response.ok) throw new Error(`Hub locale: HTTP ${response.status}.`);
  return response.json();
}

// The project-specific locator is written by Firebase CLI. Match both its live PID
// and its registered Firestore endpoint; an open TCP port alone is insufficient.
export async function inspectHybridEmulator(project: string, endpoint: Endpoint, pid?: number): Promise<boolean> {
  try { await probeEndpoint(endpoint); } catch { return false; }
  try {
    const locator = json(join(tmpdir(), `hub-${project}.json`));
    for (const origin of locator.origins ?? []) {
      try {
        const hub = await localJson(`${origin}/`);
        if (hub.pid !== locator.pid || (pid !== undefined && hub.pid !== pid)) continue;
        const mapping = await localJson(`${origin}/emulators`);
        if (!localHost(mapping.firestore?.host) || mapping.firestore?.port !== endpoint.port) continue;
        // A real Firestore request ensures the listener is ready, not just bound.
        const result = await fetch(`http://${endpoint.host}:${endpoint.port}/v1/projects/${project}/databases/(default)/documents/config/owner`, {
          headers: { Authorization: 'Bearer owner' }, // Local emulator marker, no real credential.
          signal: AbortSignal.timeout(1500), redirect: 'error',
        });
        if (result.status === 200 || result.status === 404) return true;
      } catch { /* Try the other local hub origin. */ }
    }
  } catch { /* Missing/stale locator or an unrelated service: never reuse it. */ }
  throw new Error('La porta Firestore è occupata, ma il servizio non è riconosciuto come emulatore del progetto previsto. Nessun processo esistente è stato modificato.');
}

type Exit = { code: number | null; signal?: NodeJS.Signals | null; error?: Error };
type Managed = { child: ChildProcess; done: Promise<Exit>; result?: Exit };
function launch(command: string[], root: string, env: NodeJS.ProcessEnv, output?: (text: string) => void): Managed {
  const child = spawn(command[0]!, command.slice(1), { cwd: root, env, detached: process.platform !== 'win32', windowsHide: true,
    stdio: output ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  const managed: Managed = { child, done: new Promise<Exit>((done) => {
    child.once('error', (error) => done({ code: null, error }));
    child.once('exit', (code, signal) => done({ code, signal }));
  }) };
  void managed.done.then((result) => { managed.result = result; });
  if (output) {
    child.stdout!.on('data', (data: Buffer) => output(data.toString()));
    child.stderr!.on('data', (data: Buffer) => output(data.toString()));
  }
  return managed;
}

async function stop(managed: Managed | undefined, timeout: number): Promise<void> {
  if (!managed) return;
  if (process.platform === 'win32') {
    if (!managed.result && managed.child.pid) {
      const killer = spawn('taskkill.exe', ['/PID', String(managed.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      await new Promise<void>((done, reject) => {
        killer.once('error', reject);
        killer.once('exit', (code) => code === 0 || managed.result ? done() : reject(new Error('Arresto dei processi hybrid non riuscito.')));
      });
    }
    await managed.done;
    return;
  }
  if (!managed.result) {
    // Signal only the CLI first: Java must remain alive until export completes.
    managed.child.kill('SIGINT');
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([managed.done, new Promise<void>((done) => { timer = setTimeout(done, timeout); })]);
    clearTimeout(timer);
  }
  // Reap descendants even if the CLI crashed. This group belongs only to us.
  if (managed.child.pid) {
    try { process.kill(-managed.child.pid, 'SIGKILL'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
  }
  await managed.done;
}

export function validateArchive(path: string): boolean {
  if (!existsSync(path) || readdirSync(path).length === 0) return false;
  try {
    const metadata = json(join(path, 'firebase-export-metadata.json'));
    if (Object.keys(metadata).some((key) => !['version', 'firestore'].includes(key))) throw new Error('Archivio multi-servizio.');
    const file = metadata.firestore?.metadata_file;
    if (typeof file !== 'string') throw new Error('Metadati non validi.');
    const inside = relative(resolve(path), resolve(path, file));
    if (!inside || inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside)) throw new Error('Metadati non validi.');
    if (!existsSync(resolve(path, file))) throw new Error('Export incompleto.');
    return true;
  } catch {
    throw new Error(`Archivio locale non valido o non limitato a Firestore: ${path}. Originali conservati; nessun avvio con dati vuoti.`);
  }
}

export function promoteArchive(data: string, exported: string, backup: string): void {
  if (!validateArchive(exported)) throw new Error(`Export assente: originali conservati in ${data}; controlla ${exported}.`);
  if (existsSync(data)) renameSync(data, backup);
  try { renameSync(exported, data); }
  catch (error) { if (existsSync(backup)) renameSync(backup, data); throw error; }
}

type Options = {
  root: string; env?: NodeJS.ProcessEnv; expoArgs?: string[];
  // Commands may be replaced by the integration harness; never exposed as CLI flags.
  expoCommand?: string[]; firebaseCommand?: string[]; startupMs?: number;
};
export async function runHybrid(options: Options): Promise<void> {
  const { root } = options;
  const env = hybridEnvironment(root, options.env ?? process.env);
  const endpoint = hybridEndpoint(env.EXPO_PUBLIC_FIRESTORE_EMULATOR);
  const project = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!;
  let emulator: Managed | undefined, expo: Managed | undefined;
  let session: string | undefined, configPath: string | undefined, lock: string | undefined;
  let ready = false, exported = false, stopping = false, recoveryRequired = false;
  let primaryError: unknown;
  let signalStop!: () => void;
  const interrupted = new Promise<void>((done) => { signalStop = () => { stopping = true; done(); }; });
  process.on('SIGINT', signalStop); process.on('SIGTERM', signalStop);
  try {
    if (await inspectHybridEmulator(project, endpoint)) {
      console.log('Hybrid: riutilizzo Firestore locale del progetto previsto; non verrà arrestato da questo comando.');
    } else {
      if (stopping) return;
      const data = join(root, 'emulator-data');
      const hasData = validateArchive(data);
      mkdirSync(join(root, '.firebase'), { recursive: true });
      const lockPath = join(root, '.firebase', 'hybrid.lock');
      try { writeFileSync(lockPath, JSON.stringify({ pid: process.pid, project }), { flag: 'wx' }); lock = lockPath; }
      catch { throw new Error(`Un'altra sessione hybrid gestisce l'archivio locale (${lockPath}). Se è stata interrotta, verifica i suoi export prima di rimuovere il lock.`); }
      session = mkdtempSync(join(root, '.firebase', 'hybrid-'));
      const firebase = json(join(root, 'firebase.json'));
      firebase.emulators = { ...firebase.emulators, singleProjectMode: true,
        firestore: { ...firebase.emulators?.firestore, host: '127.0.0.1', port: endpoint.port } };
      configPath = join(root, `.nummo-hybrid-${process.pid}.json`);
      writeFileSync(configPath, JSON.stringify(firebase));
      const cliEnv: NodeJS.ProcessEnv = { ...env, XDG_CONFIG_HOME: join(session, 'cli-config') };
      delete cliEnv.FIREBASE_TOKEN; delete cliEnv.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('Hybrid: avvio Firestore locale' + (hasData ? ' con import dei dati persistenti.' : ' (nessun archivio precedente).'));
      let outputTail = '';
      emulator = launch([...(options.firebaseCommand ?? [process.execPath, join(toolRoot, 'node_modules/firebase-tools/lib/bin/firebase.js')]),
        'emulators:start', '--only', 'firestore', '--project', project, '--config', configPath,
        ...(hasData ? ['--import', data] : []), '--export-on-exit', join(session, 'export')], root, cliEnv, (text) => {
        process.stdout.write(text);
        outputTail = (outputTail + text).slice(-4000);
        if (outputTail.includes('Export complete.')) exported = true;
      });
      const deadline = Date.now() + (options.startupMs ?? 90000);
      while (!ready && !stopping && Date.now() < deadline) {
        if (emulator.result) throw new Error(`Firestore terminato durante l'avvio (codice ${emulator.result.code ?? 'errore'}). Controlla il log sopra; dati originali intatti.`);
        try { ready = await inspectHybridEmulator(project, endpoint, emulator.child.pid); } catch { /* Still starting. */ }
        if (!ready) await Promise.race([pause(250), interrupted]);
      }
      if (!ready && !stopping) throw new Error('Timeout di avvio Firestore. Controlla Java e le porte di firebase.json; dati originali intatti.');
    }
    if (stopping) return;
    await checkHybridEndpoint(env.EXPO_PUBLIC_FIRESTORE_EMULATOR);
    console.log('Hybrid: Firestore pronto; avvio Expo con Authentication reale e database locale.');
    expo = launch(options.expoCommand ?? [process.execPath, join(toolRoot, 'node_modules/expo/bin/cli'),
      'start', '--web', '--host', 'localhost', ...(options.expoArgs ?? [])], root, env);
    const result = await Promise.race([
      expo.done.then((result) => ({ service: 'Expo', result })),
      ...(emulator ? [emulator.done.then((result) => ({ service: 'Firestore', result }))] : []),
      interrupted.then(() => null),
    ]);
    if (result && (result.service === 'Firestore' || result.result.error || result.result.code !== 0)) {
      throw new Error(`${result.service} terminato (codice ${result.result.code ?? result.result.signal ?? 'errore'}). Arresto dei soli processi gestiti.`);
    }
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (emulator && ready) recoveryRequired = true;
      // Windows kill('SIGINT') terminates the CLI without its export-on-exit handler.
      // Save through the owned emulator before stopping its process tree.
      if (process.platform === 'win32' && emulator && ready && !emulator.result) {
        const target = join(session!, 'export');
        mkdirSync(target, { recursive: true });
        const response = await fetch(`http://${endpoint.host}:${endpoint.port}/emulator/v1/projects/${project}:export`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ database: `projects/${project}/databases/(default)`, export_directory: target, export_name: 'firestore_export' }),
          signal: AbortSignal.timeout(45000), redirect: 'error',
        });
        if (!response.ok) throw new Error(`Export locale fallito: HTTP ${response.status}. Lock conservato.`);
        writeFileSync(join(target, 'firebase-export-metadata.json'), JSON.stringify({ firestore: {
          path: 'firestore_export', metadata_file: 'firestore_export/firestore_export.overall_export_metadata',
        } }));
        exported = validateArchive(target);
      }
      try { await stop(expo, 5000); } finally { await stop(emulator, 60000); }
      if (emulator && ready) {
        recoveryRequired = true;
        if (!exported || (process.platform !== 'win32' && emulator.result?.code !== 0)) throw new Error(`${primaryError instanceof Error ? primaryError.message + '\n' : ''}Export Firestore non confermato. Archivio precedente intatto; verifica ${session} prima di riavviare. Lock conservato per evitare un riavvio con dati precedenti.`);
        promoteArchive(join(root, 'emulator-data'), join(session!, 'export'), join(session!, 'previous'));
        recoveryRequired = false;
        console.log(`Hybrid: dati salvati in emulator-data/. Copia precedente conservata in ${session}/previous, se presente.`);
      }
    } catch (cleanupError) {
      if (primaryError instanceof Error && cleanupError instanceof Error && !cleanupError.message.includes(primaryError.message)) {
        throw new Error(`${primaryError.message}\n${cleanupError.message}`);
      }
      throw cleanupError;
    } finally {
      if (configPath) rmSync(configPath, { force: true });
      if (lock && !recoveryRequired) rmSync(lock, { force: true });
      process.off('SIGINT', signalStop); process.off('SIGTERM', signalStop);
    }
  }
}
