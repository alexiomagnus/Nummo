import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ListGroup } from '../../components/ActionList';
import { useBackLayer } from '../../components/BackNavigation';
import { Logo } from '../../components/Logo';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { androidAppVersion } from '../../services/androidApp';
import { backLevels } from '../../theme/backStack';
import { useReducedMotion } from '../../theme/useSizeClass';
import { radius, spacing } from '../../theme/tokens';
import { Guide } from '../session/Guide';
import { ReleaseNotesDialog } from '../update/ReleaseNotesDialog';
import { UpdateDialog } from '../update/UpdateDialog';
import { useAppUpdate, type UpdateCheck } from '../update/useAppUpdate';
import type { AppRelease } from '../../domain/appUpdate';
import { Spinner } from '../../components/Spinner';

// The creator's profile and the repository of the app (user's request, 26 November).
export const creatorName = 'alexiomagnus';
export const creatorUrl = `https://github.com/${creatorName}`;
const repositoryUrl = `${creatorUrl}/Nummo`;
// «Contribuisci»: GitHub's page to open a pull request; «Segnala problema»: a new issue.
export const contributeUrl = `${repositoryUrl}/compare`;
export const reportIssueUrl = `${repositoryUrl}/issues/new`;
// The creator's GitHub picture, copied into the site (public/images, 192×192): no request to GitHub to show it.
const creatorPicture = '/images/creator.jpg';

// RN Web draws a View with `href` as <a>: a real link in a new tab (middle click, long press; in the Android app every link
// outside the site opens outside).
const linkProps = (href: string) => ({ href, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } }) as object;

// «Info» (account menu, last page; 26 November, on request, after the «Informazioni» page of another app): a hero with the
// version (only in the Android app, which knows it: the browser and the installed web app show the mark instead), the
// public guide «Cos'è Nummo» (in place of the page; Back returns), the creator with the GitHub picture, and links to
// contribute or report a problem. No data.
export function InfoPage({ onGuideChange }: { onGuideChange?: (open: boolean) => void } = {}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [guide, setGuide] = useState(false);
  const version = useMemo(() => androidAppVersion(), []);
  useBackLayer(guide, backLevels.detail, () => setGuide(false));
  // The page header drops «Fatto» while the guide is open (27 November, on request): «Torna indietro» is the only way back.
  useEffect(() => { onGuideChange?.(guide); return () => onGuideChange?.(false); }, [guide, onGuideChange]);
  if (guide) return <Guide onBack={() => setGuide(false)} fill />;
  return (
    <View style={styles.root}>
      <Hero version={version} />
      {version && <Updates />}
      <Group icon={iconShapes.info} label={t("Progetto")}>
        <Row icon={iconShapes.info} color={colors.primary} title={t("Cos'è Nummo?")}
          subtitle={t("Le funzioni principali, dove sono i tuoi dati e gli avvisi")} label={t("Apri la guida Cos'è Nummo")}
          onPress={() => setGuide(true)} />
      </Group>
      <Group icon={iconShapes.user} label={t("Creatore")}>
        <Creator />
      </Group>
      <Group icon={iconShapes.pullRequest} label={t("Sviluppo")}>
        <Row icon={iconShapes.pullRequest} color={colors.secondary} title={t("Contribuisci")}
          subtitle={t("Proponi una modifica con una pull request su GitHub")}
          label={t("Contribuisci con una pull request su GitHub, si apre in una nuova scheda")} href={contributeUrl} />
        <Row icon={iconShapes.bug} color={colors.tertiary} title={t("Segnala problema")}
          subtitle={t("Apri una segnalazione (issue) su GitHub")}
          label={t("Segnala un problema su GitHub, si apre in una nuova scheda")} href={reportIssueUrl} />
      </Group>
    </View>
  );
}

