# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026, correzione focus e prestazioni sul checkout `d5170ee` con modifiche locali (Europe/Rome)**.
Gestionale personale di spese solo web, Google Auth e
Firestore BYOF, accesso riservato all'UID in `config/owner`. Contesto stabile, architettura e comandi: `AGENTS.md`;
motivazioni: `docs/architecture.md`; configurazione: `README.md`, `docs/firebase-personale.md`.
Questo file descrive il checkout: risultati emulati non certificano cloud, dispositivi reali o pubblicazione.

## Ultima fase — focus dei selettori e apertura Spese (non committata)

- **Diagnosi riprodotta:** montando «Nuovo fondo», Paper `Menu` chiuso metteva il focus sul selettore Mese:
  scorrimento automatico di 253 px. `SelectField` e `MenuSelect` ora usano anchor a coordinate e ripristino esplicito
  del focus con `preventScroll`; il dialogo parte a scroll zero, anche alla riapertura.
- **Spese:** rimossi formattatori `Intl` ricreati per riga e scansioni ripetute dell'elenco per ciascun mese.
  Riepiloghi in un passaggio (`expenseMonths.ts`), categorie indicizzate, formattatori riusati per lingua.
  Prime 50 righe, altre 50 con «Mostra altre spese»; ricerca/ordinamento/riepiloghi restano completi.
  Cambio ricerca/filtro/ordine riparte da 50. Guida e traduzioni IT/EN aggiornate; motivazioni in `docs/architecture.md`.
- **Misura Chromium headless:** 240 spese TEST su 24 mesi, 412×915, CPU 4×, tre aperture effettive della sezione:
  prima **4052/4024/4146 ms**, dopo **629/549/541 ms** (mediana 4052 → 549 ms).
  Il confronto misura l'apertura con tutte le righe prima e le prime 50 dopo; tutte le 240 restano consultabili.
  Sono dati emulati, non una misura sul dispositivo o sull'archivio personale dell'utente.
- **Verifiche attuali:** `npm run check` **OK**, typecheck, **305/305** test e build demo con endpoint espliciti
  Auth 39099/Firestore 39280. Due regressioni sui riepiloghi (mesi/anni, filtri, totali, ordine e input intatti),
  casi i18n estesi. Browser: selezione mese, Escape e focus ripristinato senza scroll, ordinamento, ricerca,
  espansione fino a tutte le 240 righe; layout 320×740 chiaro IT e 1280×900 scuro EN senza overflow orizzontale,
  dialogo in cima e prime 50 righe/traduzioni verificate. Controllo diff OK. Nessuna modifica a servizi/Rules o dati reali.

## Git

- **Ritocco successivo (non committato):** rimossa l'icona di spunta dal pulsante «Registra spesa» nel dettaglio
  lista (`ListsPage.tsx`). `npm run check` OK: typecheck, 305/305 test e build demo; resa browser non ricontrollata.

- Ramo `main`, HEAD **`d5170ee`** (8 novembre 2026, 21:49 +01:00): dettaglio lista con «Totale spesa» e «Registra spesa» sulla
  stessa riga. Riferimento `origin/main` non ricontrollato (nessun fetch).
- **Non committato — pagina Impostazioni:** il dialogo `SettingsDialog` diventa `SettingsPage.tsx`, pagina del
  workspace aperta dal menu account (contatore `settingsRequest` da `App.tsx`, come Categorie/Importa ed esporta),
  con «Fatto» che torna alla sezione d'origine e «Ripristina» in fondo. Sezioni impilate su mobile, in due colonne
  da medium in su. Da disconnessi l'icona Impostazioni sostituisce la schermata di accesso fino a «Fatto».
- **Non committato — sprite pixel `wifi`, `music`, `film` ridisegnati** (`categoryPixelGlyphs.ts`, stessi ID e tinte):
  wifi con due archi spessi e punto, due note unite piene, pellicola verticale con fori e due fotogrammi, come negli
  altri stili. Non viste nell'app con categorie reali; prove visive pregresse sotto.
