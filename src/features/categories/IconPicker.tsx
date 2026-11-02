import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { categoryIconLabels, categoryIcons, type CategoryIcon } from '../../domain/category';
import { PixelIcon } from '../../components/PixelIcon';

type Props = { value: CategoryIcon | null; onChange: (icon: CategoryIcon | null) => void };

// Tapping the selected icon removes it: icons are optional.
export function IconPicker({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.grid} accessibilityLabel="Icona della categoria (facoltativa)">
      {categoryIcons.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable key={icon} onPress={() => onChange(selected ? null : icon)}
            accessibilityRole="button" aria-selected={selected}
            accessibilityLabel={`Icona ${categoryIconLabels[icon]}${selected ? ', selezionata' : ''}`}
            style={({ pressed }) => [styles.cell, {
              backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
              borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            }]}>
            <PixelIcon icon={icon} size={28} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 48, height: 48, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
