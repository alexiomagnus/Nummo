import { StyleSheet } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { radius, spacing } from '../theme/tokens';
import { Button } from './Button';
import { SvgIcon, iconShapes } from './SvgIcon';

// «Fatto» of the account-menu pages (Settings, Notifications, Categories, Storage and backup): back to the section the
// page was opened from. A tonal pill, larger than a text button, so the way back is easy to see and to hit.
export function DoneButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Button mode="contained-tonal" onPress={onPress} style={styles.button} contentStyle={styles.content} labelStyle={styles.label}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />}>
      {t("Fatto")}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.pill },
  content: { minHeight: 48, paddingHorizontal: spacing.xs },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
