# Icone di installazione e Android

Verifica del 9 novembre 2026. Il logo principale (`logo`) e gli studi in
`docs/design/logo-concepts/` restano invariati. Non risultano script di generazione
degli asset di installazione nel repository.

## Asset e scopi

| Asset in `public/icons/` | Uso |
| --- | --- |
| `icon.svg` | Favicon a colori, simbolo scalato a 0,72, fondo «squircle» (stondatura ampia, stile Material 3 Expressive) |
| `icon-192.png`, `icon-512.png` | Manifest `any`, installazione/splash secondo il browser: **RGBA con angoli trasparenti** (stessa forma di `icon.svg`, resa con Chromium headless a sfondo trasparente). Prima erano quadrati opachi, e i launcher desktop li mostravano squadrati |
| `icon-maskable-512.png` | Manifest `maskable`, sfondo pieno e simbolo centrale |
| `apple-touch-icon.png` | Collegamento Apple, 180×180 |
| `icon-monochrome.svg` | Manifest `monochrome`, silhouette vettoriale dedicata |

Dal 15 novembre `icon-192`/`icon-512` hanno gli angoli trasparenti; `icon-maskable-512` e `apple-touch-icon` restano quadrati opachi perché il sistema applica la propria maschera. Prima, tutti i PNG erano completamente opachi; il simbolo occupa circa il 46,5% del
lato nelle icone `any` e il 37,5% nella maskable. Non è stata dimostrata sul Pixel
la causa del contrasto debole: non ci sono sfumature o alpha parziali nei loro sfondi.

La variante monocromatica conserva rettangolo arrotondato e arco del logo, con
riempimento nero opaco, senza filtri, gradienti, stroke o opacità interne. Solo lo
sfondo e gli spazi fra le forme sono trasparenti. Un fondo pieno renderebbe tutta
l'immagine una maschera quadrata. Scala 0,77 contro 0,72 della favicon: +6,9% lineare
(+14,4% di superficie). Il simbolo resta nel cerchio centrale di raggio 40% del lato.
Le risorse normali restano invariate per conservare favicon, splash e icone a colori.

## Supporto effettivo

La [specifica Web App Manifest](https://w3c.github.io/manifest/#icons-member)
definisce `any`, `maskable` e `monochrome`: per quest'ultimo conta il canale alpha,
mentre il colore è scelto dal sistema. Gli scopi sono separati nel manifest;
non si usa la silhouette come fallback `any` o `maskable`.

Il [protocollo WebAPK di Chromium, ramo main](https://raw.githubusercontent.com/chromium/chromium/main/components/webapk/webapk.proto)
indica ancora `MONOCHROME` come non utilizzato. La presenza nel manifest non
garantisce quindi un layer monocromatico nell'APK generato da Chrome, né il suo
utilizzo da parte del launcher. Una scorciatoia e un WebAPK possono inoltre avere
comportamenti diversi.

Secondo la [documentazione Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive),
le icone a tema dipendono da sistema e launcher; da Android 16 QPR2 possono essere
generate anche senza un layer monocromatico fornito dall'app. Questo può spiegare
una resa diversa dalla silhouette del manifest, ma va verificato sul dispositivo.
Nessun campo proprietario o XML Android è stato aggiunto alla web app.

## Collaudo sul Pixel 8

Registrare versioni Android, Chrome e Pixel Launcher e tipo d'installazione.
Su una futura versione pubblicata autorizzata, verificare aggiornamento effettivo
dell'icona installata (il semplice reload del sito può non aggiornare il WebAPK).
Confrontare icone a tema attive/disattive, tema di sistema chiaro/scuro e più
palette dello sfondo: contrasto, peso visivo e assenza di tagli. Controllare anche
icona normale, avvio/splash e favicon. Se necessario confrontare una nuova
installazione, senza cancellare dati o storage dell'app. Il tema scelto dentro
Nummo non controlla la tinta Material You o la splash Android statica.
