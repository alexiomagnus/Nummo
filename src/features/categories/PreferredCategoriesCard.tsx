import { StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SelectField } from '../../components/SelectField';
import type { Category } from '../../domain/category';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import { existingCategory, type PreferredCategories } from './preferredCategories';

const none = 'none';

// Settings section, shown only with an archive open (its categories): the category «Nuova spesa» starts with and the
// one proposed for a new list. «Nessuna» keeps the previous behaviour (choose each time / first of the list).
export function PreferredCategoriesCard({ categories, value, onChange }: {
  categories: readonly Category[]; value: PreferredCategories; onChange: (value: PreferredCategories) => void;
}) {
  const { t } = useI18n();
  const options = [
    { value: none, label: t("Nessuna") },
    ...categories.map((c) => ({ value: c.id, label: c.label, icon: c.icon ? <CategoryGlyph icon={c.icon} size={20} /> : undefined })),
  ];
  const pick = (field: keyof PreferredCategories) => (next: string) => onChange({ ...value, [field]: next === none ? '' : next });
  return (
    <Card title={t("Categorie preferite")} style={styles.section}>
      <View style={styles.fields}>
        <SelectField label={t("Nuova spesa")} options={options} value={existingCategory(value.expense, categories) || none} onChange={pick('expense')} />
        <SelectField label={t("Nuove liste")} options={options} value={existingCategory(value.list, categories) || none} onChange={pick('list')} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%' },
  fields: { gap: spacing.lg },
});
