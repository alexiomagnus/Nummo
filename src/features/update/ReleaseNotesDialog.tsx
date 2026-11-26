import { ScrollView, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { screenActionStyles } from '../../components/screenActions';
import { Spinner } from '../../components/Spinner';
import { compareVersions, type AppRelease } from '../../domain/appUpdate';
import { useI18n } from '../../i18n/I18nProvider';
import { dateTimeFormat } from '../../i18n/translate';
import { radius, spacing } from '../../theme/tokens';
import { ReleaseNotes } from './ReleaseNotes';

// «Note di rilascio» (Info, 27 November, on request): the last releases of the Android app, newest first, each a tonal card
// with its version, its date and its notes; the installed one is marked. Read-only: Back closes it.
const shownReleases = 5;

export function ReleaseNotesDialog({ visible, releases, failed, installed, onRetry, onClose }: {
  visible: boolean; releases: readonly AppRelease[] | null; failed: boolean; installed: string | null; onRetry: () => void; onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const date = (iso: string) => dateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date(iso));
  return (
    <Portal>
    <AppDialog visible={visible} onDismiss={onClose}>
      <AppDialog.Title>{t("Note di rilascio")}</AppDialog.Title>
      <AppDialog.ScrollArea style={styles.area}>
        <ScrollView contentContainerStyle={styles.content}>
          {releases === null && !failed && <View style={styles.center}><Spinner size={32} label={t("Caricamento delle note di rilascio")} /></View>}
          {failed && releases === null && (
            <View style={styles.center}>
              <Text variant="bodyLarge" style={[styles.centerText, { color: colors.onSurfaceVariant }]}>
                {t("Non è stato possibile leggere le note di rilascio. Controlla la connessione.")}</Text>
              <Button mode="outlined" onPress={onRetry} style={screenActionStyles.pill}>{t("Riprova")}</Button>
            </View>
          )}
          {releases?.length === 0 && <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>{t("Nessuna release pubblicata.")}</Text>}
          {releases?.slice(0, shownReleases).map((release, index) => {
            const isInstalled = installed !== null && compareVersions(release.version, installed) === 0;
            const newest = index === 0;
            return (
              <View key={release.tag} style={[styles.card, { backgroundColor: newest ? colors.primaryContainer : colors.elevation.level1, borderColor: colors.outlineVariant }, !newest && styles.outlined]}
                {...({ role: 'region', 'aria-label': t("Versione {p0}", { p0: release.version }) } as object)}>
                <View style={styles.head}>
                  <Text style={[styles.version, { color: newest ? colors.onPrimaryContainer : colors.onSurface }]}>{release.version}</Text>
                  {newest && <Tag text={t("Ultima")} fill={colors.primary} ink={colors.onPrimary} />}
                  {isInstalled && <Tag text={t("Installata")} fill={colors.secondaryContainer} ink={colors.onSecondaryContainer} />}
                </View>
                {release.publishedAt && <Text variant="bodySmall" style={{ color: newest ? colors.onPrimaryContainer : colors.onSurfaceVariant }}>{date(release.publishedAt)}</Text>}
                {release.notes.trim() ? <ReleaseNotes notes={release.notes} /> : <Text variant="bodyMedium">{t("Nessuna nota per questa versione.")}</Text>}
              </View>
            );
          })}
        </ScrollView>
      </AppDialog.ScrollArea>
    </AppDialog>
    </Portal>
  );
}

function Tag({ text, fill, ink }: { text: string; fill: string; ink: string }) {
  return <View style={[styles.tag, { backgroundColor: fill }]}><Text variant="labelMedium" style={{ color: ink }}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  area: { paddingHorizontal: 0 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  center: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxxl },
  centerText: { textAlign: 'center' },
  card: { borderRadius: radius.dialog, padding: spacing.xl, gap: spacing.sm },
  outlined: { borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  version: { fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
});
