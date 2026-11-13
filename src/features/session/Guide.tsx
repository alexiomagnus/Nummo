import { useI18n } from '../../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { spacing } from '../../theme/tokens';

// Public introduction, shown on the mode choice and sign-in screens. Static text only: no data access and no
// dependency on the session. Every statement below describes something the app does today.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View role="region" aria-label={title} style={styles.section}>
      <Text variant="titleMedium" style={styles.heading} accessibilityRole="header" aria-level={2}>{title}</Text>
      {children}
    </View>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const p = (text: string) => <Text variant="bodyLarge" style={styles.paragraph}>{text}</Text>;
  return (
    <View role="article" aria-label={t("Cos'è Nummo e come funziona")} style={styles.wrap}>
      <Button mode="text" compact onPress={onBack} style={styles.back}
        icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />}>
        {t("Torna indietro")}</Button>
      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header" aria-level={1}>{t("Cos'è Nummo")}</Text>
        <Text variant="bodyLarge" style={muted}>
          {t("Un'app per registrare le spese di ogni giorno e capire dove va il denaro. Funziona dal browser, anche da smartphone.")}</Text>
      </View>

      <Section title={t("Come iniziare")}>
        {p(t("Alla prima apertura scegli dove salvare i dati. Con la modalità Standard inizi subito, senza account: i dati restano su questo dispositivo e puoi proteggerli con un backup su Google Drive o con un file."))}
        {p(t("Con la modalità Avanzata i dati stanno in un progetto Firebase personale e si sincronizzano tra i dispositivi: entra con Google solo il proprietario del progetto. Non c'è una registrazione aperta e gli altri account Google non vedono né salvano alcun dato."))}
        {p(t("Le due modalità hanno archivi separati: cambiare modalità dalle Impostazioni non copia e non elimina nulla."))}
      </Section>

      <Section title={t("Registrare una spesa")}>
        {p(t("Tocca Nuova spesa e inserisci importo, data, descrizione e categoria. La categoria è obbligatoria; se lasci vuota la data vale oggi."))}
        <Text variant="bodyMedium" style={muted}>{t("Esempio: 4,50 € · Caffè · Colazione.")}</Text>
      </Section>

      <Section title={t("Organizzare le categorie")}>
        {p(t("Dal menu dell'account, alla voce Categorie, crei le tue categorie con un nome e, se vuoi, un'icona. Puoi rinominarle o eliminarle, oppure aggiungere quelle già pronte."))}
        {p(t("Mentre registri una spesa puoi crearne una anche da Nuova categoria, in fondo all'elenco del campo Categoria: diventa subito la categoria della spesa e i dati già inseriti restano. In modalità Avanzata serve la connessione."))}
      </Section>

      <Section title={t("Liste della spesa")}>
        {p(t("In Liste prepari le liste della spesa: aggiungi i prodotti e spuntali mentre li metti nel carrello. Puoi rinominare, duplicare ed eliminare le liste; ogni lista mostra quanti prodotti hai già preso. Le modifiche si salvano da sole."))}
        {p(t("In fondo alla lista scrivi il totale dello scontrino, senza prezzi per i singoli prodotti, e tocca Registra spesa, anche se non hai spuntato tutto. Confermi descrizione, importo, categoria, fondo e data: viene creata una sola spesa con l'elenco dei prodotti acquistati, che incide su saldo e budget del fondo come ogni altra spesa."))}
        {p(t("La lista registrata viene archiviata: puoi consultarla, duplicarla o creare una nuova lista con i prodotti non acquistati. In Spese queste spese sono segnate con Lista spesa e nei dettagli mostrano i prodotti; se elimini la spesa, la lista torna tra quelle attive."))}
      </Section>

      <Section title={t("Consultare le spese")}>
        {p(t("In Spese trovi due viste. Spese elenca le spese singole raggruppate per mese, con ricerca per nome, ordinamento e filtro per categoria; tocca una spesa per aprirne i dettagli, da cui la modifichi o la elimini. Abbonamenti raccoglie le spese che si ripetono."))}
        {p(t("L’elenco mostra 50 spese alla volta: Mostra altre spese estende la lista. Ricerca, ordinamento e riepiloghi mensili considerano sempre tutti i risultati."))}
        {p(t("La pagina Analisi mostra le spese per categoria nel mese corrente, nel mese scorso o negli ultimi 3, 6 o 12 mesi, con riepilogo, ciambella, blocchi o barre e andamento giornaliero interattivo."))}
        {p(t("Grafico e periodo scelti vengono ricordati in questo browser. Il confronto usa un intervallo precedente di pari durata, mostrato con le sue date, quando lo storico lo consente. L’andamento include i giorni senza spese fino a oggi e si può nascondere dalle Impostazioni."))}
        {p(t("Puoi creare categorie senza un limite di numero. I grafici mostrano solo quelle con spese nel periodo: se sono molte, le meno rilevanti sono riunite in Altre, con dettaglio consultabile. Nei Blocchi, i rettangoli sono proporzionali agli importi e la legenda sotto il grafico elenca tutte le categorie; tocca un blocco per vederne importo, quota e transazioni. Le barre sono proporzionali alla categoria con spesa maggiore; le percentuali indicano la quota sul totale. Seleziona una categoria per consultarne le spese."))}
      </Section>

      <Section title={t("Spese ricorrenti e abbonamenti")}>
        {p(t("Una spesa può ripetersi ogni settimana, mese o anno: la inserisci una volta sola e compare a ogni scadenza maturata."))}
        {p(t("Se il prezzo cambia, puoi indicare un prezzo promozionale per i primi rinnovi, oppure modificare solo il prossimo rinnovo o tutti quelli futuri: i pagamenti già maturati restano com'erano. Prossimi rinnovi mostra le scadenze dei prossimi 30 giorni."))}
        {p(t("Alla creazione di un abbonamento puoi attivare Periodo di prova gratuito e scegliere il primo pagamento. Durante la prova non viene conteggiata alcuna spesa. La data è modificabile finché futura; dopo il primo addebito resta invariata. Puoi annullare durante la prova per evitare i pagamenti successivi."))}
        {p(t("In Abbonamenti ogni serie mostra importo, frequenza, prossimo rinnovo e stato (Attivo, In pausa o Annullato). Aprendo i dettagli trovi lo storico dei pagamenti, quanti ne sono stati effettuati e il totale speso, anche per gli abbonamenti annullati."))}
        {p(t("Puoi mettere in pausa, annullare o riattivare un abbonamento: la scelta vale dai rinnovi successivi a oggi, i rinnovi che cadono mentre è in pausa o annullato non vengono conteggiati e i pagamenti già registrati non cambiano. Alla riattivazione i rinnovi riprendono dalle date originali. La pagina Analisi e l'esportazione CSV includono sempre i pagamenti effettuati degli abbonamenti."))}
        {p(t("Puoi cambiare la frequenza di un abbonamento da Modifica serie (settimanale, mensile o annuale) scegliendo la data del primo rinnovo con la nuova frequenza: i pagamenti già effettuati restano invariati e il prezzo segue il numero di rinnovo. Un abbonamento con la frequenza cambiata richiede la versione aggiornata dell’app e un backup versione 6."))}
      </Section>

      <Section title={t("Fondi")}>
        {p(t("I fondi e i budget sono facoltativi: puoi usare Nummo senza crearne nessuno. Un fondo raggruppa alcune spese (ad esempio vacanze, casa o università) con nome, icona e colore; in Nuova spesa puoi sceglierlo oppure lasciare Nessun fondo, e puoi indicarne uno predefinito."))}
        {p(t("La pagina Fondi mostra quanto hai speso nel mese, in totale e per fondo; aprendo un fondo vedi le sue spese del mese. Puoi impostare un budget mensile generale, per tutte le spese, e un budget per ciascun fondo: è un limite indicativo che mostra quanto hai speso e quanto resta, avvisa quando ti avvicini o lo superi, ma non blocca le spese. Vale dal mese corrente: i mesi passati restano come sono."))}
        {p(t("Da Impostazioni, sezione Funzionalità, puoi nascondere il budget mensile generale e i controlli del budget in Nuovo fondo e Modifica fondo. I budget restano salvati e non cambiano quando modifichi gli altri dati del fondo; i controlli ricompaiono quando li riattivi."))}
        {p(t("Le spese senza fondo restano valide; puoi assegnarle a un fondo solo se lo scegli. Un fondo con spese collegate si archivia invece di essere eliminato."))}
        {p(t("I fondi creati con una versione precedente conservano saldo iniziale, ricariche, movimenti ed eccezioni del budget: restano consultabili e non vengono modificati quando salvi il fondo."))}
      </Section>

      <Section title={t("Esportare i dati")}>
        {p(t("Dalla pagina Importa ed esporta, nel menu account sotto Categorie, esporti le transazioni in CSV, da aprire con Excel, LibreOffice o Google Fogli, e scarichi il backup completo in JSON. Solo il backup JSON si può importare di nuovo per ripristinare i dati, con riepilogo prima della conferma. In modalità Avanzata servono la connessione e la sincronizzazione completata."))}
        {p(t("In modalità Standard, da Impostazioni, sezione Archiviazione e backup, puoi collegare Google Drive: Nummo salva una copia dei dati in una cartella riservata all'app, quando lo chiedi o in automatico mentre la usi, e la ripristina su richiesta dopo averti mostrato data e contenuto del backup. Il ripristino sostituisce i dati del dispositivo. È un backup, non una sincronizzazione: i dati non si aggiornano da soli tra dispositivi."))}
      </Section>

      <Section title={t("Dove sono i dati")}>
        {p(t("In modalità Standard le spese sono salvate nel browser di questo dispositivo e non vengono inviate a nessun server. Se cancelli i dati del sito, disinstalli l'app o cambi browser o dispositivo senza un backup, vanno perse."))}
        {p(t("In modalità Avanzata le spese sono salvate in Cloud Firestore, il database di Firebase (Google), nel progetto del proprietario. Possono leggerle e scriverle solo l'accesso con Google e le regole di sicurezza del database, riservate al proprietario."))}
        {p(t("Il segnale in alto mostra lo stato dei dati; in modalità Avanzata, senza rete alcune operazioni non sono disponibili."))}
      </Section>

      <Button mode="outlined" onPress={onBack} style={styles.bottom}>{t("Torna indietro")}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.xl },
  back: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  intro: { gap: spacing.sm },
  title: { fontWeight: '700', letterSpacing: -0.3 },
  section: { gap: spacing.sm },
  heading: { fontWeight: '700' },
  paragraph: { lineHeight: 26 },
  bottom: { alignSelf: 'flex-start' },
});
