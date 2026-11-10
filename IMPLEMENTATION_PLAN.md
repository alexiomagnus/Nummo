# Piano operativo — GitHub Issues aperte

Redatto il **10 novembre 2026** sulla base di `main` a `ab7a72a` (allineato al riferimento locale `origin/main`, nessun fetch).
Issue lette con `gh issue list/view`: **#4, #5, #6, #7, #9, #10, #11, #12** (nessun commento presente). Allegati
(screenshot e video di #4/#5) non scaricabili via `gh`: non esaminati.

Il piano non modifica codice. Riferimenti di riga validi per `ab7a72a`. Stato e verifiche correnti: `HANDOFF.md`;
architettura e convenzioni: `AGENTS.md`. Al momento della stesura `npm run check` è verde (typecheck, 331/331, build demo).

## Verifica pre-rilascio (10 novembre 2026) — READY

- **Revisione finale** del diff `origin/main..HEAD` (13 commit). Rules: documenti esistenti a schema 1/2 ancora validi;
  schema 3 e `calendar_changes` solo su serie, versione non regredibile, campo non rimovibile né accorciabile;
  `settings/budget` solo per il proprietario, ogni altro documento di `settings` negato dal catch-all. Vecchi client: continuano a scrivere
  schema 1/2 accettati; rifiutano (decoder) archivi con serie a schema 3, come per le prove gratuite. Nessun difetto bloccante.
- **Test:** `npm run check` 363/363 + typecheck + build demo; `test:emulator` 18/18 (porte 49199/49280); `test:hybrid` 9/9.
- **Backup di produzione in sola lettura** (API REST con l'accesso della Firebase CLI, nessun contenuto stampato):
  `.firebase/backup-prod-20261110-021925/` (ignorata da Git) con `config/owner`, tutte le sottocollezioni del proprietario
  (10 categorie, 10 nomi, 12 spese, 2 liste, 6 prodotti; nessun fondo né movimento), ruleset live e release Hosting live, manifest con SHA-256.
- **Compatibilità dei dati reali:** il nuovo codice decodifica 12/12 spese (tutte schema 1, 4 serie), 10/10 categorie, 2/2 liste,
  6/6 prodotti; round trip nel backup v6 riuscito.
- **Rules live prima del rilascio:** release del 9 novembre 16:45:38 UTC, SHA-256 `972fd97e…d6d4a` = `origin/main`.
  **Hosting live prima del rilascio:** versione `88cb0099e5e9976e` (9 novembre 16:49 UTC, commit `37407c3`).
- `firebase deploy --only firestore:rules --dry-run --project nummo-6b6e2`: compilazione riuscita.

## Rilascio in produzione (10 novembre 2026) — eseguito

- Branch pubblicato: `origin/release/2026-11-10` (nessun merge su `main`, nessun force push).
- **Rules** pubblicate su `nummo-6b6e2` alle **01:20:40 UTC**; ruleset live riletto via API: identico a `firestore.rules`,
  SHA-256 `59e64d5b…078bb`. Precedente: `972fd97e…d6d4a` (salvato nel backup per un eventuale ripristino).
- **Hosting** pubblicato con `npm run deploy:hosting` (build cloud verificata, solo Hosting): live serve `index-2460cefa….js`
  (HTTP 200, 2,4 MB), manifest invariato (`theme_color` `#121212`), nessun endpoint di emulatore nel bundle, fallback SPA attivo.
  Versione precedente: `88cb0099e5e9976e` (rollback possibile dalla console Hosting; le Rules nuove accettano anche il client vecchio).
- **Verifica post-rilascio dell'agente:** pagina pubblica caricata in Chromium senza errori JavaScript né richieste fallite fino a
  «Accedi con Google». **Non verificati:** login, lettura e scrittura dei dati reali (richiedono l'account del proprietario).
- **Issue:** a #4, #5, #6, #7, #9, #10, #11 e #12 è stato aggiunto un commento con soluzione, commit, test e verifiche mancanti.
  **Chiuse su autorizzazione del proprietario:** #6, #7, #9, #10, #12, ciascuna con un commento finale. Le verifiche sul sito pubblico
  restano consigliate. **Aperte:** #11 (approvazione visiva degli sprite), #4 e #5 (prove sul Pixel 8).

## Stato di avanzamento (aggiornato il 10 novembre 2026, secondo giro)

Branch `fix/10-12-review`: tutti i commit sono impilati su `main` (`ab7a72a`). Nessun push, nessun deploy, nessuna issue chiusa;
`HANDOFF.md` non modificato (ha ancora modifiche non committate di un'altra sessione, escluse da ogni commit).
Verifiche finali sullo stato corrente: `npm run check` **verde** (typecheck, **363/363** test, build demo) e
`test:emulator` **18/18** (Auth 49199, Firestore 49280, config temporanea rimossa). `test:hybrid` non rieseguito (nessuna modifica
al runner). Prove nel browser solo in Chromium headless su build demo con emulatori dedicati: **nessuna prova su dispositivo**.

| Issue | Stato | Commit | Verifiche e note |
| --- | --- | --- | --- |
| #6 | **Completata** | `3c198d9`, `bd2f6df` | Spese e Pagamenti ricorrenti con la stessa scheda: interamente cliccabile, nessuna freccia né matita da chiusa, importo a destra, «Modifica» nei dettagli (con le azioni di stato per gli abbonamenti), dissolvenza con movimento ridotto. Chromium 412×915 chiaro e 1280×900 scuro: nessun pulsante annidato, nessun overflow, nessun errore JS; nome lungo su due righe con ellissi. |
| #11 | **Completata** (da approvare visivamente) | `10052d9` | Audit dei 42 sprite a 24/72 px chiaro/scuro. Ridisegnati i 6 meno riconoscibili: `pasta`, `bag`, `box`, `graduation`, `growth`, `piggy`. Stessi ID, tinte e griglia 12×12; nuovo test anti-duplicati. Gli altri 36 restano invariati: giudicati leggibili, da confermare con l'utente. |
| #5 | **Correzione lato app + protocollo** | `bcecf44` | Causa dimostrata in emulazione: nel segnaposto d'avvio il titolo «Nuova spesa» era a metà schermo e saltava di ≈ 350 px all'arrivo del modulo. Corretto: titolo e indicatore fermi tra segnaposto e modulo. Doppia splash e logo in dissolvenza sopra la pagina sono di Android/Chrome. Protocollo Pixel 8 in `docs/avvio-prestazioni.md`. |
| #4 | **Nessun codice possibile oltre al ripiego** | `bcecf44` (documenti) | La barra usa solo il `theme_color` della WebAPK (`#121212`, scuro sempre): «tema chiaro → barra chiara» non è realizzabile dalla pagina. Da verificare su Pixel 8 dopo aggiornamento o reinstallazione della WebAPK. |
| #9 | **Completata, rivista** | `fd8aeb4` | Revisione: storico invariato per costruzione (numeri di occorrenza fissi), equivalenza senza cambi testata, cambio di stato e `assignFund` preservano `calendar_changes`/schema 3, Rules (forma, versione non regredibile, campo non accorciabile, budget di espressioni nel caso peggiore), backup v6 con lettore v5 e rifiuto dei file vecchi con schema 3. Nessun difetto trovato. |
| #7 | **Completata, rivista** | `6b38a96`, `da617e1` | Revisione: **trovata e corretta** una regressione: il navigatore dei mesi partiva dall'inizio del fondo più vecchio, quindi senza fondi o con fondi nuovi i mesi passati di spesa non erano raggiungibili (`firstOverviewMonth`). Campi nascosti mai sovrascritti (`fundFromForm`, test); budget generale con Rules, transazioni, export/import (unione non sovrascrive). |
| #10 | **Completata, rivista** | `969ddb4`, `a479b7b` | Browser: 6 categorie → 6 colori distinti, legenda coerente. Revisione dei requisiti: con più di 12 categorie usate, ora le 12 con più spesa nell'archivio hanno colori distinti, quindi le categorie mostrate insieme non si ripetono più; fino a 12 il risultato non cambia. |
| #12 | **Completata, verificata** | `bccc653` | Browser: visibile di base; con la preferenza a `false` dopo il ricaricamento il grafico non c'è e non lascia spazi; l'interruttore in Impostazioni lo riattiva subito e la scelta resta salvata. |

**Decisioni prese in autonomia (non distruttive):** per #9 l'opzione A (nuovo calendario nel documento, schema 3). Per #7, le funzioni di
saldo restano nascoste ma conservate, il budget generale è un documento dedicato, le eccezioni mensili esistenti restano attive e il budget
generale non ha eccezioni. Per #11 il ridisegno riguarda solo gli sprite giudicati ambigui.

**Criticità irrisolte / da decidere:**
1. **Ordine di rilascio obbligato:** prima le Rules (schema 3, `settings/budget`), poi il sito. Con il sito nuovo e le Rules vecchie,
   l'esportazione del backup fallisce (lettura di `settings/budget` negata) e i salvataggi con cambio di frequenza vengono rifiutati.
   I client vecchi rifiutano gli archivi con serie a schema 3.
2. Importare in «Sostituisci» un backup senza `general_budget`, per esempio un v5, azzera il budget generale. È coerente con «uguaglia il file»
   e la copia automatica precedente lo conserva.
3. Le Rules non verificano l'ordine e le date di `calendar_changes`: lo fa solo il decoder.
4. Oltre 12 categorie i colori delle categorie minori possono ripetersi. Se cambia la classifica delle 12 maggiori, alcuni colori cambiano.
5. Le chiavi i18n del vecchio testo della Guida su Fondi restano inutilizzate in `src/i18n/en.ts`.
6. #11: va confermata con l'utente la selezione degli sprite ridisegnati.

**Verifiche manuali prima del rilascio:**
- **Pixel 8 / PWA:** protocollo #4 e #5 in `docs/avvio-prestazioni.md`, cioè WebAPK aggiornata, barra con i due temi, video di tre aperture, `navigation` = 1.
- **Telefono reale:** schede Spese e Abbonamenti al tocco, scorrimento senza attivazioni accidentali, tastiera fisica (Tab/Invio),
  lettore di schermo, 320 px, movimento ridotto.
- **Dati reali, dopo la pubblicazione delle Rules:** cambio di frequenza su un abbonamento di prova, export/import del backup v6,
  pagina Fondi con i 3 fondi e i 6 movimenti esistenti (saldi ancora visibili, nulla riscritto), budget generale impostato e rimosso.
- **Icone pixel:** controllo visivo in app (elenco, Categorie, selettore) chiaro/scuro.
- **Inglese:** verifica delle nuove stringhe (Fondi, frequenza, budget) nell'interfaccia.

---

## Sintesi e ordine consigliato

| Ordine | Issue | Tipo | Priorità | Stima | Schema/Rules/backup | Bloccanti |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | #12 Toggle «Andamento nel tempo» | feature piccola | **P2** | S | No | — |
| 2 | #10 Colori duplicati in Dashboard | bug visivo | **P1** | S–M | No (opzione B sì) | Decisione D10 |
| 3 | #4 Barra di navigazione Android | bug piattaforma | **P2** | XS | No | Pixel 8, autorizzazione a commentare/chiudere |
| 4 | #5 Splash ripetuto all'avvio | bug | **P1** | ? (diagnosi) | No previsto | Video, Pixel 8 + debug remoto |
| 5 | #6 Schede delle spese | refactor UI | **P2** | M | No | D6 |
| 6 | #9 Frequenza di un abbonamento | bug/feature | **P1** | L | **Sì** (schema 3, backup v6) | D9 |
| 7 | #7 Semplificare Fondi e Budget | redesign UX | **P3** | L–XL, a fasi | Fase 7a no; 7b sì | D7 (più decisioni) |
| — | #11 Icone pixel art | design | **P3** | M, iterativa | No | Approvazione visiva a lotti |

Criteri dell'ordine:

- **Rischio crescente.** Prima le modifiche locali e reversibili (#12, #10), poi quelle sul modello dati (#9, #7).
- **Conflitti di file.** #12 e #10 toccano entrambe `Dashboard.tsx`: vanno fatte in sequenza. #6 e #9 toccano le
  stesse viste di Spese/abbonamenti. Le righe espandibili di #6 serviranno a #7 («aprendo un fondo, visualizzare le
  spese associate»).
- **Blocchi esterni.** #4 e #5 richiedono il telefono reale e una pubblicazione: si verificano insieme in una
  sessione su dispositivo, senza bloccare il resto.
- **#11** tocca un solo file di disegni: può procedere in parallelo in qualsiasi momento, a lotti approvati.

Priorità: P1 = difetto che altera dati o lettura dei dati / blocca un flusso; P2 = qualità o UX importante;
P3 = redesign o miglioramento estetico.

## Regole comuni a ogni fase

Valgono per ogni issue; non vengono ripetute nelle sezioni.

- **Una issue per fase.** Branch dedicato da `main` (es. `fix/10-category-colors`), niente commit automatici.
  Per i commit, push, commenti e chiusure su GitHub serve una richiesta esplicita.
- **Lingua.** Ogni nuovo testo passa da `useI18n().t('…')` con la traduzione in `src/i18n/en.ts`, e i casi si
  estendono in `tests/i18n.test.ts`. Controllare entrambe le lingue.
- **Componenti, token e Guida.** Usare token e componenti condivisi (`Button`, `SwitchRow`, `AppDialog`, `Reveal`,
  `StateLayerPressable`, `motion.ts`, `useReducedMotion()`), niente hex sparsi. Aggiornare `Guide.tsx` quando
  cambiano le funzioni descritte.
- **Verifiche prima di dichiarare concluso.** Sempre `npm run check`. Quando cambiano accesso ai dati, Rules o
  servizi, anche `npm run test:emulator` su porte dedicate, con config temporanea nella radice rimossa a fine prova.
  Per la UI, Chromium headless sulla build demo con emulatori dedicati a 320×740, 412×915 e 1280×900, chiaro/scuro,
  IT/EN, senza overflow né errori JS. Va dichiarato che non è una prova su dispositivo.
- **Rules.** Qualunque nuovo controllo sulle spese richiede di rimisurare il budget di 1000 espressioni con
  l'emulatore. Le Rules si pubblicano solo separatamente, con autorizzazione, e prima dell'Hosting che le usa.
- **Backup.** Un cambio incompatibile richiede un nuovo `backupVersion`, il lettore storico in `readers` e
  l'aggiornamento delle fixture `docs/testing/`. Se #9 e #7b vengono rilasciati insieme, conviene **un solo** salto
  di versione (v6) per entrambi.
- **Documentazione a fine fase.** `HANDOFF.md`, con prove emulate distinte da quelle su dispositivo o cloud. Le
  decisioni vanno in `docs/architecture.md`; `AGENTS.md` si tocca solo se cambiano architettura o convenzioni stabili.
- **Rilascio.** Nessun deploy senza autorizzazione: `npm run deploy:hosting` per il sito, Rules a parte.

---

## #12 — Toggle per nascondere «Andamento nel tempo»

**Priorità P2 · stima S · nessun impatto su dati/Rules/backup.**

### Stato attuale
- `src/features/dashboard/Dashboard.tsx:133`: `<Card><TimeChart key={period} days={insights.days} /></Card>` sempre
  renderizzato; il layout usa `gap: layout.sectionGap`, quindi togliere il nodo non lascia spazi vuoti.
- Preferenze di sola presentazione in `src/features/settings/preferences.ts` (`nummo.preferences.v1`), validazione per
  campo in `parsePreferences`, persistenza in `usePreferences.ts`; `DashboardPreferences` arriva alla Dashboard da
  `App.tsx` → `RemoteWorkspace` → `Sections` (`Workspace.tsx:288`) senza rimontaggi.
- `SettingsPage.tsx` non ha una sezione «visualizzazione»: card Lingua, Tema, Colore, Carattere, Stile delle icone.

### Interventi
1. `preferences.ts`: aggiungere `dashboardTrend: boolean` a `DashboardPreferences`, predefinito `true`; in
   `parsePreferences` accettare solo booleani (`typeof o.dashboardTrend === 'boolean' ? … : true`).
2. `SettingsPage.tsx`: nuova card **«Dashboard»** (prima di «Stile delle icone», così il pulsante «Ripristina
   predefiniti» resta in fondo) con `SwitchRow` «Mostra andamento nel tempo»; `onChange({ dashboardTrend })`.
3. `Dashboard.tsx`: `{preferences.dashboardTrend && <Card><TimeChart …/></Card>}`. `insights` resta calcolato: serve
   anche alle date del riepilogo (`insights.from/to`).
4. `src/i18n/en.ts`: «Dashboard» (se non già presente), «Mostra andamento nel tempo».
5. `Guide.tsx:60`: menzionare che l'andamento si può nascondere dalle Impostazioni.
6. `AGENTS.md` (riga «scelte di dashboard (grafico, periodo)») → includere l'andamento.

### Rischi e regressioni
- Vecchie preferenze senza il campo → grafico visibile (requisito «visibile per impostazione predefinita»).
- «Ripristina predefiniti» riattiva il grafico: comportamento coerente con le altre scelte, da citare nella Guida
  se si ritiene utile.
- La Dashboard è conservata con `Activity` nascosta: il cambio dalla pagina Impostazioni deve applicarsi al ritorno
  senza ricaricare (lo stato arriva via props, nessun problema atteso).

### Test
- `tests/preferences.test.ts`: assente → `true`; `false` conservato; valori non booleani (`"false"`, `0`, `null`) →
  `true` senza alterare gli altri campi; round-trip con grafico/periodo.
- `tests/i18n.test.ts`: nuove etichette in EN.
- Browser: toggle on/off, nessuno spazio residuo, persistenza dopo reload, compact ed expanded.

### Completamento
Criteri della issue soddisfatti in demo; HANDOFF aggiornato.

---

## #10 — Colori duplicati tra categorie nei grafici

**Priorità P1 · stima S–M · nessun impatto su dati (opzione A).**

### Causa (verificata nel codice)
`categoryColorSlot` (`src/domain/history.ts:172`) assegna lo slot con un hash FNV-1a dell'ID **modulo 12**,
indipendentemente dalle altre categorie. Con 12 slot e *n* categorie la probabilità di almeno una collisione è
~43% già con 4 categorie, ~78% con 6 e ~95% con 8 (paradosso del compleanno). È quindi atteso vedere Casa/Ristorazione o
Alimentari/Trasporti con lo stesso colore. La scelta era documentata («una palette finita deve ripetersi»,
`docs/architecture.md:205`, test `tests/categoryPresentation.test.ts:65-71`), ma le ripetizioni avvengono anche
quando la palette basterebbe.

Flusso: `breakdown()` → `Series.slot` → `seriesColor()` (`charts.tsx:26`) usato da Ciambella, Blocchi, Barre e
legenda. Corrispondenza segmenti/legenda già garantita dallo stesso `slot`.

### Decisione D10
- **A (consigliata, senza modifiche ai dati):** assegnazione a collisioni minime calcolata su un insieme **stabile**
  di categorie, non sul periodo. Le categorie con almeno una spesa nell'archivio si ordinano per ID (ordine
  deterministico, indipendente da nomi e ordinamento). Ognuna prende lo slot preferito dall'hash attuale oppure,
  se occupato, il primo libero (sondaggio lineare). Le categorie senza spese restano fuori.
  - Con ≤12 categorie usate i colori sono tutti distinti.
  - I colori restano stabili cambiando periodo, grafico, filtri e navigazione. Possono cambiare solo quando una
    categoria riceve la sua prima spesa o viene eliminata, e solo per le categorie in collisione.
  - Oltre 12 categorie usate le ripetizioni sono inevitabili: restano etichette e legenda.
- **B (stabilità totale, più costosa):** salvare uno slot `color` nella categoria, come per i fondi (`nextFundColor`
  in `funds.ts:460`). Comporta Rules (`category()` con `hasOnly`), decoder, `CategoryEditor` (selettore colore),
  backup v6, assegnazione per le categorie esistenti e client vecchi che rifiutano il campo. Da valutare solo se A
  non basta.
- Non consigliato: rendere distinti solo i colori del grafico corrente. Viola «colori stabili cambiando periodo».
- Non consigliato: ampliare la palette oltre 12 colori. La skill dataviz e la palette validata pongono già 12 come
  limite di distinguibilità, e lo slot 12 vincola anche i fondi (`firestore.rules:127`, `d.color <= 11`).

### Interventi (opzione A)
1. `src/domain/history.ts`: nuova funzione pura `categoryColorSlots(categoryIds: readonly string[]): Map<string, number>`
   (input deduplicato e ordinato internamente); `categoryColorSlot` resta come preferenza dell'hash.
2. Calcolare l'insieme «categorie usate» una volta da tutte le occorrenze/spese (non filtrate per periodo) e passare la
   mappa a `breakdown()` (nuovo parametro facoltativo o oggetto contesto); ripiego sull'hash se la mappa manca.
   Punto di calcolo: `Dashboard.tsx` (`useMemo` su `occurrences`, `categories`), o il chiamante in `Workspace.tsx`.
3. Verificare gli altri consumatori di `Series.slot`: `insights.ts` (righe Barre, `dashboardInsights` riusa
   `source`), `TransactionDetails`, `CategoryLegend`, `BlockChart`.
4. Aggiornare il commento in `history.ts:169-171`, `Dashboard.tsx:31` e `docs/architecture.md:205`.
5. Seguire la skill **dataviz** (richiesta da AGENTS.md) per controllare contrasto e ordine di assegnazione degli
   slot. Valutare se riordinare la sequenza dei primi slot per massimizzare la distanza tra colori adiacenti, a
   palette invariata.

### Rischi e regressioni
- Cambiano i colori delle categorie esistenti: è voluto, ma va segnalato nel rilascio.
- Il test esistente «100 categorie inutilizzate non cambiano i colori» resta valido con A, perché le inutilizzate
  sono escluse. Le asserzioni `slot === categoryColorSlot(key)` (`categoryPresentation.test.ts:71`,
  `history.test.ts:65`) vanno riscritte sulla nuova funzione.
- «Altre categorie» e «Senza categoria» restano neutre (`slot: null`).
- Prestazioni: O(n) sulle occorrenze già caricate, una volta per cambio dati.

### Test
- Nuovi test di dominio. Con ≤12 categorie usate, slot tutti distinti. Risultato indipendente dall'ordine e dai
  nomi delle categorie. Slot identici tra periodi diversi (`month`, `quarter`, `year`) sugli stessi dati. Una
  categoria inutilizzata non cambia nulla. Con 13+ categorie usate, ogni slot è nell'intervallo 0..11 e il
  risultato è deterministico.
- Caso della issue: fixture con Casa, Ristorazione, Alimentari, Trasporti → colori distinti.
- Browser: Ciambella, Blocchi, Barre e legenda coerenti in chiaro e scuro; colori uguali tornando da Spese.

---

## #4 — Barra di navigazione Android sempre chiara con tema scuro

**Priorità P2 · stima XS · lavoro di codice già eseguito; resta verifica su dispositivo e chiusura.**

### Stato attuale (da HANDOFF e codice)
- Analisi del sorgente Chromium già documentata in `docs/architecture.md:22-38`. In una WebAPK standalone la barra
  di navigazione usa **solo** il `theme_color` del manifest salvato nella WebAPK. Il meta `theme-color` dinamico non
  la cambia e `dark_theme_color` non viene letto. Seguire il tema scelto in Nummo **non è tecnicamente possibile**.
- Ripiego scuro richiesto dall'utente: `public/manifest.webmanifest` ha `theme_color` `#121212` e
  `background_color` `#0F1511`, protetti da `tests/manifest.test.ts`. Pubblicato con l'Hosting di `37407c3`
  (HANDOFF, 9 novembre).
- Le WebAPK già installate si aggiornano solo dopo il controllo giornaliero di Chrome (app chiusa, in carica,
  Wi-Fi) oppure reinstallando l'app.

### Interventi
1. Nessuna modifica di codice prevista; **non** introdurre workaround inefficaci (indicazione 6 della issue).
2. Verifica su Pixel 8:
   - confermare l'aggiornamento della WebAPK (reinstallazione o `chrome://webapks`, con data aggiornamento e
     `theme_color`);
   - controllare la barra con tema chiaro e scuro, sulla pagina Nuova spesa e sulla pillola di navigazione,
     annotando la versione di Chrome e Android.
3. Su autorizzazione: commento sulla issue con la limitazione (link a `docs/architecture.md`) e l'esito della
   verifica. Poi chiusura. Il criterio «tema chiaro: sfondo chiaro» va dichiarato non realizzabile: la barra è
   scura in entrambi i temi, con contrasto adeguato.

### Dipendenze
Stessa sessione su dispositivo di #5; eventuale nuovo deploy solo se #5 modifica manifest/HTML.

### Test
`tests/manifest.test.ts` già presente. Prova reale su dispositivo, da riportare in HANDOFF come tale.

---

## #5 — Splash ripetuto e sfarfallio all'avvio della PWA

**Priorità P1 · stima non determinabile prima della diagnosi · la issue chiede la causa prima delle correzioni.**

### Stato attuale
- Nel codice **non esiste una splash con logo**. La splash è generata da Chrome/Android dal manifest
  (`background_color` + icona). Il logo dell'app compare solo nella testata di `AppShell` (`AppShell.tsx:107-118`).
- Sequenza d'avvio attuale:
  1. lo script `nummo-boot` (`public/index.html`) applica lo sfondo del tema;
  2. `App.tsx` mostra `StartupWorkspace` sopra il workspace reale (overlay `absoluteFill`, `inert`) se c'è l'indizio
     di sessione;
  3. `RemoteWorkspace` libera l'overlay con `onReleased` (dati pronti, errore o 4 s).
- Nessun service worker e nessun `location.reload()` nel codice: le sole manipolazioni della history sono in
  `SignIn.tsx:21,34` (guida).
- HANDOFF «Avvio web, temi e ripresa PWA» (9 novembre): il video precedente non era disponibile e la causa del logo
  sovrapposto non è stata dimostrata. Le correzioni già fatte (modulo fittizio eliminato, rilascio a 4 s, ripresa da
  `visibilitychange`/`pageshow`) non provano la risoluzione su Pixel.

### Ipotesi da verificare (nessuna dimostrata)
| # | Ipotesi | Come distinguerla |
| --- | --- | --- |
| H1 | Doppia splash di piattaforma: la splash di sistema Android 12+ (icona del launcher), poi quella WebAPK di Chrome generata dal manifest | Video fotogramma per fotogramma: icona/sfondo diversi tra le due splash; `adb logcat` con eventi della splash WebAPK; confronto con un'altra PWA installata |
| H2 | Ricaricamento o nuova navigazione della pagina dopo il primo render (avvio WebAPK, intent ripetuto, redirect di scope) | Debug remoto `chrome://inspect`: `performance.getEntriesByType('navigation')`, log di un contatore in `sessionStorage` scritto dallo script di boot (**solo in build diagnostica locale, mai pubblicata**) |
| H3 | Cambio di guscio o rimontaggio React: `StartupWorkspace` → workspace reale, oppure schermata di accesso → workspace | Timeline e screenshot con DevTools Performance; React key/uid stabile; sequenza delle schermate nel video |
| H4 | Il «logo sovrapposto» è l'uscita animata della splash di Chrome sopra la pagina già dipinta | Video: dissolvenza del logo su contenuto già visibile senza ricaricare (H2 negativa) |
| H5 | Aggiornamento WebAPK in corso (nuovo manifest pubblicato il 9 novembre) che rilancia l'attività | Si presenta solo una volta? Ripetere su più aperture e dopo l'aggiornamento |

### Interventi
1. **Raccolta.** Video allegato alla issue scaricato in una cartella dedicata, versione di Chrome e Android, app
   installata prima o dopo il 9 novembre, cold start oppure ripresa da Recenti.
2. **Riproduzione su Pixel 8.** Usare debug remoto USB, registrazione schermo a 60 fps e `adb logcat`, poi
   classificare l'evidenza secondo H1–H5.
3. **Correzioni**, solo se la causa è nell'app:
   - H2: eliminare la causa del secondo caricamento;
   - H3: un solo guscio stabile da caricamento a connesso, senza cambi di overlay;
   - H1/H4/H5: limiti di piattaforma da documentare in `docs/avvio-prestazioni.md`, eventualmente riducendo lo
     stacco visivo (colori di splash e pagina uguali, icona coerente), senza ritardi artificiali.
4. Aggiornare `docs/avvio-prestazioni.md` (matrice Pixel 8) e HANDOFF.

### File potenzialmente coinvolti
`public/index.html`, `public/manifest.webmanifest`, `App.tsx` (overlay `showStartup`), `src/features/workspace/Workspace.tsx`
(`StartupWorkspace`, rilascio), `src/theme/GlobalStyle.tsx`, `src/theme/bootTheme.ts`, `src/services/sessionHint.ts`.

### Rischi
Toccare la sequenza di avvio può reintrodurre problemi già corretti: sfondo errato al primo fotogramma, modulo
fittizio, rilascio prematuro. `tests/startup.test.ts` e `scripts/measure-startup.mjs` vanno usati come guardia.

### Test
`tests/startup.test.ts`, `tests/theme.test.ts`, `tests/viewport.test.ts` più eventuali regressioni sulla causa
trovata. Misura d'avvio secondo la procedura di `docs/avvio-prestazioni.md`. La prova decisiva è il video su
dispositivo dopo il deploy, che richiede autorizzazione.

---

## #6 — Schede delle spese più compatte e interamente cliccabili

**Priorità P2 · stima M · solo UI.**

### Stato attuale
- `src/features/history/ExpenseList.tsx:112-191` (`ExpenseRow`): `ListRow outlined` con icona, titolo (fino a 3
  righe). Su compact l'importo è **sotto il titolo** (`meta`, riga 147), su medium+ a destra (riga 151, `minWidth: 96`).
  La chiusa mostra la freccia (`IconButton` chevron, righe 152-159) e la matita (160-161). La data appare solo nei
  dettagli.
- I dettagli mostrano Data, Categoria, Prodotti acquistati (liste) e Ripetizione, con montaggio immediato senza
  animazione: `Reveal` esiste ma qui non è usato.
- `ListRow` (`src/components/ListRow.tsx`) è condiviso da 7 viste: Spese, Abbonamenti, Prossimi rinnovi, Categorie,
  Barre, Dettaglio giornaliero, Dettaglio transazioni. Va modificato solo in modo additivo.
- `SubscriptionList.tsx:98-151` usa lo stesso schema di freccia + matita (con azioni di stato nei dettagli).

### Decisione D6
- Estendere lo stesso schema anche a **Pagamenti ricorrenti** (`SubscriptionList`) per coerenza? Consiglio sì, ma
  in una seconda sotto-fase dopo l'approvazione visiva di Spese: la issue parla di «spese».
- Animazione di chiusura: AGENTS.md ammette transizioni solo su `transform`/`opacity`, quindi niente animazione
  dell'altezza. Proposta: apertura con `Reveal` (dissolvenza e 4 dp), chiusura con `usePresence` (dissolvenza breve,
  poi smontaggio); lo spostamento delle righe sotto resta immediato. Alternativa con griglia
  `grid-template-rows 0fr→1fr`: anima il layout ed è contraria alla convenzione, da accettare esplicitamente.

### Interventi
1. **Struttura accessibile.** La parte principale della scheda diventa un unico `StateLayerPressable` con
   `role="button"`, `aria-expanded`, `aria-controls` ed etichetta «Mostra/Nascondi dettagli di {descrizione}, {data}».
   Il pannello dei dettagli sta **fuori** dal pressable, perché un bottone dentro un bottone non è valido e
   provocherebbe attivazioni accidentali. Nella scheda chiusa non restano pulsanti interni.
2. **Layout chiuso.** Icona a sinistra; nome (massimo 2 righe con ellissi, nome completo nell'etichetta accessibile
   e nei dettagli) e sotto la data abbreviata (`formatDate(date, { day: 'numeric', month: 'short' })` da
   `useI18n`, es. «6 nov» / «Nov 6»); importo a destra, allineato su tutte le larghezze (`tabular-nums`, larghezza
   minima comune, `flexShrink: 0`). Il segno «Lista spesa» resta nella colonna testo.
3. **Spaziature.** Ridurre `paddingVertical` e `minHeight` tramite una variante dedicata, per esempio
   `ListRow density="compact"` o un nuovo componente `ExpandableRow` in `src/components/`, mantenendo il bersaglio
   ≥48 dp. Bordo più leggero (`outlineVariant` invece di `outline`). Valori dai token.
4. **Dettagli.** Data completa, categoria, prodotti, ripetizione e, in fondo, `Button` «Modifica» (`onEdit`).
   Animazione come da D6, con movimento ridotto via `useReducedMotion()`.
5. **Prestazioni.** Mantenere `memo(ExpenseRow)` con props stabili e il formattatore `Intl` della data breve
   creato una volta per lingua, come `dates`/`amounts` (vedi HANDOFF, «Spese», 4052 → 549 ms).
6. Traduzioni EN, aggiornamento di `Guide.tsx:57` («tocca una spesa per vederne i dettagli e modificarla»).

### Rischi e regressioni
- Rilascio del tocco sullo scroll mobile: il pressable non deve attivarsi durante lo scorrimento, comportamento
  verificato da `StateLayerPressable`/RN Web, da controllare con touch emulato.
- Focus: dopo la chiusura del dialogo di modifica il focus deve tornare al pulsante della scheda, non a inizio
  pagina.
- Paginazione «Mostra altre spese» e riepiloghi mensili invariati.
- Le altre 6 viste che usano `ListRow` non devono cambiare (variante facoltativa).

### Test
- Nessun test DOM esistente per le righe. Aggiungere test puri per l'eventuale helper di formato data breve IT/EN
  (`tests/i18n.test.ts`).
- Browser: tocco/click/Invio/Spazio aprono e chiudono; Tab raggiunge «Modifica» solo da aperta; descrizioni di 100
  caratteri a 320 px; importi allineati; `prefers-reduced-motion`; nessun salto dello scroll; 240 spese TEST con
  misura d'apertura comparabile a quella registrata.

---

## #9 — Modificare la frequenza di un abbonamento esistente

**Priorità P1 · stima L · tocca dominio, Rules, decoder e backup.**

### Stato attuale (verificato)
- `ExpenseEditor.tsx` («Modifica serie», riga 61) usa `ExpenseFields`, che non include `RepeatField`. La frequenza
  è copiata da `record.recurrence` e non modificabile: conferma il bug.
- Modello: una serie è **un solo documento**. Le occorrenze sono calcolate (`occurrenceDateAt`, `recurrence.ts`) da
  `expense_date` (o `first_payment_date` per le prove) e `recurrence`. I prezzi sono legati al **numero di
  occorrenza** (`price_changes`, `pricing.ts`), gli stati alla **data** (`status_changes`, `subscription.ts`).
- Cambiare semplicemente `recurrence` nel documento ricalcolerebbe **tutte** le date e il numero dei pagamenti
  passati. Violerebbe sia il criterio «storico invariato» sia la convenzione «mai alterare pagamenti già maturati».
- Rules: `trialUpdate` (`firestore.rules:44-48`) vieta già di cambiare `recurrence` sulle serie con prova iniziata;
  `validDate` vieta `expense_date` futura (righe 14-28).

### Decisione D9 — modello del cambio di frequenza
- **A (consigliata): «nuovo calendario» nel documento.** Un campo facoltativo compatto (es. `calendar_changes`,
  stringa `"indice:YYYY-MM-DD:recurrence"`, massimo pochi elementi, regex unica nelle Rules come `status_changes`)
  dice che dall'occorrenza numero *n* il calendario riparte dalla data *D* con la nuova frequenza. Indici e prezzi
  proseguono (l'occorrenza *n* resta la *n*-esima), stati per data invariati, storico intatto per costruzione.
  Richiede `schema_version: 3`, perché i client vecchi devono rifiutare invece di contare date sbagliate (stesso
  schema delle prove), più decoder, backup v6 e Rules.
- **B: chiudere e ricreare.** Si annulla la serie da oggi e se ne crea una nuova con la nuova frequenza in una sola
  transazione. Due ostacoli:
  - la nuova serie partirebbe in una data futura, vietata da `validDate`;
  - usare `first_payment_date` la farebbe apparire «In prova gratuita».

  Servirebbe quindi un'eccezione nelle Rules o un nuovo campo, e l'abbonamento comparirebbe due volte nell'elenco.
- **C (ridotta): solo senza storico.** Frequenza modificabile soltanto se nessuna occorrenza è maturata (la serie
  parte in futuro, per esempio una prova non ancora iniziata). Non risolve il caso tipico della issue.

Le sezioni seguenti assumono A. Prima di implementare va confermato con l'utente: è la scelta con più impatto
del piano.

### Interventi (opzione A)
1. **Dominio (`src/domain/`).**
   - `recurrence.ts`: calendario a segmenti, `occurrenceDateAt(start, recurrence, n, changes)` e
     `occurrenceDates(…)`, con un'unica funzione di base riusata ovunque.
   - Aggiornare tutti i chiamanti: `history.ts` (`expandOccurrences`, `forecastOccurrences`, `upcomingRenewals`,
     `subscriptionSummary`), `pricing.ts` (`nextRenewal`), `subscription.ts` (`nextPaidRenewal`), `expense.ts`
     (`applyPriceEdit`, `currentPrice`), `trial.ts`, `features/expenses/PriceSchedule.tsx`, `TrialField.tsx`.
   - Nuova funzione pura `applyFrequencyChange(record, recurrence, firstDate, today)`. Ammessa solo da oggi in poi:
     l'indice è quello del primo rinnovo futuro, la data scelta deve essere ≥ domani. Per le serie in prova va
     ammessa solo a prova conclusa, oppure va modificata la frequenza della prova finché è futura (da definire in D9).
2. **Contratto, decoder, backup.**
   - `contract.ts` e `firestore.ts`: codifica e decodifica della stringa compatta, validazione di ordine e indici,
     accettazione di `schema_version` 3.
   - `backup.ts`: v6 con array leggibile, lettori v1–v5 invariati, rifiuto di v6 dai client vecchi.
   - `docs/testing/`: nuova fixture.
3. **Rules.** Funzione `calendarChanges(d)` con una sola regex e il collegamento a `schema_version == 3`. Il
   documento in Firestore non può tornare a schema inferiore. Rimisurare il budget di espressioni: `expense()` è
   già vicino al limite secondo i commenti alle righe 53-54 e 79-81.
4. **UI.** In «Modifica serie», un campo «Frequenza» (`SelectField` settimanale/mensile/annuale) e la data del primo
   rinnovo con la nuova frequenza, proposta uguale al prossimo rinnovo attuale. Mostrare un'anteprima «Prossimo
   rinnovo: …» e l'avviso «I pagamenti già effettuati restano invariati». Le variazioni di prezzo future già
   programmate continuano sugli indici: va spiegato chiaramente o richiesta conferma se esistono.
5. **Viste.** `SubscriptionList`, `UpcomingRenewals`, l'export CSV (`backup.ts:269`, la colonna frequenza mostrerà
   la frequenza attuale) e `ExpenseList` (Ripetizione nei dettagli) devono usare la frequenza valida alla data
   dell'occorrenza. Oggi `Occurrence.recurrence` copia quella del documento.
6. **Documentazione.** `Guide.tsx:68`, `docs/architecture.md` (decisione e compatibilità), AGENTS.md (convenzione
   accanto alle prove gratuite).

### Dipendenze
- #6, se D6 estende la scheda ad Abbonamenti: fare #6 prima per evitare conflitti su `SubscriptionList.tsx`.
- Se #7b introduce dati nuovi, coordinare un solo backup v6.
- Rilascio: prima le Rules, poi l'Hosting. I client già aperti vanno ricaricati, come per lo schema 2.

### Rischi e regressioni
- **Alto**: un errore nel calcolo segmentato altera totali, Dashboard, Fondi (spese previste) e CSV. Mitigazione:
  le serie senza `calendar_changes` devono produrre **esattamente** le stesse occorrenze di oggi (test di
  equivalenza su tutte le fixture esistenti).
- Gli stati (pausa/annullamento) cambiati oggi valgono da domani: comporli correttamente con un cambio di
  calendario nello stesso giorno.
- Il limite `maxOccurrences` (1000) per segmento o totale va definito.

### Test
- `tests/recurrence`/`history.test.ts`/`pricing.test.ts`/`subscription.test.ts`/`trial.test.ts`:
  - equivalenza senza cambi;
  - mensile → annuale e settimanale → mensile con pagamenti passati invariati (date e importi);
  - prossimo rinnovo ricalcolato;
  - prezzi programmati oltre il cambio;
  - pausa e annullamento a cavallo;
  - fine mese (31 → 28/29) nel nuovo segmento;
  - rifiuto di cambi nel passato o non ordinati.
- `tests/contract.test.ts`, `tests/backup.test.ts`: codifica e decodifica, v6 round-trip, lettore v5, rifiuto di
  schema 3 non valido.
- `tests/emulator/firestore.e2e.ts`:
  - Rules accettano schema 3 valido;
  - rifiutano stringhe malformate, `calendar_changes` su spese singole e ritorno a schema inferiore;
  - budget di espressioni non superato con 8 prezzi + 8 stati + cambi di calendario.
- `tests/i18n.test.ts`. Browser: modifica della frequenza, storico pagamenti invariato, Dashboard e Fondi
  coerenti, CSV.

---

## #7 — Semplificare Fondi e Budget, mantenendoli opzionali

**Priorità P3 · stima L–XL · da dividere in fasi · richiede decisioni di prodotto.**

### Stato attuale
- Il modello (`src/domain/funds.ts:1-58`) distingue saldo, ricarica, budget e speso; prevede movimenti immutabili
  (entrate e trasferimenti) ed eccezioni del budget. Le convenzioni stabili sono in AGENTS.md («Fondi: …»).
- UI:
  - `FundsPage.tsx` mostra le tessere Disponibile ora/Saldo a fine mese/Spese/Entrate, il budget complessivo,
    le azioni «Nuovo fondo», «Aggiungi denaro» e «Trasferisci», le spese senza fondo, i dettagli mensili con
    movimenti, archiviazione ed eliminazione;
  - `FundEditor.tsx` contiene nome, colore, icona, saldo iniziale, data di inizio, ricarica e la sezione budget a
    scomparsa con eccezioni.
- Già opzionali oggi:
  - senza fondi il campo non compare nel modulo (`ExpenseForm.tsx:97`, `fundChoices.length > 0`);
  - le spese senza `fund_id` funzionano ovunque.

  **Ma** con almeno un fondo attivo la scelta del fondo diventa obbligatoria («Scegli il fondo che paga la spesa,
  oppure Nessun fondo.», `ExpenseForm.tsx:61`), salvo un fondo predefinito: è un passaggio in più contrario alla
  issue.
- Dati reali: secondo HANDOFF l'archivio hybrid contiene 3 fondi e 6 movimenti. In produzione esistono dati con
  ricariche/movimenti. Non vanno mai cancellati automaticamente.

### Decisioni D7 (da chiedere prima di iniziare)
1. **Funzioni avanzate: nascoste o rimosse?** Consiglio di **nasconderle dal flusso principale** senza cambiare il
   modello. I dati esistenti restano validi, letti e preservati in modifica, e il backup resta invariato.
   Rimuoverle significherebbe migrare o perdere dati reali e cambiare Rules e backup: da evitare senza un piano
   esplicito.
2. **Fondi con ricariche, movimenti o saldo iniziale già salvati:**
   - (a) mostrarli in una sezione «Dettagli avanzati» in sola lettura;
   - (b) mantenere un accesso «Opzioni avanzate» per modificarli.

   Consiglio (a) più la possibilità di archiviarli.
3. **Concetto di «saldo».** Se spariscono saldo iniziale e ricariche, la pagina mostra solo «speso» e «budget
   rimanente». Le tessere di saldo vanno tolte, o conservate solo per i fondi che hanno dati di saldo?
4. **Budget mensile generale** indipendente dai fondi. Richiede un nuovo documento: proposta
   `users/{uid}/settings/budget`, con piano compatto come `budgets`. Comporta Rules, decoder, listener, backup e
   «nessuna scrittura automatica». **Non** in `localStorage`: è un dato, non una preferenza di presentazione. Va
   deciso se è nel perimetro.
5. **Eccezioni mensili esistenti:** continuano a valere nel calcolo (`budgetFor`) anche se non più modificabili?
   Consiglio sì; in alternativa vanno rimosse esplicitamente dall'utente.

### Fasi proposte
**7a — Semplificazione UI senza modifiche ai dati (P2 dopo la decisione).**
1. `FundEditor.tsx`: nome, colore, icona e budget mensile facoltativo (interruttore più importo, ricorrente da
   questo mese). Saldo iniziale, data di inizio, ricarica ed eccezioni escono dal flusso. In modifica il
   salvataggio **preserva** i campi non mostrati (`initial_minor`, `start_date`, `recharges`, `budget_exceptions`),
   da coprire con un test.
2. `FundsPage.tsx`:
   - per ogni fondo nome/icona, speso nel mese, budget rimanente e `BudgetMeter`;
   - aprendo un fondo, l'elenco delle sue spese del mese, riusando la riga di #6;
   - «Aggiungi denaro» e «Trasferisci» tolti dalla barra principale (o spostati in «Opzioni avanzate» secondo
     D7.2);
   - stato vuoto essenziale senza invito obbligato («Nessun fondo» più un pulsante discreto);
   - testi esplicativi ridotti (es. `FundsPage.tsx:130`).
3. `ExpenseForm.tsx`: con fondi presenti, predefinito «Nessun fondo» (o il fondo predefinito) invece dell'errore
   obbligatorio. Eliminare `fundMissing` mantenendo la validazione degli ID, e verificare
   `nummo.defaultFund.v1.<uid>`.
4. `src/domain/funds.ts`: eventuali funzioni pure per la vista semplificata (speso/rimanente per fondo), senza
   toccare `balanceAt`/ricariche.
5. `Guide.tsx:72-75`, traduzioni, `docs/architecture.md`; aggiornare AGENTS.md («Fondi: …») per la nuova UX.

**7b — Budget generale (solo se approvato in D7.4).** Nuovo documento e Rules, `useRemoteFunds` o un nuovo hook,
backup v6 (condiviso con #9 se rilasciati insieme), test emulatore, editor nella pagina Fondi o nella Dashboard.
Da decidere anche come si combina con i budget dei fondi (somma? indipendente?).

**7c — Eventuale dismissione delle funzioni avanzate:** solo dopo uso reale e con migrazione esplicita e confermata
dall'utente. Fuori da questo piano.

### Dipendenze
#6 (riga di spesa riutilizzabile); #10 (i colori dei fondi condividono la palette: con l'opzione A di #10 i fondi non
cambiano); #9/#7b per il backup v6 comune.

### Rischi e regressioni
- **Perdita silenziosa di dati** se l'editor semplificato riscrive i campi nascosti con valori predefiniti. È il
  rischio principale e richiede test di dominio e un test emulatore di modifica conservativa.
- Saldi e «Disponibile ora» cambiano significato o scompaiono: verificare che nessun'altra vista (modulo,
  `FundField` con saldo?) li richieda.
