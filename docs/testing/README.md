# Backup di collaudo

Quattro file JSON fittizi da importare a mano, preferibilmente nella demo locale (`npm run emulators`, `emulators:seed`,
`dev:demo`) o in un archivio Standard di prova: casi limite (v5), utente medio (v6), pagamenti eliminati (v9) ed esercenti (v10).
Nomi di categorie, fondi e descrizioni hanno prefissi distinti (`TEST`, `Medio ·`, `V9`, `V10`): i file si possono unire allo
stesso archivio senza conflitti tra loro.

## Casi limite (backup v5)

File: [`nummo-test-casi-limite-2026-11-08.json`](nummo-test-casi-limite-2026-11-08.json).
Dati interamente fittizi, formato storico `nummo-backup` **v5**, leggibile dal client corrente (backup v10):
89 spese/serie, 15 categorie, 6 fondi, 2 movimenti, 4 liste con 112 prodotti. Circa 76 kB.
Non è compatibile con versioni dell’app che leggono solo backup v1/v2/v3.

## Come usarlo

1. Preferire la demo locale con le Rules del checkout. In un archivio personale fare prima un backup JSON.
2. Da **menu account → Archiviazione e backup → Importa backup (JSON)** scegliere il file e **Unisci ai dati esistenti**.
   Categorie, fondi, liste e descrizioni sono riconoscibili dal prefisso `TEST` (eccetto il testo di prova CSV).
   L’unione aggiunge comunque dati all’archivio: non selezionare Sostituisci su dati personali da conservare.
3. I due riferimenti a una categoria e a un fondo inesistenti sono intenzionali: una spesa deve apparire senza
   categoria/fondo, con l’eventuale avviso del riepilogo import. Non sono record malformati.
4. Reimportare lo stesso file prima di modificarne i dati: nessun conflitto e nessuna nuova aggiunta attesi.
   Modificare poi una spesa `TEST` e riprovare l’unione: deve essere bloccata dal conflitto, senza sovrascriverla.

Nessuna importazione viene eseguita automaticamente. Gli ID sono fissi: riusare il file permette di verificare
la ripetibilità; eliminare o cambiare i dati TEST cambia naturalmente il risultato della reimportazione.

## Cosa controllare

Valori sotto calcolati con le funzioni del dominio al **8 novembre 2026**, su archivio contenente solo questo file.
Su un archivio misto i totali cambiano; con il passare dei giorni maturano altre ricorrenze e ricariche.

| Area / caso | Risultato atteso |
| --- | --- |
| Fondo `TEST Saldo negativo` | Saldo **−30,00 €**, nessun budget; la spesa resta visibile. |
| Fondo `TEST Budget 80 percento` | Speso **80,00 €** su **100,00 €**, stato vicino al limite; saldo **970,00 €**, incluso trasferimento ricevuto di 50,00 €. |
| Fondo `TEST Budget raggiunto` | Speso **100,00 €** su **100,00 €**, limite raggiunto; saldo **900,00 €**. |
| Fondo `TEST Budget superato` | Speso **125,00 €** su **100,00 €**, superato di **25,00 €**; saldo **875,00 €**. |
| Fondo `TEST Quotidiano` | Ricarica il giorno 31: febbraio usa il 28, aprile il 30. Budget ordinario **400,00 €**, eccezione novembre **300,00 €**, dicembre senza budget. La ricarica del 30 novembre è ancora prevista, non ricevuta. |
| Fondo archiviato | Non disponibile per nuove spese; storico e saldo **650,00 €** conservati. Ricarica sospesa da marzo 2024. |
| Movimenti | Entrata manuale **123,45 €**; trasferimento **50,00 €** tra due fondi, escluso da entrate e spese complessive. |
| Pagamenti ricorrenti | Sei serie: attive, in pausa, annullata, riattivata con otto cambi di stato e settimanale messa in pausa oggi. Il pagamento settimanale dell’8 novembre resta nello storico. |
| Date e prezzi | Mensile dal 31 gennaio con promozione e otto variazioni (una una tantum); annuale dal 29 febbraio 2024 con scadenza il 28 febbraio negli anni non bisestili. Passato conservato. |
| Importi limite | **0,01 €** e **99.999,99 €**, massimo per una spesa: nessun arrotondamento/troncamento. La spesa massima è senza fondo e domina intenzionalmente i grafici. |
| Dashboard | Oltre otto categorie con spese nel mese: gruppo virtuale Altre, dettaglio completo, nomi lunghi e accenti; verificare tre grafici e selezione persistente della ciambella. Una categoria è senza spese. |
| Liste | Una vuota, una parziale, una con **100 prodotti** (limite), una registrata. Quest’ultima è collegata a una sola spesa di **23,45 €**, senza doppio conteggio; tre prodotti comprati, uno non spuntato. |
| CSV | Descrizione `=1+1; TEST formula innocua, "caffè" àè`: esportata come testo neutralizzato, con delimitatori e virgolette gestiti. Non è una formula da eseguire. |

