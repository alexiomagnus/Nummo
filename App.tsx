import { useState } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme } from 'react-native';
import { ActivityIndicator, Button, IconButton, MD3DarkTheme, MD3LightTheme, PaperProvider, Surface, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeIcon } from './src/components/ThemeIcon';
import { SignIn } from './src/features/session/SignIn';
import { useSession } from './src/features/session/useSession';
import { RemoteWorkspace } from './src/features/workspace/Workspace';
import { backendMode, firestoreEmulator, missingFirebaseConfig, persistentCache } from './src/services/backendConfig';

const demo = backendMode === 'emulator';
const configMissing = missingFirebaseConfig.length > 0;
const storageNote = (demo || firestoreEmulator
  ? 'Spese e categorie negli emulatori locali Firestore.'
  : 'Spese e categorie nel tuo progetto Firebase personale.') + (persistentCache
    ? ' Cache offline SDK abilitata dove supportata: usa un dispositivo fidato.'
    : 'Cache in memoria: le scritture offline non sopravvivono alla chiusura.');

export default function App() {
  const session = useSession(!configMissing);
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const dark = override ?? systemScheme === 'dark';
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const theme = {
    ...base,
    roundness: 5,
    colors: {
      ...base.colors,
      primary: dark ? '#A9D5BB' : '#32634B',
      onPrimary: dark ? '#103826' : '#FFFFFF',
      primaryContainer: dark ? '#294E3B' : '#C6ECD3',
      onPrimaryContainer: dark ? '#C6ECD3' : '#103826',
      background: dark ? '#121713' : '#F7F9F2',
      surface: dark ? '#1A211C' : '#FFFFFF',
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.brand} accessibilityRole="header" accessibilityLabel="Nummo">
                <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.logoLetter, { color: theme.colors.onPrimary }]}>N</Text>
                </View>
                <Text variant="displaySmall" style={[styles.brandName, { color: theme.colors.primary }]}>Nummo</Text>
              </View>
              <IconButton icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
                onPress={() => setOverride(!dark)} accessibilityLabel={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'} />
            </View>
            <View style={styles.intro}>
              <Text variant="headlineSmall" style={styles.title}>Una spesa, pochi gesti.</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Importo, nome e ci sei.</Text>
            </View>
            {session.status === 'signed-in' && (
              <View style={styles.account}>
                <Text variant="bodyMedium" numberOfLines={1} style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
                  {session.user.email ?? 'Account Google'}
                </Text>
                <Button mode="text" disabled={session.busy} loading={session.busy} onPress={session.signOut}>Esci</Button>
              </View>
            )}
            {configMissing && (
              <Surface elevation={1} style={styles.notice}>
                <Text variant="titleMedium" accessibilityRole="header">Configurazione Firebase mancante</Text>
                <Text variant="bodyMedium">
                  Mancano: {missingFirebaseConfig.join(', ')}. Copia `.env.example` in `.env.local`,
                  compila i valori e riavvia Expo.
                </Text>
              </Surface>
            )}
            {session.status === 'signed-in' && session.error && <Text accessibilityRole="alert">{session.error}</Text>}
            {session.status === 'loading' && <ActivityIndicator accessibilityLabel="Caricamento della sessione" />}
            {session.status === 'signed-out' && <SignIn error={session.error} demo={demo} onSignIn={session.signIn} />}
            {session.status === 'signed-in' && <View pointerEvents={session.busy ? 'none' : 'auto'}><RemoteWorkspace key={session.user.uid} uid={session.user.uid} storageNote={storageNote} /></View>}
            <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>Il tuo registro, una spesa alla volta.</Text>
          </View>
        </ScrollView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20 },
  container: { width: '100%', maxWidth: 580, alignSelf: 'center', gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  intro: { gap: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 30, lineHeight: 34, fontWeight: '900' },
  brandName: { fontWeight: '800', letterSpacing: -1 },
  title: { fontWeight: '600' },
  footer: { textAlign: 'center', paddingBottom: 16 },
  notice: { padding: 20, borderRadius: 28, gap: 8 },
  account: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: -12 },
  email: { flexShrink: 1 },
});
