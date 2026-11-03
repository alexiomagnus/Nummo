import { ScrollView, StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { ChoiceChips } from '../../components/ChoiceChips';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { accentLabels, accents, buildScheme, type ColorMode } from '../../theme/palette';
import { layout, radius, spacing } from '../../theme/tokens';
import type { FontChoice, Preferences, ThemeChoice } from './preferences';

type Props = {
  visible: boolean;
  preferences: Preferences;
  dark: boolean;
  onChange: (change: Partial<Preferences>) => void;
  onReset: () => void;
  onDismiss: () => void;
};

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Sistema' }, { value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' },
];
const modeOptions: { value: ColorMode; label: string }[] = [
  { value: 'mono', label: 'Monocolore' }, { value: 'palette', label: 'Palette' },
];
const fontOptions: { value: FontChoice; label: string }[] = [
  { value: 'google', label: 'Google Sans' }, { value: 'system', label: 'Sistema' },
];

// Display settings, opened from the account menu. Every change applies at once and is kept in
// this browser; nothing here touches expense data.
export function SettingsDialog({ visible, preferences, dark, onChange, onReset, onDismiss }: Props) {
  const { colors } = useTheme();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ width: '92%', maxWidth: layout.maxForm, alignSelf: 'center', maxHeight: '90%', borderRadius: radius.dialog }}>
        <Dialog.Title>Impostazioni</Dialog.Title>
        <Dialog.ScrollArea style={styles.area}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Section title="Tema">
              <ChoiceChips label="Tema" options={themeOptions} value={preferences.theme} onChange={(value) => value && onChange({ theme: value })} />
            </Section>
            <Section title="Colori">
              <ChoiceChips label="Modalità colore" options={modeOptions} value={preferences.colorMode} onChange={(value) => value && onChange({ colorMode: value })} />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {preferences.colorMode === 'mono'
                  ? 'Un solo colore in tutta l’app.' : 'Colore principale con due colori complementari per stati selezionati e icone.'}
              </Text>
              <View style={styles.swatches} role="radiogroup" aria-label="Colore principale">
                {accents.map((accent) => {
                  const scheme = buildScheme(accent, preferences.colorMode, dark);
                  const selected = accent === preferences.accent;
                  return (
                    <StateLayerPressable key={accent} layerColor={colors.onSurface} radius={radius.control} accessibilityRole="radio"
                      aria-checked={selected} accessibilityLabel={`${accentLabels[accent]}${selected ? ', selezionato' : ''}`}
                      onPress={() => onChange({ accent })}
                      style={[styles.swatch, { borderColor: selected ? colors.primary : colors.outlineVariant, borderWidth: selected ? 2 : 1 }]}>
                      <View style={styles.dots}>
                        {[scheme.primary, ...(preferences.colorMode === 'palette' && accent !== 'graphite' ? [scheme.secondary, scheme.tertiary] : [])].map((color, index) => (
                          <View key={index} style={[styles.dot, { backgroundColor: color, marginLeft: index ? -6 : 0 }]} />
                        ))}
                      </View>
                      <Text variant="labelMedium" style={{ color: colors.onSurface }}>{accentLabels[accent]}</Text>
                    </StateLayerPressable>
                  );
                })}
              </View>
            </Section>
            <Section title="Carattere">
              <ChoiceChips label="Carattere" options={fontOptions} value={preferences.font} onChange={(value) => value && onChange({ font: value })} />
            </Section>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Le preferenze restano in questo browser.</Text>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onReset}>Ripristina</Button>
          <Button mode="contained" onPress={onDismiss}>Chiudi</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.xl },
  section: { gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minHeight: layout.minTouch, minWidth: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.control },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(128,128,128,0.4)' },
});