- Assegnazione delle spese «Senza fondo» (`FundsPage.tsx:318-321`): mantenerla, perché non è un'impostazione
  avanzata.
- Le transazioni server (`useRemoteFunds`) e le Rules del fondo restano invariate in 7a.

### Test
- `tests/funds.test.ts`: helper speso/rimanente; preservazione dei campi nascosti al salvataggio; budget
  disattivato/modificato da oggi senza toccare il passato; fondo senza budget.
- `tests/expense.test.ts`/form: nessun errore senza scelta del fondo; predefinito rispettato.
- `test:emulator`: modifica di un fondo con ricariche e movimenti esistenti → campi invariati.
- Browser: flussi senza fondi (nessun passaggio aggiuntivo in Nuova spesa) e con fondi; 320 px; archivio con dati
  avanzati preesistenti (fixture `docs/testing/`).

---

## #11 — Ridisegnare le icone pixel art

**Priorità P3 · stima M, iterativa · nessun impatto su dati o Rules (ID invariati).**

### Stato attuale
- 42 sprite in `src/components/categoryPixelGlyphs.ts`: griglia ≤12×12 a caratteri (`.` `i` `b` `t` `o` `l`),
  scala ×2, tinte per significato condivise con lo stile colorato. Risoluzione dei colori per tema in
  `theme/iconPalette.ts`; scelta e ripieghi in `categoryIconSets.ts`.
