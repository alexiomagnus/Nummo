import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import { useBackLayer } from '../../components/BackNavigation';
import { Logo } from '../../components/Logo';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { androidAppVersion } from '../../services/androidApp';
import { backLevels } from '../../theme/backStack';
import { radius, spacing } from '../../theme/tokens';
import { Guide } from '../session/Guide';

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
export function InfoPage() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [guide, setGuide] = useState(false);
  const version = useMemo(() => androidAppVersion(), []);
  useBackLayer(guide, backLevels.detail, () => setGuide(false));
  if (guide) return <Guide onBack={() => setGuide(false)} />;
  return (
    <View style={styles.root}>
      <Hero version={version} />
      <Group label={t("Progetto")}>
        <Row icon={iconShapes.info} tile={[colors.primaryContainer, colors.onPrimaryContainer]} title={t("Cos'è Nummo?")}
          subtitle={t("Le funzioni principali, dove sono i tuoi dati e gli avvisi")} label={t("Apri la guida Cos'è Nummo")}
          onPress={() => setGuide(true)} />
      </Group>
      <Group label={t("Creatore")}>
        <Creator />
      </Group>
      <Group label={t("Sviluppo")}>
        <Row icon={iconShapes.pullRequest} tile={[colors.secondaryContainer, colors.onSecondaryContainer]} title={t("Contribuisci")}
          subtitle={t("Proponi una modifica con una pull request su GitHub")}
          label={t("Contribuisci con una pull request su GitHub, si apre in una nuova scheda")} href={contributeUrl} />
        <Divider style={styles.divider} />
        <Row icon={iconShapes.bug} tile={[colors.tertiaryContainer, colors.onTertiaryContainer]} title={t("Segnala problema")}
          subtitle={t("Apri una segnalazione (issue) su GitHub")}
          label={t("Segnala un problema su GitHub, si apre in una nuova scheda")} href={reportIssueUrl} />
      </Group>
    </View>
  );
}

// The big card at the top: the version in large figures, its first number in the main colour (Android app), or the mark.
function Hero({ version }: { version: { name: string; code: number } | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const ink = colors.onPrimaryContainer;
  const [first, ...rest] = version ? version.name.split('.') : [];
  return (
    <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}
      {...({ role: 'region', 'aria-label': version ? t("Nummo, versione {p0}", { p0: version.name }) : 'Nummo' } as object)}>
      {/* Two soft discs behind the content, in the main colour (decoration only). */}
      <View pointerEvents="none" style={[styles.disc, styles.discLarge, { backgroundColor: colors.primary }]} />
      <View pointerEvents="none" style={[styles.disc, styles.discSmall, { backgroundColor: colors.primary }]} />
      {version
        ? <Text style={[styles.version, { color: ink }]} aria-hidden numberOfLines={1} adjustsFontSizeToFit>
            <Text style={{ color: colors.primary }}>{first}</Text>{rest.length > 0 ? `.${rest.join('.')}` : ''}
          </Text>
        : <Logo size={88} color={ink} />}
      <Text variant="headlineSmall" style={[styles.name, { color: ink }]}>Nummo</Text>
      <Text variant="bodyLarge" style={[styles.center, { color: ink, opacity: 0.8 }]}>{t("Semplifica le tue spese.")}</Text>
      {version && <Text variant="bodyMedium" style={[styles.build, { color: ink, opacity: 0.8 }]}>
        {t("Versione {p0} · Build {p1}", { p0: version.name, p1: version.code })}</Text>}
    </View>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.group} {...({ role: 'region', 'aria-label': label } as object)}>
      <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]} accessibilityRole="header" aria-level={2}>
        {label.toLocaleUpperCase()}</Text>
      <View style={[styles.box, { backgroundColor: colors.elevation.level1, borderColor: colors.outlineVariant }]}>{children}</View>
    </View>
  );
}

type RowProps = { icon: string; tile: readonly [string, string]; title: string; subtitle: string; label: string } &
  ({ href: string; onPress?: undefined } | { onPress: () => void; href?: undefined });

function Row({ icon, tile, title, subtitle, label, href, onPress }: RowProps) {
  const { colors } = useTheme();
  return (
    <StateLayerPressable layerColor={colors.onSurface} accessibilityLabel={label} role={href ? 'link' : 'button'}
      onPress={onPress} {...(href ? linkProps(href) : null)} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: tile[0] }]}><SvgIcon shape={icon} size={22} color={tile[1]} /></View>
      <View style={styles.text}>
        <Text variant="titleMedium" numberOfLines={1}>{title}</Text>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text>
      </View>
      <SvgIcon shape={href ? iconShapes.externalLink : iconShapes.chevronRight} size={20} color={colors.onSurfaceVariant} />
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
  hero: { borderRadius: radius.dialog, overflow: 'hidden', alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  disc: { position: 'absolute', borderRadius: 9999, opacity: 0.12 },
  discLarge: { width: 320, height: 320, right: -120, bottom: -160 },
  discSmall: { width: 180, height: 180, left: -70, top: -60 },
  version: { fontSize: 80, lineHeight: 92, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
  name: { fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  center: { textAlign: 'center' },
  build: { textAlign: 'center', marginTop: spacing.lg },
  group: { gap: spacing.sm },
  label: { letterSpacing: 0.8, paddingHorizontal: spacing.sm },
  box: { borderRadius: radius.dialog, borderWidth: 1, overflow: 'hidden' },
  divider: { marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 72, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  picture: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, padding: 2, overflow: 'hidden' },
  strong: { fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.xs },
});
