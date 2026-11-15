import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
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

function Step({ index, title, children }: { index: number; title: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.step} role="listitem">
      <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
        <Text variant="labelLarge" style={{ color: colors.onSecondaryContainer }}>{index}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text variant="bodyMedium">{title}</Text>
        {children}
      </View>
    </View>
  );
}

// A value to type elsewhere (domain, UID): shown in full, selectable, with a copy button.
function CopyValue({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const copy = useCopy();
  return (
    <View style={[styles.value, { backgroundColor: colors.surfaceVariant }]}>
      <Text variant="bodyMedium" selectable style={[styles.valueText, { color: colors.onSurfaceVariant }]}>{value}</Text>
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

type ConnectProps = {
  target: CustomFirebaseTarget;
  // The project connected from this browser, if any, and the one built into the site (null when missing).
  connected: FirebaseWebConfig | null;
  site: FirebaseWebConfig | null;
  signedIn: boolean;
  onCancel: () => void;
};

// «Collega il tuo Firebase»: the steps in the Firebase console, then the configuration pasted here. Saved in this
// browser only; the page reloads on the new project.
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
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="headlineMedium" accessibilityRole="header" aria-level={1}>{t("Collega il tuo Firebase")}</Text>
        <Text variant="bodyLarge" style={muted}>
          {t("Usa la modalità Avanzata con un progetto Firebase tuo: i dati passano direttamente da questo browser al tuo progetto e solo il tuo account Google può aprirli.")}</Text>
      </View>
      {connected && (
        <Card title={t("Progetto collegato")}>
          <Text variant="bodyMedium">{t("Questo browser usa il tuo progetto {p0}.", { p0: connected.projectId })}</Text>
          {site && <View style={styles.start}>
            <Button mode="outlined" disabled={busy} onPress={() => run(null)}>{t("Torna al progetto di questo sito")}</Button>
          </View>}
        </Card>
      )}
      <Card title={t("Nella Console Firebase")}>
        <View role="list" style={styles.steps}>
          <Step index={1} title={t("Crea un progetto e, nella sua pagina iniziale, aggiungi un'app Web.")} />
          <Step index={2} title={t("Authentication → Metodo di accesso: attiva Google. Poi Impostazioni → Domini autorizzati: aggiungi questo indirizzo.")}>
            <CopyValue label={t("indirizzo")} value={host} />
          </Step>
          <Step index={3} title={t("Firestore Database → Crea database, in modalità produzione. Poi Regole: incolla le regole di Nummo e premi Pubblica.")}>
            <RulesActions />
          </Step>
          <Step index={4} title={t("Impostazioni progetto → Le tue app: copia il blocco firebaseConfig e incollalo qui sotto.")} />
        </View>
        <View style={styles.start}>
          <Button mode="text" compact onPress={() => openExternal(firebaseConsoleUrl)}>{t("Apri la Console Firebase")}</Button>
        </View>
      </Card>
      <Card title={t("Configurazione del progetto")}>
        <TextInput mode="outlined" outlineStyle={inputOutline} multiline numberOfLines={6} value={text} disabled={busy}
          label={t("firebaseConfig")} accessibilityLabel={t("Configurazione del progetto Firebase")}
          placeholder={'const firebaseConfig = {\n  apiKey: "…",\n  authDomain: "…",\n  projectId: "…",\n  appId: "…"\n};'}
          autoCapitalize="none" autoCorrect={false} spellCheck={false} style={styles.code}
          onChangeText={(value) => { setText(value); setError(null); }} />
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error.message, { p0: error.fields ?? '' })}</HelperText>}
        <Text variant="bodySmall" style={muted}>
          {t("La configurazione resta solo in questo browser. Dopo il collegamento accedi con Google: Nummo ti dirà come completare l'ultimo passaggio.")}</Text>
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
      </View>
      <Card title={t("Nella Console Firebase")}>
        <View role="list" style={styles.steps}>
          <Step index={1} title={t("Firestore Database → Regole: se non l'hai già fatto, incolla le regole di Nummo e premi Pubblica.")}>
            <RulesActions />
          </Step>
          <Step index={2} title={t("Firestore Database → Dati → Avvia raccolta: ID raccolta «config», ID documento «owner», un campo «uid» di tipo stringa con questo valore:")}>
            <CopyValue label={t("UID")} value={uid} />
          </Step>
          <Step index={3} title={t("Torna qui e premi «Controlla di nuovo».")} />
        </View>
        <Text variant="bodySmall" style={muted}>
          {t("Se il proprietario è già impostato con un altro account, esci e accedi con quello.")}</Text>
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
  intro: { gap: spacing.xs },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, minWidth: 0, gap: spacing.sm, paddingTop: 4 },
  value: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.tile, paddingLeft: spacing.md, paddingVertical: 2 },
  valueText: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  code: { minHeight: 140 },
  helper: { paddingHorizontal: 0 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  button: { minHeight: 48 },
  start: { alignSelf: 'flex-start' },
});
