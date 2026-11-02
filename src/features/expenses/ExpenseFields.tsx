import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { expensePolicy } from '../../domain/policy';
import { CategoryPicker } from './CategoryPicker';

export type BaseField = 'amount' | 'description' | 'categoryId';
type Props = {
  values: Record<BaseField, string>;
  errors: Partial<Record<BaseField, string>>;
  categories: readonly Category[];
  disabled?: boolean;
  onChange: (field: BaseField, value: string) => void;
  onBlur: (field: BaseField) => void;
};

// Shared by «Nuova spesa» and «Ricorrenti» so both forms look and validate alike.
export function ExpenseFields({ values, errors, categories, disabled, onChange, onBlur }: Props) {
  return (
    <>
      <View>
        <TextInput label="Importo (€)" value={values.amount} onChangeText={(value) => onChange('amount', value)}
          mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)}
          onBlur={() => onBlur('amount')} accessibilityLabel="Importo in euro" style={styles.amount} disabled={disabled} />
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
      </View>
      <View>
        <TextInput label="Nome dell’acquisto" value={values.description}
          onChangeText={(value) => onChange('description', value)} mode="outlined" error={Boolean(errors.description)}
          onBlur={() => onBlur('description')} accessibilityLabel="Nome dell’acquisto" disabled={disabled} />
        <HelperText type={errors.description ? 'error' : 'info'} accessibilityRole={errors.description ? 'alert' : undefined}>
          {errors.description ?? `${Array.from(values.description).length} / ${expensePolicy.maxDescriptionLength} caratteri`}
        </HelperText>
      </View>
      <View style={styles.group}>
        <Text variant="labelLarge">Categoria (facoltativa)</Text>
        <CategoryPicker categories={categories} selectedId={values.categoryId}
          onChange={(id) => onChange('categoryId', id)} />
        {categories.length === 0 && <Text variant="bodyMedium">Puoi creare categorie nella sezione Categorie.</Text>}
        {errors.categoryId && <HelperText type="error" accessibilityRole="alert">{errors.categoryId}</HelperText>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 20 },
  group: { gap: 10 },
});
