import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { spacing } from '../../theme/tokens';
import { Guide } from './Guide';

// `onChangeMode`: back to the choice between the device archive and Firebase.
type Props = { error: string | null; onSignIn: () => void; onChangeMode?: () => void };

// The guide lives at `#guida` (no router in the app): a direct link and a reload keep working, and the
// browser's Back button returns to the sign-in. Hosting needs no rewrite for a fragment.
const guideHash = '#guida';
const readGuide = () => typeof window !== 'undefined' && window.location.hash === guideHash;

// Opened from the sign-in screen: go back in history. Opened by a direct link: just clear the fragment.
// Also used by the brand in the top bar, outside this component, hence the synthetic popstate.
export function leaveGuide() {
  if ((window.history.state as { guide?: boolean } | null)?.guide) window.history.back();
  else if (readGuide()) { window.history.replaceState(null, '', window.location.pathname + window.location.search); window.dispatchEvent(new PopStateEvent('popstate')); }
}

// The guide as a route of the signed-out screens (mode choice and sign-in).
export function useGuide() {
  const [guide, setGuide] = useState(readGuide);
  useEffect(() => {
    const sync = () => setGuide(readGuide());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  const openGuide = () => { window.history.pushState({ guide: true }, '', guideHash); setGuide(true); };
  return { guide, openGuide, closeGuide: leaveGuide };
}

export function SignIn({ error, onSignIn, onChangeMode }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  // No link to the guide here (it stays on the mode choice); a direct `#guida` link still opens it.
  const { guide, closeGuide } = useGuide();
  if (guide) return <Guide onBack={closeGuide} />;
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="displaySmall" accessibilityRole="header" aria-level={1}>{t("Semplifica le tue spese.")}</Text>
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Fallo in maniera pragmatica.")}</Text>
      </View>
      <Card>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(error)}</HelperText>}
        <Button mode="contained" onPress={onSignIn} contentStyle={styles.button}>{t("Accedi con Google")}</Button>
      </Card>
      <View style={styles.links}>
        {onChangeMode && <Button mode="text" compact onPress={onChangeMode} style={styles.guideLink}>{t("Usa Nummo senza account")}</Button>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  intro: { gap: spacing.xs },
  helper: { paddingHorizontal: 0 },
  button: { minHeight: 48 },
  links: { alignItems: 'flex-start' },
  guideLink: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
});
