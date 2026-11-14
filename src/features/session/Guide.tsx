import { useI18n } from '../../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
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
      <Button mode="text" compact onPress={onBack} style={styles.back}
        icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />}>
        {t("Torna indietro")}</Button>
      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header" aria-level={1}>{t("Cos'è Nummo")}</Text>
        <Text variant="bodyLarge" style={[styles.paragraph, muted]}>
          {t("Nummo è un'app web per registrare le spese quotidiane e capire come gestisci il denaro. Funziona direttamente dal browser, sia da computer che da smartphone, senza dover creare necessariamente un account.")}</Text>
      </View>

      <Section title={t("Le funzioni principali")}>
        {item("Spese e categorie su misura", "Inserisci importo, descrizione e categoria (se lasci vuota la data, viene impostata automaticamente a oggi). Puoi creare infinite categorie con icone personalizzate, anche al volo mentre stai registrando una spesa.")}
        {item("Liste della spesa intelligenti", "Prepara la lista e spunta i prodotti mentre li metti nel carrello. Alla cassa ti basta inserire il totale dello scontrino, senza dover digitare i prezzi dei singoli articoli: Nummo crea un'unica spesa con il riepilogo di ciò che hai comprato e archivia la lista, permettendoti di recuperarne eventuali prodotti rimasti fuori.")}
        {item("Abbonamenti e spese fisse", "Imposta pagamenti ricorrenti (settimanali, mensili o annuali), gestendo anche periodi di prova gratuiti e prezzi promozionali. Puoi mettere in pausa, modificare o annullare un abbonamento in qualsiasi momento senza alterare lo storico passato.")}
        {item("Fondi e budget (facoltativi)", "Raggruppa le spese per obiettivo (es. Casa, Vacanze, Università) e imposta tetti di spesa mensili. Gli avvisi ti segnalano quando ti avvicini o superi il limite, senza mai bloccarti.")}
        {item("Analisi e grafici", "Controlla dove vanno i tuoi soldi da 1 a 12 mesi con grafici interattivi (a ciambella, a barre o a blocchi), andamento giornaliero e confronto con i periodi precedenti.")}
      </Section>

      <Section title={t("Dove sono i tuoi dati (Privacy e Backup)")}>
        {p(t("Puoi scegliere come gestire il tuo archivio in base alle tue esigenze:"))}
        {item("Modalità Standard (subito pronta, zero account)", "I dati vengono salvati esclusivamente nel browser del tuo dispositivo e non vengono inviati a nessun server. Per non perderli se cambi telefono o pulisci i dati di navigazione, scarica periodicamente un backup in formato JSON (oppure esporta in CSV per Excel e Google Fogli).")}
        {item("Modalità Avanzata (sincronizzazione tra dispositivi)", "Collega un tuo progetto personale su Firebase (Google) con accesso riservato solo al tuo account. I dati si sincronizzano ovunque restando sotto il tuo esclusivo controllo.")}
        <Text variant="bodyMedium" style={muted}>{t("Nota: le due modalità usano archivi separati; passare dall'una all'altra da Archiviazione e backup non sposta né cancella i dati esistenti.")}</Text>
      </Section>

      <Section title={t("Avvisi e promemoria")}>
        {p(t("Nummo ti invia un riepilogo periodico delle spese e, in modalità Standard, ti ricorda di salvare un backup quando ci sono nuove modifiche. Se attivi le notifiche di sistema dalla pagina Notifiche, gli avvisi arrivano anche con l'app chiusa; altrimenti compaiono quando apri Nummo."))}
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
  lead: { fontWeight: '700' },
  bottom: { alignSelf: 'flex-start' },
});
