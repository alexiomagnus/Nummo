# Backup di collaudo

Sei file JSON fittizi da importare a mano, preferibilmente nella demo locale (`npm run emulators`, `emulators:seed`,
`dev:demo`) o in un archivio Standard di prova: casi limite (v5), utente medio (v6), pagamenti eliminati (v9), esercenti (v10),
template (v11) e scontrini scansionati (v12). Nomi di categorie, fondi, descrizioni e template hanno prefissi distinti (`TEST`,
`Medio ·`, `V9`, `V10`, `V11`, `V12`): i file si possono unire allo stesso archivio senza conflitti tra loro (gli esercenti uguali
tra file, come «Esselunga» o «Q8», hanno lo stesso nome e si riconoscono come lo stesso esercente).

## Casi limite (backup v5)

File: [`nummo-test-casi-limite-2026-11-08.json`](nummo-test-casi-limite-2026-11-08.json).
Dati interamente fittizi, formato storico `nummo-backup` **v5**, leggibile dal client corrente (backup v12):
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
4. Esportare il JSON: il file è v11 (dal 21 novembre; v10 prima) con gli stessi `skipped_payments` (array); il CSV ha una riga per pagamento rimasto, senza
   le date eliminate.
5. In Avanzata (demo/emulatore) l'importazione deve riuscire anche per la Lavanderia: i suoi 60 numeri (il massimo) diventano
   una stringa compatta controllata dalle Rules.

## Esercenti (backup v10)

File: [`nummo-esercenti-v10.json`](nummo-esercenti-v10.json), backup **v10** (formato attuale fino al 21 novembre, poi v11 con i template), dati fittizi, circa 17 kB.
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

## Template ed esercente (backup v11)

File: [`nummo-template-v11.json`](nummo-template-v11.json), backup **v11** (formato attuale dal 21 novembre 2026), dati fittizi,
circa 9 kB, scritto dall'esportatore del dominio (`makeBackup`). **9 template `V11`**, 8 spese singole `V11`, 4 categorie `V11 ·`,
2 fondi (`V11 · Quotidiano`, budget 300,00 € dal settembre 2026; `V11 · Vacanze 2025`, **archiviato**), 5 esercenti senza
prefisso (Lidl, Forno Bianchi, Q8, Trattoria La Pergola e un nome di **60 caratteri**, il massimo), nessuna lista né movimento.
Come per il v10, gli esercenti non si possono togliere con un'unione: usare la demo o un archivio di prova (oppure la pagina
Esercenti, che li elimina lasciando le spese senza esercente).

Prima di provare: **Templates → «Usa i template»** acceso, altrimenti il pulsante «Template» di Nuova spesa non compare.

Risultati partendo da un modulo vuoto (dopo un salvataggio o «Nessun template»); per il passaggio diretto da un template all'altro
vedi l'osservazione sotto il collaudo.

| Template | Caso | In Nuova spesa dopo la scelta |
| --- | --- | --- |
| `V11 Spesa settimanale` 45,00 € | esercente scritto `lidl` (minuscolo), fondo Quotidiano | Esercente «lidl»; salvata, la spesa usa l'esercente **esistente** «Lidl» (nessun nuovo esercente, nome invariato) |
| `V11 Pane` 2,40 € | esercente identico a quello salvato | tutto compilato, fondo Quotidiano |
| `V11 Pieno` 60,00 € | «Nessun fondo» scelto anche se esistono fondi | Fondo «Nessun fondo», nessuna richiesta di sceglierlo |
| `V11 Caffè e cornetto "al banco"; colazione` 2,50 € | senza esercente, virgolette e `;` | Esercente vuoto; descrizione intatta |
| `V11 Pizza d'asporto` 18,50 € | esercente **non ancora salvato** (`Pizzeria Nuova Napoli`) | l'esercente nasce solo con «Salva» (pagina Esercenti: da 5 a 6); se si sceglie «Nessun template» prima di salvare, non nasce |
| `V11 Mobili su misura` 999.999.999,99 € | importo massimo ed esercente di 60 caratteri | importo intero nel campo (testo più piccolo su smartphone); esercente intero nel campo, su una riga con «…» nei suggerimenti |
| `V11 Weekend al lago` 150,00 € | fondo **archiviato** | il fondo archiviato non si propone: il campo torna al fondo preferito (Impostazioni), se c'è, altrimenti «Nessun fondo» |
| `V11 Categoria che non esiste più` 9,99 € | categoria assente dal file | Categoria da scegliere di nuovo; l'anteprima del ripristino non la conta tra i riferimenti mancanti (solo le spese) |
| `V11 Vecchio template senza importo` | `amount_minor: null`, come i template salvati prima del 21 novembre | Importo vuoto da scrivere; nella pagina Templates la modifica chiede l'importo prima di salvare |

