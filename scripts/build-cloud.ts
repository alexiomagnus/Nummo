// Production build: real Auth + real Firestore only. Expo's own `.env*` loading is disabled
// (EXPO_NO_DOTENV) so `.env.local` (development) can never leak in; the public variables come from
// `.env.production.local` (git-ignored) and/or the shell (CI), are validated, then passed explicitly.
// Output goes to `dist/`; the bundle is scanned afterwards. Never prints values, only names/counts.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { BUNDLE_FORBIDDEN, cloudEnvProblems, conflictProblems } from './envPolicy.ts';
import { syncOcr } from './sync-ocr.ts';

const FILE = '.env.production.local';
const outDir = 'dist';
const fail = (lines: string[]): never => {
  console.error(`Build cloud interrotta:\n- ${lines.join('\n- ')}`);
  return process.exit(1);
};

const fromFile = existsSync(FILE) ? parseEnv(readFileSync(FILE, 'utf8')) : {};
const fromShell = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key.startsWith('EXPO_PUBLIC_') && value !== undefined));
// The mode is imposed here: it may be repeated as "cloud" in the file/shell, but any other value is a contradiction.
const declared = [fromFile.EXPO_PUBLIC_NUMMO_BACKEND, fromShell.EXPO_PUBLIC_NUMMO_BACKEND].filter((value) => value !== undefined && value !== 'cloud');
const publicEnv: Record<string, string | undefined> = { ...fromFile, ...fromShell, EXPO_PUBLIC_NUMMO_BACKEND: 'cloud' };
const problems = [
  ...(declared.length > 0 ? ['EXPO_PUBLIC_NUMMO_BACKEND diverso da "cloud" nel file o nella shell: rimuovilo (build:cloud lo imposta)'] : []),
  ...conflictProblems(fromFile, fromShell), ...cloudEnvProblems(publicEnv),
];
if (problems.length > 0) fail([...problems, `Variabili in ${FILE} (non versionato) o nella shell; vedi .env.example.`]);

const childEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')));
Object.assign(childEnv, publicEnv, { EXPO_NO_DOTENV: '1', NODE_ENV: 'production' });
rmSync(outDir, { recursive: true, force: true });
// The receipt reader is served by the app itself (public/ocr/, generated from node_modules).
try { syncOcr(); } catch (error) { fail([error instanceof Error ? error.message : 'copia dei file OCR non riuscita']); }
const require = createRequire(import.meta.url);
const run = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', outDir], { env: childEnv as NodeJS.ProcessEnv, stdio: 'inherit' });
if (run.status !== 0) fail([run.error?.message ?? 'expo export non riuscito']);

const jsFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []);
const bundle = jsFiles(outDir).map((file) => readFileSync(file, 'utf8')).join('\n');
const found = BUNDLE_FORBIDDEN.map(({ label, pattern }) => ({ label, count: bundle.match(pattern)?.length ?? 0 })).filter((item) => item.count > 0);
const projectId = publicEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID!.trim();
const lines = found.map((item) => `${item.label}: ${item.count} occorrenze nel bundle`);
if (!bundle.includes(projectId)) lines.push('il bundle non contiene l\'ID progetto configurato');
if (lines.length > 0) { rmSync(outDir, { recursive: true, force: true }); fail(lines); }
console.log(`Build cloud verificata: ${outDir}/ (backend cloud, nessun endpoint emulatore nel bundle).`);
