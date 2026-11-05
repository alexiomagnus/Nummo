import { useState } from 'react';
import { spacing } from '../../theme/tokens';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import { ChoiceChips } from '../../components/ChoiceChips';
import { CategoryGlyph } from '../../components/CategoryGlyph';

type Props = { categories: readonly Category[]; selectedId: string; onChange: (id: string) => void; disabled?: boolean };

const collapsedCount = 8;

export function CategoryPicker({ categories, selectedId, onChange, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = categories.length > collapsedCount;
  // The selected category always stays visible, even when it is beyond the first chips.
  const visible = !collapsible || expanded ? categories
    : categories.filter((category, index) => index < collapsedCount || category.id === selectedId);
  return (
    <>
      <ChoiceChips label="Categoria" allowDeselect disabled={disabled} value={selectedId} onChange={onChange}
        options={visible.map((category) => ({
          value: category.id, label: category.label,
          icon: category.icon ? <CategoryGlyph icon={category.icon} size={20} /> : undefined,
        }))} />
      {collapsible && (
        <Button onPress={() => setExpanded(!expanded)} style={{ alignSelf: 'flex-start', marginLeft: -spacing.md, marginVertical: -spacing.xs }}>
          {expanded ? 'Mostra meno' : `Mostra tutte (${categories.length})`}
        </Button>
      )}
    </>
  );
}