- **Revisione documentale precedente:** riesaminati codice, script, Rules, documentazione e Git; aggiornati solo questi due
  documenti, conservando le modifiche applicative preesistenti e la rinomina già nell'indice. Nessun commit o deploy.
- Commit recenti: `d5170ee` riga checkout liste; `5a42ef1` pagina Importa ed esporta, ritocchi Dashboard/Fondi/Liste, backup fittizio standard;
  `296407b` liste della spesa, backup v4, Dashboard informativa, backup fittizio limite; `85fb9aa` fondi e budget,
  icone a tema denaro; `96777ac` transizioni e ricerca abbonamenti; `112ebcb` stati abbonamenti, backup v2, tre stili
  icone, predefiniti, avvio. I titoli dei commit non descrivono interamente il contenuto.
- HEAD traccia ancora `.nummo-hybrid-12312.json` (config temporanea del runner, non coperta da `.gitignore`).

## Funzionalità implementate (riscontro nel codice)

- **Sessione:** login Google popup, logout dopo scritture pendenti, isolamento per UID, avatar con fallback, errori
  `auth/...` validati IT/EN; guida pubblica `#guida`.
- **Spese:** CRUD con UUID stabile, conferma server, revisioni e conflitti espliciti, verifica degli esiti incerti,
  copie di recupero in memoria, bozza conservata tra sezioni. Pagina Spese a due viste: «Spese» (singole, ricerca,
  filtro categoria, ordinamento, raggruppamento mensile) e «Pagamenti ricorrenti» (serie, ricerca normalizzata,
  stati Attivo/In pausa/Annullato, storico pagamenti, prossimi rinnovi). Ricorrenze settimanali/mensili/annuali con
  fino a otto variazioni di prezzo per numero di rinnovo; i pagamenti maturati non vengono mai riscritti.
- **Categorie:** pagina dal menu account (sotto Impostazioni) o dal modulo; nomi unici, 45 icone in tre stili
  (minimale, colorato, pixel); cinque predefinite su archivio vuoto confermato dal server.
- **Fondi e budget** (destinazione «Fondi»): saldo iniziale, ricarica mensile calcolata, budget mensile con eccezioni,
  entrate e trasferimenti immutabili, archiviazione, fondo predefinito per browser, mesi navigabili
  effettivo/previsione, selettore fondo nel modulo, assegnazione esplicita delle spese «Senza fondo».
- **Liste della spesa** (destinazione «Liste»): crea/rinomina/duplica/elimina, checklist con salvataggio automatico,
  «Registra spesa» in transazione (una spesa con `list_id`/`list_items`, lista archiviata, non acquistati spostabili
  in nuova lista); eliminare la spesa riattiva la lista. Limite 100 prodotti per lista solo lato client.
- **Dashboard:** periodi mese corrente/precedente, 3/6/12 mesi; riepilogo con date del periodo (confronto globale col
  periodo precedente rimosso; resta la variazione per categoria nelle righe Barre); Ciambella (centro vuoto, dettagli al passaggio/
  selezione), Blocchi treemap senza testo nelle tessere con pannello dettagli, Barre complete ordinate per spesa;
  dettaglio transazioni per categoria con conteggio; andamento giornaliero SVG con selezione del giorno (nessuna
  apertura delle transazioni del giorno). Preferenza `ranking` legacy migrata a `bars`.
- **Importa ed esporta** (menu account, sotto Categorie): CSV di sola consultazione; JSON `nummo-backup` **v4** unico
  ripristino (lettori storici per le versioni precedenti), anteprima su una riga, unione senza sovrascritture,
  sostituzione confermata con copia automatica, esiti in snackbar.
- **Shell/UI:** Material 3 adattiva, quattro destinazioni + «Nuova spesa» (modulo desktop compatto ≥1024 dp),
  temi/tinte, IT/EN senza rimontare sessione o bozze, tastiera virtuale gestita, transizioni con riduzione movimento.
- **Collaudo:** `docs/testing/` con due backup fittizi v4 (casi limite; spese standard prefissate `Demo ·`) e guida
  ai risultati attesi. Da importare preferibilmente nella demo.

## Decisioni tecniche recenti (dettagli in `docs/architecture.md`)