// «Aggiornamenti» (27 November, on request; only in the Android app, which has a version to compare): «Controlla
// aggiornamenti» asks GitHub at once (the automatic check waits 24 hours between two) and opens «Aggiornamento disponibile» or
// says the app is up to date; «Note di rilascio» shows the notes of the last releases.
function Updates() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { installed, check, releases, run, load } = useAppUpdate();
  const [offer, setOffer] = useState<AppRelease | null>(null);
  const [notes, setNotes] = useState(false);
  const [notesFailed, setNotesFailed] = useState(false);
  const checking = check.kind === 'checking';
  const verify = async () => {
    const result = await run();
    if (result.kind === 'available') setOffer(result.release);
  };
  const openNotes = async () => {
    setNotes(true);
    setNotesFailed(false);
    if (releases) return;
    const found = await load();
    if (typeof found === 'string') setNotesFailed(true);
  };
  return (
    <Group icon={iconShapes.download} label={t("Aggiornamenti")}>
      <Row icon={iconShapes.sync} color={colors.primary} title={t("Controlla aggiornamenti")}
        subtitle={checkText(t, check, installed)} label={t("Controlla se è disponibile una nuova versione dell'app")}
        busy={checking} onPress={() => { void verify(); }} />
      <Row icon={iconShapes.receipt} color={colors.secondary} title={t("Note di rilascio")}
        subtitle={t("Le novità delle ultime versioni dell'app")} label={t("Apri le note di rilascio")}
        onPress={() => { void openNotes(); }} />
      {installed && <UpdateDialog release={offer} installed={installed} onClose={() => setOffer(null)} />}
      <ReleaseNotesDialog visible={notes} releases={releases} failed={notesFailed} installed={installed}
        onRetry={() => { void openNotes(); }} onClose={() => setNotes(false)} />
    </Group>
  );
}

function checkText(t: ReturnType<typeof useI18n>['t'], check: UpdateCheck, installed: string | null): string {
  switch (check.kind) {
    case 'checking': return t("Controllo in corso…");
    case 'current': return t("Hai l'ultima versione ({p0})", { p0: installed ?? '' });
    case 'available': return t("Disponibile la versione {p0}", { p0: check.release.version });
    case 'failed': return check.reason === 'limited' ? t("GitHub ha limitato le richieste: riprova più tardi")
      : check.reason === 'offline' ? t("Controllo non riuscito: sei offline?") : t("Controllo non riuscito: riprova più tardi");
    default: return t("Cerca una nuova versione su GitHub");
  }
}

// The big card at the top: the version in large figures, its first number in the main colour (Android app), or the mark.
function Hero({ version }: { version: { name: string; code: number } | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const ink = colors.onPrimaryContainer;
  const [first, ...rest] = version ? version.name.split('.') : [];
  // Entry (26 November, on request): the figures (or the mark) rise and settle on a soft spring, then the name, the line and the
  // build fade in one after the other; the discs behind drift slowly all the time (`data-orb`, CSS in GlobalStyle, still with
  // reduced motion). Once, when the page opens; nothing with reduced motion.
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { enter.setValue(1); return undefined; }
    const run = Animated.timing(enter, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [enter, reduceMotion]);
  // A step of the entry from `from` to `to` (0–1 of the whole), as opacity and a rise.
  const step = (from: number, to: number, rise = 14) => ({
    opacity: enter.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: enter.interpolate({ inputRange: [from, to], outputRange: [rise, 0], extrapolate: 'clamp' }) }],
  });
  const figures = {
    opacity: enter.interpolate({ inputRange: [0, 0.35], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0.7, 1.06, 0.98, 1] }) },
      { translateY: enter.interpolate({ inputRange: [0, 0.5], outputRange: [24, 0], extrapolate: 'clamp' }) },
    ],
  };
  return (
    <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}
      {...({ role: 'region', 'aria-label': version ? t("Nummo, versione {p0}", { p0: version.name }) : 'Nummo' } as object)}>
      {/* Two soft discs behind the content, in the main colour (decoration only), slowly drifting. */}
      <View pointerEvents="none" {...({ dataSet: { orb: '1' } } as object)} style={[styles.disc, styles.discLarge, { backgroundColor: colors.primary }]} />
      <View pointerEvents="none" {...({ dataSet: { orb: '2' } } as object)} style={[styles.disc, styles.discSmall, { backgroundColor: colors.primary }]} />
      <Animated.View style={figures}>
        {version
          ? <Text style={[styles.version, { color: ink }]} aria-hidden numberOfLines={1} adjustsFontSizeToFit>
              <Text style={{ color: colors.primary }}>{first}</Text>{rest.length > 0 ? `.${rest.join('.')}` : ''}
            </Text>
          : <Logo size={88} color={ink} />}
      </Animated.View>
      <Animated.View style={step(0.3, 0.65)}>
        <Text variant="headlineSmall" style={[styles.name, { color: ink }]}>Nummo</Text>
      </Animated.View>
      <Animated.View style={step(0.45, 0.8)}>
        <Text variant="bodyLarge" style={[styles.center, { color: ink, opacity: 0.8 }]}>{t("Semplifica le tue spese.")}</Text>
      </Animated.View>
      {version && <Animated.View style={step(0.6, 0.95)}>
        <Text variant="bodyMedium" style={[styles.build, { color: ink, opacity: 0.8 }]}>
          {t("Versione {p0} · Build {p1}", { p0: version.name, p1: version.code })}</Text>
      </Animated.View>}
    </View>
  );
}

