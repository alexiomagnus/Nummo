# Nummo — tre concept di logo

Studio del 3 novembre 2026. **Proposte da selezionare: nessun logo integrato nell’app.**

[Anteprima comparativa PNG](comparison.png) · [Tavola vettoriale SVG](comparison.svg)

## Identità visiva osservata

Analisi del codice corrente, incluse le modifiche UI già presenti nel checkout:

- `src/theme/tokens.ts`: verde principale `#2D6A4F`, menta su scuro `#9BD4B3`, contenitore `#B7F0CF`, fondo chiaro `#F5FBF5`, fondo scuro `#0F1511`. Griglia di 4 px; raggi di 12 px per controlli, card e tile, 16 px per dialoghi.
- `src/theme/palette.ts` e `src/features/settings/preferences.ts`: identità predefinita menta/monocolore, con accenti e aspetto personalizzabili. Il marchio deve quindi funzionare in un solo colore, indipendentemente dalla tinta.
- `src/theme/theme.ts` e `GlobalStyle.tsx`: Google Sans predefinito, con alternativa di sistema. Icone outline su griglia 24 px con tratto 1,5 px.
- `src/components/AppShell.tsx`: marchio attuale con lettera N dentro un tile 36 × 36 px, raggio 12, affiancato dal nome Nummo. `Card.tsx` e `ListRow.tsx` confermano l’uso di superfici tonali, geometrie morbide e gerarchie sobrie.

Direzione: simboli semplici, senza gradienti o ombre, con un peso maggiore delle icone operative per conservare presenza alle piccole dimensioni. Il raggio dei simboli è proporzionato alla loro geometria, non una copia letterale dei 12 px dei componenti.

Il logotipo comune usa **Google Sans 600**, dal file locale già presente nell’app, con spaziatura leggermente serrata. Le lettere sono convertite in tracciati: nessun font o collegamento esterno è necessario per visualizzare i loghi. Il lettering condiviso permette di confrontare i tre simboli a parità di condizioni.

## Concept

| Concept | Idea e carattere | Punto da valutare |
| --- | --- | --- |
| **01 · Nastro** | Una N disegnata come gesto continuo, con raccordi e terminali morbidi. Personale, essenziale e in continuità con il marchio attuale. | Il richiamo alle spese è affidato al nome e al contesto dell’app. |
| **02 · Spicchio** | Una moneta aperta e una quota separata: la singola spesa come parte del totale. Comunica budget e sintesi. | Il richiamo al grafico è immediato ma meno legato alla lettera iniziale. A 16 px il dettaglio è più delicato. |
| **03 · Moduli** | Tre forme piene in una griglia: categorie e registrazioni riunite in un quadro ordinato. Vicino ai tile Material 3. | Più astratto; può ricordare una dashboard. |

**Direzione consigliata: 01 · Nastro**, per il legame immediato con Nummo e la continuità con la N esistente. La scelta finale resta aperta.

**Logo adottato: Arco** (`hybrids-10/01-arco-*.svg`, una «n» in due volumi), già integrato nelle icone dell'app
(`public/icons/`: `icon.svg`, `icon-monochrome.svg` e i PNG). Gli altri concept restano studi; la raccomandazione sopra
è storica.

## File

Ogni concept comprende simbolo (viewBox 64 × 64) e composizione orizzontale con nome (284 × 64), entrambi su fondo trasparente:

| Concept | Simbolo | Con nome |
| --- | --- | --- |
| 01 · Nastro | [SVG](01-nastro-symbol-light.svg) | [SVG](01-nastro-wordmark-light.svg) |
| 02 · Spicchio | [SVG](02-spicchio-symbol-light.svg) | [SVG](02-spicchio-wordmark-light.svg) |
| 03 · Moduli | [SVG](03-moduli-symbol-light.svg) | [SVG](03-moduli-wordmark-light.svg) |

Per ogni file sono incluse le varianti `-light` (verde principale), `-dark` (menta per fondo scuro) e `-mono` (inchiostro monocromatico). I colori sono copie dei token per questo studio autonomo; l’eventuale integrazione dovrà collegarli al tema. Il marchio non deve cambiare font quando cambia la preferenza tipografica dell’interfaccia: è una proposta da confermare con la selezione.

## Verifiche e limiti

- SVG analizzati come XML: geometrie vettoriali, nessuna immagine incorporata, nessuno script o riferimento esterno; simboli e logotipi senza elementi di testo.
- Tavola rasterizzata a 1500 × 1080 e ispezionata visivamente: chiaro/scuro, monocromia, simboli 16/24/32 px. Le misure indicate sono quelle della tavola a scala 100%; l’anteprima in chat può essere ridimensionata.
- Nome convertito da Google Sans 600: caricamento del font locale verificato in Chromium prima della conversione.
- `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator npm run check`: typecheck, test app e build superati. Nessuna modifica a dati o Rules, nessun test cloud.
- Nessun file UI o asset esistente sostituito. Non eseguito un confronto dentro l’app o un collaudo su dispositivi; nessuna ricerca di anteriorità del marchio.

Prossimo passo: selezionare un concept, poi affinare proporzioni e applicazioni prima di un’eventuale integrazione autorizzata.
