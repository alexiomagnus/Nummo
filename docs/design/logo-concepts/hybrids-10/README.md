# Nummo — Spicchio × Moduli

Secondo studio, 3 novembre 2026. Su richiesta dell’utente, il concept Nastro non viene sviluppato; si esplorano dieci combinazioni di archi/spicchi e moduli arrotondati. Nessuna scelta definitiva o integrazione UI.

[Anteprima PNG](comparison.png) · [Tavola SVG](comparison.svg)

## Le dieci direzioni

| Icona | Idea | File |
| --- | --- | --- |
| 01 · Arco | Una n, due volumi. | [SVG](01-arco-light.svg) |
| 02 · Portale | Arco, spicchio e pilastro. | [SVG](02-portale-light.svg) |
| 03 · Innesto | La n diventa modulare. | [SVG](03-innesto-light.svg) |
| 04 · Quota | Una moneta, un modulo. | [SVG](04-quota-light.svg) |
| 05 · Orbita | Tre parti di un insieme. | [SVG](05-orbita-light.svg) |
| 06 · Quadrante | Categorie dentro un cerchio. | [SVG](06-quadrante-light.svg) |
| 07 · Abbraccio | Una forma che raccoglie. | [SVG](07-abbraccio-light.svg) |
| 08 · Scambio | Pieni e vuoti in equilibrio. | [SVG](08-scambio-light.svg) |
| 09 · Ponte | Una n aperta, essenziale. | [SVG](09-ponte-light.svg) |
| 10 · Bilancio | Moduli con bordi circolari. | [SVG](10-bilancio-light.svg) |

Arco, Portale, Innesto e Ponte esplorano una **n minuscola**. Quota e Orbita conservano il richiamo alla **moneta**. Quadrante, Scambio e Bilancio danno maggiore spazio alla **composizione modulare**. Abbraccio suggerisce un **contenitore**.

I simboli condividono griglia 64 × 64, verde `#2D6A4F`, menta su scuro `#9BD4B3` e forme morbide, coerenti con i token esistenti. Tutte le forme sono monocromatiche; il colore non è necessario per distinguere le parti. Questa tornata confronta i soli simboli: il lettering può essere valutato dopo la selezione.

Per ogni icona: `-light.svg`, `-dark.svg` e `-mono.svg`, tutti su fondo trasparente, senza font, immagini incorporate o risorse esterne. La tavola presenta 16/24/32 px a scala 100%; la chat può ridimensionarla. Le proposte con più parti richiedono ulteriore ottimizzazione ottica se scelte per una favicon.

## Verifica

SVG validati come XML e rasterizzati; tavola controllata visivamente. `npm run check` eseguito con `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator`: typecheck, 141 test app e build superati. Nessun accesso a dati, Rules o cloud; UI e asset precedenti conservati.
