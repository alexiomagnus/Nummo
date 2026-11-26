import { useI18n } from '../../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { BackButton } from '../../components/BackButton';
import { spacing } from '../../theme/tokens';

// Public introduction, shown on the mode choice and sign-in screens. Static text only: no data access and no
// dependency on the session. Every statement below describes something the app does today. Wording rule: short,
// plain sentences an average user understands at once (no technical terms unless they are named in the interface).
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
  // A short bold lead-in followed by its explanation, in one paragraph.
  const item = (lead: string, text: string) => (
    <Text variant="bodyLarge" style={styles.paragraph}><Text variant="bodyLarge" style={styles.lead}>{t(lead)}</Text>{": "}{t(text)}</Text>
  );
  return (
    <View role="article" aria-label={t("Cos'è Nummo e come funziona")} style={styles.wrap}>
      <BackButton onPress={onBack} />
      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header" aria-level={1}>{t("Cos'è Nummo")}</Text>
        <Text variant="bodyLarge" style={[styles.paragraph, muted]}>
          {t("Nummo è un'app web per registrare le spese quotidiane e capire come gestisci il denaro. Funziona direttamente dal browser, sia da computer che da smartphone, senza dover creare necessariamente un account.")}</Text>
      </View>

      <Section title={t("Le funzioni principali")}>
        {item("Spese e categorie su misura", "Inserisci importo, descrizione e categoria (se lasci vuota la data, viene impostata automaticamente a oggi). Puoi creare quante categorie vuoi, con icone personalizzate, dalla pagina Categorie.")}
        {item("Esercenti ricordati", "In Nuova spesa puoi indicare anche l’Esercente, se vuoi. Mentre scrivi, Nummo ti propone i negozi che usi più spesso e di recente; «amazon» e «AMAZON» sono lo stesso esercente. Dalla pagina Esercenti del menu puoi correggere un nome, unire due esercenti o eliminarne uno.")}
        {item("Scansione dello scontrino", "In Nuova spesa, con Scansiona scontrino fotografi lo scontrino e Nummo propone importo, data, descrizione, esercente e categoria: controlli tutto e decidi tu se salvare. È facoltativa: la attivi dalla pagina Lista scontrini del menu e usa l’AI che scegli, con la tua chiave; la foto viene inviata a quel servizio, e Nummo conserva solo i dati letti, nella Lista scontrini, quando salvi la spesa.")}
        {item("Template per le spese", "Se attivi i Template dal menu, puoi salvare spese già pronte (descrizione, importo, esercente, categoria e fondo) e sceglierle in Nuova spesa per compilare tutto in un attimo.")}
        {item("Link per compilare Nuova spesa", "Un link come …/#nuova?importo=12,50&descrizione=Bar apre Nuova spesa con i campi già compilati: controlli e premi Salva. Puoi usarlo in un’automazione del telefono, per esempio dopo un pagamento con lo smartphone.")}
        {item("Liste della spesa intelligenti", "Prepara la lista e spunta i prodotti mentre li metti nel carrello. Alla cassa ti basta inserire il totale dello scontrino, senza dover digitare i prezzi dei singoli articoli: Nummo crea un'unica spesa con il riepilogo di ciò che hai comprato e archivia la lista, permettendoti di recuperarne eventuali prodotti rimasti fuori.")}
        {item("Abbonamenti e spese fisse", "Imposta pagamenti ricorrenti (settimanali, mensili o annuali), gestendo anche periodi di prova gratuiti e prezzi promozionali. Puoi mettere in pausa, modificare o annullare un abbonamento in qualsiasi momento. Se ti eri dimenticato di farlo, scegli da quale data vale e i pagamenti successivi non vengono più contati. Dallo «Storico dei pagamenti» puoi anche eliminare un singolo pagamento che non andava contato.")}
        {item("Fondi e budget (facoltativi)", "Raggruppa le spese per obiettivo (es. Casa, Vacanze, Università) e imposta tetti di spesa mensili. Nella pagina Fondi vedi quanto hai speso e se sei vicino al limite o l’hai superato, senza mai bloccarti. Da Spese e Analisi puoi filtrare i pagamenti per fondo.")}
        {item("Blocco con impronta o viso", "Nelle Impostazioni puoi chiedere a Nummo di bloccarsi: quando lo apri, e quando ci torni dopo il tempo che scegli, chiede impronta, viso o il PIN del telefono. Nasconde i tuoi dati sullo schermo a chi prende in mano il dispositivo.")}
        {item("Analisi e grafici", "Controlla dove vanno i tuoi soldi da 1 a 12 mesi con grafici interattivi (a ciambella, a barre o a blocchi) e andamento giornaliero.")}
      </Section>

      <Section title={t("Dove sono i tuoi dati (Privacy e Backup)")}>
        {p(t("Puoi scegliere come gestire il tuo archivio in base alle tue esigenze:"))}
        {item("Modalità Standard (subito pronta, zero account)", "I dati vengono salvati esclusivamente nel browser del tuo dispositivo e non vengono inviati a nessun server. Per non perderli se cambi telefono o pulisci i dati di navigazione, scarica periodicamente un backup in formato JSON (oppure esporta in CSV per Excel e Google Fogli).")}
        {item("Modalità Avanzata (sincronizzazione tra dispositivi)", "Colleghi un progetto Firebase (Google) tuo seguendo i passaggi indicati da Nummo: entra solo il tuo account e i dati si sincronizzano tra i tuoi dispositivi, sotto il tuo controllo.")}
        <Text variant="bodyMedium" style={muted}>{t("Nota: le due modalità usano archivi separati. Cambiare modalità non sposta né cancella nulla; quando vuoi, da Archiviazione e backup porti i tuoi dati nell'altra modalità, senza perdere quelli che ci sono già.")}</Text>
      </Section>

      <Section title={t("Avvisi e promemoria")}>
        {p(t("Se attivi le notifiche di sistema dalla pagina Notifiche, Nummo ti invia un riepilogo periodico delle spese, ti avvisa il giorno prima del rinnovo di un abbonamento e, in modalità Standard, ti ricorda di salvare un backup quando ci sono nuove modifiche. Gli avvisi arrivano come notifiche del dispositivo, anche con l'app chiusa."))}
      </Section>

      <Button mode="outlined" onPress={onBack} style={styles.bottom}>{t("Torna indietro")}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.xl },
  intro: { gap: spacing.sm },
  title: { fontWeight: '700', letterSpacing: -0.3 },
  section: { gap: spacing.sm },
  heading: { fontWeight: '700' },
  paragraph: { lineHeight: 26 },
  lead: { fontWeight: '700' },
  bottom: { alignSelf: 'flex-start' },
});
