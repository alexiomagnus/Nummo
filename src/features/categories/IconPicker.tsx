import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { categoryIconLabels, categoryIcons, type CategoryIcon } from '../../domain/category';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { radius, spacing } from '../../theme/tokens';

type Props = { value: CategoryIcon | null; onChange: (icon: CategoryIcon | null) => void };

// Tapping the selected icon removes it: icons are optional.
export function IconPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid} role="group" aria-label="Icona della categoria (facoltativa)">
      {categoryIcons.map((icon) => {
        const selected = icon === value;
        return (
          <StateLayerPressable key={icon} bleed={4} layerColor={colors.onSurface} radius={radius.control} onPress={() => onChange(selected ? null : icon)}
            accessibilityRole="button" aria-pressed={selected}
            accessibilityLabel={`Icona ${categoryIconLabels[icon]}${selected ? ', selezionata' : ''}`}
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
