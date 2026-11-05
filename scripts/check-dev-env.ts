// Runs before every dev:* command: Expo merges `.env*` files over the shell, so a stale
// backend/emulator line in a file would silently override the chosen environment.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { devFileProblems } from './envPolicy.ts';

const files = ['.env', '.env.local', '.env.development', '.env.development.local'];
const problems = files.filter(existsSync).flatMap((file) => devFileProblems(file, parseEnv(readFileSync(file, 'utf8'))));
if (problems.length > 0) {
  console.error(`Configurazione di sviluppo ambigua:\n- ${problems.join('\n- ')}\nVedi docs/firebase-personale.md.`);
  process.exit(1);
}
