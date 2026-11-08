# Backup dimostrativo con casi limite

File: [`nummo-test-casi-limite-2026-11-08.json`](nummo-test-casi-limite-2026-11-08.json).
Dati interamente fittizi, formato `nummo-backup` **v4** della versione corrente del repository:
89 spese/serie, 15 categorie, 6 fondi, 2 movimenti, 4 liste con 112 prodotti. Circa 76 kB.
Non è compatibile con versioni dell’app che leggono solo backup v1/v2/v3.

## Come usarlo

1. Preferire la demo locale con le Rules del checkout. In un archivio personale fare prima un backup JSON.
2. Da **Spese → Dati → Importa backup (JSON)** scegliere il file e **Unisci ai dati esistenti**.
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

## Spese standard di un utente comune

File: [`nummo-spese-standard-2026-11-08.json`](nummo-spese-standard-2026-11-08.json), backup v4.
Profilo fittizio di una persona che vive in affitto: **66 spese singole e 6 pagamenti ricorrenti**, da settembre
all’8 novembre 2026, in 8 categorie. Supermercato, bar, pranzi, bollette, autobus, carburante, farmacia,
abbigliamento e tempo libero, con normali differenze tra un mese e l’altro.
Ricorrenti: affitto 650 €, internet 26,90 €, telefono 9,99 €, musica 10,99 €, palestra 29,90 € e antivirus annuale 24,99 €.

Include 3 fondi (conto quotidiano, contanti e risparmi), stipendio mensile simulato da 1.850 €, un rimborso da 35 €,
trasferimenti per prelievi/risparmio e 2 liste della spesa (una registrata, una da completare).
Nomi di categorie, fondi e liste prefissati `Demo ·`; descrizioni delle spese naturali, nessun importo estremo,
riferimento mancante, pausa o annullamento. Gli ID sono distinti da quelli del file dei casi limite.

Su archivio contenente solo questo file, all’8 novembre 2026:

| Periodo | Speso maturato | Entrate, ricariche incluse |
| --- | ---: | ---: |
| Settembre 2026 | 1.456,65 € | 1.850,00 € |
| Ottobre 2026 | 1.555,79 € | 1.885,00 € |
| Novembre fino all’8 | 828,77 € | 1.850,00 € |

Totale disponibile attuale, tutti i fondi: **3.893,79 €**; **80 occorrenze** maturate.
Valori calcolati con il dominio; variano dopo l’8 novembre o unendo dati preesistenti.

Importare da **Spese → Dati → Importa backup (JSON) → Unisci ai dati esistenti**, preferibilmente nella demo.
Le categorie con nomi uguali ma ID diversi possono produrre un conflitto: usare un archivio demo vuoto in tal caso.
File verificato con parser, piano su archivio vuoto, riferimenti completi e reimportazione identica senza aggiunte.
Importazione UI/Firestore con questo specifico file non eseguita.
