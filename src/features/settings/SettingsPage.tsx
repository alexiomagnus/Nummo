import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { iconStyles, iconStyleText } from '../../components/categoryIconSets';
import type { CategoryIcon } from '../../domain/category';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SwitchRow } from '../../components/SwitchRow';
import { PageHeader } from '../../components/PageHeader';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { accentLabels, accents, buildScheme, type ColorMode } from '../../theme/palette';
import { layout, radius, spacing } from '../../theme/tokens';
import type { FontChoice, Preferences, ThemeChoice } from './preferences';

type Props = {
  preferences: Preferences;
  dark: boolean;
  onChange: (change: Partial<Preferences>) => void;
  onReset: () => void;
  onDone: () => void;
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
// Sample of four categories, drawn in each style whatever the chosen one is.
const iconPreview: CategoryIcon[] = ['cart', 'popcorn', 'shirt', 'train'];

// Display settings page, opened from the account menu (or the sign-in screen), outside the main destinations.
// Every change applies at once and is kept in this browser; nothing here touches expense data.
// Sections stack on phones; when the page is wide enough, Colore and Carattere move to a right-hand column beside
// Lingua and Tema (two stacks of similar height), and the wider sections follow at full width.
export function SettingsPage({ preferences, dark, onChange, onReset, onDone }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [contentWidth, setContentWidth] = useState(0);
  // Measure the actual page: the desktop navigation and browser zoom reduce its usable width.
  // 360 dp per column: the colour swatches wrap onto a second row rather than squeeze, every chip row still fits.
  const wide = contentWidth >= 2 * 360 + spacing.xxl;
  const general = (
    <View key="general" style={[styles.column, wide && styles.half]}>
      <Card title={t("Lingua")} style={styles.section}>
        <ChoiceChips label={t("Lingua")} options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]}
          value={preferences.language} onChange={(language) => language && onChange({ language })} />
      </Card>
      <Card title={t("Tema")} style={styles.section}>
        <ChoiceChips label={t("Tema")} options={themeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.theme} onChange={(value) => value && onChange({ theme: value })} />
      </Card>
    </View>
  );
  const look = (
    <View key="look" style={[styles.column, wide && styles.half]}>
      <Card title={t("Colore")} style={styles.section}>
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
      </Card>
      <Card title={t("Carattere")} style={styles.section}>
        <ChoiceChips label={t("Carattere")} options={fontOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.font} onChange={(value) => value && onChange({ font: value })} />
      </Card>
    </View>
  );
  return (
    <View style={styles.root} onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}>
      <PageHeader title={t("Impostazioni")} action={
        <Button mode="text" icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />}
          onPress={onDone}>{t("Fatto")}</Button>} />
      <View style={[styles.grid, wide && styles.columns]}>
        {/* Desktop: Colore and Carattere on the left, Lingua and Tema on the right; phones keep the reading order. */}
        {wide ? [look, general] : [general, look]}
      </View>
      <View style={styles.grid}>
        <Card title={t("Stile delle icone")} style={styles.section}>
          <View style={styles.styleCards} role="radiogroup" aria-label={t("Stile delle icone")}>
            {iconStyles.map((style) => {
              const selected = style === preferences.iconStyle;
              return (
                <StateLayerPressable key={style} layerColor={colors.onSurface} radius={radius.card} accessibilityRole="radio"
                  aria-checked={selected} accessibilityLabel={`${t(iconStyleText[style].label)}${selected ? t(", selezionato") : ''}`}
                  onPress={() => onChange({ iconStyle: style })}
                  style={[styles.styleCard, { borderColor: selected ? colors.primary : colors.outlineVariant, backgroundColor: selected ? colors.primaryContainer : 'transparent' }]}>
                  <View style={styles.preview} aria-hidden>
                    {iconPreview.map((icon) => <CategoryGlyph key={icon} icon={icon} size={24} style={style} />)}
                  </View>
                  <Text variant="labelLarge" style={{ color: selected ? colors.onPrimaryContainer : colors.onSurface }}>{t(iconStyleText[style].label)}</Text>
                </StateLayerPressable>
              );
            })}
          </View>
        </Card>
        <Card title={t("Funzionalità")} style={styles.section}>
          <SwitchRow label={t("Mostra andamento nel tempo")} supporting={t("Nella pagina Analisi, il grafico delle spese giorno per giorno.")} value={preferences.dashboardTrend}
            onChange={(dashboardTrend) => onChange({ dashboardTrend })} />
          <SwitchRow label={t("Mostra budget mensile")} supporting={t("Mostra il budget generale e i controlli del budget dei fondi. I budget nascosti restano salvati.")}
            value={preferences.showGeneralBudget} onChange={(showGeneralBudget) => onChange({ showGeneralBudget })} />
        </Card>
      </View>
      {/* Outlined pill after every section: secondary to the options, still clearly a button. Paper draws the 1 dp
          `outline` border, hover/press state layers and the ripple; the global focus ring follows the radius. */}
      <Button mode="outlined" textColor={colors.secondary} style={styles.reset} onPress={onReset}
        icon={({ size, color }) => <SvgIcon shape={iconShapes.rotateCcw} size={size} color={color} />}>
        {t("Ripristina predefiniti")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  grid: { gap: layout.sectionGap },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  column: { gap: layout.sectionGap },
  half: { flex: 1, minWidth: 0 },
  section: { width: '100%' },
  reset: { alignSelf: 'flex-start', borderRadius: radius.pill },
  styleCards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  styleCard: { flexGrow: 1, flexBasis: 150, minWidth: 0, gap: spacing.xs, padding: spacing.md, borderWidth: 2, borderRadius: radius.card },
  preview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: spacing.sm, minHeight: 32, marginBottom: spacing.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minHeight: layout.minTouch, minWidth: layout.minTouch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderWidth: 2, borderRadius: radius.control },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.4)' },
});
