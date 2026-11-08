import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { ActivityIndicator, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountMenu } from './src/components/AccountMenu';
import { AppShell } from './src/components/AppShell';
import { Card } from './src/components/Card';
import { IconStyleProvider } from './src/components/CategoryGlyph';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SvgIcon, iconShapes } from './src/components/SvgIcon';
import type { Preferences } from './src/features/settings/preferences';
import { SettingsDialog } from './src/features/settings/SettingsDialog';
import { usePreferences } from './src/features/settings/usePreferences';
import { SignIn, leaveGuide } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { readSessionHint, writeSessionHint } from './src/services/sessionHint';
import { RemoteWorkspace, StartupWorkspace } from './src/features/workspace/Workspace';
import { backendMode, firestoreEmulator, missingFirebaseConfig, persistentCache } from './src/services/backendConfig';
import { warmUpServices } from './src/services/firebase';
import { GlobalStyle } from './src/theme/GlobalStyle';
import { initialSafeAreaMetrics } from './src/theme/initialMetrics';
import { createTheme } from './src/theme/theme';
import { spacing } from './src/theme/tokens';
import { useReducedMotion } from './src/theme/useSizeClass';
import { I18nProvider, useI18n } from './src/i18n/I18nProvider';

const demo = backendMode === 'emulator';
const configMissing = missingFirebaseConfig.length > 0;
if (!configMissing) warmUpServices();

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

function Root({ dark, onToggleTheme, preferences, onChangePreferences, onResetPreferences }: RootProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Categories open from the account menu (below Settings): each request (a counter) opens their page in the workspace.
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const session = useSession(!configMissing);
  const storageNote = t(demo || firestoreEmulator
    ? 'Spese e categorie negli emulatori locali Firestore.'
    : 'Spese e categorie nel tuo progetto Firebase personale.') + ' ' + t(persistentCache
      ? 'Cache offline SDK abilitata dove supportata: usa un dispositivo fidato.'
      : 'Cache in memoria: le scritture offline non sopravvivono alla chiusura.');
  const settings = <SettingsDialog visible={settingsOpen} preferences={preferences} dark={dark} onChange={onChangePreferences}
    onReset={onResetPreferences} onDismiss={() => setSettingsOpen(false)} />;
  const themeToggle = (
    <IconButton size={24} style={styles.touch} icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
      onPress={onToggleTheme} accessibilityLabel={dark ? t("Attiva tema chiaro") : t("Attiva tema scuro")} />
  );
  const account = session.status === 'signed-in'
    ? <AccountMenu key={`${session.user.uid}:${session.user.photoURL ?? ''}`} email={session.user.email} photoURL={session.user.photoURL} busy={session.busy} onSignOut={session.signOut} onOpenSettings={() => setSettingsOpen(true)}
      onOpenCategories={() => setCategoriesRequest((n) => n + 1)} /> : null;

  // Startup: while Auth restores the session (it waits for a network round trip) and the first data load, a placeholder
  // identical to the final screen is shown instead of the sign-in shell with a spinner. Only when the previous visit
  // ended signed in; it grants nothing, the real screen still needs the session.
  const [hint] = useState(() => readSessionHint());
  const [releasedUid, setReleasedUid] = useState<string | null>(null);
  useEffect(() => {
    if (session.status === 'signed-in') writeSessionHint(backendMode === 'cloud' ? 'cloud' : 'local');
    else if (session.status === 'signed-out') writeSessionHint(null);
  }, [session.status]);
  const signedIn = session.status === 'signed-in';
  const showStartup = (session.status === 'loading' && hint !== null) || (signedIn && releasedUid !== session.user.uid);

  // One fixed list of slots: the placeholder keeps its place (and its measured fields) from «loading» to «signed in».
  return (
    <>
      {signedIn && session.error ? (
        <View style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
          <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{t(session.error)}</Text>
        </View>
      ) : null}
      {settings}
      {signedIn ? (
        <View style={styles.fill} pointerEvents={session.busy ? 'none' : 'auto'}>
          <RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote}
            onReleased={() => setReleasedUid(session.user.uid)} categoriesRequest={categoriesRequest}
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
        <AppShell actions={<>{themeToggle}<IconButton style={styles.touch} accessibilityLabel={t('Impostazioni')}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.settings} size={size} color={color} />}
          onPress={() => setSettingsOpen(true)} /></>} brand={{ label: t("accesso"), onPress: leaveGuide }}>
          {configMissing && (
            <Card title={t("Configurazione Firebase mancante")}>
              <Text variant="bodyMedium">
                {t("Mancano: ")}{missingFirebaseConfig.join(', ')}{t(". Copia `.env.example` in `.env.local`, compila i valori e riavvia Expo.")}</Text>
            </Card>
          )}
          {session.status === 'loading' && <View style={styles.center}><ActivityIndicator accessibilityLabel={t("Caricamento della sessione")} /></View>}
          {session.status === 'signed-out' && <SignIn error={session.error} onSignIn={session.signIn} />}
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
});
