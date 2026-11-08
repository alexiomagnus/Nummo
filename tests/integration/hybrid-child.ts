import { runHybrid } from '../../scripts/hybridRunner.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2]!;
const mode = process.argv[3];
process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR = `127.0.0.1:${readFileSync(join(root, 'endpoint'), 'utf8')}`;
const expoCommand = [process.execPath, '-e',
  "console.log('TEST_EXPO_READY'); process.on('SIGINT',()=>process.exit(0)); setInterval(()=>{},1000)"];
// Deliberately crash a fake CLI after it has spawned a listening descendant:
// the runner must reap that process group even though its parent already exited.
const orphan = `const s=require('node:net').createServer(); s.listen(0,'127.0.0.1',()=>{require('node:fs').writeFileSync(${JSON.stringify(join(root, 'orphan-port'))},String(s.address().port)); process.send('ready');});`;
const failure = `const c=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(orphan)}],{stdio:['ignore','ignore','ignore','ipc']}); c.on('message',()=>process.exit(17));`;
try {
  await runHybrid({ root, expoCommand,
    ...(mode === 'failure' ? { firebaseCommand: [process.execPath, '-e', failure, '--'] } : {}) });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
