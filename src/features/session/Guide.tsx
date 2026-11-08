import { useI18n } from '../../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { spacing } from '../../theme/tokens';

// Public introduction, shown on the signed-out screen. Static text only: no Firebase access and no
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
        {t("Torna all'accesso")}</Button>
      <View style={styles.intro}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header" aria-level={1}>{t("Cos'è Nummo")}</Text>
        <Text variant="bodyLarge" style={muted}>
          {t("Un'app per registrare le spese di ogni giorno e capire dove va il denaro. Funziona dal browser, anche da smartphone.")}</Text>
      </View>

      <Section title={t("Come iniziare")}>
        {p(t("Si entra con il proprio account Google."))}
        {p(t("Nummo è un'app personale: al momento può accedere solo il proprietario autorizzato. Non c'è una registrazione aperta e gli altri account Google non vedono né salvano alcun dato."))}
      </Section>

      <Section title={t("Registrare una spesa")}>
        {p(t("Tocca Nuova spesa e inserisci importo, data, descrizione e categoria. La categoria è obbligatoria; se lasci vuota la data vale oggi."))}
        <Text variant="bodyMedium" style={muted}>{t("Esempio: 4,50 € · Caffè · Colazione.")}</Text>
      </Section>

      <Section title={t("Organizzare le categorie")}>
        {p(t("Nella pagina Categorie crei le tue categorie con un nome e, se vuoi, un'icona. Puoi rinominarle o eliminarle, oppure aggiungere quelle già pronte."))}
      </Section>

      <Section title={t("Consultare le spese")}>
        {p(t("In Spese trovi l'elenco raggruppato per mese, con ricerca per nome, ordinamento e filtro per categoria. Da qui modifichi o elimini una voce."))}
        {p(t("La Dashboard mostra le spese per categoria nel mese corrente, nel mese scorso o negli ultimi 3, 6 o 12 mesi, con grafici a ciambella o a blocchi e un elenco giornaliero espandibile."))}
      </Section>

      <Section title={t("Spese ricorrenti e abbonamenti")}>
        {p(t("Una spesa può ripetersi ogni settimana, mese o anno: la inserisci una volta sola e compare a ogni scadenza maturata."))}
        {p(t("Se il prezzo cambia, puoi indicare un prezzo promozionale per i primi rinnovi, oppure modificare solo il prossimo rinnovo o tutti quelli futuri: i pagamenti già maturati restano com'erano. Prossimi rinnovi mostra le scadenze in arrivo."))}
      </Section>

      <Section title={t("Esportare i dati")}>
        {p(t("Dal pulsante Dati della pagina Spese esporti le transazioni in CSV, da aprire con Excel, LibreOffice o Google Fogli, e scarichi il backup completo in JSON. Solo il backup JSON si può importare di nuovo per ripristinare i dati, con riepilogo prima della conferma. Servono la connessione e la sincronizzazione completata."))}
      </Section>

      <Section title={t("Dove sono i dati")}>
        {p(t("Le spese sono salvate in Cloud Firestore, il database di Firebase (Google), nel progetto del proprietario: non ci sono altri archivi. Possono leggerle e scriverle solo l'accesso con Google e le regole di sicurezza del database, riservate al proprietario."))}
        {p(t("Il segnale in alto mostra se i dati sono sincronizzati; senza rete alcune operazioni non sono disponibili."))}
      </Section>

      <Button mode="outlined" onPress={onBack} style={styles.bottom}>{t("Torna all'accesso")}</Button>
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
