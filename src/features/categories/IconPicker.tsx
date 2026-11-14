import { useI18n } from '../../i18n/I18nProvider';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { categoryIconLabels, selectableCategoryIcons, type CategoryIcon } from '../../domain/category';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { radius, spacing } from '../../theme/tokens';

type Props = { value: CategoryIcon | null; onChange: (icon: CategoryIcon | null) => void; disabled?: boolean };

// Tapping the selected icon removes it: icons are optional. A retired icon appears only on the category that has it.
export function IconPicker({ value, onChange, disabled }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.grid} role="group" aria-label={t("Icona della categoria (facoltativa)")}>
      {(value && !selectableCategoryIcons.includes(value) ? [...selectableCategoryIcons, value] : selectableCategoryIcons).map((icon) => {
        const selected = icon === value;
        return (
          <StateLayerPressable key={icon} bleed={4} layerColor={colors.onSurface} radius={radius.control} disabled={disabled} aria-disabled={disabled} onPress={() => onChange(selected ? null : icon)}
            accessibilityRole="button" aria-pressed={selected}
            accessibilityLabel={t("Icona {p0}{p1}", { p0: t(categoryIconLabels[icon]), p1: selected ? t(", selezionata") : '' })}
            style={[styles.cell, {
              backgroundColor: selected ? colors.primaryContainer : 'transparent',
            }]}>
            <CategoryGlyph icon={icon} size={26} color={selected ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
