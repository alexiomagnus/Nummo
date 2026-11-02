# Nummus

Leggere integralmente `recap.md` prima di modificare il progetto. Le conferme
successive sono in `docs/architecture.md`; avanzamento e limiti in `docs/progress.md`.

## Struttura
- `App.tsx`: contenitore, tema Material 3 e navigazione spesa/categorie.
- `src/features/expenses/`: modulo di inserimento.
- `src/features/categories/`: creazione categorie e stato condiviso.
- `src/services/categoryStorage.ts`: persistenza temporanea nel browser.
- `src/components/`: componenti UI condivisi.
- `src/domain/`: policy, validazione pura e stati di invio; nessuna dipendenza UI/SDK.
- `tests/`: test del dominio con il runner integrato di Node.
- `public/`: documento HTML web in italiano; PWA non ancora configurata.
- `docs/`: decisioni, piano e collaudo. `recap.md` resta la specifica originale.

## Comandi
Node compatibile con `package.json` (preferire LTS), npm e lockfile versionato.
- `npm ci`
- `npm run dev`: anteprima web su localhost.
- `npm run typecheck`, `npm test`, `npm run build`
- `npm run check`: tutti i controlli precedenti, interrompendo al primo errore.

## Convenzioni
- TypeScript strict; nomi del codice in inglese, interfaccia/documentazione in italiano.
- Importi interi in centesimi, nessun arrotondamento implicito; data spesa in Roma,
  timestamp backend in UTC. Data vuota nella bozza = oggi al momento della validazione. Regole condivise in `src/domain/policy.ts`.
- Nessun invio in render/effect. Conferma solo da esito applicativo verificato.
- Retry con stesso ID e payload immutabile; timeout = esito incerto, non rifiuto.
- Il client non decide identità, registro o permessi. Non memorizzare token manualmente.
- Niente segreti, deployment, fatturazione o servizi aggiuntivi senza autorizzazione.
- Una fase MVP alla volta; aggiornare progressi e decisioni a ogni cambiamento significativo.
- Testare comportamento e rischi reali; distinguere test locali da prove effettive su Sheets.