- Ricariche dei fondi calcolate dal piano come le occorrenze, mai documenti: niente duplicati tra dispositivi né
  migrazioni automatiche; spese esistenti senza `fund_id` restano «Senza fondo».
- Liste e prodotti con scritture semplici «ultima vince» (uso offline in negozio tramite coda SDK); l'unica scrittura
  economica è la registrazione transazionale.
- Backup v4 aggiunge fondi, movimenti, liste; piani e `status_changes` stringhe compatte in Firestore per il budget
  di espressioni delle Rules, array nel backup.
- Pagina Importa ed esporta montata nascosta fuori pagina per conservare anteprima e operazioni in corso.

## Problemi aperti e limitazioni

- **Allineamento Rules cloud da verificare:** ultima pubblicazione documentata il 6 novembre 2026 (`a30a988`). Le Rules locali
  successive (stati abbonamenti, fondi/movimenti/`fund_id`, liste/`list_id`, icone `wallet`/`bank`/`cash`/`safe`/
  `growth`) non hanno una pubblicazione documentata. Se la release fosse ancora quella registrata, le nuove scritture
  sarebbero rifiutate («Accesso negato»). Stato cloud non interrogato: confrontare le Rules distribuite e, se necessario,
  pubblicarle solo con autorizzazione **prima** della pubblicazione Hosting.
- **Compatibilità icone:** decoder/import rifiutano ID rimossi (`receipt`, `phone`, `bed`, `ticket`, `briefcase`,
  `droplet`, `wrench`, `pill`, `book`, `plane`, `scissors`, `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`,
  `ellipsis`; prova locale: tutti i 18 ID sono rifiutati da decoder categorie e lettore backup). Vecchi record possono bloccare categorie e backup;
  presenza nei dati personali non verificata, nessun adapter.
- **Rules:** budget di 1000 espressioni stretto (rimisurare a ogni nuovo controllo sulle spese); non verificano
  esistenza di fondo/lista referenziati, unicità dei nomi di fondo (solo client), ordine/date degli stati.
- **Fondi:** eliminazione basata sui dati caricati (concorrenza → spese orfane, non perse); cambiare fondo a una serie
  sposta anche i pagamenti passati; fondo predefinito non sincronizzato tra browser.
- **Liste:** spunte simultanee su due dispositivi: prevale l'ultima; nomi non unici; lista archiviata non modificabile.
- **Backup/concorrenza:** nessuno snapshot globale né atomicità dell'intero ripristino; piano di sostituzione
  ricalcolato senza nuova anteprima. Client precedenti non leggono backup più recenti.
- **Guida/avvio:** `warmUpServices()` parte da `App.tsx` anche su `#guida`: assenza di traffico Firebase non garantita.
- **UI mobile (diagnosi storiche non riverificate):** menu Categoria che allarga il viewport o copre la pillola, scroll
  annidato nei menu bassi, etichetta «Dashboard» troncata a 320 px, Nuova spesa in landscape aperta scorsa.
- Nessun service worker né avvio offline a freddo; cache persistente non cancellata al logout; collezioni caricate
  integralmente. Licenza assente; audit dipendenze non aggiornato. Nessun lint configurato.
- Richieste pregresse senza contesto sufficiente (scritta «minimale» senza testo, colori attivi mobile/rail): chiarire
  con l'utente prima di intervenire.
- **Documentazione d'uso parzialmente storica:** README indica ancora Spese → «Dati» per i backup e non elenca Fondi/Liste;
  `docs/architecture.md` conserva sezioni poi superate (classifica, dettaglio giornaliero, totale centrale ciambella).
  Per il comportamento attuale usare codice e questo stato; riallineamento fuori dalla presente revisione di due file.

## Verifiche

**Revisione documentale precedente** sulla base `d5170ee`, prima della correzione focus/prestazioni, dipendenze già installate,
Node 26.13.0, npm 12.2.2, Java 21.0.13:

