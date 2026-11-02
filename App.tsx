import { useMemo, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { ActivityIndicator, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountMenu } from './src/components/AccountMenu';
import { AppShell } from './src/components/AppShell';
import { Card } from './src/components/Card';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SignIn } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { RemoteWorkspace } from './src/features/workspace/Workspace';
import { backendMode, firestoreEmulator, missingFirebaseConfig, persistentCache } from './src/services/backendConfig';
import { GlobalStyle } from './src/theme/GlobalStyle';
import { createTheme } from './src/theme/theme';
import { spacing } from './src/theme/tokens';
import { useReducedMotion } from './src/theme/useSizeClass';

const demo = backendMode === 'emulator';
const configMissing = missingFirebaseConfig.length > 0;
const storageNote = (demo || firestoreEmulator
  ? 'Spese e categorie negli emulatori locali Firestore.'
  : 'Spese e categorie nel tuo progetto Firebase personale.') + (persistentCache
    ? ' Cache offline SDK abilitata dove supportata: usa un dispositivo fidato.'
    : ' Cache in memoria: le scritture offline non sopravvivono alla chiusura.');

export default function App() {
  const systemScheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [override, setOverride] = useState<boolean | null>(null);
  const dark = override ?? systemScheme === 'dark';
  const theme = useMemo(() => createTheme(dark, reduceMotion), [dark, reduceMotion]);
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <GlobalStyle />
        <Root dark={dark} onToggleTheme={() => setOverride(!dark)} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function Root({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const theme = useTheme();
  const session = useSession(!configMissing);
  const themeToggle = (
    <IconButton size={24} style={styles.touch} icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
      onPress={onToggleTheme} accessibilityLabel={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'} />
  );
  const account = session.status === 'signed-in'
    ? <AccountMenu email={session.user.email} busy={session.busy} onSignOut={session.signOut} /> : null;

  if (session.status === 'signed-in') {
    return (
      <>
        {session.error && (
          <View style={[styles.alert, { backgroundColor: theme.colors.errorContainer }]}>
            <Text accessibilityRole="alert" style={{ color: theme.colors.onErrorContainer }}>{session.error}</Text>
          </View>
        )}
        <View style={styles.fill} pointerEvents={session.busy ? 'none' : 'auto'}>
          <RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote}
            topActions={<>{themeToggle}{account}</>} />
        </View>
      </>
    );
  }
  return (
    <AppShell actions={themeToggle}>
      {configMissing && (
        <Card title="Configurazione Firebase mancante" variant="outlined">
          <Text variant="bodyMedium">
            Mancano: {missingFirebaseConfig.join(', ')}. Copia `.env.example` in `.env.local`,
            compila i valori e riavvia Expo.
          </Text>
        </Card>
      )}
      {session.status === 'loading' && <View style={styles.center}><ActivityIndicator accessibilityLabel="Caricamento della sessione" /></View>}
      {session.status === 'signed-out' && <SignIn error={session.error} demo={demo} onSignIn={session.signIn} />}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  touch: { margin: 0, width: 48, height: 48 },
  center: { alignItems: 'center', padding: spacing.xxl },
  alert: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
