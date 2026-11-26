# Icone di installazione e Android

Verifica del 9 novembre 2026. Il logo principale (`logo`) e gli studi in
`docs/design/logo-concepts/` restano invariati. Non risultano script di generazione
degli asset di installazione nel repository.

**24 novembre 2026, su richiesta:** fondo nero (`#000000`) e logo bianco (`#FFFFFF`) al posto del verde scuro (`#0F1512`) con
logo menta (`#97D8BB`), per desktop e mobile. Rigenerati con `rsvg-convert` da SVG: `icon.svg` (stessa forma e scala 0,72),
`icon-192.png` e `icon-512.png` (da `icon.svg`, angoli trasparenti), `icon-maskable-512.png` (quadrato pieno, logo a scala 0,5:
37,5 % del lato, come prima) e `apple-touch-icon.png` (quadrato pieno, scala 0,62: circa 46,5 %, come prima). App Android:
`icon_background`/`icon_foreground` in `android/app/src/main/res/values/colors.xml` (serve un nuovo APK). Invariati
`icon-monochrome.svg`, `badge-96.png` e la piccola icona delle notifiche Android (la tinge il sistema). Un'app web già installata
aggiorna l'icona quando il browser rilegge il manifest (su Android può richiedere giorni).

**26 novembre 2026, su richiesta:** fondo blu notte in sfumatura verticale (`#34476F` in alto, `#1B2642` in basso) con un filo
chiaro (bianco al 14 %) sul bordo della squircle, logo bianco, sul modello di un'icona fornita dall'utente. Rigenerati con `rsvg-convert`:
`icon.svg` (stessa forma, scala 0,72), `icon-192.png` e `icon-512.png` (angoli trasparenti), `icon-maskable-512.png` (quadrato pieno con la
sola sfumatura, scala 0,5) e `apple-touch-icon.png` (quadrato pieno, scala 0,62). App Android: sfondo `drawable/ic_launcher_background.xml`
(stessa sfumatura), `icon_background` `#1B2642` (serve un nuovo APK). Invariati `icon-monochrome.svg`, `badge-96.png` e l'icona delle notifiche.

**26 novembre 2026, poco dopo, su richiesta («più in stile Material 3 Expressive»):** sullo stesso fondo una forma «cookie» a nove lobi
(`#3E5A92` al 75 %, raggio 22,5 su 64) dietro il logo, logo a scala 0,6 con l'asta `#A9C4F2`, l'arco bianco e un'ombra leggera (`#0B1226`
al 35 %, 1,6 unità in basso). Maskable: tutto a scala 0,8 (forma dentro il cerchio sicuro del 40 %); Apple: scala 0,95. Android:
`ic_launcher_foreground.xml` con forma e logo (colori `icon_shape`, `icon_stem`, `icon_foreground`), nuovo `ic_launcher_monochrome.xml` (il
solo logo, per le icone a tema: con la forma la silhouette sarebbe un disco). Scelta fra quattro varianti in anteprima (la B).

**26 novembre 2026, ancora su richiesta:** tolta la forma «cookie»; fondo blu navy in sfumatura diagonale (`#2E4C8C` in alto a sinistra,
`#1B3068` al centro, `#0D1A3E` in basso a destra) con una luce morbida dall'angolo in alto a sinistra (bianco radiale al 14 %), filo chiaro
sul bordo (bianco al 16 %), «n» di un solo colore in bianco non puro `#F3F6FC` con un'ombra leggera (`#050B1E` al 30 %, 2 unità in basso),
nessuna forma geometrica. Provati lo stesso giorno, su richiesta, un azzurro grigio (`#97B2D8`), un celeste e un blu vivo (`#5B9BFF` → `#1A47B8`): scartati. PNG alle stesse
scale (0,72; maskable 0,5; Apple 0,62). `icon.svg` è solo il **favicon** delle schede (16–32 px), in una versione propria: logo a scala 0,8,
senza ombra né filo sul bordo (a quelle misure li impastavano). Android: `ic_launcher_background.xml` con la stessa sfumatura a 315° (senza
la luce radiale), `icon_background` `#0D1A3E` (anche primo fotogramma), `ic_launcher_foreground.xml` = logo e ombra a scala 0,6,
`icon_foreground` `#F3F6FC`; `icon_shape` e `icon_stem` tolti (serve un nuovo APK).

## Asset e scopi

| Asset in `public/icons/` | Uso |
| --- | --- |
| `icon.svg` | Favicon a colori (dal 26 novembre logo a 0,8, senza ombra né filo, per le schede), prima simbolo scalato a 0,72, fondo «squircle» (dal 21 novembre più squadrato: punti di controllo a 4 unità dagli angoli su 64, prima 10) |
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
