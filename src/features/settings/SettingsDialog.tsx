import { useI18n } from '../../i18n/I18nProvider';
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

// Display settings, opened from the account menu or the sign-in screen. Every change applies at once and is kept in
// this browser; nothing here touches expense data.
export function SettingsDialog({ visible, preferences, dark, onChange, onReset, onDismiss }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ width: '92%', maxWidth: layout.maxForm, alignSelf: 'center', maxHeight: '90%', borderRadius: radius.dialog }}>
        <Dialog.Title style={styles.title}>{t("Impostazioni")}</Dialog.Title>
        <Dialog.ScrollArea style={styles.area}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Section title={t("Lingua")}>
              <ChoiceChips label={t("Lingua")} options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]}
                value={preferences.language} onChange={(language) => language && onChange({ language })} />
            </Section>
            <Section title={t("Tema")}>
              <ChoiceChips label={t("Tema")} options={themeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.theme} onChange={(value) => value && onChange({ theme: value })} />
            </Section>
            <Section title={t("Colore")}>
              <ChoiceChips label={t("Modalità colore")} options={modeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.colorMode} onChange={(value) => value && onChange({ colorMode: value })} />
              <View style={styles.swatches} role="radiogroup" aria-label={t("Colore principale")}>
                {accents.map((accent) => {
                  const scheme = buildScheme(accent, preferences.colorMode, dark);
                  const selected = accent === preferences.accent;
                  const dots = [scheme.primary, ...(preferences.colorMode === 'palette' && accent !== 'graphite' ? [scheme.secondary, scheme.tertiary] : [])];
                  return (
                    <StateLayerPressable key={accent} layerColor={colors.onSurface} radius={radius.control} accessibilityRole="radio"
                      aria-checked={selected} accessibilityLabel={`${t(accentLabels[accent])}${selected ? t(", selezionato") : ''}`}
                      // `title` is the web tooltip: the swatch carries no visible text.
                      {...({ title: t(accentLabels[accent]) } as object)}
                      onPress={() => onChange({ accent })}
                      style={[styles.swatch, { borderColor: selected ? colors.primary : 'transparent' }]}>
                      <View style={styles.dots}>
                        {dots.map((color, index) => (
                          <View key={index} style={[styles.dot, { backgroundColor: color, marginLeft: index ? -8 : 0 }]} />
                        ))}
                      </View>
                    </StateLayerPressable>
                  );
                })}
              </View>
            </Section>
            <Section title={t("Carattere")}>
              <ChoiceChips label={t("Carattere")} options={fontOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.font} onChange={(value) => value && onChange({ font: value })} />
            </Section>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onReset} contentStyle={styles.action} labelStyle={styles.actionLabel}>{t("Ripristina")}</Button>
          <Button mode="contained" onPress={onDismiss} contentStyle={styles.action} labelStyle={styles.actionLabel}>{t("Fatto")}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="labelLarge" accessibilityRole="header" style={{ color: colors.onSurfaceVariant }}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700' },
  action: { minHeight: 52, paddingHorizontal: spacing.md },
  actionLabel: { fontSize: 15, lineHeight: 22 },
  // Paper's scroll area draws a line above and below: none, spacing separates the parts.
  area: { paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm, gap: spacing.xl },
  section: { gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minHeight: layout.minTouch, minWidth: layout.minTouch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderWidth: 2, borderRadius: radius.control },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.4)' },
});
