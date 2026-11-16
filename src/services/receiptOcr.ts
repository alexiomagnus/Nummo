// Local OCR of a receipt picture with Tesseract.js, entirely in the browser: the picture never leaves the device.
// The library, its WebAssembly core and the Italian/English data are served by Nummo itself from `/ocr/` (copied from
// node_modules by `npm run ocr:sync`), never from a CDN, and are downloaded only at the first scan.
type OcrWorker = {
  setParameters(parameters: Record<string, string>): Promise<unknown>;
  recognize(image: Blob): Promise<{ data: { text: string } }>;
  terminate(): Promise<unknown>;
};
type OcrLog = { status: string; progress: number };
type Tesseract = { createWorker(languages: string[], engine: number, options: Record<string, unknown>): Promise<OcrWorker> };

export const ocrErrors = {
  load: 'Non è stato possibile caricare il lettore di scontrini: controlla la connessione e riprova.',
  read: 'Non è stato possibile leggere l’immagine.',
} as const;

// Thrown when the caller's signal stops a scan: not an error to show.
export const aborted = () => new DOMException('Aborted', 'AbortError');
export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

let library: Promise<Tesseract> | null = null;

function loadLibrary(base: string): Promise<Tesseract> {
  library ??= new Promise<Tesseract>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${base}tesseract.min.js`;
    script.async = true;
    script.onload = () => {
      const api = (globalThis as { Tesseract?: Tesseract }).Tesseract;
      if (api) resolve(api); else reject(new Error(ocrErrors.load));
    };
    script.onerror = () => { script.remove(); reject(new Error(ocrErrors.load)); };
    document.head.appendChild(script);
  });
  // A failed download can be retried at the next scan.
  library.catch(() => { library = null; });
  return library;
}

// Text of the picture, line by line. `onProgress`: null while the reader is being prepared (first use: a few MB to
// download), then 0–1 while reading. Stopping through `signal` ends the worker at once and rejects with an AbortError.
export async function recognizeReceipt(image: Blob, signal: AbortSignal, onProgress: (progress: number | null) => void): Promise<string> {
  const base = `${location.origin}/ocr/`;
  if (signal.aborted) throw aborted();
  onProgress(null);
  let worker: OcrWorker | null = null;
  let stop: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    stop = () => { void worker?.terminate().catch(() => {}); reject(aborted()); };
    signal.addEventListener('abort', stop, { once: true });
  });
  // Without a handler a stop that nobody is awaiting yet would be reported as an unhandled rejection.
  stopped.catch(() => {});
  const read = async () => {
    const api = await loadLibrary(base);
    try {
      // 1 = LSTM engine only (the `-lstm` cores and `best_int` data). The data is kept by the HTTP cache: no second archive in IndexedDB.
      worker = await api.createWorker(['ita', 'eng'], 1, {
        workerPath: `${base}worker.min.js`, corePath: base.slice(0, -1), langPath: `${base}lang`, gzip: true, cacheMethod: 'none',
        logger: (log: OcrLog) => { if (!signal.aborted) onProgress(log.status === 'recognizing text' ? log.progress : null); },
        errorHandler: () => {},
      });
    } catch { throw new Error(ocrErrors.load); }
    // Stopped while the worker was still starting: nobody else holds it, so it is ended here.
    if (signal.aborted) { void worker.terminate().catch(() => {}); throw aborted(); }
    try {
      // 4 = one column of text of variable sizes: keeps a label and its amount on the same line.
      await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
      return (await worker.recognize(image)).data.text;
    } catch { throw signal.aborted ? aborted() : new Error(ocrErrors.read); }
  };
  try {
    return await Promise.race([read(), stopped]);
  } finally {
    if (stop) signal.removeEventListener('abort', stop);
    void (worker as OcrWorker | null)?.terminate().catch(() => {});
  }
}