- `tests/categoryIcons.test.ts` impone: uno sprite per ID, centrato su 12×12, stessa tinta del colorato, celle
  intere, nessun colore letterale, contrasti sulle superfici di ogni accento.
- Precedenti: `popcorn` ridisegnato due volte, `wifi`/`music`/`film` ridisegnati (HANDOFF). La issue non elenca le
  icone problematiche.

### Interventi
1. **Audit.** Generare un foglio di confronto (HTML statico nella scratchpad, fuori dal repo) con tutti i 42 sprite
   a 24/48 px, chiaro e scuro, accanto al glifo minimale e al colorato, con l'etichetta di `categoryIconLabels`.
   L'utente classifica: chiare / da rivedere / ambigue (coppie simili, es. `coin`/`cash`/`wallet`/`piggy`/`safe`,
   `burger`/`pizza`/`pasta`/`utensils`, `heart`/`heartpulse`/`cross`, `tv`/`laptop`/`film`).
2. **Regole di stile comuni**, da fissare prima di ridisegnare e da riportare nel commento del file e in
   `docs/architecture.md`:
   - area utile 10×10 o 12×12 coerente;
   - contorno `i` di 1 cella su tutto il perimetro;
   - massimo 3 ruoli colore per icona;
   - dettagli sottili solo in `b`/`t` (regola esistente);
   - silhouette riconoscibile senza colore;
   - nessun dettaglio di una sola cella isolata.
