import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';

type Props = { email: string | null; busy: boolean; error: string | null; onUseStandard: () => void; onSignOut: () => void };

// Advanced mode, signed in with a Google account that is not the owner of this Nummo: a clear way out instead of
// a workspace full of «access denied» errors.
export function AccessDenied({ email, busy, error, onUseStandard, onSignOut }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="displaySmall" accessibilityRole="header" aria-level={1}>{t("Questo Nummo è privato")}</Text>
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>
          {email
            ? t("L'account {p0} non può accedere: in modalità Avanzata entra solo il proprietario di questo Nummo.", { p0: email })
            : t("Questo account non può accedere: in modalità Avanzata entra solo il proprietario di questo Nummo.")}
        </Text>
      </View>
      <Card>
        <Text variant="bodyMedium">{t("Puoi usare Nummo in modalità Standard: i dati restano su questo dispositivo, senza account.")}</Text>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
        <View style={styles.actions}>
          <Button mode="contained" disabled={busy} onPress={onUseStandard} contentStyle={styles.button}>{t("Usa la modalità Standard")}</Button>
          <Button mode="outlined" disabled={busy} onPress={onSignOut} contentStyle={styles.button}>{t("Esci")}</Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  intro: { gap: spacing.xs },
  helper: { paddingHorizontal: 0 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  button: { minHeight: 48 },
});
