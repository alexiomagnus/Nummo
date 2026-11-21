import { StyleSheet } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { spacing } from '../theme/tokens';
import { Button } from './Button';
import { SvgIcon, iconShapes } from './SvgIcon';

const chevron = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />;

// «Torna indietro» at the top of a full page outside the destinations (the guide, «Collega il tuo Firebase»): a compact text
// button whose chevron lines up with the page's left edge.
export function BackButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  return <Button mode="text" compact disabled={disabled} onPress={onPress} style={styles.back} icon={chevron}>{t("Torna indietro")}</Button>;
}

const styles = StyleSheet.create({ back: { alignSelf: 'flex-start', marginLeft: -spacing.sm } });
