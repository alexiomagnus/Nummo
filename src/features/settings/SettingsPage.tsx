import { useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DoneButton } from '../../components/DoneButton';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { iconStyles, iconStyleText } from '../../components/categoryIconSets';
import type { CategoryIcon } from '../../domain/category';
import { ChoiceChips } from '../../components/ChoiceChips';
import { SwitchRow } from '../../components/SwitchRow';
import { PageHeader } from '../../components/PageHeader';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { accentLabels, accentSwatches, accents, type ColorMode } from '../../theme/palette';
import { layout, radius, spacing } from '../../theme/tokens';
import type { FontChoice, Preferences, ThemeChoice } from './preferences';
import type { TimeFormat } from '../../domain/timeFormat';
import { deviceTimeZone } from '../../domain/pushSchedule';
import { autoTimeZone, timeZoneChoices } from '../../domain/timeZones';
import { MenuSelect } from '../../components/MenuSelect';
import { ReceiptAiCard } from '../receipts/ReceiptAiCard';
import { resetReceiptAi } from '../receipts/aiSettings';
import { hasHaptics } from '../../theme/haptics';
import { useSizeClass } from '../../theme/useSizeClass';
import { SameWidthGroup, doubleWidth, useSameWidth } from '../../components/SameWidth';
import { ProfileImageCard, localProfileScope, type ProfileScope } from './ProfileImageCard';
import { AppLockCard } from '../lock/AppLock';
import { resetAppLockDelay } from '../lock/appLockStore';
import { defaultProfileRing, noProfileImage } from './profileImage';
import { saveProfileImage, saveProfileRing } from './useProfileImage';

// Read once: only in the Android app (23 November, on request), where the vibration is Android's touch feedback.
const vibrationAvailable = hasHaptics();
const vibrationNote = "Una breve vibrazione quando interagisci con l'app. Segue le impostazioni di vibrazione di Android.";

type Props = {
  preferences: Preferences;
  dark: boolean;
  onChange: (change: Partial<Preferences>) => void;
  onReset: () => void;
  onDone: () => void;
  // Sections that need the open archive (preferred categories), given by the workspace; absent when signed out.
  archiveSections?: ReactNode;
  // Back to the defaults of what `archiveSections` shows (preferred categories and fund of the open archive).
  onResetArchive?: () => void;
  // The picture of the account button, first on the page: Standard (`local`), or Advanced signed in (the UID, with the
  // Google photo as the picture when nothing is chosen). Absent: no card (signed out, mode choice).
  profile?: ProfileScope;
  // Standard mode: the app lock asks for a PIN to turn it off from the lock screen.
  lockPin?: boolean;
};

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Sistema' }, { value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' },
];
const modeOptions: { value: ColorMode; label: string }[] = [
  // «Palette» first: it is the default (22 November).
  { value: 'palette', label: 'Palette' }, { value: 'mono', label: 'Monocolore' },
];
const fontOptions: { value: FontChoice; label: string }[] = [
  { value: 'google', label: 'Google Sans' }, { value: 'system', label: 'Sistema' },
];
const timeFormatOptions: { value: TimeFormat; label: string }[] = [
  { value: '24h', label: '24 ore' }, { value: '12h', label: '12 ore (AM/PM)' },
];
// Sample of four categories, drawn in each style whatever the chosen one is.
const iconPreview: CategoryIcon[] = ['cart', 'popcorn', 'shirt', 'train'];

