import { useMemo, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { ActivityIndicator, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountMenu } from './src/components/AccountMenu';
import { AppShell } from './src/components/AppShell';
import { Card } from './src/components/Card';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SvgIcon, iconShapes } from './src/components/SvgIcon';
import type { Preferences } from './src/features/settings/preferences';
import { SettingsDialog } from './src/features/settings/SettingsDialog';
import { usePreferences } from './src/features/settings/usePreferences';
import { SignIn, leaveGuide } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { RemoteWorkspace } from './src/features/workspace/Workspace';
import { backendMode, firestoreEmulator, missingFirebaseConfig, persistentCache } from './src/services/backendConfig';
import { GlobalStyle } from './src/theme/GlobalStyle';
import { createTheme } from './src/theme/theme';
import { spacing } from './src/theme/tokens';
import { useReducedMotion } from './src/theme/useSizeClass';
import { I18nProvider, useI18n } from './src/i18n/I18nProvider';

const demo = backendMode === 'emulator';
const configMissing = missingFirebaseConfig.length > 0;

export default function App() {
  const systemScheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [preferences, updatePreferences, resetPreferences] = usePreferences();
  const dark = preferences.theme === 'system' ? systemScheme === 'dark' : preferences.theme === 'dark';
  const { accent, colorMode, font } = preferences;
  const theme = useMemo(() => createTheme(dark, reduceMotion, { accent, colorMode, font }), [dark, reduceMotion, accent, colorMode, font]);
  return (
    <I18nProvider language={preferences.language}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <GlobalStyle />
          <Root dark={dark} onToggleTheme={() => updatePreferences({ theme: dark ? 'light' : 'dark' })}
            preferences={preferences} onChangePreferences={updatePreferences} onResetPreferences={resetPreferences} />
        </PaperProvider>
      </SafeAreaProvider>
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
    ? <AccountMenu key={`${session.user.uid}:${session.user.photoURL ?? ''}`} email={session.user.email} photoURL={session.user.photoURL} busy={session.busy} onSignOut={session.signOut} onOpenSettings={() => setSettingsOpen(true)} /> : null;

  if (session.status === 'signed-in') {
    return (
      <>
        {session.error && (
          <View style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
            <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{t(session.error)}</Text>
          </View>
        )}
        {settings}
        <View style={styles.fill} pointerEvents={session.busy ? 'none' : 'auto'}>
          <RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote}
            topActions={<>{themeToggle}{account}</>} />
        </View>
      </>
    );
  }
  return (
    <>
    {settings}
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
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  touch: { margin: 0, width: 48, height: 48 },
  center: { alignItems: 'center', padding: spacing.xxl },
  alert: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