Riferimenti numerici globali: **132 occorrenze maturate**, speso novembre **100.474,37 €**, entrate novembre
**123,45 €**, rinnovi previsti nel resto di novembre **24,98 €**, disponibile totale **12.152,03 €**.
Le 89 righe del backup includono le sei serie; non sono 89 pagamenti del mese.

## Verifiche eseguite sul file

- Lettura con `parseBackup`, generazione con `makeBackup`, piano di unione su archivio vuoto senza conflitti.
- Seconda unione identica senza aggiunte né conflitti; rilevazione di una modifica allo stesso ID come conflitto.
- Una categoria e un fondo mancanti rilevati dal piano; coerenza tra totale spese mensili e occorrenze.
- Stati/saldi dei cinque fondi limite, scadenze febbraio, stato pause/annullamento e pagamento di oggi verificati
  con asserzioni sulle funzioni del dominio; una copia in memoria con importo zero correttamente rifiutata.
- Nessuna scrittura Firestore, importazione dall’interfaccia, prova Rules con questo specifico file o collaudo
  su browser/dispositivo eseguiti: la validazione locale non sostituisce la prova completa in demo.

Il file valido serve a esplorare situazioni difficili ma ammesse; importi negativi o date impossibili non sono
inclusi perché renderebbero inutilizzabile l’intero backup.

## Utente medio (backup v6)

