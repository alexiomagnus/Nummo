import type { Category } from '../../domain/category';
import { ChoiceChips } from '../../components/ChoiceChips';
import { PixelIcon } from '../../components/PixelIcon';

type Props = { categories: readonly Category[]; selectedId: string; onChange: (id: string) => void };

export function CategoryPicker({ categories, selectedId, onChange }: Props) {
  return (
    <ChoiceChips label="Categoria" allowDeselect value={selectedId} onChange={onChange}
      options={categories.map((category) => ({
        value: category.id, label: category.label,
        icon: category.icon ? <PixelIcon icon={category.icon} size={22} /> : undefined,
      }))} />
  );
}
