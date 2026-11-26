// Storage of the «Standard» mode: one IndexedDB database on this device. Only this file talks to IndexedDB; the local
// store (localStore.ts) works on the small transactional contract below, which also has an in-memory twin for tests.
// Never localStorage: records live in object stores keyed by `id`, written in atomic transactions.

// `templates` came with schema step 2: step 1 keeps the stores it always created. Templates were removed from Nummo on
// 16 November 2026 (the store stayed, unread) and reintroduced on 21 November: the same store, so templates saved before
// the removal come back as they were.
const firstStoreNames = ['expenses', 'categories', 'funds', 'movements', 'lists', 'listItems', 'settings', 'meta'] as const;
// `merchants` came with step 3, `receipts` (scanned receipts, keyed by the ID of their expense) with step 4.
export const localStoreNames = [...firstStoreNames, 'templates', 'merchants', 'receipts'] as const;
export type LocalStoreName = (typeof localStoreNames)[number];
export type LocalRow = { id: string } & Record<string, unknown>;

// Inside a transaction: reads see the writes made before them. Await nothing but these calls (IndexedDB closes a
// transaction as soon as the page waits for anything else).
export type LocalTx = {
  get(store: LocalStoreName, id: string): Promise<LocalRow | undefined>;
  getAll(store: LocalStoreName): Promise<LocalRow[]>;
  put(store: LocalStoreName, row: LocalRow): void;
  delete(store: LocalStoreName, id: string): void;
  clear(store: LocalStoreName): void;
};
export type LocalDatabase = {
  read<T>(work: (tx: LocalTx) => Promise<T>): Promise<T>;
  // All or nothing: if `work` throws, or the browser cannot commit, nothing is written.
  write<T>(work: (tx: LocalTx) => Promise<T>): Promise<T>;
  close(): void;
};

export const localDatabaseName = 'nummo-local';

// Schema history. The database version is the number of steps: to change the local schema append a step, never edit
// an old one. Each step runs once, inside the upgrade transaction, on devices still at an earlier version.
type Migration = (db: IDBDatabase, tx: IDBTransaction) => void;
export const localMigrations: readonly Migration[] = [
  // 1: one object store per kind of record, keyed by `id`. `settings` holds single documents (the general budget),
  //    `meta` bookkeeping that is not part of a backup (time of the last change).
  (db) => { for (const name of firstStoreNames) db.createObjectStore(name, { keyPath: 'id' }); },
  // 2: the templates of «Nuova spesa».
  (db) => { db.createObjectStore('templates', { keyPath: 'id' }); },
  // 3: merchants («Esercente» of an expense), keyed by the key of their name (merchant.ts).
  (db) => { db.createObjectStore('merchants', { keyPath: 'id' }); },
  // 4: scanned receipts («Lista scontrini», 26 November 2026), keyed by the ID of the expense they belong to.
  (db) => { db.createObjectStore('receipts', { keyPath: 'id' }); },
];
export const localSchemaVersion = localMigrations.length;

// Steps still to run on a database found at `from` (0 = new database).
export function pendingMigrations(from: number, migrations: readonly Migration[] = localMigrations): readonly Migration[] {
  if (!Number.isSafeInteger(from) || from < 0 || from > migrations.length) throw new Error(newerDatabase);
  return migrations.slice(from);
}

export const storageUnavailable = 'Archivio locale non disponibile in questo browser. Controlla che la navigazione privata o il blocco dei dati dei siti non siano attivi.';
export const newerDatabase = 'I dati su questo dispositivo sono stati creati da una versione più recente di Nummo: ricarica la pagina per aggiornare l’app.';
export const saveFailed = 'Salvataggio sul dispositivo non riuscito: lo spazio potrebbe essere esaurito. Nessuna modifica.';
export const readFailed = 'Lettura dei dati dal dispositivo non riuscita. Ricarica la pagina.';

const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export function openLocalDatabase(name = localDatabaseName, factory: IDBFactory | undefined = globalThis.indexedDB): Promise<LocalDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) { reject(new Error(storageUnavailable)); return; }
    let opening: IDBOpenDBRequest;
    try { opening = factory.open(name, localSchemaVersion); } catch { reject(new Error(storageUnavailable)); return; }
    opening.onupgradeneeded = (event) => {
      // A failing step aborts the upgrade: the database stays at its previous version, untouched.
      for (const step of pendingMigrations(event.oldVersion)) step(opening.result, opening.transaction!);
    };
    opening.onblocked = () => reject(new Error('Chiudi le altre schede di Nummo per completare l’aggiornamento dei dati locali.'));
    opening.onerror = () => reject(new Error(opening.error?.name === 'VersionError' ? newerDatabase : storageUnavailable));
    opening.onsuccess = () => {
      const db = opening.result;
      // Another tab is upgrading the schema: let it, this tab must be reloaded.
      db.onversionchange = () => db.close();
      const run = <T>(mode: IDBTransactionMode, failure: string, work: (tx: LocalTx) => Promise<T>) => new Promise<T>((done, fail) => {
        let tx: IDBTransaction;
        // Writes ask for `strict` durability: the transaction completes only once the browser has flushed it to disk,
        // so a save is never reported before it is really kept (browsers without the option ignore it).
        try { tx = db.transaction(localStoreNames, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined); } catch { fail(new Error(failure)); return; }
        let result: T;
        let reason: unknown;
        const api: LocalTx = {
          get: (store, id) => request(tx.objectStore(store).get(id) as IDBRequest<LocalRow | undefined>),
          getAll: (store) => request(tx.objectStore(store).getAll() as IDBRequest<LocalRow[]>),
          put: (store, row) => { tx.objectStore(store).put(row); },
          delete: (store, id) => { tx.objectStore(store).delete(id); },
          clear: (store) => { tx.objectStore(store).clear(); },
        };
        tx.oncomplete = () => done(result);
        // An application error (conflict, validation) aborts on purpose and is reported as it is.
        tx.onabort = () => fail(reason ?? new Error(failure));
        work(api).then((value) => { result = value; }, (error: unknown) => {
          reason = error;
          try { tx.abort(); } catch { fail(error); }
        });
      });
      resolve({
        read: (work) => run('readonly', readFailed, work),
        write: (work) => run('readwrite', saveFailed, work),
        close: () => db.close(),
      });
    };
  });
}

// In-memory twin with the same guarantees (atomic writes, isolated copies, writes one at a time). Used by the tests.
export function createMemoryDatabase(): LocalDatabase {
  let data = new Map<LocalStoreName, Map<string, LocalRow>>(localStoreNames.map((name) => [name, new Map()]));
  let queue: Promise<unknown> = Promise.resolve();
  const view = (stores: Map<LocalStoreName, Map<string, LocalRow>>): LocalTx => ({
    get: async (store, id) => { const row = stores.get(store)!.get(id); return row && structuredClone(row); },
    getAll: async (store) => [...stores.get(store)!.values()].map((row) => structuredClone(row)),
    put: (store, row) => { stores.get(store)!.set(row.id, structuredClone(row)); },
    delete: (store, id) => { stores.get(store)!.delete(id); },
    clear: (store) => { stores.get(store)!.clear(); },
  });
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => {}); return next; };
  return {
    read: (work) => serial(() => work(view(data))),
    write: (work) => serial(async () => {
      const draft = new Map([...data].map(([name, rows]) => [name, new Map(rows)]));
      const result = await work(view(draft));
      data = draft;
      return result;
    }),
    close: () => {},
  };
}