File: [`nummo-utente-medio.json`](nummo-utente-medio.json), backup **v6**, dati fittizi.
Profilo di una persona in affitto con auto, dal 1° maggio all'11 novembre 2026: **187 spese singole e 9 pagamenti
ricorrenti** in 10 categorie, 3 fondi semplici (modello #7: nessun saldo, ricarica o movimento), budget mensile generale
di 2.000 € dal maggio 2026 e 2 liste. Nomi di categorie, fondi e liste prefissati `Medio ·` (nessun conflitto con le
categorie predefinite né con gli altri file); descrizioni naturali. Agosto con vacanza al mare e meno spesa alimentare.

- **Fondi:** `Spesa e casa` (budget 550 €: spesa, internet, bollette), `Tempo libero` (250 €: bar, cene, svago, Netflix,
  palestra, Spotify), `Auto` (senza budget: carburante, tagliando, assicurazione). 75 spese «Senza fondo» (affitto, caffè,
  farmacia, shopping, viaggi…), da assegnare esplicitamente se si vuole provare la funzione.
- **Abbonamenti all'11 novembre:** Affitto 750 € (7 pagamenti); Internet fibra 27,90 €; Telefono 9,99 € → **11,99 €
  dal 5° rinnovo** (totale 63,94 €); Netflix 13,99 € **in pausa dal 1° settembre** (4 pagamenti); Palestra 39 €
  **annullata dal 1° ottobre** (5 pagamenti); Amazon Prime annuale 49,90 €; Assicurazione auto annuale 420 € (giugno);
  Spazio cloud 2,99 € mensile, **cambio di frequenza** (schema 3) ad annuale 29,99 € dal 20 novembre; Spotify
  **in prova gratuita** (schema 2), primo addebito 1° dicembre a 10,99 €, nessun pagamento.
- **Liste:** `Medio · Spesa grande di ottobre` registrata (spesa del 16 ottobre, 87,40 €, 9 prodotti) e
  `Medio · Spesa della settimana` attiva, 8 prodotti di cui 3 spuntati, senza totale.

Su archivio contenente solo questo file, all'11 novembre 2026 (224 occorrenze maturate, totale **12.788,13 €**):

| Mese | Speso | Budget generale | Spesa e casa | Tempo libero | Auto |
| --- | ---: | --- | ---: | ---: | ---: |
| Maggio | 1.764,39 € | vicino (≥ 80%) | 577,21 € superato | 207,10 € vicino | 122,28 € |
| Giugno | 2.290,99 € | **superato** | 475,80 € vicino | 243,15 € vicino | 538,44 € |
| Luglio | 1.876,03 € | vicino | 567,53 € superato | 276,74 € superato | 114,08 € |
| Agosto | 2.044,03 € | **superato** | 218,99 € | 311,03 € superato | 117,52 € |
| Settembre | 1.830,60 € | vicino | 574,10 € superato | 164,07 € | 243,94 € |
| Ottobre | 1.778,63 € | vicino | 484,31 € vicino | 130,82 € | 118,08 € |
| Novembre fino all'11 | 1.203,46 € | sotto | 295,82 € | 18,56 € | 66,56 € |

Valori calcolati con il dominio; cambiano dopo l'11 novembre (Telefono il 12, Spazio cloud il 20, Affitto e Spotify
il 1° dicembre). Importare preferibilmente nella demo con **Unisci ai dati esistenti**: le categorie predefinite non
entrano in conflitto. Verificato con `parseBackup`, piano di unione su archivio vuoto (nessun conflitto né riferimento
mancante) e, nell'emulatore demo con le Rules del checkout, importazione reale con `importRecords`: l'export successivo
è identico al file byte per byte e una seconda unione non trova conflitti. Importazione dall'interfaccia non eseguita.

## Pagamenti eliminati (backup v9)

