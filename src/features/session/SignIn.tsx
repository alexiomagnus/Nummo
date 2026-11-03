import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { spacing } from '../../theme/tokens';

type Props = { error: string | null; demo: boolean; onSignIn: () => void };

export function SignIn({ error, demo, onSignIn }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="displaySmall" accessibilityRole="header" aria-level={1}>Una spesa, pochi gesti.</Text>
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>Importo, nome e ci sei.</Text>
      </View>
      <Card title="Accedi" description="Spese e categorie vengono salvate nel tuo progetto Firebase personale. Accedi con l’account Google autorizzato.">
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{error}</HelperText>}
        <Button mode="contained" onPress={onSignIn} contentStyle={styles.button}>Accedi con Google</Button>
        {demo && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Ambiente di prova locale: account simulati, nessun dato reale.
          </Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  intro: { gap: spacing.xs },
  helper: { paddingHorizontal: 0 },
  button: { minHeight: 48 },
});
