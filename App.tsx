import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { ActivityIndicator, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountMenu } from './src/components/AccountMenu';
import { AppShell } from './src/components/AppShell';
import { Button } from './src/components/Button';
import { Card } from './src/components/Card';
import { IconStyleProvider } from './src/components/CategoryGlyph';
import { HapticsProvider } from './src/components/Haptics';
import { useOverlayMotion, usePresence } from './src/components/Overlay';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SvgIcon, iconShapes } from './src/components/SvgIcon';
import type { Preferences } from './src/features/settings/preferences';
import { SettingsPage } from './src/features/settings/SettingsPage';
import { usePreferences } from './src/features/settings/usePreferences';
import { AccessDenied } from './src/features/session/AccessDenied';
import { FirebaseConnect, OwnerSetup } from './src/features/session/FirebaseSetup';
import { switchFirebase } from './src/features/session/firebaseConnection';
import { SignIn, leaveGuide } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { readSessionHint, writeSessionHint } from './src/services/sessionHint';
import { DataWorkspace, RemoteWorkspace, StartupWorkspace, type StorageSlot } from './src/features/workspace/Workspace';
import { ModeChoice } from './src/features/storage/ModeChoice';
import { useBackLayer } from './src/components/BackNavigation';
import { StandardAvatar } from './src/features/settings/ProfileImageCard';
import { AppLockScreen, useLockRecovery } from './src/features/lock/AppLock';
import { disableAppLock } from './src/features/lock/appLockStore';
import { backLevels } from './src/theme/backStack';
import { AdvancedStorage, StandardStorage } from './src/features/storage/StorageSection';
import { ModeTransfer } from './src/features/storage/ModeTransfer';
import { useStorageProtection } from './src/features/storage/useStorageProtection';
import { openLocalDatabase } from './src/services/localDatabase';
import { createLocalStore, type LocalStore } from './src/services/localStore';
import { initialStorageMode, readStorageMode, writeStorageMode, type StorageMode } from './src/services/storageMode';
import {
  activeFirebaseConfig, backendMode, customFirebaseConfig, customFirebaseTarget, firebaseConfigProblems, firebaseWebConfig,
  firestoreEmulator, missingFirebaseConfig, persistentCache,
} from './src/services/backendConfig';
import { getDatabase, warmUpServices } from './src/services/firebase';
import { checkOwnerAccess, type OwnerAccess } from './src/services/ownerAccess';
import { GlobalStyle } from './src/theme/GlobalStyle';
import { initialSafeAreaMetrics } from './src/theme/initialMetrics';
import { createTheme } from './src/theme/theme';
import { fadeTransition } from './src/theme/motion';
import { motion, spacing } from './src/theme/tokens';
import { useReducedMotion } from './src/theme/useSizeClass';
import { I18nProvider, useI18n } from './src/i18n/I18nProvider';

const demo = backendMode === 'emulator';
const configMissing = firebaseConfigProblems.length > 0;
// The project built into the site, when complete (a project connected from this browser replaces it).
const siteFirebase = missingFirebaseConfig.length === 0 ? firebaseWebConfig : null;
// Standard (this device) or Advanced (Firebase): the saved choice, or Firebase for a browser that was already using it.
const startMode = initialStorageMode(readStorageMode(), readSessionHint());
// Firebase is started only for the Advanced mode: the Standard mode never contacts it.
if (!configMissing && startMode === 'advanced') warmUpServices();

export default function App() {
  const systemScheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [preferences, updatePreferences, resetPreferences] = usePreferences();
  const dark = preferences.theme === 'system' ? systemScheme === 'dark' : preferences.theme === 'dark';
  const { accent, colorMode, font } = preferences;
  const theme = useMemo(() => createTheme(dark, reduceMotion, { accent, colorMode, font }), [dark, reduceMotion, accent, colorMode, font]);
  // Without initial metrics the provider renders nothing until an effect has measured the safe area.
  const [safeArea] = useState(initialSafeAreaMetrics);
  return (
    <I18nProvider language={preferences.language}>
      <IconStyleProvider style={preferences.iconStyle}>
        <HapticsProvider enabled={preferences.haptics}>
        <SafeAreaProvider initialMetrics={safeArea}>
          <PaperProvider theme={theme}>
            <GlobalStyle mode={preferences.theme} accent={accent} colorMode={colorMode} />
            <Root dark={dark} onToggleTheme={() => updatePreferences({ theme: dark ? 'light' : 'dark' })}
              preferences={preferences} onChangePreferences={updatePreferences} onResetPreferences={resetPreferences} />
            <AppLockScreen />
          </PaperProvider>
        </SafeAreaProvider>
        </HapticsProvider>
      </IconStyleProvider>
    </I18nProvider>
  );
}

