import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useSnackbar } from '../../components/SnackbarHost';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import type { FirebaseWebConfig } from '../../services/backendConfig';
import { parseFirebaseConfig, sameFirebaseProject, type CustomFirebaseTarget } from '../../services/customFirebase';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { copyText, firebaseConsoleUrl, openExternal, rulesUrl, switchFirebase } from './firebaseConnection';

const copyIcon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.copy} size={size} color={color} />;

// The Rules text, fetched when a page that offers to copy it opens (a static file of the site, no data involved), so
// that the copy itself happens right inside the tap.
function useRulesText(): string | null {
  const [rules, setRules] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch(rulesUrl(), { cache: 'no-cache' }).then((response) => response.ok ? response.text() : null)
      .then((text) => { if (live && text && text.includes('service cloud.firestore')) setRules(text); }, () => {});
    return () => { live = false; };
  }, []);
  return rules;
}

function useCopy() {
  const notify = useSnackbar();
  return (text: string | null) => {
    if (!text) { notify('Copia non riuscita: apri il file e copialo a mano.'); return; }
    void copyText(text).then((done) => notify(done ? 'Copiato.' : 'Copia non riuscita: apri il file e copialo a mano.'));
  };
}

// One numbered step: a short title, then what to do in the console and, when useful, why it is needed.
function Step({ index, title, children, why }: { index: number; title: string; children?: ReactNode; why?: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.step} role="listitem">
      <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
        <Text variant="labelLarge" style={{ color: colors.onSecondaryContainer }}>{index}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text variant="titleSmall" accessibilityRole="header" aria-level={3}>{title}</Text>
        {children}
        {why && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          <Text variant="bodySmall" style={[styles.strong, { color: colors.onSurfaceVariant }]}>{t("Perché serve:")}</Text> {why}</Text>}
      </View>
    </View>
  );
}

