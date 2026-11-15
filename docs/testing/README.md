# Backup dimostrativo con casi limite

File: [`nummo-test-casi-limite-2026-11-08.json`](nummo-test-casi-limite-2026-11-08.json).
Dati interamente fittizi, formato storico `nummo-backup` **v5**, leggibile dal client corrente (backup v6):
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

## Fixture dei test automatici

I backup usati solo dai test di regressione sono in `tests/fixtures/`, non qui: spese standard (v5, lettore storico),
prove gratuite (v5) e cambio di frequenza (v6), verificati da `tests/trial.test.ts` e `tests/frequency.test.ts`.
Il file dei casi limite qui sopra resta **v5** di proposito: esercita il lettore storico anche dall'interfaccia.

## Budget mensile generale

Il backup v6 può contenere `general_budget` (piano compatto come il budget ricorrente di un fondo; assente = nessun budget).
Nessuna fixture dedicata: il caso è coperto da `tests/generalBudget.test.ts` e dalla suite emulatore. Importando un file senza
`general_budget` in modalità «Sostituisci» il budget generale salvato viene rimosso (la copia automatica prima del ripristino lo conserva).