Nessun template ha la data applicata: la `date` del file non compare né nell'elenco né in Nuova spesa. Nel selettore i template
sono in ordine alfabetico (il primo è `V11 Caffè e cornetto…`).

Valori calcolati con il dominio al **23 novembre 2026**, su archivio contenente solo questo file:

- **Esercenti** (pagina Esercenti e suggerimenti): Lidl 3 spese, Forno Bianchi 2, Trattoria La Pergola 1, Q8 1, Falegnameria… 1.
  Suggerimenti: «l» → Lidl, Trattoria La Pergola; «f» → Forno Bianchi, Falegnameria…; «LIDL» o «q8» → nessuno (già scritto per intero).
- **Totali:** 8 spese, **1.472,25 €** (settembre 1.200,00 · ottobre 43,80 · novembre **228,45 €**); fondo `V11 · Quotidiano` a
  novembre **103,95 €** su 300,00 €.
- **Anteprima dell'unione** su archivio vuoto: 8 spese, 4 categorie, 2 fondi, 5 esercenti, **9 template**, nessun conflitto né
  riferimento mancante. Seconda unione: nulla da aggiungere.

**Collaudo dall'interfaccia** (passi; esiti nel paragrafo seguente):

1. **Unisci ai dati esistenti** in Standard; poi Templates: 9 template, matita su ogni riga; con «Usa i template» spento elenco e
   modulo in grigio, mai nascosti.
2. Nuova spesa → «Template»: i casi della tabella, uno alla volta; «Nessun template» svuota tutto il modulo.
3. Salvare `V11 Spesa settimanale` e `V11 Pizza d'asporto`: Esercenti mostra Lidl a 4 spese e il nuovo «Pizzeria Nuova Napoli».
4. Modificare `V11 Pane` (es. 2,60 €) e unire di nuovo il file: conflitto «1 elemento è diverso…» che nomina `V11 Pane`, nessuna
   sovrascrittura; **Sostituisci** lo riporta a 2,40 € (dopo la proposta di scaricare un backup).
5. Esercenti → rinominare «Lidl» in «Lidl Italia» (chiave diversa: un nuovo esercente): il template conserva `lidl` e, usato di
   nuovo, crea ancora l'esercente «Lidl» (i template conservano il nome, non cambiano).
6. Esportare il JSON: v11 con gli stessi 9 template (anche `merchant: null` e `amount_minor: null`); il CSV non contiene template.
7. In Avanzata (demo/emulatore): l'importazione dei template deve essere accettata dalle Rules, compreso l'importo massimo, il
   nome di 60 caratteri, `amount_minor: null` e il fondo archiviato.

Dichiarato v10, lo stesso file è rifiutato («L’esercente nei template richiede un backup versione 11 o successiva.»): coperto dal test.

**Collaudo eseguito (23 novembre 2026)** su `dist-demo/` in Chromium headless a 1280×900, italiano, tema chiaro, nessun errore JS.

- **Standard** (archivio nuovo, con le cinque categorie predefinite): tutti i passi 1–6 con il risultato atteso. Anteprima
  «8 spese · 4 categorie · 2 fondi · 5 esercenti · 9 template», seconda unione «Niente da aggiungere»; Templates spento in grigio,
  il template con la categoria assente mostra «Categoria eliminata»; selettore in ordine alfabetico; ogni riga della tabella
  verificata da modulo vuoto (con fondo archiviato e senza fondo preferito: «Nessun fondo»); dopo il salvataggio Lidl a 4 spese e
  nessun «lidl» in più, «Pizzeria Nuova Napoli» creato; `V11 Pane` a 2,60 € → unione bloccata con «1 elemento è diverso dai dati
  salvati.» e `V11 Pane`; Sostituisci: «Elementi da eliminare: 9. Da scrivere: 1.» (2 spese, 5 categorie predefinite, 1 esercente
  e il vecchio `V11 Pane`, riscritto), backup proposto e scaricato, nessuna copia automatica, poi `V11 Pane` a 2,40 € ed esercenti
  come nel file; «Lidl» rinominato «Lidl Italia», il template conserva `lidl` e salvato ricrea «Lidl» (1 spesa); export JSON v11 con
  i 9 template identici al file, CSV con BOM e solo le spese. Modifica di `V11 Vecchio template senza importo` → «Inserisci
  l’importo.». A 390×844 (smartphone emulato) `V11 Mobili su misura` riempie il modulo senza scorrimento orizzontale, «Salva»
  sopra la navigazione.
