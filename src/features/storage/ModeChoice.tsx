import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { useI18n } from '../../i18n/I18nProvider';
import { androidGoogleSignIn, inAndroidApp } from '../../services/androidApp';
import { activeFirebaseConfig } from '../../services/backendConfig';
import type { StorageMode } from '../../services/storageMode';
import { radius, spacing } from '../../theme/tokens';
import { Guide } from '../session/Guide';
import { useGuide } from '../session/SignIn';

type Option = { mode: StorageMode; title: string; badge?: string; text: string; action: string };
const options: readonly Option[] = [
  { mode: 'standard', title: 'Standard', badge: 'Consigliata', action: 'Inizia subito',
    text: 'Utilizza Nummo immediatamente. I dati vengono salvati sul dispositivo e puoi conservarne una copia esportando un backup.' },
  { mode: 'advanced', title: 'Avanzata', badge: 'Firebase', action: 'Continua con Firebase',
    text: 'Collega un progetto Firebase tuo, accedi con Google e sincronizza i dati tra i tuoi dispositivi.' },
];

// An Android app without Google sign-in for this project (version 0.1.0): Advanced stays in the browser.
export const appWithoutAdvanced = (): boolean => inAndroidApp() && !androidGoogleSignIn(activeFirebaseConfig.projectId);
export const appOnlyStandard = "Questa versione dell'app Android offre solo la modalità Standard: aggiornala o usa Nummo nel browser.";

// First screen, before any sign-in: where the data will live. Standard opens the app at once, with no account;
// Advanced continues to the Firebase sign-in, where a project of the user's own can be connected. The choice is remembered
// and can be changed from «Archiviazione e backup».
// Android app: Advanced needs the app's native Google sign-in (version 0.2.0, 22 November; Google refuses its sign-in page
// inside a WebView). An older app offers Standard only, and the card says so instead of failing.
export function ModeChoice({ onChoose }: { onChoose: (mode: StorageMode) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { guide, openGuide, closeGuide } = useGuide();
  const androidApp = appWithoutAdvanced();
  if (guide) return <Guide onBack={closeGuide} />;
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="displaySmall" accessibilityRole="header" aria-level={1}>{t("Semplifica le tue spese.")}</Text>
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Scegli dove salvare i tuoi dati.")}</Text>
      </View>
      <View style={styles.options}>
        {options.map((option) => {
          const primary = option.mode === 'standard';
          return (
            <View key={option.mode} role="group" aria-label={t(option.title)}
              style={[styles.option, primary ? { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer } : { borderColor: colors.outlineVariant }]}>
              <View style={styles.heading}>
                <Text variant="titleLarge" accessibilityRole="header" aria-level={2} style={[styles.title, primary && { color: colors.onPrimaryContainer }]}>{t(option.title)}</Text>
                {option.badge && <View style={[styles.badge, { backgroundColor: primary ? colors.primary : colors.secondaryContainer }]}>
                  <Text variant="labelMedium" style={{ color: primary ? colors.onPrimary : colors.onSecondaryContainer }}>{t(option.badge)}</Text>
                </View>}
              </View>
              <Text variant="bodyLarge" style={[styles.text, { color: primary ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>{t(option.text)}</Text>
              {androidApp && !primary && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t(appOnlyStandard)}</Text>}
              <Button mode={primary ? 'contained' : 'outlined'} disabled={androidApp && !primary} onPress={() => onChoose(option.mode)} style={styles.action}>{t(option.action)}</Button>
            </View>
          );
        })}
      </View>
      <Button mode="text" compact onPress={openGuide} style={styles.guideLink}>{t("Cos'è Nummo e come funziona?")}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 880, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  intro: { gap: spacing.xs },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  option: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderRadius: radius.dialog },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  title: { fontWeight: '700' },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  text: { flexGrow: 1 },
  action: { alignSelf: 'flex-start' },
  guideLink: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
});