3. **Ridisegno a lotti per famiglia** (cibo, denaro, casa, svago, trasporti/tecnologia, salute), con approvazione
   visiva a ogni lotto prima del successivo.
4. Mantenere la griglia 12 (aggancio a multipli di 12 px in `snapPixelSize`). Passare a 16 rompe l'integrità a
   24 px.
5. Aggiornare l'anteprima in Impostazioni (`SettingsPage.tsx:35`) solo se cambia l'insieme rappresentativo.

### Rischi
Puramente visivi; i test esistenti fanno da guardia strutturale. Non rimuovere né rinominare ID (compatibilità di
record e backup).

### Test
`tests/categoryIcons.test.ts` (invariato, deve passare), eventuale test di «distinguibilità» minima (sprite non
identici tra ID diversi). Prova visiva in app nelle tre superfici: elenco Spese, Categorie, selettore icone.

---

## Riepilogo delle decisioni richieste all'utente

| ID | Issue | Domanda | Raccomandazione |
| --- | --- | --- | --- |
| D10 | #10 | Assegnazione a collisioni minime calcolata (A) o colore salvato nella categoria (B)? | A |
| D6 | #6 | Stessa scheda anche per Pagamenti ricorrenti? Chiusura con sola dissolvenza (convenzione) o animazione dell'altezza? | Sì, in sotto-fase; sola dissolvenza |
| D9 | #9 | Modello: nuovo calendario nel documento (A), chiudi-e-ricrea (B), solo senza storico (C)? Comportamento con le prove? | A, schema 3 + backup v6 |
| D7.1–5 | #7 | Nascondere o rimuovere le funzioni avanzate; dati esistenti; saldo; budget generale; eccezioni | Nascondere, sola lettura, 7a prima, 7b solo se confermato |
| — | #4 | Autorizzazione a commentare e chiudere dopo la verifica su Pixel 8 | — |
| — | #5 | Video e sessione su dispositivo con debug remoto | — |

## Fuori ambito

Nessun deploy, pubblicazione delle Rules, commit o chiusura di issue senza autorizzazione. Nessuna nuova dipendenza.
Nessuna migrazione automatica di dati personali. Nessun service worker, nessun OCR/Google Pay.
