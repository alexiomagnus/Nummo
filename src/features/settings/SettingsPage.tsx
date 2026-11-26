import { type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { ListGroup, OptionRow, RowDivider, ToggleRow } from '../../components/ActionList';
import { DoneButton } from '../../components/DoneButton';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { iconStyles, iconStyleText } from '../../components/categoryIconSets';
import type { CategoryIcon } from '../../domain/category';
import { ChoiceChips } from '../../components/ChoiceChips';
import { PageHeader } from '../../components/PageHeader';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { accentLabels, accentSwatches, accents, hasSystemColors, type ColorMode } from '../../theme/palette';
import { layout, radius, spacing } from '../../theme/tokens';
import type { FontChoice, Preferences, ThemeChoice } from './preferences';
import type { TimeFormat } from '../../domain/timeFormat';
import { deviceTimeZone } from '../../domain/pushSchedule';
import { autoTimeZone, timeZoneChoices } from '../../domain/timeZones';
import { MenuSelect } from '../../components/MenuSelect';
import { backgroundLabels, backgrounds, type Background } from '../../theme/background';
import { hasHaptics } from '../../theme/haptics';
import { useSizeClass } from '../../theme/useSizeClass';
import { ProfileImageCard, localProfileScope, type ProfileScope } from './ProfileImageCard';
import { AppLockCard } from '../lock/AppLock';
import { resetAppLockDelay } from '../lock/appLockStore';
import { noProfileImage } from './profileImage';
import { saveProfileImage } from './useProfileImage';

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

const themeOptions: { value: ThemeChoice; label: string; shape: string }[] = [
  { value: 'system', label: 'Sistema', shape: iconShapes.smartphone }, { value: 'light', label: 'Chiaro', shape: iconShapes.sun },
  { value: 'dark', label: 'Scuro', shape: iconShapes.moon },
];
// «Material You» only where the phone gives its palettes (Android app 0.3.11+), first and the default there (27 November).
// A function, not a constant: the palettes are read in App.tsx after the imports have run, so a module-level check was always false
// (the option never showed in the app 0.3.11–0.3.13).
const colorModeOptions = (): { value: ColorMode; label: string; shape: string }[] => [
  ...(hasSystemColors() ? [{ value: 'system' as const, label: 'Material You', shape: iconShapes.sparkles }] : []),
  { value: 'palette', label: 'Palette', shape: iconShapes.palette }, { value: 'mono', label: 'Monocolore', shape: iconShapes.contrast },
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
const backgroundIcons: Record<Background, string> = { circles: iconShapes.circle, rings: iconShapes.rings, space: iconShapes.sparkles,
  snow: iconShapes.snow, particles: iconShapes.particles, none: iconShapes.eyeOff };

export function SettingsPage({ preferences, dark, onChange, onReset, onDone, archiveSections, onResetArchive, profile, lockPin = false }: Props) {
  // «Ripristina predefiniti» brings back the defaults of everything on this page (user's request, 21 November): the
  // preferences, the profile picture and, with an archive open, its preferred categories and fund. The receipt scan moved to
  // «Lista scontrini» (26 November, on request) and is no longer reset from here.
  // The app lock is the exception: only its delay goes back to the default, since turning it off asks for the fingerprint.
  const resetAll = () => { onReset(); resetAppLockDelay(); if (profile) saveProfileImage(noProfileImage, profile.scope); onResetArchive?.(); };
  const { t } = useI18n();
  const { colors } = useTheme();
  const sizeClass = useSizeClass();
  const phone = sizeClass === 'compact';
  const desktop = sizeClass === 'expanded';
  const device = deviceTimeZone();
  const zones = timeZoneChoices([device, preferences.timeZone]);
  return (
    <View style={styles.root}>
      <PageHeader title={t("Impostazioni")} action={<DoneButton onPress={onDone} />} />
      {/* The grouped rows of «Lista scontrini» and «Info» (user's request, 27 November), one column at every size: each setting is a
          row with a tonal tile and its choices under it. */}
      {profile && <ProfileImageCard scope={profile.scope} googlePhoto={profile.googlePhoto} />}
      <ListGroup icon={iconShapes.globe} label={t("Lingua e ora")}>
        <OptionRow icon={iconShapes.globe} title={t("Lingua")}>
          <ChoiceChips label={t("Lingua")} options={[{ value: 'it', label: 'Italiano' }, { value: 'en', label: 'English' }]}
            value={preferences.language} onChange={(language) => language && onChange({ language })} />
        </OptionRow>
        <RowDivider />
        <OptionRow icon={iconShapes.clock} title={t("Formato dell’ora")}>
          <ChoiceChips label={t("Formato dell’ora")} options={timeFormatOptions.map((entry) => ({ ...entry, label: t(entry.label) }))}
            value={preferences.timeFormat} onChange={(value) => value && onChange({ timeFormat: value })} />
        </OptionRow>
        <RowDivider />
        <OptionRow icon={iconShapes.calendar} title={t("Fuso orario")}>
          <ChoiceChips label={t("Fuso orario")} value={preferences.timeZone === autoTimeZone ? 'auto' : 'custom'}
            options={[{ value: 'auto', label: t("Automatico") }, { value: 'custom', label: t("Scegli un fuso") }]}
            onChange={(value) => { if (value === 'auto') onChange({ timeZone: autoTimeZone }); else if (value) onChange({ timeZone: device }); }} />
          {preferences.timeZone === autoTimeZone
            ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Fuso orario: {p0}", { p0: device.replace(/_/g, ' ') })}</Text>
            : <MenuSelect panel whole label={t("Fuso")} icon={iconShapes.calendar} value={preferences.timeZone} options={zones}
                onChange={(timeZone) => onChange({ timeZone })} />}
        </OptionRow>
      </ListGroup>
      <ListGroup icon={iconShapes.palette} label={t("Aspetto")}>
        <OptionRow icon={iconShapes.moon} title={t("Tema")}>
          <ChoiceChips label={t("Tema")} options={themeOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.theme} onChange={(value) => value && onChange({ theme: value })} />
        </OptionRow>
        <RowDivider />
        <ToggleRow icon={iconShapes.moon} title={t("Modalità AMOLED")} subtitle={t("Nel tema scuro lo sfondo è nero puro: consuma meno sugli schermi OLED.")}
          value={preferences.amoled} onChange={(amoled) => onChange({ amoled })} />
        <RowDivider />
        <OptionRow icon={iconShapes.sparkles} title={t("Animazione dello sfondo")}>
          <MenuSelect panel whole label={t("Animazione")} icon={iconShapes.sparkles} value={preferences.background}
            options={backgrounds.map((value) => ({ value, label: t(backgroundLabels[value]),
              icon: <SvgIcon shape={backgroundIcons[value]} size={20} color={colors.onSurfaceVariant} /> }))}
            onChange={(background) => onChange({ background })} />
        </OptionRow>
        <RowDivider />
        <OptionRow icon={iconShapes.palette} title={t("Colore")}>
          <ChoiceChips label={t("Modalità colore")} options={colorModeOptions().map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.colorMode === 'system' && !hasSystemColors() ? 'palette' : preferences.colorMode} onChange={(value) => value && onChange({ colorMode: value })} />
          {!(preferences.colorMode === 'system' && hasSystemColors()) && <View style={styles.swatches} role="radiogroup" aria-label={t("Colore principale")}>
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
          </View>}
        </OptionRow>
        <RowDivider />
        <OptionRow icon={iconShapes.typeIcon} title={t("Carattere")}>
          <ChoiceChips label={t("Carattere")} options={fontOptions.map((entry) => ({ ...entry, label: t(entry.label) }))} value={preferences.font} onChange={(value) => value && onChange({ font: value })} />
        </OptionRow>
        <RowDivider />
        <OptionRow icon={iconShapes.blocks} title={t("Stile delle icone")}>
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
        </OptionRow>
      </ListGroup>
      <ListGroup icon={iconShapes.settings} label={t("Funzionalità")}>
        <ToggleRow icon={iconShapes.chart} title={t("Mostra andamento nel tempo")} subtitle={t("Nella pagina Analisi, il grafico delle spese giorno per giorno.")} value={preferences.dashboardTrend}
          onChange={(dashboardTrend) => onChange({ dashboardTrend })} />
        <RowDivider />
        <ToggleRow icon={iconShapes.archive} title={t("Mostra liste archiviate")} subtitle={t("Nella pagina Liste, le liste già registrate come spesa.")}
          value={preferences.showArchivedLists} onChange={(showArchivedLists) => onChange({ showArchivedLists })} />
        <RowDivider />
        <ToggleRow icon={iconShapes.wallet} title={t("Mostra fondi archiviati")} subtitle={t("Nella pagina Fondi, i fondi che non usi più.")}
          value={preferences.showArchivedFunds} onChange={(showArchivedFunds) => onChange({ showArchivedFunds })} />
        {/* Desktop only: the drawer's «Comprimi» row (27 November, on request). */}
        {desktop && <><RowDivider /><ToggleRow icon={iconShapes.chevronLeft} title={t("Pulsante per comprimere il menu")} subtitle={t("Da computer, in fondo al menu a sinistra. Spento, il menu resta sempre aperto.")}
          value={preferences.drawerToggle} onChange={(drawerToggle) => onChange({ drawerToggle })} /></>}
        {/* Only in the Android app: never in the browser (23 November, on request). */}
        {vibrationAvailable && <><RowDivider /><ToggleRow icon={iconShapes.flash} title={t("Vibrazione")} subtitle={t(vibrationNote)}
          value={preferences.haptics} onChange={(haptics) => onChange({ haptics })} /></>}
      </ListGroup>
      <AppLockCard requirePin={lockPin} />
      {archiveSections}
      {/* Outlined pill after every section: secondary to the options, still clearly a button. Paper draws the 1 dp
          `outline` border, hover/press state layers and the ripple; the global focus ring follows the radius. */}
      <ResetAllButton phone={phone} onPress={resetAll} />
    </View>
  );
}

// Its own width from medium (until 26 November it was as wide as the two actions of the AI card, now in «Lista scontrini»).
function ResetAllButton({ phone, onPress }: { phone: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Button mode="outlined" textColor={colors.secondary} style={[styles.reset, phone && styles.resetPhone]} onPress={onPress}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.rotateCcw} size={size} color={color} />}>
      {t("Ripristina predefiniti")}
    </Button>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  reset: { alignSelf: 'flex-start', borderRadius: radius.pill },
  // Phones: as wide as the page, like the actions above it (user's request, 22 November).
  resetPhone: { alignSelf: 'stretch' },
  styleCards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  styleCard: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs, padding: spacing.md, borderWidth: 2, borderRadius: radius.card },
  preview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: spacing.sm, minHeight: 32, marginBottom: spacing.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minHeight: layout.minTouch, minWidth: layout.minTouch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderWidth: 2, borderRadius: radius.control },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.4)' },
});
