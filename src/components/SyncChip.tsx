import { useI18n } from '../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { SyncDescription, SyncKind } from '../features/workspace/syncStatus';
import { radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { useSnackbar } from './SnackbarHost';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

const icons: Record<SyncKind, string> = {
  loading: iconShapes.sync, synced: iconShapes.checkCircle, pending: iconShapes.sync,
  cached: iconShapes.cloudOff, offline: iconShapes.cloudOff, error: iconShapes.alert,
};

// Discreet sync indicator: a chip with a label on wider windows, an icon on compact ones.
// Pressing it explains the state in a snackbar.
export function SyncChip({ status }: { status: SyncDescription }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const notify = useSnackbar();
  const compact = useSizeClass() === 'compact';
  const error = status.kind === 'error';
  const color = error ? colors.onErrorContainer : colors.onSurfaceVariant;
  return (
    <StateLayerPressable layerColor={color} radius={radius.control} accessibilityRole="button"
      accessibilityLabel={t("Stato dei dati: {p0}. Premi per i dettagli.", { p0: t(status.label) })}
      onPress={() => notify(status.detail)}
      style={[compact ? styles.icon : styles.chip, error
        ? { backgroundColor: colors.errorContainer }
        : compact ? null : { borderWidth: 1, borderColor: colors.outlineVariant }]}>
      <SvgIcon shape={icons[status.kind]} size={compact ? 24 : 22} color={color} />
      <Text variant="labelLarge" accessibilityLiveRegion="polite" style={[{ color }, compact && styles.hidden]}>{t(status.label)}</Text>
    </StateLayerPressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
