// Copies the OCR runtime (Tesseract.js, its WebAssembly cores and the Italian/English data) from node_modules to
// `public/ocr/`, so the app serves it itself instead of loading code from a CDN. The folder is generated and ignored
// by Git; every dev and build command runs this first. Only the LSTM cores and the `best_int` data are copied
// (about 16 MB on disk, downloaded by the browser only at the first receipt scan).
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ocrFiles: ReadonlyArray<readonly [from: string, to: string]> = [
  ['tesseract.js/dist/tesseract.min.js', 'tesseract.min.js'],
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['@tesseract.js-data/ita/4.0.0_best_int/ita.traineddata.gz', 'lang/ita.traineddata.gz'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];

export function syncOcr(modules = join(root, 'node_modules'), target = join(root, 'public', 'ocr')): number {
  let copied = 0;
  for (const [from, to] of ocrFiles) {
    const source = join(modules, from);
    const destination = join(target, to);
    if (!existsSync(source)) throw new Error(`File OCR mancante: ${from} (esegui npm ci).`);
    if (existsSync(destination) && statSync(destination).size === statSync(source).size && statSync(destination).mtimeMs >= statSync(source).mtimeMs) continue;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    copied += 1;
  }
  return copied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const copied = syncOcr();
    console.log(copied ? `OCR: ${copied} file copiati in public/ocr/.` : 'OCR: public/ocr/ già aggiornata.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
