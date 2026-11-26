import { ListGroup, RowBody } from '../../components/ActionList';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SelectField } from '../../components/SelectField';
import type { Category } from '../../domain/category';
import { useI18n } from '../../i18n/I18nProvider';
import { NoFundAvatar } from '../funds/FundAvatar';
import { existingCategory, type PreferredCategories } from './preferredCategories';

const none = 'none';

// Settings section, shown only with an archive open (its categories): the category «Nuova spesa» starts with and the
// one proposed for a new list. «Nessuna» (dashed icon, as «Nessun fondo»): the forms start from «Nessuna categoria».
export function PreferredCategoriesCard({ categories, value, onChange }: {
  categories: readonly Category[]; value: PreferredCategories; onChange: (value: PreferredCategories) => void;
}) {
  const { t } = useI18n();
  const options = [
    { value: none, label: t("Nessuna"), icon: <NoFundAvatar size={24} /> },
    ...categories.map((c) => ({ value: c.id, label: c.label, icon: c.icon ? <CategoryGlyph icon={c.icon} size={20} /> : undefined })),
  ];
  const pick = (field: keyof PreferredCategories) => (next: string) => onChange({ ...value, [field]: next === none ? '' : next });
  return (
    <ListGroup label={t("Categorie preferite")}>
      <RowBody>
        <SelectField panel label={t("Nuova spesa")} options={options} value={existingCategory(value.expense, categories) || none} onChange={pick('expense')} />
        <SelectField panel label={t("Nuove liste")} options={options} value={existingCategory(value.list, categories) || none} onChange={pick('list')} />
      </RowBody>
    </ListGroup>
  );
}
