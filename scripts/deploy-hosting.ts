// Publishes `dist/` to Firebase Hosting ONLY (never Firestore rules/indexes, never functions).
// It always rebuilds with build:cloud first, takes the target project from the same public variables the
// bundle is built with (so bundle and target cannot diverge) and passes `--only hosting` explicitly.
//   npm run deploy:hosting                  -> live site
//   npm run deploy:hosting -- --channel nome -> temporary preview channel (7 days), live site untouched
//   npm run deploy:hosting -- --dry-run      -> build + checks, prints the command, deploys nothing
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const channelAt = args.indexOf('--channel');
const channel = channelAt >= 0 ? args[channelAt + 1] : undefined;
const fail = (message: string): never => { console.error(`Pubblicazione interrotta: ${message}`); return process.exit(1); };
if (channelAt >= 0 && !(channel && /^[a-z0-9][a-z0-9-]{0,62}$/.test(channel))) fail('--channel richiede un nome in minuscolo (lettere, cifre, trattini).');
const unknown = args.filter((arg, index) => arg !== '--dry-run' && arg !== '--channel' && index !== channelAt + 1);
if (unknown.length > 0) fail(`argomenti non riconosciuti: ${unknown.join(' ')}`);

const file = '.env.production.local';
const fromFile = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
const project = (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fromFile.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim();
if (!project) fail(`EXPO_PUBLIC_FIREBASE_PROJECT_ID mancante in ${file} o nella shell.`);
if (project.startsWith('demo-')) fail('il progetto è un progetto demo: non si pubblica.');

const build = spawnSync(process.execPath, ['scripts/build-cloud.ts'], { stdio: 'inherit' });
if (build.status !== 0) fail('build:cloud non riuscita (nulla è stato pubblicato).');
// assetlinks.json must be a real file in dist/: a missing one would be answered by the SPA rewrite with index.html.
for (const required of ['dist/index.html', 'dist/manifest.webmanifest', 'dist/icons/icon-512.png', 'dist/.well-known/assetlinks.json']) {
  if (!existsSync(required)) fail(`${required} assente da dist/: build incompleta.`);
}

const command = channel
  ? ['firebase', 'hosting:channel:deploy', channel, '--expires', '7d', '--project', project]
  : ['firebase', 'deploy', '--only', 'hosting', '--project', project];
console.log(`\nTarget: progetto ${project}, ${channel ? `canale di anteprima «${channel}»` : 'sito LIVE'}, solo Hosting.`);
console.log(`Comando: npx ${command.join(' ')}`);
if (dryRun) { console.log('--dry-run: nessuna pubblicazione eseguita.'); process.exit(0); }
const require = createRequire(import.meta.url);
const deployed = spawnSync(process.execPath, [require.resolve('firebase-tools/lib/bin/firebase.js'), ...command.slice(1)], { stdio: 'inherit' });
if (deployed.error) fail(deployed.error.message);
process.exit(deployed.status ?? 1);