- **Avanzata** (emulatori demo propri su porte dedicate, export della demo costruito per quelle porte, accesso dal popup
  dell'emulatore Auth come proprietario demo): stessa anteprima, unione accettata dalle Rules per tutti i 9 template (letti via
  REST: `amount_minor` nullo, 99999999999, esercente di 60 caratteri, fondo archiviato), seconda unione senza aggiunte, spesa
  salvata da `V11 Pizza d'asporto` con `merchant_id` `m-pizzeria nuova napoli` creato insieme, export con template e fondi identici
  al file, Sostituisci («Elementi da eliminare: 7. Da scrivere: 0.») → sul server 9 template, 5 esercenti, 8 spese, 4 categorie,
  2 fondi.
- **Osservazione (non corretta, da decidere):** passando **direttamente** da un template all'altro, Importo ed Esercente del
  precedente restano se il nuovo non li ha (`applyTemplate` in `ExpenseForm.tsx` li applica solo se presenti). Esempio: dopo
  `V11 Pieno`, `V11 Caffè e cornetto…` tiene l'esercente «Q8»; dopo `V11 Categoria che non esiste più`, `V11 Vecchio template
  senza importo` tiene 9,99. Da modulo vuoto il risultato è quello della tabella.
- **Non provati:** smartphone reale, inglese, CSV in un foglio di calcolo.

## Scontrini scansionati (backup v12)

File: [`nummo-scontrini-v12.json`](nummo-scontrini-v12.json), backup **v12** (26 novembre 2026), dati fittizi, prefisso `V12`,
generato con `makeBackup` (identico a un export). Serve a collaudare la pagina **Lista scontrini** e il ripristino degli scontrini
senza una chiave AI: 6 spese singole, 3 categorie, 1 fondo (`V12 · Quotidiano`, budget 400,00 € da ottobre), 3 esercenti
(Brico Center, Esselunga, Q8), **5 scontrini**, ognuno con l'ID della sua spesa.

| Scontrino (spesa) | Caso | Atteso in Lista scontrini e nel dettaglio |
| --- | --- | --- |
| Esselunga 24 nov., 27,80 € (`V12 Spesa corretta dopo`, 25,00 €) | spesa corretta dopo il salvataggio; nessun prodotto | lo scontrino resta a 27,80 € (non segue la spesa); «Nessun prodotto letto», senza pulsante dei prodotti |
| Esselunga 22 nov., 87,45 € (`V12 Spesa grande`) | 12 prodotti con accenti, virgolette e `;`, sconto 3,20 €, Claude | «12 prodotti», sconto, prodotti in ordine nello schermo dei prodotti |
| Q8 15 nov., 60,00 € (`V12 Carburante`) | un solo prodotto, Google Gemini | «1 prodotto» |
| Esercente non letto, 34,90 € (`V12 Ferramenta`, spesa con esercente Brico Center) | esercente e data non letti, OpenAI | titolo «Esercente non letto», «Data non letta» nella riga e «Non letta» nel dettaglio; ordinato col giorno del salvataggio (8 nov.) |
| Esercente non letto, 30 ott. (`V12 Scorta di fine mese`, 1.234,56 €) | totale non letto, sconto 15,00 €, **500 prodotti** (limite), il primo di 60 caratteri | nessun importo nella riga, «Totale non letto» attenuato nel dettaglio; lo schermo dei prodotti scorre fino a `V12 Articolo 500` |

`V12 Mercato senza scontrino` (12,00 €) non ha scontrino: non compare nella pagina. Ordine della pagina (dal più recente): come
la tabella.

Valori calcolati con il dominio al **26 novembre 2026**, su archivio contenente solo questo file:

- **Totali:** 6 spese, **1.453,91 €** (ottobre 1.234,56 · novembre **219,35 €**); fondo `V12 · Quotidiano` a ottobre
  **1.234,56 €** su 400,00 € (superato), a novembre **124,45 €**.
- **Anteprima dell'unione** su archivio vuoto: 6 spese, 3 categorie, 1 fondo, 3 esercenti, **5 scontrini**, nessun conflitto.
  Seconda unione: nulla da aggiungere.

**Collaudo dall'interfaccia** (passi):

1. **Unisci ai dati esistenti** in Standard; poi menu account → **Lista scontrini**: i cinque scontrini nell'ordine della tabella,
   con i casi della tabella (anche con la scansione spenta: la pagina mostra comunque gli scontrini).
2. Dettaglio di ogni scontrino: data, spesa collegata con la categoria, sconto, servizio AI, «Prodotti letti».
3. **Elimina scontrino** su `V12 Carburante`: la spesa resta in Spese, lo scontrino sparisce; unire di nuovo il file lo riporta.
4. Eliminare la spesa `V12 Ferramenta` da Spese: sparisce anche il suo scontrino. «Elimina tutte le spese» (dopo la proposta del
   backup) svuota anche Lista scontrini; categorie, fondo ed esercenti restano.
5. Esportare il JSON: v12 con gli stessi 5 scontrini, identico al file a parte `exported_at` (se nulla è stato cambiato); il CSV non
   contiene scontrini.
6. In Avanzata (demo/emulatore, Rules del checkout): l'unione deve essere accettata, compresi i 500 prodotti e i valori `null`;
   sul server `receipts/{id spesa}` con i prodotti uniti da `\n`.

Dichiarato v11, lo stesso file è rifiutato («Gli scontrini richiedono un backup versione 12 o successiva.»); senza la spesa di uno
scontrino è rifiutato («Scontrini nel backup senza la loro spesa.»); uno scontrino cambiato nell'archivio blocca l'unione come
conflitto: tutto coperto dal test.

**Collaudo eseguito (26 novembre 2026)** su export demo in Chromium headless a 1280×900, italiano, tema chiaro, nessun errore JS.

- **Standard** (`dist-demo/`, archivio nuovo con le cinque categorie predefinite): passi 1–5 con il risultato atteso. Anteprima
  «6 spese · 3 categorie · 1 fondo · 3 esercenti · 5 scontrini», seconda unione «Niente da aggiungere»; Lista scontrini nell'ordine e
  con le righe della tabella; dettagli come in tabella (27,80 € con «Nessun prodotto letto» e senza pulsante, sconto 3,20 € e i 12
  prodotti con accenti e virgolette, «Data non letta»/«Non letta», «Totale non letto»); lo schermo dei 500 prodotti contiene il primo
  di 60 caratteri e `V12 Articolo 500`. «Elimina scontrino» su Q8: la spesa resta, Spese mostra 1453,91 € (novembre 219,35 €);
  l'unione successiva propone «1 scontrino» e lo riporta. Eliminata `V12 Ferramenta` dalla modifica, il suo scontrino sparisce;
  «Elimina tutte le spese» (backup proposto, non scaricato) lascia «Nessuno scontrino.», con categorie, fondo ed esercenti. Export
  JSON v12: fondi, esercenti, scontrini e spese identici al file, in più solo le cinque categorie predefinite.
- **Avanzata** (emulatori demo propri su porte dedicate, export costruito per quelle porte, proprietario demo): stessi risultati;
  unione accettata dalle Rules per i 5 scontrini (letti via REST: 500 prodotti uniti da `\n`, `merchant`, `date`, `total_minor` e
  `discount_minor` nulli dove previsto), seconda unione senza aggiunte, export identico come sopra; dopo «Elimina tutte le spese» sul
  server 0 spese e 0 scontrini. A 390×844 (smartphone emulato) lista e dettaglio senza scorrimento orizzontale.
- **CSV e tema scuro (26 novembre, stesso giorno, Standard):** il CSV esportato ha BOM, righe CRLF, `;`, virgola decimale e le 6 spese
  (nessun dato degli scontrini); aperto in LibreOffice Calc con il filtro CSV italiano, date riconosciute come date e importi come
  numeri (somma 1453,91), accenti e «·» intatti. Tema scuro a 1280×900 e 390×844: lista, dettagli (anche «Totale non letto»), prodotti
  e conferma «Eliminare questo scontrino?» leggibili, senza scorrimento orizzontale né errori JS.
- **Non provati:** smartphone reale, inglese.

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
**Stesso collaudo in Avanzata (20 novembre 2026, notte, eseguito):** demo con emulatori (`npm run emulators`, `emulators:seed`),
`dist-demo/` con le correzioni, accesso Google dal popup dell'emulatore come proprietario demo, archivio Firestore vuoto. Stessi
risultati della Standard, con i messaggi e i conteggi corretti: anteprime, seconda unione senza aggiunte, storici e rinnovi, Fondi
da luglio a novembre, 61° pagamento rifiutato (conferma chiusa, messaggio sopra lo storico), conflitto «1 elemento è diverso…» con
«V9 Streaming», riepilogo v10 con «11 esercenti», conferma «Elementi da eliminare: 20. Da scrivere: 1.», copia automatica, export
finale identico al file a parte `exported_at`, CSV, Analisi. Controllati anche i documenti sul server (lettura REST dell'emulatore):
`skipped_payments` di Streaming «7,10» con revisione 2; esercenti `m-a%2Fb ottica` e `m-outlet 30%25`; «Ebay» dopo l'unione e
«eBay» dopo Sostituisci; le spese «ESSELUNGA» ed «ebay» con `merchant_id` dell'esercente esistente; stato «Sincronizzato».

**Su smartphone emulato (21 novembre 2026, eseguito; non è una prova su dispositivo):** Chromium headless con emulazione di
telefono (390×844, densità 2, touch, user agent Android), tocchi come eventi touch, modalità Standard. Stessi risultati attesi:
anteprime, unione e seconda unione, storico in dialogo stretto (Telefono, Lavanderia con 45 righe scorrevoli), 61° pagamento
rifiutato con il messaggio sopra il dialogo, conflitto «1 elemento è diverso…» con «V9 Streaming», Fondi, Nuova spesa con la
categoria dal foglio dal basso, esercente «Ebay», suggerimenti nel flusso del modulo (nome lungo con «…») e scelta di un
suggerimento, conferma «Elementi da eliminare: 19. Da scrivere: 1.» e sostituzione («eBay», 27 spese, 12 esercenti). Problemi
trovati, **corretti lo stesso giorno** e riverificati in emulazione (sotto): (1) nei dettagli di una spesa su smartphone un esercente lungo (60 caratteri) non va a capo, passa
sotto «Modifica» ed esce dalla scheda; (2) lo `<span>` nascosto che misura le etichette della navigazione resta in fondo a `body`
senza `top`/`left`, così la pagina è più alta della finestra di 15 px e, quando il documento scorre (per esempio verso un campo),
fogli e dialoghi lasciano scoperta una striscia in basso; (3) dopo la scelta del file l'anteprima del ripristino compare in fondo
alla pagina, quasi tutta fuori schermo, senza scorrimento automatico. Non verificabili in emulazione: tastiera virtuale (la
navigazione non si nasconde senza tastiera), safe area, gesti reali, prestazioni.
Dopo la correzione: la pagina è alta quanto la finestra (844 su 844), l'anteprima del ripristino scorre in vista sopra la
navigazione, l'esercente lungo va a capo accanto a «Modifica» senza uscire dalla scheda (su desktop resta su una riga).

Osservazioni del collaudo, **corrette lo stesso giorno** e riverificate nella demo (italiano e inglese): l'unione bloccata dice
«1 elemento è diverso dai dati salvati.» (plurale da 2) e nomina fino a tre elementi, poi «altri N»; riepilogo e conferma del
ripristino contano gli esercenti («12 esercenti»; conferma «Elementi da eliminare: N. Da scrivere: M.»); al 61° pagamento eliminato
la conferma si chiude e il messaggio compare sopra il dialogo; nel modulo di modifica l'importo usa il separatore della lingua.

I file v9, v10, v11 e v12 di questa cartella sono verificati da `tests/testingBackups.test.ts`: lettura, export identico (a parte il numero
di versione per il v9), i valori delle tabelle qui sopra al 20 novembre 2026, piano di unione e CSV. Se si cambiano i file o le
regole di calcolo, aggiornare insieme file, test e tabelle.
Il file dei casi limite qui sopra resta **v5** di proposito: esercita il lettore storico anche dall'interfaccia.

## Budget mensile generale

Il backup v6 può contenere `general_budget` (piano compatto come il budget ricorrente di un fondo; assente = nessun budget).
Nessuna fixture dedicata: il caso è coperto da `tests/generalBudget.test.ts` e dalla suite emulatore. Importando un file senza
`general_budget` in modalità «Sostituisci» il budget generale salvato viene rimosso (la copia automatica prima del ripristino lo conserva).
