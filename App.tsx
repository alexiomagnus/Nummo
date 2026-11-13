import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { ActivityIndicator, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountMenu } from './src/components/AccountMenu';
import { AppShell } from './src/components/AppShell';
import { Button } from './src/components/Button';
import { Card } from './src/components/Card';
import { IconStyleProvider } from './src/components/CategoryGlyph';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SvgIcon, iconShapes } from './src/components/SvgIcon';
import type { Preferences } from './src/features/settings/preferences';
import { SettingsPage } from './src/features/settings/SettingsPage';
import { usePreferences } from './src/features/settings/usePreferences';
import { SignIn, leaveGuide } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { readSessionHint, writeSessionHint } from './src/services/sessionHint';
import { DataWorkspace, RemoteWorkspace, StartupWorkspace } from './src/features/workspace/Workspace';
import { ModeChoice } from './src/features/storage/ModeChoice';
import { AdvancedStorage, StandardStorage } from './src/features/storage/StorageSection';
import { useDriveBackup } from './src/features/storage/useDriveBackup';
import { openLocalDatabase } from './src/services/localDatabase';
import { createLocalStore, type LocalStore } from './src/services/localStore';
import { initialStorageMode, readStorageMode, writeStorageMode, type StorageMode } from './src/services/storageMode';
import { backendMode, firebaseWebConfig, firestoreEmulator, missingFirebaseConfig, persistentCache } from './src/services/backendConfig';
import { warmUpServices } from './src/services/firebase';
import { GlobalStyle } from './src/theme/GlobalStyle';
import { initialSafeAreaMetrics } from './src/theme/initialMetrics';
import { createTheme } from './src/theme/theme';
import { spacing } from './src/theme/tokens';
import { useReducedMotion } from './src/theme/useSizeClass';
import { I18nProvider, useI18n } from './src/i18n/I18nProvider';

const demo = backendMode === 'emulator';
const configMissing = missingFirebaseConfig.length > 0;
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
        <SafeAreaProvider initialMetrics={safeArea}>
          <PaperProvider theme={theme}>
            <GlobalStyle mode={preferences.theme} accent={accent} colorMode={colorMode} />
            <Root dark={dark} onToggleTheme={() => updatePreferences({ theme: dark ? 'light' : 'dark' })}
              preferences={preferences} onChangePreferences={updatePreferences} onResetPreferences={resetPreferences} />
          </PaperProvider>
        </SafeAreaProvider>
      </IconStyleProvider>
    </I18nProvider>
  );
}