// A paragraph of a step (instructions in the words of the Firebase console).
function Line({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const { colors } = useTheme();
  return <Text variant="bodyMedium" style={muted ? { color: colors.onSurfaceVariant } : undefined}>{children}</Text>;
}

// A value to type elsewhere (domain, collection, UID): shown in full, selectable, with a copy button. `caption`: what
// the value is, when the step asks for several.
function CopyValue({ label, value, caption }: { label: string; value: string; caption?: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const copy = useCopy();
  return (
    <View style={[styles.value, { backgroundColor: colors.surfaceVariant }]}>
      <View style={styles.valueText}>
        {caption && <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{caption}</Text>}
        <Text variant="bodyMedium" selectable style={{ color: colors.onSurfaceVariant }}>{value}</Text>
      </View>
      <Button mode="text" compact icon={copyIcon} accessibilityLabel={t("Copia {p0}", { p0: label })} onPress={() => copy(value)}>{t("Copia")}</Button>
    </View>
  );
}

function RulesActions() {
  const { t } = useI18n();
  const rules = useRulesText();
  const copy = useCopy();
  return (
    <View style={styles.inline}>
      <Button mode="outlined" compact icon={copyIcon} onPress={() => copy(rules)}>{t("Copia le regole")}</Button>
      <Button mode="text" compact onPress={() => openExternal(rulesUrl())}>{t("Apri il file")}</Button>
    </View>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bullet} role="listitem">
      <Text variant="bodyMedium" aria-hidden style={{ color: colors.onSurfaceVariant }}>•</Text>
      <Text variant="bodyMedium" style={styles.bulletText}>{children}</Text>
    </View>
  );
}

type ConnectProps = {
  target: CustomFirebaseTarget;
  // The project connected from this browser, if any, and the one built into the site (null when missing).
  connected: FirebaseWebConfig | null;
  site: FirebaseWebConfig | null;
  signedIn: boolean;
  onCancel: () => void;
};

// «Collega il tuo Firebase»: what is needed, then six short steps in the Firebase console, with the configuration pasted
// right after it is copied (step 2), and why each step matters. Console names in Italian with the English ones in
// brackets: the console may be in either language. Saved in this browser only; the page reloads on the new project.
export function FirebaseConnect({ target, connected, site, signedIn, onCancel }: ConnectProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const [text, setText] = useState('');
  const [error, setError] = useState<{ message: string; fields?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const host = window.location.hostname;
  const run = (config: FirebaseWebConfig | null) => {
    setBusy(true); setError(null);
    void switchFirebase(config, signedIn).then((failure) => { if (failure) { setError({ message: failure }); setBusy(false); } });
  };
  const connect = () => {
    const parsed = parseFirebaseConfig(text, target);
    if ('error' in parsed) { setError({ message: parsed.error, fields: parsed.fields }); return; }
    if (connected && sameFirebaseProject(parsed.config, connected)) { setError({ message: 'Questo progetto è già collegato.' }); return; }
    // The site's own project needs no saved configuration.
    run(site && sameFirebaseProject(parsed.config, site) ? null : parsed.config);
  };
  return (
    <View style={[styles.wrap, styles.withBack]}>
      <BackButton disabled={busy} onPress={onCancel} />
      <View style={styles.intro}>
        <Text variant="headlineMedium" accessibilityRole="header" aria-level={1}>{t("Collega il tuo Firebase")}</Text>
        <Text variant="bodyLarge" style={muted}>
          {t("Con un progetto Firebase tuo, le spese si salvano nel tuo account Google e le ritrovi su ogni dispositivo. Solo tu puoi aprirle.")}</Text>
      </View>
      {connected && (
        <Card title={t("Progetto collegato")}>
          <Text variant="bodyMedium">{t("Questo browser usa il tuo progetto {p0}.", { p0: connected.projectId })}</Text>
          {site && <View style={styles.start}>
            <Button mode="outlined" disabled={busy} onPress={() => run(null)}>{t("Torna al progetto di questo sito")}</Button>
          </View>}
        </Card>
      )}
      <Card title={t("Prima di iniziare")}>
        <View role="list" style={styles.bullets}>
          <Bullet>{t("Ti servono un account Google e circa 10 minuti.")}</Bullet>
          <Bullet>{t("Basta il piano gratuito di Firebase («Spark»): non serve una carta di credito.")}</Bullet>
          <Bullet>{t("Le spese della modalità Standard restano su questo dispositivo: dopo il collegamento le porti nel tuo Firebase da Archiviazione e backup.")}</Bullet>
          <Bullet>{t("Tieni aperte due schede: questa e la Console Firebase.")}</Bullet>
        </View>
        <View style={styles.start}>
          <Button mode="contained-tonal" onPress={() => openExternal(firebaseConsoleUrl)}>{t("Apri la Console Firebase")}</Button>
        </View>
      </Card>
      <Card title={t("Nella Console Firebase")}>
        <View role="list" style={styles.steps}>
          <Step index={1} title={t("Crea il progetto")}>
            <Line>{t("Premi «Crea un progetto» (Create a project) e dagli un nome, per esempio «nummo-tuonome». Google Analytics non serve: puoi disattivarlo.")}</Line>
          </Step>
          <Step index={2} title={t("Registra l'app web e copia la configurazione")}
            why={t("dice a Nummo qual è il tuo progetto. Questi valori non sono una password: i dati li proteggono il tuo accesso Google e le regole del passaggio 6.")}>
            <Line>{t("Nella pagina del progetto premi l'icona </> (Web). Scrivi un nome qualsiasi, lascia non spuntato «Configura anche Firebase Hosting» e premi «Registra app».")}</Line>
            <Line>{t("Firebase mostra un blocco che inizia con «const firebaseConfig = {»: copialo tutto, graffe comprese, e incollalo qui.")}</Line>
            <TextInput mode="outlined" outlineStyle={inputOutline} multiline numberOfLines={6} value={text} disabled={busy} error={error !== null && error.fields !== undefined}
              label={t("firebaseConfig")} accessibilityLabel={t("Configurazione del progetto Firebase")}
              placeholder={'const firebaseConfig = {\n  apiKey: "…",\n  authDomain: "…",\n  projectId: "…",\n  appId: "…"\n};'}
              autoCapitalize="none" autoCorrect={false} spellCheck={false} style={styles.code}
              onChangeText={(value) => { setText(value); setError(null); }} />
            <Line muted>{t("Se l'hai chiuso: ingranaggio accanto a «Panoramica del progetto» → Impostazioni progetto (Project settings) → Le tue app (Your apps).")}</Line>
          </Step>
          <Step index={3} title={t("Attiva l'accesso con Google")} why={t("entri in Nummo con il tuo account Google.")}>
            <Line>{t("Menu a sinistra → Authentication → «Inizia» (Get started). Nella scheda «Metodo di accesso» (Sign-in method) scegli Google, attivalo, scegli la tua email come email di assistenza e premi «Salva».")}</Line>
          </Step>
          <Step index={4} title={t("Autorizza questo indirizzo")}
            why={t("stai usando Nummo da questo indirizzo, ma i dati vanno nel tuo progetto, che accetta l'accesso con Google solo dagli indirizzi che autorizzi tu. Senza questo passaggio l'accesso si ferma con «Questo indirizzo non è tra i domini autorizzati del progetto Firebase». Autorizzarlo vuol dire fidarsi della versione di Nummo pubblicata qui.")}>
            <Line>{t("Sempre in Authentication apri la scheda «Impostazioni» (Settings), poi «Domini autorizzati» (Authorized domains) → «Aggiungi dominio» (Add domain) e incolla:")}</Line>
            <CopyValue label={t("indirizzo")} value={host} />
          </Step>
          <Step index={5} title={t("Crea il database")} why={t("è dove si salvano le tue spese.")}>
            <Line>{t("Menu a sinistra → Firestore Database → «Crea database» (Create database). Scegli una località in Europa: non si può cambiare dopo. Poi scegli la modalità di produzione (production mode), non quella di prova.")}</Line>
          </Step>
          <Step index={6} title={t("Pubblica le regole di Nummo")} why={t("le regole fanno entrare solo te e controllano che i dati salvati siano corretti.")}>
            <Line>{t("In Firestore Database apri la scheda «Regole» (Rules), cancella tutto il testo che c'è, incolla le regole di Nummo e premi «Pubblica» (Publish).")}</Line>
            <RulesActions />
          </Step>
        </View>
      </Card>
      <Card title={t("Collega")}>
        <Text variant="bodyMedium" style={muted}>
          {t("La configurazione resta salvata in questo browser. Dopo il collegamento accedi con Google: manca solo un ultimo passaggio, te lo indica Nummo.")}</Text>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error.message, { p0: error.fields ?? '' })}</HelperText>}
        <View style={styles.actions}>
          <Button mode="contained" disabled={busy || text.trim() === ''} loading={busy} onPress={connect} contentStyle={styles.button}>{t("Collega")}</Button>
          <Button mode="outlined" disabled={busy} onPress={onCancel} contentStyle={styles.button}>{t("Annulla")}</Button>
        </View>
      </Card>
    </View>
  );
}