type RootProps = {
  dark: boolean; onToggleTheme: () => void; preferences: Preferences;
  onChangePreferences: (change: Partial<Preferences>) => void; onResetPreferences: () => void;
};
// What the three screens below share: the theme button, the settings page and the mode switch.
type ModeProps = RootProps & {
  themeToggle: ReactNode;
  renderSettings: (onDone: () => void, archiveSections?: ReactNode, onResetArchive?: () => void) => ReactNode;
  onChangeMode: (mode: StorageMode | null) => void;
};

// The mode decides which archive is opened; the two are never mixed. Each screen is mounted only in its own mode,
// so leaving a mode discards its listeners, drafts and views.
function Root(props: RootProps) {
  const { t } = useI18n();
  const { dark, onToggleTheme, preferences, onChangePreferences, onResetPreferences } = props;
  const [mode, setMode] = useState(startMode);
  // A mode inferred from an earlier Firebase session is saved, so that it no longer depends on staying signed in.
  useEffect(() => { if (startMode && !readStorageMode()) writeStorageMode(startMode); }, []);
  const changeMode = (next: StorageMode | null) => { writeStorageMode(next); setMode(next); };
  const themeToggle = (
    <IconButton size={24} style={styles.touch} icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
      onPress={onToggleTheme} accessibilityLabel={dark ? t("Attiva tema chiaro") : t("Attiva tema scuro")} />
  );
  const renderSettings = (onDone: () => void, archiveSections?: ReactNode, onResetArchive?: () => void) => <SettingsPage preferences={preferences} dark={dark} onChange={onChangePreferences}
    onReset={onResetPreferences} onDone={onDone} archiveSections={archiveSections} onResetArchive={onResetArchive} profileImage={mode === 'standard'} />;
  const shared = { ...props, themeToggle, renderSettings, onChangeMode: changeMode };
  if (mode === 'advanced') return <AdvancedRoot {...shared} />;
  if (mode === 'standard') return <StandardRoot {...shared} />;
  return <ChoiceRoot {...shared} />;
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return <IconButton style={styles.touch} accessibilityLabel={t('Impostazioni')}
    icon={({ size, color }) => <SvgIcon shape={iconShapes.settings} size={size} color={color} />} onPress={onPress} />;
}

// First visit: no archive is opened and nothing is contacted until a mode is chosen.
function ChoiceRoot({ themeToggle, renderSettings, onChangeMode }: ModeProps) {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useBackLayer(settingsOpen, backLevels.page, () => setSettingsOpen(false));
  return (
    <AppShell actions={<>{themeToggle}<SettingsButton onPress={() => setSettingsOpen(true)} /></>} brand={{ label: t("inizio"), onPress: leaveGuide }}>
      {settingsOpen ? renderSettings(() => setSettingsOpen(false)) : <ModeChoice onChoose={onChangeMode} />}
    </AppShell>
  );
}

