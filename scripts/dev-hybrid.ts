import { runHybrid } from './hybridRunner.ts';

try {
  await runHybrid({ root: process.cwd(), expoArgs: process.argv.slice(2) });
} catch (error) {
  console.error(`Avvio hybrid interrotto: ${error instanceof Error ? error.message : 'errore inatteso'}`);
  process.exitCode = 1;
}
