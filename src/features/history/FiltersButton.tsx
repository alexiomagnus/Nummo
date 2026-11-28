import { StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, radius, spacing } from '../../theme/tokens';

// «Filtri» button of Spese and Abbonamenti on phones, beside the search: tonal when filters are on («Filtri · n») or the panel is
// open. As tall as the visible box of the search field next to it: its 56 dp include 6 dp above the outline (the label notch),
// so the box is `fieldBoxHeight` (50), the border inside (ListsPage does the same for «Aggiungi»).
export function FiltersButton({ active, open, onToggle }: { active: number; open: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <Button mode={active > 0 || open ? 'contained-tonal' : 'outlined'} style={styles.button} contentStyle={styles.content}
      aria-expanded={open} accessibilityLabel={open ? t("Nascondi i filtri") : t("Mostra i filtri")}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.filter} size={size} color={color} />} onPress={onToggle}>
      {active > 0 ? t("Filtri · {p0}", { p0: active }) : t("Filtri")}
    </Button>
  );
}

export const filtersStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  panel: { gap: spacing.md },
});

const styles = StyleSheet.create({
  button: { height: layout.fieldBoxHeight, borderRadius: radius.input },
  content: { height: layout.fieldBoxHeight - 2, minHeight: 0, paddingHorizontal: spacing.xs },
});