// Display settings page, opened from the account menu (or the sign-in screen), outside the main destinations.
// Every change applies at once and is kept in this browser; nothing here touches expense data.
// Sections stack on phones (Lingua, Carattere, Formato dell'ora, Fuso orario, then Tema and Colore); when the page is wide enough, Lingua,
// Carattere, Formato dell'ora and Fuso orario form the left column and Tema and Colore the right one, and the wider sections follow at full width.
export function SettingsPage({ preferences, dark, onChange, onReset, onDone, archiveSections, onResetArchive, profile, lockPin = false }: Props) {
  // «Ripristina predefiniti» brings back the defaults of everything on this page (user's request, 21 November): the
  // preferences, the receipt scan (off, no service), the profile picture of the Standard mode and, with an archive open,
  // its preferred categories and fund.
  // The app lock is the exception: only its delay goes back to the default, since turning it off asks for the fingerprint.
  const resetAll = () => { onReset(); resetReceiptAi(); resetAppLockDelay(); if (profile) { saveProfileImage(noProfileImage, profile.scope); if (profile.scope !== localProfileScope) saveProfileRing(defaultProfileRing, profile.scope); } onResetArchive?.(); };
  const { t } = useI18n();
  const { colors } = useTheme();
  const [contentWidth, setContentWidth] = useState(0);
  const phone = useSizeClass() === 'compact';
  // Measure the actual page: the desktop navigation and browser zoom reduce its usable width.
  // 360 dp per column: the colour swatches wrap onto a second row rather than squeeze, every chip row still fits.
  const wide = contentWidth >= 2 * 360 + spacing.xxl;
  const device = deviceTimeZone();
  const zones = timeZoneChoices([device, preferences.timeZone]);
  const general = (
    <View key="general" style={[styles.column, wide && styles.half]}>
      <Card title={t("Lingua")} style={styles.section}>
        <ChoiceChips label={t("Lingua")} options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]}
          value={preferences.language} onChange={(language) => language && onChange({ language })} />
      </Card>
      <Card title={t("Carattere")} style={styles.section}>
        <ChoiceChips label={t("Carattere")} options={fontOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.font} onChange={(value) => value && onChange({ font: value })} />
      </Card>
      <Card title={t("Formato dell’ora")} style={styles.section}>
        <ChoiceChips label={t("Formato dell’ora")} options={timeFormatOptions.map((entry) => ({ ...entry, label: t(entry.label) }))}
          value={preferences.timeFormat} onChange={(value) => value && onChange({ timeFormat: value })} />
      </Card>
      <Card title={t("Fuso orario")} style={styles.section}>
        <ChoiceChips label={t("Fuso orario")} value={preferences.timeZone === autoTimeZone ? 'auto' : 'custom'}
          options={[{ value: 'auto', label: t("Automatico") }, { value: 'custom', label: t("Scegli un fuso") }]}
          onChange={(value) => { if (value === 'auto') onChange({ timeZone: autoTimeZone }); else if (value) onChange({ timeZone: device }); }} />
        {preferences.timeZone === autoTimeZone
          ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Fuso orario: {p0}", { p0: device.replace(/_/g, ' ') })}</Text>
          : <MenuSelect label={t("Fuso")} icon={iconShapes.calendar} value={preferences.timeZone} options={zones}
              onChange={(timeZone) => onChange({ timeZone })} />}
      </Card>
    </View>
  );
  const look = (
    <View key="look" style={[styles.column, wide && styles.half]}>
      <Card title={t("Tema")} style={styles.section}>
        <ChoiceChips label={t("Tema")} options={themeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.theme} onChange={(value) => value && onChange({ theme: value })} />
      </Card>
      <Card title={t("Colore")} style={styles.section}>
        <ChoiceChips label={t("Modalità colore")} options={modeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.colorMode} onChange={(value) => value && onChange({ colorMode: value })} />
        <View style={styles.swatches} role="radiogroup" aria-label={t("Colore principale")}>
          {accents.map((accent) => {
            const selected = accent === preferences.accent;
            // Shown colours of the accent (accentSwatches): in light the dots were the text-safe roles, far too dark.
            const dots = accentSwatches(accent, preferences.colorMode, dark);
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
    </View>
  );
  return (
    // From medium «Ripristina predefiniti» and the AI card's actions share one width (user's request, 22 November).
    <SameWidthGroup>
    <View style={styles.root} onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}>
      <PageHeader title={t("Impostazioni")} action={<DoneButton onPress={onDone} />} />
      {profile && <ProfileImageCard scope={profile.scope} googlePhoto={profile.googlePhoto} />}
      <View style={[styles.grid, wide && styles.columns]}>
        {/* Lingua, Carattere and Tema first (left column on desktop), then Colore. */}
        {general}
        {look}
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
          <SwitchRow label={t("Mostra liste archiviate")} supporting={t("Nella pagina Liste, le liste già registrate come spesa.")}
            value={preferences.showArchivedLists} onChange={(showArchivedLists) => onChange({ showArchivedLists })} />
          <SwitchRow label={t("Mostra fondi archiviati")} supporting={t("Nella pagina Fondi, i fondi che non usi più.")}
            value={preferences.showArchivedFunds} onChange={(showArchivedFunds) => onChange({ showArchivedFunds })} />
          {/* Only in the Android app: never in the browser (23 November, on request). */}
          {vibrationAvailable && <SwitchRow label={t("Vibrazione")} supporting={t(vibrationNote)}
            value={preferences.haptics} onChange={(haptics) => onChange({ haptics })} />}
        </Card>
        <AppLockCard requirePin={lockPin} />
        {archiveSections}
        <ReceiptAiCard />
      </View>
      {/* Outlined pill after every section: secondary to the options, still clearly a button. Paper draws the 1 dp
          `outline` border, hover/press state layers and the ripple; the global focus ring follows the radius. */}
      <ResetAllButton phone={phone} onPress={resetAll} />
    </View>
    </SameWidthGroup>
  );
}

// Inside the page's `SameWidthGroup`: from medium as wide as the AI card's two actions together (user's request, 22 November);
// it does not measure itself. Without those actions on screen, its own width.
function ResetAllButton({ phone, onPress }: { phone: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const sameWidth = useSameWidth();
  return (
    <Button mode="outlined" textColor={colors.secondary} style={[styles.reset, phone && styles.resetPhone, doubleWidth(sameWidth, spacing.sm)]} onPress={onPress}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.rotateCcw} size={size} color={color} />}>
      {t("Ripristina predefiniti")}
    </Button>
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
  // Phones: as wide as the page, like the actions above it (user's request, 22 November).
  resetPhone: { alignSelf: 'stretch' },
  styleCards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  styleCard: { flexGrow: 1, flexBasis: 150, minWidth: 0, gap: spacing.xs, padding: spacing.md, borderWidth: 2, borderRadius: radius.card },
  preview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: spacing.sm, minHeight: 32, marginBottom: spacing.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minHeight: layout.minTouch, minWidth: layout.minTouch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderWidth: 2, borderRadius: radius.control },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.4)' },
});
