# Nummo — istruzioni per gli agenti

Web app personale (PWA prevista) per registrare spese in Google Sheets («Registro spese»),
in sostituzione di Google Forms. Nome dell'app: **Nummo** (in passato «Nummus»,
nome ancora presente nello storico di `docs/progress.md`; `recap.md` lo indica «da definire»). Stato operativo e
prossimi passi: `HANDOFF.md`.

## Fonti
- `recap.md`: specifica originale v0.4 (comportamento previsto). Leggerla integralmente
  prima di modifiche funzionali; non modificarla.
- `docs/architecture.md`: decisioni confermate, confini del backend, proposte non approvate.
- `docs/progress.md`: piano a fasi e registro dettagliato delle verifiche.
- Lo stato effettivo si ricava dal codice e dall'esecuzione dei controlli, non dai documenti.

## Architettura effettiva
Solo frontend locale: nessun backend, login o collegamento a Sheets; i dati vivono in
`localStorage`. `index.ts` → `App.tsx` (tema Material 3 chiaro/scuro, sezioni Nuova ·
Spese · Dashboard · Categorie, stato React locale, senza router né store globale).
Il dominio è puro e testato; la UI lo usa.

- `src/domain/`: regole pure, senza dipendenze UI/SDK, riusabili dal futuro backend.
  `policy.ts` (limiti condivisi, `todayInRome`), `expense.ts` (bozza, parsing importi,
  validazione), `category.ts` (normalizzazione, unicità nomi, predefinite, ID icone),
  `recurrence.ts` (date delle occorrenze), `history.ts` (occorrenze, ricerca, ordinamento,
  periodi e aggregazione per la dashboard), `submission.ts` (reducer degli stati d'invio
  verso il futuro backend, **non collegato**).
- `src/features/expenses/`: modulo «Nuova spesa» (`ExpenseFields`, `CategoryPicker`,
  `RecurrencePicker`) e hook `useExpenses`.
- `src/features/history/`: elenco ricercabile e ordinabile («Spese»).
- `src/features/dashboard/`: dashboard e grafici SVG inline (`charts.tsx`, solo web).
- `src/features/categories/`: sezione «Categorie», `IconPicker` e hook `useCategories` condiviso.
- `src/services/`: adapter `localStorage` temporanei, uno per entità
  (`categoryStorage.ts`, `expenseStorage.ts`); validano i dati letti e
  rileggono prima di ogni scrittura.
- `src/components/`: componenti UI condivisi. Non c'è una libreria di icone: le icone
  di interfaccia sono SVG inline (`SvgIcon` + `iconShapes`); quelle delle categorie sono
  sprite pixel art 12×12 in `pixelIcons.ts` (dati puri, testati), resi da `PixelIcon`
  (che aggiunge da solo l'alone chiaro nel tema scuro: non disegnare sprite fuori da lì).
  Aggiungere un'icona = sprite + voce in `categoryIconLabels` (`src/domain/category.ts`).
  `DeleteAction`: cestino + conferma, da riusare per ogni eliminazione. `ChoiceChips`:
  stile unico per le scelte singole (pieno nel colore primario, senza spunta).
- `tests/`: test di dominio e storage con il runner integrato di Node.
- `public/index.html`: documento HTML web in italiano. `dist/`: export generato, ignorato da Git.

## Stack
TypeScript strict (`noUncheckedIndexedAccess`), Expo SDK 58 (solo piattaforma web,
bundler Metro), React 19.3, React Native 0.88 + React Native Web, React Native Paper 5.
Nessuna libreria di test esterna. Versioni fissate da `package-lock.json`.
Direzione backend confermata ma non implementata: Firebase Authentication + Cloud Functions
+ Sheets API con identità di servizio.

## Comandi
Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm, lockfile versionato.
- `npm ci`: installazione.
- `npm run dev`: anteprima web su localhost (Expo).
- `npm run typecheck`, `npm test`, `npm run build` (export web in `dist/`).
- `npm run check`: tutti i controlli precedenti, con arresto al primo errore.

I test girano in-process (`--experimental-test-isolation=none`) con
`--experimental-strip-types`: per questo gli import nei file di dominio usano
l'estensione `.ts`.

## Convenzioni
- Accessibilità: usare `role`/`aria-*` (`aria-checked`, `aria-selected`, `aria-disabled`).
  React Native Web 0.21 **ignora `accessibilityState`**: lo stato non arriva al DOM.
- Material 3: componenti personalizzati quando Paper non rende lo stile M3 sul web
  (es. `M3Switch`, `ChoiceChips`); riusarli invece di introdurne di nuovi.
- Grafici e colori dei dati: seguire la skill dataviz (palette categoriale in ordine fisso,
  validata col suo script; legenda e tabella; colore legato alla categoria).
- Nomi del codice in inglese; interfaccia e documentazione in italiano.
- Importi interi in centesimi, nessun arrotondamento implicito; data spesa in Europe/Rome,
  timestamp backend in UTC. Data vuota nella bozza = oggi al momento della validazione.
  Limiti solo in `src/domain/policy.ts`.
- Nessun invio in render/effect. Conferma solo da esito applicativo verificato con `expense_id`.
- Retry con stesso ID e payload immutabile; timeout = esito incerto, non rifiuto.
- Il client non decide identità, registro o permessi. Non memorizzare token manualmente.
- Note scritte come testo (Sheets `valueInputOption: RAW`), mai come formule.
- Storage illeggibile o negato: nessun falso successo, nessuna sovrascrittura.

## Regole per gli agenti
- Niente segreti, `.env` reali, deployment, fatturazione o servizi aggiuntivi senza autorizzazione.
- Non usare `npm audit fix --force` (retrocede Expo).
- Una fase alla volta; non anticipare funzioni fuori dal MVP (dashboard, OCR, ricorrenze, Google Pay).
- Eseguire `npm run check` prima di dichiarare un lavoro concluso.
- Testare comportamento e rischi reali; distinguere test locali da prove effettive su Sheets.
- A fine fase aggiornare `HANDOFF.md`; aggiornare questo file solo se cambiano
  architettura, strumenti o convenzioni; le decisioni vanno in `docs/architecture.md`.