File: [`nummo-pagamenti-eliminati-v9.json`](nummo-pagamenti-eliminati-v9.json), backup **v9**, dati fittizi, circa 7 kB.
Otto abbonamenti con pagamenti tolti a mano (`skipped_payments`, numeri dell'occorrenza contati da 0) e una spesa singola,
3 categorie `V9 ·`, un fondo `V9 · Abbonamenti` con budget di **60,00 €** dal gennaio 2026. Nessun esercente (arrivano con la v10).

Valori calcolati con il dominio al **20 novembre 2026**, su archivio contenente solo questo file. «Storico» = pagamenti in
«Storico dei pagamenti»; le date eliminate non devono comparire né essere contate da nessuna parte.

| Abbonamento | Caso | Pagamenti eliminati | Storico | Prossimo |
| --- | --- | --- | --- | --- |
| `V9 Streaming` 12,99 € mensile | uno solo | 15 ago (n. 7) | 10 · **129,90 €** | 15 dic, 12,99 € |
| `V9 Palestra` 39,00 € mensile | in pausa dal 10 ott | 1 set (n. 6) | 7 · **273,00 €** | nessuno (in pausa) |
| `V9 Telefono` 9,99 € → 11,99 € dal n. 4 | due di fila, sul cambio di prezzo | 5 lug e 5 ago (n. 3, 4) | 6 · **65,94 €** (tre a 9,99, tre a 11,99) | 5 dic, 11,99 € |
| `V9 Spazio cloud` 2,99 € mensile → annuale 29,99 € dal 10 ott | il primo pagamento annuale (schema 3) | 10 ott (n. 8) | 8 · **23,92 €** | 10 ott 2027, 29,99 € |
| `V9 Lavanderia` 5,00 € settimanale dal 22 nov 2024 | **limite di 60** | dal 22 nov 2024 al 9 gen 2026 (n. 0–59) | 45 · **225,00 €** | 27 nov, 5,00 € |
| `V9 Assicurazione casa` 180,00 € annuale dal 2024 | il rinnovo del 2025 | 1 mar 2025 (n. 1) | 2 · **360,00 €** | 1 mar 2027 |
| `V9 Rivista` 4,99 € mensile dal 5 ott | **tutti** quelli maturati | 5 ott e 5 nov (n. 0, 1) | 0 · 0,00 € (storico vuoto) | 5 dic, 4,99 € |
| `V9 Musica` 10,99 € con prova gratuita (schema 2) | il primo addebito dopo la prova | 1 set (n. 0) | 2 · **21,98 €** | 1 dic, 10,99 € |

`V9 Detersivi` (25,00 €, 2 novembre) è una spesa singola: non ha «Storico dei pagamenti» e non può avere pagamenti eliminati.

- **Totali:** 81 occorrenze maturate, **1.124,74 €**. Mesi del 2026: gen 27,99 · feb 35,98 · mar 254,98 · apr 84,97 · mag 89,97 ·
  giu 84,97 · lug 79,98 · ago 61,99 · set 47,97 · ott 99,97 · nov 75,97 €.
- **Fondo `V9 · Abbonamenti`** (Streaming, Palestra, Telefono, Musica, Detersivi), spesa del mese su 60,00 €: luglio 51,99 (vicino al
  limite), agosto **39,00** (senza Streaming e Telefono eliminati), settembre 24,98 (senza Palestra e Musica eliminate), ottobre **74,97**
  superato, novembre **60,97** superato (Abbonamenti 35,97 + Spese 25,00).

**Collaudo dall'interfaccia (eseguito il 20 novembre 2026 in Standard, vedi sotto):**

1. **Unisci ai dati esistenti**: 9 spese, 3 categorie e 1 fondo aggiunti, nessun conflitto né riferimento mancante. Una seconda
   unione dello stesso file non aggiunge nulla.
2. Spese → Abbonamenti → dettagli di ciascuna serie → «Storico dei pagamenti»: numero, totale e date come nella tabella; nel
   Telefono i pagamenti successivi all'eliminazione restano a 11,99 €.
3. Eliminare un altro pagamento della `V9 Lavanderia`: rifiutato con «Troppi pagamenti eliminati per questo abbonamento: per
   continuare creane uno nuovo.», nessuna modifica. Eliminare invece il pagamento del 15 novembre di `V9 Streaming`: il totale
   di novembre scende di 12,99 € in Spese, Analisi e Fondi; una nuova unione del file segnala ora il conflitto su quella serie.
4. Esportare il JSON: il file è v10 con gli stessi `skipped_payments` (array); il CSV ha una riga per pagamento rimasto, senza
   le date eliminate.
5. In Avanzata (demo/emulatore) l'importazione deve riuscire anche per la Lavanderia: i suoi 60 numeri (il massimo) diventano
   una stringa compatta controllata dalle Rules.

## Esercenti (backup v10)

File: [`nummo-esercenti-v10.json`](nummo-esercenti-v10.json), backup **v10** (formato attuale), dati fittizi, circa 17 kB.
27 spese `V10` (26 singole e la serie `V10 Netflix`), 5 categorie `V10 ·`, nessun fondo, **12 esercenti**, di cui uno mai usato.
`V10 Lampadine` è l'unica spesa senza esercente. La serie Netflix ha anche un pagamento eliminato (18 agosto, n. 2): 5 pagamenti,
69,95 €.

**Gli esercenti non hanno prefisso** (nomi realistici, per provare grafie e suggerimenti) e non si eliminano dall'interfaccia: in
un archivio personale l'unione li aggiungerebbe per sempre, fondendoli con quelli dallo stesso nome. Usare la demo o un
archivio di prova.

Ordine dei suggerimenti al 20 novembre (frequenza con emivita di 90 giorni, poi data dell'ultimo uso):

| # | Esercente | ID | Usi · ultimo | Speso |
| ---: | --- | --- | --- | ---: |
| 1 | Bar da Mario | `m-bar da mario` | 4 · 17 nov | 15,20 € |
| 2 | Coop | `m-coop` | 3 · 19 nov | 135,30 € |
| 3 | Esselunga | `m-esselunga` | **10** · 6 giu (frequente ma vecchio) | 667,50 € |
| 4 | McDonald's | `m-mcdonald's` | 2 · 8 nov | 41,10 € |
| 5 | Pizzeria "Da Gino"; Centro | `m-pizzeria "da gino"; centro` | 1 · 15 nov | 23,50 € |
| 6 | Caffè Centrale | `m-caffè centrale` | 1 · 12 nov | 2,90 € |
| 7 | Ferramenta e Colorificio dei Fratelli Bianchi di San Giorgio (**60 caratteri**, il massimo) | `m-ferramenta e …` | 1 · 18 ott | 46,25 € |
| 8 | eBay (maiuscole miste conservate) | `m-ebay` | 1 · 12 set | 35,50 € |
| 9 | Outlet 30% | `m-outlet 30%25` | 1 · 22 ago | 49,90 € |
| 10 | A/B Ottica | `m-a%2Fb ottica` | 1 · 4 lug | 89,00 € |
| 11 | Netflix (serie) | `m-netflix` | 1 · 18 giu | 69,95 € |
| 12 | Libreria Rossi (mai usato) | `m-libreria rossi` | 0 | 0,00 € |

- **Totali:** 31 occorrenze maturate, **1.189,09 €**. Mesi: apr 249,00 · mag 345,00 · giu 87,49 · lug 102,99 · ago 49,90 ·
  set 49,49 · ott 80,24 · nov 224,98 €.
- **Suggerimenti** nel campo Esercente di Nuova spesa: «e» → Esselunga, Ferramenta e Colorificio… (parola «e»), eBay;
  «b» → Bar da Mario, Ferramenta… (Bianchi), A/B Ottica; «co» → Coop, Ferramenta… (Colorificio); «caffe» → Caffè Centrale
  (senza accento); «lib» → Libreria Rossi; «esselunga» o «ESSELUNGA» → nessun suggerimento (esercente già scritto per intero).
- **CSV:** colonna «Esercente» in fondo; la riga della pizza è
  `2026-11-15;"V10 Pizza d'asporto";"V10 · Ristoranti e bar";23,50;EUR;"";"";"Pizzeria ""Da Gino""; Centro"`.

**Collaudo dall'interfaccia (eseguito il 20 novembre 2026 in Standard, vedi sotto):**

1. **Unisci ai dati esistenti** su un archivio di prova: 27 spese, 5 categorie, 12 esercenti aggiunti, nessun conflitto.
   Seconda unione: nulla di nuovo.
2. Nuova spesa → Esercente: i suggerimenti sopra, nell'ordine. Salvare una spesa scrivendo «ESSELUNGA»: usa l'esercente
   esistente, nessun nuovo esercente, il nome resta «Esselunga». Dettagli e modifica di una spesa mostrano l'esercente.
3. **Grafia diversa già salvata:** prima dell'importazione creare in Nuova spesa una spesa con esercente «ebay» (mostrato
   «Ebay»). L'unione non segnala conflitti e lascia «Ebay»; **Sostituisci** porta il nome a «eBay» (e rimuove gli esercenti
   assenti dal file, dopo la copia automatica).
4. In Avanzata (demo/emulatore): `A/B Ottica` e `Outlet 30%` devono importarsi con gli ID con `%2F` e `%25`, accettati dalle
   Rules. Su un archivio con solo questo file, l'export successivo coincide con il file a parte `exported_at`.
5. Un file v9 che contenesse esercenti o `merchant_id` viene rifiutato («Gli esercenti richiedono un backup versione 10 o
   successiva.»): coperto dai test automatici, nessun file dedicato.

## Fixture dei test automatici

I backup usati solo dai test di regressione sono in `tests/fixtures/`, non qui: spese standard (v5, lettore storico),
prove gratuite (v5) e cambio di frequenza (v6), verificati da `tests/trial.test.ts` e `tests/frequency.test.ts`.
**Importazione nell'emulatore demo (20 novembre 2026, eseguita):** con lo store Firestore reale e le Rules del checkout, su
emulatori dedicati e archivio demo vuoto: v9 unito (export identico al file salvo il numero di versione; `skipped_payments` della
Lavanderia salvato come stringa `0,1,…,59` e accettato), reimportato senza aggiunte né conflitti; poi, con un esercente «Ebay» già
salvato, v10 unito (27 spese, 5 categorie, 11 esercenti nuovi, «Ebay» conservato, ID con `%2F` e `%25` accettati); infine v10 con
**Sostituisci** (rimossi i 9 + 3 + 1 elementi v9, nome «eBay» dal file, export identico al file byte per byte) e reimportato senza
aggiunte né conflitti. Collaudo dall'interfaccia: vedi il paragrafo seguente.

**Collaudo dall'interfaccia (20 novembre 2026, eseguito):** export demo (`dist-demo/`) in Chromium headless a 1280×900,
modalità **Standard** (archivio IndexedDB nuovo, con le cinque categorie predefinite). Tutti i passi delle due sezioni sopra
danno il risultato atteso: anteprime (9 spese · 3 categorie · 1 fondo; 27 spese · 5 categorie), seconda unione «Niente da
aggiungere», storico e prossimo rinnovo di ogni abbonamento v9, Fondi da luglio a novembre, 61° pagamento della Lavanderia
rifiutato con il messaggio previsto, conflitto dopo l'eliminazione del pagamento del 15 novembre di Streaming, export JSON v10 e
CSV (BOM, date eliminate assenti), «Ebay» conservato dall'unione e «eBay» dopo Sostituisci (copia automatica scaricata, 20
elementi eliminati), suggerimenti dell'Esercente, «ESSELUNGA» che riusa l'esercente esistente, esercente nei dettagli e nella
modifica, export finale identico al file v10 a parte `exported_at`, totali di Analisi (novembre 224,98 €, 12 mesi 1189,09 €).
Con la spesa di prova «ebay» del giorno l'ordine per «e» diventa Esselunga, Ebay, Ferramenta…: atteso, l'uso di oggi pesa di più.
Non provati: modalità Avanzata dall'interfaccia (accesso Google dall'emulatore), smartphone, CSV in un foglio di calcolo vero.
Osservazioni del collaudo, **corrette lo stesso giorno** e riverificate nella demo (italiano e inglese): l'unione bloccata dice
«1 elemento è diverso dai dati salvati.» (plurale da 2) e nomina fino a tre elementi, poi «altri N»; riepilogo e conferma del
ripristino contano gli esercenti («12 esercenti»; conferma «Elementi da eliminare: N. Da scrivere: M.»); al 61° pagamento eliminato
la conferma si chiude e il messaggio compare sopra il dialogo; nel modulo di modifica l'importo usa il separatore della lingua.

I due file v9 e v10 di questa cartella sono verificati da `tests/testingBackups.test.ts`: lettura, export identico (a parte il numero
di versione per il v9), i valori delle tabelle qui sopra al 20 novembre 2026, piano di unione e CSV. Se si cambiano i file o le
regole di calcolo, aggiornare insieme file, test e tabelle.
Il file dei casi limite qui sopra resta **v5** di proposito: esercita il lettore storico anche dall'interfaccia.

## Budget mensile generale

Il backup v6 può contenere `general_budget` (piano compatto come il budget ricorrente di un fondo; assente = nessun budget).
Nessuna fixture dedicata: il caso è coperto da `tests/generalBudget.test.ts` e dalla suite emulatore. Importando un file senza
`general_budget` in modalità «Sostituisci» il budget generale salvato viene rimosso (la copia automatica prima del ripristino lo conserva).