| Comando | Esito |
| --- | --- |
| `npm run check` | **OK**: typecheck, **303/303** test, export demo `dist-demo/` (435 moduli, bundle 2,4 MB). |
| `npm run check:env` | **OK**: policy dei file di sviluppo; non certifica servizi o credenziali. |
| `git diff --check` | **OK**. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-review.json` | **15/15** (SDK/Rules, CRUD, conflitti, stati, fondi, liste, import v4). Porte dedicate anche per Hub/log/websocket, UI disattivata; config temporanea rimossa dopo la suite. |
| `npm run test:hybrid` | **8/8** (lifecycle runner, Firestore demo reale, Expo simulato). |
| Prova locale decoder/import con ID icona rimossi | **OK**: 45 icone attive, 18 ID storici rifiutati da entrambi. Nessun dato personale letto. |

Le suite hybrid ed emulatori sono state rieseguite fuori dalla sandbox dopo i primi tentativi falliti
(avvio test hybrid; binding porte emulatori). Solo dati demo isolati, nessun arresto dei servizi utente.
I `PERMISSION_DENIED` nei casi negativi delle Rules sono attesi; non costituiscono un fallimento della suite.

**Evidenza delle fasi precedenti (stesso giorno, non ripetuta qui):** Chromium headless su build demo con emulatori
dedicati per fondi, liste, Dashboard, modulo desktop compatto, Importa ed esporta e nuova pagina Impostazioni
(412×915 chiaro IT, 1280×900 scuro EN, 320×740 scuro IT): nessun overflow o errore JS riportato.
Per Impostazioni riportati accesso da connessi/disconnessi e ritorno con «Fatto»; sprite pixel visti in anteprima
24/48/72 px chiaro/scuro. Queste prove non sono state ripetute nella revisione documentale.
Riepilogo/esiti del ripristino, centro ciambella, Blocchi senza
testo e rimozioni di testi verificati solo da typecheck/test/build. Misure d'avvio: `docs/avvio-prestazioni.md`.

**Ancora non verificati nell'ultima fase:** `npm ci`/clone pulito, `check:hybrid`, avvio interattivo dev/demo, build/preview cloud,
dry-run/deploy, audit, import UI dei backup fittizi, dispositivi reali, touch, tastiera virtuale reale,
screen reader, concorrenza tra due dispositivi.

## Prossime attività, per priorità

1. **Rules e compatibilità prima di distribuire** (con autorizzazione per il cloud): decidere conservazione o migrazione
   esplicita degli ID icona rimossi, con regressioni decoder/import; confrontare le Rules cloud e, se necessario,
   pubblicarle (`--only firestore:rules`, `--project ID`) verificando poi la release; infine valutare `npm run deploy:hosting`.
2. **Collaudo in demo** con i backup di `docs/testing/` (`npm run emulators`, `emulators:seed`, `dev:demo`):
   unione/conflitto/sostituzione v4 dall'interfaccia, riepilogo ed esiti del ripristino, eccezioni di budget e
   sospensione ricarica, dialoghi Fondi/Liste a 320 px e in landscape, CSV in foglio di calcolo reale.
3. **Collaudo dispositivi:** telefono reale (touch, tastiera virtuale, safe area, rotazione), screen reader, Tab/Invio
   su Blocchi e Ciambella, riduzione movimento; riprodurre i problemi UI mobile elencati sopra.
4. **Igiene Git separata:** aggiungere `.nummo-hybrid-*.json` a `.gitignore` e togliere dall'indice il file tracciato
   (`git rm --cached`) senza cancellarlo se un runner lo usa. Non ripulire `.firebase/`, lock, staging o `emulator-data/`
   senza ispezione. Nessun commit automatico.
5. **Avvio/guida:** misurare rete su `#guida`; procedura `docs/avvio-prestazioni.md` su dispositivo e rete lenta;
   popup dopo logout/scadenza, Safari/Firefox/Edge.
6. **Riproducibilità:** `npm ci` da clone pulito su Node LTS, audit aggiornato, scelta della licenza.
   Riallineare README e sezioni superate di `docs/architecture.md` alle funzioni attuali, preservandone le decisioni valide.
   Unicità server dei nomi fondo, sincronizzazione del predefinito, paginazione e service worker sono evoluzioni da
   valutare, non lavori pianificati né implementati.
