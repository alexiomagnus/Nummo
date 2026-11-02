import { StyleSheet } from 'react-native';
import { Button, HelperText, Surface, Text, useTheme } from 'react-native-paper';

type Props = { error: string | null; demo: boolean; onSignIn: () => void };

export function SignIn({ error, demo, onSignIn }: Props) {
  const theme = useTheme();
  return (
    <Surface elevation={1} style={styles.card}>
      <Text variant="titleLarge" accessibilityRole="header">Accedi</Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        Le spese vengono salvate nel tuo registro Google Sheets. Accedi con l’account Google autorizzato.
      </Text>
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <Button mode="contained" onPress={onSignIn} contentStyle={styles.button}>Accedi con Google</Button>
      {demo && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Ambiente di prova locale: account simulati, nessun dato reale.
        </Text>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 28, gap: 16 },
  button: { minHeight: 48 },
});