function Group({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return <ListGroup label={label} icon={icon}>{children}</ListGroup>;
}

type RowProps = { icon: string; color: string; title: string; subtitle: string; label: string; busy?: boolean } &
  ({ href: string; onPress?: undefined } | { onPress: () => void; href?: undefined });

function Row({ icon, color, title, subtitle, label, href, onPress, busy = false }: RowProps) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} accessibilityLabel={label} role={href ? 'link' : 'button'}
      disabled={busy} aria-busy={busy} onPress={onPress} {...(href ? linkProps(href) : null)} style={styles.row}>
      <View style={styles.icon}><SvgIcon shape={icon} size={24} color={color} /></View>
      <View style={styles.text}>
        <Text variant="titleMedium" numberOfLines={1}>{title}</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }} {...({ 'aria-live': 'polite' } as object)}>{subtitle}</Text>
      </View>
      {busy ? <Spinner size={20} label={title} />
        : <SvgIcon shape={href ? iconShapes.externalLink : iconShapes.chevronRight} size={20} color={colors.onSurfaceVariant} />}
    </StateLayerPressable>
  );
}

// The creator, a little more prominent than the other rows: the GitHub picture and the name, a link to the profile.
function Creator() {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} role="link" {...linkProps(creatorUrl)}
      accessibilityLabel={t("Profilo GitHub di {p0}, creatore di Nummo, si apre in una nuova scheda", { p0: creatorName })} style={styles.creator}>
      <View style={[styles.picture, { backgroundColor: colors.secondaryContainer, borderColor: colors.primary }]}>
        <img src={creatorPicture} alt="" aria-hidden draggable={false} width={64} height={64}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} />
      </View>
      <View style={styles.text}>
        <Text variant="titleLarge" numberOfLines={1} style={styles.strong}>{creatorName}</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Ha creato e sviluppa Nummo")}</Text>
        <View style={[styles.chip, { backgroundColor: colors.secondaryContainer }]}>
          <SvgIcon shape={iconShapes.user} size={16} color={colors.onSecondaryContainer} />
          <Text variant="labelLarge" style={{ color: colors.onSecondaryContainer }}>{t("Profilo GitHub")}</Text>
        </View>
      </View>
      <SvgIcon shape={iconShapes.externalLink} size={20} color={colors.onSurfaceVariant} />
    </StateLayerPressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  hero: { borderRadius: radius.group, overflow: 'hidden', alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  disc: { position: 'absolute', borderRadius: 9999, opacity: 0.12 },
  discLarge: { width: 320, height: 320, right: -120, bottom: -160 },
  discSmall: { width: 180, height: 180, left: -70, top: -60 },
  version: { fontSize: 80, lineHeight: 92, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
  name: { fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  center: { textAlign: 'center' },
  build: { textAlign: 'center', marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 68, paddingVertical: spacing.md + 2, paddingHorizontal: 18 },
  icon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  picture: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, padding: 2, overflow: 'hidden' },
  strong: { fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.xs },
});