type RootProps = {
  dark: boolean; onToggleTheme: () => void; preferences: Preferences;
  onChangePreferences: (change: Partial<Preferences>) => void; onResetPreferences: () => void;
};
// What the three screens below share: the theme button, the settings page (with its storage section) and the mode switch.
type ModeProps = RootProps & {
  themeToggle: ReactNode;
  renderSettings: (onDone: () => void, storage?: ReactNode) => ReactNode;
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
  const renderSettings = (onDone: () => void, storage?: ReactNode) => <SettingsPage preferences={preferences} dark={dark} onChange={onChangePreferences}
    onReset={onResetPreferences} onDone={onDone} storage={storage} />;
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
  useEffect(() => {
    let cancelled = false;
    let store: LocalStore | undefined;
    openLocalDatabase().then((db) => {
      store = createLocalStore(db);
      if (cancelled) { store.close(); return; }
      setOpened({ store });
      // Asks the browser not to evict this site's data when space runs low (granted or refused without a prompt on
      // most browsers). It lowers the risk; it is not a backup.
      void navigator.storage?.persist?.().catch(() => false);
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
  const drive = useDriveBackup(store);
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const [backupRequest, setBackupRequest] = useState(0);
  const [released, setReleased] = useState(false);
  const openBackup = () => setBackupRequest((n) => n + 1);
  const menu = <AccountMenu email={null} photoURL={null} busy={false} onOpenSettings={() => setSettingsRequest((n) => n + 1)}
    onOpenCategories={() => setCategoriesRequest((n) => n + 1)} onOpenBackup={openBackup} />;
  return (
    <>
      <View style={styles.fill}>
        <DataWorkspace backend={store} scope="local" storageNote={t('Spese e categorie salvate su questo dispositivo.')}
          onReleased={() => setReleased(true)} categoriesRequest={categoriesRequest} backupRequest={backupRequest} settingsRequest={settingsRequest}
          renderSettings={(onDone) => renderSettings(onDone, <StandardStorage drive={drive} onOpenFiles={openBackup} onChangeMode={onChangeMode} style={styles.wide} />)}
          dashboardPreferences={preferences} onChangeDashboardPreferences={onChangePreferences}
          topActions={<>{themeToggle}{menu}</>}
          notice={drive.autoWaiting ? (
            <Card>
              <Text variant="bodyMedium" accessibilityRole="alert">{t("Backup automatico in attesa: autorizza di nuovo Google Drive per salvarlo.")}</Text>
              <View style={styles.start}><Button mode="contained-tonal" disabled={drive.busy !== null} loading={drive.busy === 'backup'} onPress={() => void drive.backupNow()}>{t("Esegui backup")}</Button></View>
            </Card>
          ) : undefined} />
      </View>
      {!released ? (
        <View style={[StyleSheet.absoluteFill, styles.startup]} aria-hidden>
          <div inert style={fillDiv}><StartupWorkspace topActions={themeToggle} /></div>
        </View>
      ) : null}
    </>
  );
}

// «Avanzata»: the user's own Firebase project (BYOF), Google sign-in, Firestore. Unchanged flow.
function AdvancedRoot({ themeToggle, renderSettings, onChangeMode, preferences, onChangePreferences }: ModeProps) {
  const { t } = useI18n();
  const theme = useTheme();
  // Signed out, Settings replaces the sign-in screen until «Fatto».
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Account menu pages (Settings, Categories, import/export): each request (a counter) opens its page in the workspace.
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const [backupRequest, setBackupRequest] = useState(0);
  const session = useSession(!configMissing);
  const storageNote = t(demo || firestoreEmulator
    ? 'Spese e categorie negli emulatori locali Firestore.'
    : 'Spese e categorie nel tuo progetto Firebase personale.') + ' ' + t(persistentCache
      ? 'Cache offline SDK abilitata dove supportata: usa un dispositivo fidato.'
      : 'Cache in memoria: le scritture offline non sopravvivono alla chiusura.');
  const openBackup = () => setBackupRequest((n) => n + 1);
  // The storage section of Settings: the connected project, and the account once signed in.
  const storage = (email?: string | null, onOpenFiles?: () => void) => <AdvancedStorage style={styles.wide} onChangeMode={onChangeMode} onOpenFiles={onOpenFiles}
    project={configMissing ? '' : firebaseWebConfig.projectId} email={email} cache={persistentCache ? 'Salvata sul dispositivo' : 'Solo in memoria'} />;
  const account = session.status === 'signed-in'
    ? <AccountMenu key={`${session.user.uid}:${session.user.photoURL ?? ''}`} email={session.user.email} photoURL={session.user.photoURL} busy={session.busy} onSignOut={session.signOut} onOpenSettings={() => setSettingsRequest((n) => n + 1)}
      onOpenCategories={() => setCategoriesRequest((n) => n + 1)}
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
  const showStartup = (session.status === 'loading' && hint !== null) || (signedIn && releasedUid !== session.user.uid);

  // One fixed list of slots: the placeholder keeps its place from «loading» to «signed in».
  return (
    <>
      {signedIn && session.error ? (
        <View style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
          <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{t(session.error)}</Text>
        </View>
      ) : null}
      {signedIn ? (
        <View style={styles.fill} pointerEvents={session.busy ? 'none' : 'auto'}>
          <RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote}
            onReleased={() => setReleasedUid(session.user.uid)} categoriesRequest={categoriesRequest} backupRequest={backupRequest}
            settingsRequest={settingsRequest} renderSettings={(onDone) => renderSettings(onDone, storage(session.user.email, openBackup))}
            dashboardPreferences={preferences} onChangeDashboardPreferences={onChangePreferences}
            topActions={<>{themeToggle}{account}</>} />
        </View>
      ) : null}
      {showStartup ? (
        // Covers the real screen until it is ready; decorative (hidden from assistive technology, not focusable).
        <View style={[StyleSheet.absoluteFill, styles.startup]} aria-hidden>
          <div inert style={fillDiv}><StartupWorkspace topActions={themeToggle} /></div>
        </View>
      ) : null}
      {!signedIn && !showStartup ? (
        <AppShell actions={<>{themeToggle}<SettingsButton onPress={() => setSettingsOpen(true)} /></>} brand={{ label: t("accesso"), onPress: leaveGuide }}>
          {configMissing && !settingsOpen && (
            <Card title={t("Configurazione Firebase mancante")}>
              <Text variant="bodyMedium">
                {t("Mancano: ")}{missingFirebaseConfig.join(', ')}{t(". Copia `.env.example` in `.env.local`, compila i valori e riavvia Expo.")}</Text>
              <View style={styles.start}><Button mode="outlined" onPress={() => onChangeMode(null)}>{t("Scegli un’altra modalità")}</Button></View>
            </Card>
          )}
          {settingsOpen && renderSettings(() => setSettingsOpen(false), storage())}
          {!settingsOpen && session.status === 'loading' && <View style={styles.center}><ActivityIndicator accessibilityLabel={t("Caricamento della sessione")} /></View>}
          {!settingsOpen && session.status === 'signed-out' && <SignIn error={session.error} onSignIn={session.signIn} onChangeMode={() => onChangeMode(null)} />}
        </AppShell>
      ) : null}
    </>
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