// «Standard»: the archive in IndexedDB on this device. No account, no sign-in, no Firebase.
function StandardRoot(props: ModeProps) {
  const { t } = useI18n();
  const { themeToggle, renderSettings, onChangeMode } = props;
  const [opened, setOpened] = useState<{ store: LocalStore } | { error: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useBackLayer(settingsOpen, backLevels.page, () => setSettingsOpen(false));
  useEffect(() => {
    let cancelled = false;
    let store: LocalStore | undefined;
    openLocalDatabase().then((db) => {
      store = createLocalStore(db);
      if (cancelled) { store.close(); return; }
      setOpened({ store });
    }, (reason: unknown) => { if (!cancelled) setOpened({ error: reason instanceof Error ? reason.message : 'Archivio locale non disponibile in questo browser. Controlla che la navigazione privata o il blocco dei dati dei siti non siano attivi.' }); });
    return () => { cancelled = true; store?.close(); };
  }, []);
  if (opened && 'store' in opened) return <StandardWorkspace {...props} store={opened.store} />;
  if (!opened) return <View style={styles.fill} aria-hidden><div inert style={fillDiv}><StartupWorkspace topActions={themeToggle} /></div></View>;
  // The device cannot keep data (private browsing, storage blocked): say so; the other mode stays reachable.
  return (
    <AppShell actions={<>{themeToggle}<SettingsButton onPress={() => setSettingsOpen(true)} /></>}>
      {settingsOpen ? renderSettings(() => setSettingsOpen(false)) : (
        <Card title={t("Dati non disponibili su questo dispositivo")}>
          <Text variant="bodyMedium" accessibilityRole="alert">{t(opened.error)}</Text>
          <View style={styles.start}><Button mode="outlined" onPress={() => onChangeMode(null)}>{t("Scegli un’altra modalità")}</Button></View>
        </Card>
      )}
    </AppShell>
  );
}

function StandardWorkspace({ store, themeToggle, renderSettings, onChangeMode, preferences, onChangePreferences }: ModeProps & { store: LocalStore }) {
  const { t } = useI18n();
  // Asks the browser to keep the device archive (automatic, no setting); the state is shown in Settings.
  const protection = useStorageProtection(store);
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [notificationsRequest, setNotificationsRequest] = useState(0);
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const [templatesRequest, setTemplatesRequest] = useState(0);
  const [backupRequest, setBackupRequest] = useState(0);
  const [released, setReleased] = useState(false);
  const openBackup = () => setBackupRequest((n) => n + 1);
  const menu = <AccountMenu email={null} photoURL={null} avatar={<StandardAvatar />} busy={false} onOpenSettings={() => setSettingsRequest((n) => n + 1)}
    onOpenNotifications={() => setNotificationsRequest((n) => n + 1)} onOpenCategories={() => setCategoriesRequest((n) => n + 1)} onOpenTemplates={() => setTemplatesRequest((n) => n + 1)} onOpenBackup={openBackup} />;
  return (
    <>
      <View style={styles.fill}>
        <DataWorkspace backend={store} scope="local" storageNote={t('Spese e categorie salvate su questo dispositivo.')}
          onReleased={() => setReleased(true)} categoriesRequest={categoriesRequest} templatesRequest={templatesRequest} backupRequest={backupRequest} settingsRequest={settingsRequest}
          notificationsRequest={notificationsRequest} localArchive={store}
          renderSettings={renderSettings}
          storage={<StandardStorage protection={protection} onChangeMode={onChangeMode} style={styles.wide} />}
          dashboardPreferences={preferences} onChangeDashboardPreferences={onChangePreferences}
          topActions={<>{themeToggle}{menu}</>} />
      </View>
      <StartupCover visible={!released} topActions={themeToggle} />
    </>
  );
}

// «Avanzata»: the user's own Firebase project (BYOF), Google sign-in, Firestore. Unchanged flow.
function AdvancedRoot({ themeToggle, renderSettings, onChangeMode, preferences, onChangePreferences }: ModeProps) {
  const { t } = useI18n();
  const theme = useTheme();
  // Signed out, Settings replaces the sign-in screen until «Fatto».
  const [settingsOpen, setSettingsOpen] = useState(false);
  // «Collega il tuo Firebase» replaces the sign-in screen (or the private-Nummo screen) until «Annulla».
  const [connectOpen, setConnectOpen] = useState(false);
  // Back closes them as «Fatto» and «Annulla» do (Settings first when both are open: it was opened last).
  useBackLayer(settingsOpen, backLevels.page, () => setSettingsOpen(false));
  useBackLayer(connectOpen, backLevels.page, () => setConnectOpen(false));
  // Account menu pages (Settings, Notifications, Categories, import/export): each request (a counter) opens its page in the workspace.
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [notificationsRequest, setNotificationsRequest] = useState(0);
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const [templatesRequest, setTemplatesRequest] = useState(0);
  const [backupRequest, setBackupRequest] = useState(0);
  const session = useSession(!configMissing);
  // «Esci» goes back to the first screen (Standard / Avanzata), not to the sign-in screen (user's request, 21 November).
  const signOut = () => { if (session.status === 'signed-in') session.signOut(() => onChangeMode(null)); };
  // App lock, signed in: «Non riesco a sbloccare» signs out (the data need Google again) and turns the lock off afterwards.
  useLockRecovery(session.status === 'signed-in' ? () => session.signOut(() => { disableAppLock(); onChangeMode(null); }) : null);
  const storageNote = t(demo || firestoreEmulator
    ? 'Spese e categorie negli emulatori locali Firestore.'
    : 'Spese e categorie nel tuo progetto Firebase personale.') + ' ' + t(persistentCache
      ? 'Cache offline SDK abilitata dove supportata: usa un dispositivo fidato.'
      : 'Cache in memoria: le scritture offline non sopravvivono alla chiusura.');
  const openBackup = () => setBackupRequest((n) => n + 1);
  // The storage section of the backup page: the connected project and the offline cache.
  const storage = (): StorageSlot => ({ backend, enabled, shown }) => <>
    <AdvancedStorage style={styles.wide} onChangeMode={onChangeMode}
      project={configMissing ? '' : activeFirebaseConfig.projectId} cache={persistentCache ? 'Locale' : 'Non attiva'}
      connected={customFirebaseConfig !== null} onDisconnect={() => switchFirebase(null, true)} />
    <ModeTransfer style={styles.wide} backend={backend} enabled={enabled} shown={shown} onChangeMode={onChangeMode} />
  </>;
  const account = session.status === 'signed-in'
    ? <AccountMenu key={`${session.user.uid}:${session.user.photoURL ?? ''}`} email={session.user.email} photoURL={session.user.photoURL} busy={session.busy} onSignOut={signOut} onOpenSettings={() => setSettingsRequest((n) => n + 1)}
      onOpenNotifications={() => setNotificationsRequest((n) => n + 1)} onOpenCategories={() => setCategoriesRequest((n) => n + 1)} onOpenTemplates={() => setTemplatesRequest((n) => n + 1)}
      onOpenBackup={openBackup} /> : null;

  // Startup: while Auth restores the session and the first data load, the workspace shell shows loading status.
  // No duplicate form with fake empty data. Only when the previous visit
  // ended signed in; it grants nothing, the real screen still needs the session.
  const [hint] = useState(() => readSessionHint());
  const [releasedUid, setReleasedUid] = useState<string | null>(null);
  useEffect(() => {
    if (session.status === 'signed-in') { writeSessionHint(backendMode === 'cloud' ? 'cloud' : 'local'); setSettingsOpen(false); }
    else if (session.status === 'signed-out') writeSessionHint(null);
  }, [session.status]);
  const signedIn = session.status === 'signed-in';
  // A Google account that is not the owner gets a clear screen instead of a workspace full of «access denied».
  // Checked alongside the workspace (the owner's startup does not wait for it); only a refusal changes the screen.
  const uid = signedIn ? session.user.uid : null;
  const [access, setAccess] = useState<{ uid: string; value: OwnerAccess; attempt: number } | null>(null);
  // «Controlla di nuovo» (connected project, owner not set yet) repeats the check.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (uid === null) return;
    let live = true;
    void checkOwnerAccess(getDatabase(), uid).then((value) => { if (live) setAccess({ uid, value, attempt }); });
    return () => { live = false; };
  }, [uid, attempt]);
  const denied = signedIn && access?.uid === session.user.uid && access.value === 'denied';
  const checking = denied && access.attempt !== attempt;
  const showStartup = (session.status === 'loading' && hint !== null) || (signedIn && !denied && releasedUid !== session.user.uid);

  // One fixed list of slots: the placeholder keeps its place from «loading» to «signed in».
  return (
    <>
      {signedIn && session.error && !denied ? (
        <View style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
          <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{t(session.error)}</Text>
        </View>
      ) : null}
      {denied ? (
        <AppShell actions={themeToggle} brand={{ label: t("accesso"), onPress: leaveGuide }}>
          {connectOpen && customFirebaseTarget
            ? <FirebaseConnect target={customFirebaseTarget} connected={customFirebaseConfig} site={siteFirebase} signedIn
              onCancel={() => setConnectOpen(false)} />
            // A project connected from this browser: the owner is still to be set (or the Rules to be published).
            : customFirebaseConfig
              ? <OwnerSetup project={customFirebaseConfig.projectId} uid={session.user.uid} email={session.user.email} busy={session.busy}
                error={session.error} checking={checking} onCheck={() => setAttempt((n) => n + 1)}
                onChangeProject={() => setConnectOpen(true)} onSignOut={signOut} />
              : <AccessDenied email={session.user.email} busy={session.busy} error={session.error}
                onSignOut={signOut} onUseStandard={() => { session.signOut(); onChangeMode('standard'); }}
                onConnect={customFirebaseTarget ? () => setConnectOpen(true) : undefined} />}
        </AppShell>
      ) : null}
      {signedIn && !denied ? (
        <View style={styles.fill} pointerEvents={session.busy ? 'none' : 'auto'}>
          <RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote}
            onReleased={() => setReleasedUid(session.user.uid)} categoriesRequest={categoriesRequest} templatesRequest={templatesRequest} backupRequest={backupRequest}
            settingsRequest={settingsRequest} notificationsRequest={notificationsRequest} renderSettings={renderSettings}
            storage={storage()}
            dashboardPreferences={preferences} onChangeDashboardPreferences={onChangePreferences}
            topActions={<>{themeToggle}{account}</>} />
        </View>
      ) : null}
      <StartupCover visible={showStartup} topActions={themeToggle} />
      {!signedIn && !showStartup ? (
        <AppShell actions={<>{themeToggle}<SettingsButton onPress={() => setSettingsOpen(true)} /></>} brand={{ label: t("accesso"), onPress: leaveGuide }}>
          {configMissing && !settingsOpen && !connectOpen && (
            <Card title={t("Configurazione Firebase mancante")}>
              <Text variant="bodyMedium">
                {t("Mancano: ")}{firebaseConfigProblems.join(', ')}{t(". Copia `.env.example` in `.env.local`, compila i valori e riavvia Expo.")}</Text>
              <View style={styles.start}><Button mode="outlined" onPress={() => onChangeMode(null)}>{t("Scegli un’altra modalità")}</Button></View>
              {customFirebaseTarget && <View style={styles.start}><Button mode="text" onPress={() => setConnectOpen(true)}>{t("Collega il tuo Firebase")}</Button></View>}
            </Card>
          )}
          {settingsOpen && renderSettings(() => setSettingsOpen(false))}
          {!settingsOpen && connectOpen && customFirebaseTarget && <FirebaseConnect target={customFirebaseTarget} connected={customFirebaseConfig}
            site={siteFirebase} signedIn={false} onCancel={() => setConnectOpen(false)} />}
          {!settingsOpen && !connectOpen && session.status === 'loading' && <View style={styles.center}><ActivityIndicator accessibilityLabel={t("Caricamento della sessione")} /></View>}
          {!settingsOpen && !connectOpen && session.status === 'signed-out' && <SignIn error={session.error} onSignIn={session.signIn} onChangeMode={() => onChangeMode(null)}
            firebase={customFirebaseTarget ? { connected: customFirebaseConfig?.projectId ?? null, onOpen: () => setConnectOpen(true) } : undefined} />}
        </AppShell>
      ) : null}
    </>
  );
}

// Covers the real screen until it is ready; decorative (hidden from assistive technology, not focusable). It appears at
// once and leaves with a short fade, so the form does not pop in (issue #5); with reduced motion it leaves at once.
function StartupCover({ visible, topActions }: { visible: boolean; topActions: ReactNode }) {
  const { mounted } = usePresence(visible, motion.short, useOverlayMotion());
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.startup, fadeTransition, { opacity: visible ? 1 : 0 }]} pointerEvents={visible ? 'auto' : 'none'} aria-hidden>
      <div inert style={fillDiv}><StartupWorkspace topActions={topActions} /></div>
    </View>
  );
}

const fillDiv = { display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0, minWidth: 0 } as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  startup: { flexDirection: 'column' },
  touch: { margin: 0, width: 48, height: 48 },
  center: { alignItems: 'center', padding: spacing.xxl },
  alert: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  start: { alignSelf: 'flex-start' },
  wide: { width: '100%' },
});
