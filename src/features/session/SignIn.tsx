import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { spacing } from '../../theme/tokens';
import { Guide } from './Guide';

type Props = { error: string | null; demo: boolean; onSignIn: () => void };

// The guide lives at `#guida` (no router in the app): a direct link and a reload keep working, and the
// browser's Back button returns to the sign-in. Hosting needs no rewrite for a fragment.
const guideHash = '#guida';
const readGuide = () => typeof window !== 'undefined' && window.location.hash === guideHash;

export function SignIn({ error, demo, onSignIn }: Props) {
  const { colors } = useTheme();
  const [guide, setGuide] = useState(readGuide);
  useEffect(() => {
    const sync = () => setGuide(readGuide());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  const openGuide = () => { window.history.pushState({ guide: true }, '', guideHash); setGuide(true); };
  // Opened from this screen: go back in history. Opened by a direct link: just clear the fragment.
  const closeGuide = () => {
    if ((window.history.state as { guide?: boolean } | null)?.guide) window.history.back();
    else { window.history.replaceState(null, '', window.location.pathname + window.location.search); setGuide(false); }
  };
  if (guide) return <Guide onBack={closeGuide} />;
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text variant="displaySmall" accessibilityRole="header" aria-level={1}>Una spesa, pochi gesti.</Text>
        <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>Importo, nome e ci sei.</Text>
      </View>
      <Card>
        {error && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{error}</HelperText>}
        <Button mode="contained" onPress={onSignIn} contentStyle={styles.button}>Accedi con Google</Button>
        {demo && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Ambiente di prova locale: account simulati, nessun dato reale.
          </Text>
        )}
      </Card>
      <Button mode="text" compact onPress={openGuide} style={styles.guideLink}>Cos'è Nummo e come funziona?</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  intro: { gap: spacing.xs },
  helper: { paddingHorizontal: 0 },
  button: { minHeight: 48 },
  guideLink: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
});