type OwnerProps = {
  project: string; uid: string; email: string | null; busy: boolean; error: string | null; checking: boolean;
  onCheck: () => void; onChangeProject: () => void; onSignOut: () => void;
};

// Signed in to a project connected from this browser, but not (yet) its owner: the last step happens in the console,
// because a client can never appoint the owner (Rules). Also shown while the Rules are not published.
export function OwnerSetup({ project, uid, email, busy, error, checking, onCheck, onChangeProject, onSignOut }: OwnerProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="headlineMedium" accessibilityRole="header" aria-level={1}>{t("Ultimo passaggio")}</Text>
        <Text variant="bodyLarge" style={muted}>
          {email
            ? t("Indica nel progetto {p0} che l'account {p1} è il proprietario di questo Nummo.", { p0: project, p1: email })
            : t("Indica nel progetto {p0} che questo account è il proprietario di questo Nummo.", { p0: project })}</Text>
        <Text variant="bodyMedium" style={muted}>
          {t("Nummo non può farlo da solo: le regole impediscono a chiunque di nominarsi proprietario, così nessun altro può farlo al posto tuo.")}</Text>
      </View>
      <Card title={t("Nella Console Firebase")}>
        <View role="list" style={styles.steps}>
          <Step index={1} title={t("Controlla le regole")}>
            <Line>{t("Se non l'hai già fatto, in Firestore Database → «Regole» (Rules) incolla le regole di Nummo e premi «Pubblica» (Publish).")}</Line>
            <RulesActions />
          </Step>
          <Step index={2} title={t("Crea il documento del proprietario")}>
            <Line>{t("Firestore Database → scheda «Dati» (Data) → «Avvia raccolta» (Start collection), poi compila:")}</Line>
            <CopyValue label={t("ID raccolta")} caption={t("ID raccolta (Collection ID)")} value="config" />
            <CopyValue label={t("ID documento")} caption={t("ID documento (Document ID): scrivilo tu, non premere «ID automatico»")} value="owner" />
            <CopyValue label={t("nome del campo")} caption={t("Campo (Field), tipo string")} value="uid" />
            <CopyValue label={t("UID")} caption={t("Valore (Value)")} value={uid} />
            <Line>{t("Poi premi «Salva» (Save).")}</Line>
          </Step>
          <Step index={3} title={t("Torna qui e premi «Controlla di nuovo»")} />
        </View>
        <Text variant="bodySmall" style={muted}>
          {t("Se non funziona: controlla che l'ID documento sia esattamente «owner», che il tipo del campo sia string e che il valore non abbia spazi. Se il proprietario è già un altro account, esci e accedi con quello.")}</Text>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
        <View style={styles.actions}>
          <Button mode="contained" disabled={busy || checking} loading={checking} onPress={onCheck} contentStyle={styles.button}>{t("Controlla di nuovo")}</Button>
          <Button mode="outlined" disabled={busy} onPress={onChangeProject} contentStyle={styles.button}>{t("Cambia progetto Firebase")}</Button>
          <Button mode="text" disabled={busy} onPress={onSignOut} contentStyle={styles.button}>{t("Esci")}</Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  // With «Torna indietro» on top, as in the guide: the button takes the place of the top padding.
  withBack: { paddingTop: 0 },
  intro: { gap: spacing.xs },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, minWidth: 0, gap: spacing.sm, paddingTop: 2 },
  strong: { fontWeight: '700' },
  bullets: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletText: { flex: 1, minWidth: 0 },
  value: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.tile, paddingLeft: spacing.md, paddingVertical: 2 },
  valueText: { flex: 1, minWidth: 0, paddingVertical: spacing.xs },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  code: { minHeight: 140 },
  helper: { paddingHorizontal: 0 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  button: { minHeight: 48 },
  start: { alignSelf: 'flex-start' },
});
