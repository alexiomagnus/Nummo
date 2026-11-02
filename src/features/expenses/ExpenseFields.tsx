import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { expensePolicy, todayInRome } from '../../domain/policy';
import { ChoiceChips } from '../../components/ChoiceChips';
import { leadingIcon } from '../../components/FieldIcon';
import { iconShapes } from '../../components/SvgIcon';
import { spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { CategoryPicker } from './CategoryPicker';

export type BaseField = 'amount' | 'description' | 'categoryId' | 'date';
type Props = {
  values: Record<BaseField, string>;
  errors: Partial<Record<BaseField, string>>;
  categories: readonly Category[];
  disabled?: boolean;
  // Only for new expenses: a series keeps its start date when edited.
  withDate?: boolean;
  categoryRequired?: boolean;
  // Rendered below the category picker (e.g. the repeat switch).
  extra?: ReactNode;
  onChange: (field: BaseField, value: string) => void;
  onBlur: (field: BaseField) => void;
};

function yesterdayOf(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Shared by the new-expense form and the edit dialog so both look and validate alike.
// The amount is the hero field; then description/date, category, and `extra` (repeat).
// Required fields are not starred one by one: the screen says so once, optional ones say «facoltativa».
export function ExpenseFields({ values, errors, categories, disabled, withDate, categoryRequired, extra, onChange, onBlur }: Props) {
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const length = Array.from(values.description).length;
  const today = todayInRome();
  const yesterday = yesterdayOf(today);
  const dateChoice = values.date === '' || values.date === today ? 'today' : values.date === yesterday ? 'yesterday' : '';
  return (
    <View style={styles.layout}>
      <View>
        <TextInput label="Importo" value={values.amount} onChangeText={(value) => onChange('amount', value)}
          mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)} disabled={disabled}
          onBlur={() => onBlur('amount')} accessibilityLabel="Importo in euro, obbligatorio"
          contentStyle={styles.amountText}
          left={leadingIcon(iconShapes.euro)} />
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
      </View>
      <View>
        <TextInput label="Descrizione" value={values.description} mode="outlined" error={Boolean(errors.description)}
          onChangeText={(value) => onChange('description', value)} onBlur={() => onBlur('description')}
          accessibilityLabel="Descrizione, obbligatoria" disabled={disabled} />
        {(errors.description || length > 0) && <View style={styles.helperRow}>
          <HelperText type="error" visible={Boolean(errors.description)} accessibilityRole="alert" style={styles.helper}>{errors.description ?? ' '}</HelperText>
          {length > 0 && <Text variant="bodySmall" style={{ color: length > expensePolicy.maxDescriptionLength ? colors.error : colors.onSurfaceVariant }}>{length}/{expensePolicy.maxDescriptionLength}</Text>}
        </View>}
      </View>
      {withDate && (
        <View style={styles.group} role="group" aria-label="Data">
          <View style={[styles.dateRow, !compact && styles.dateRowWide]}>
            <TextInput label="Data (facoltativa)" value={values.date} onChangeText={(value) => onChange('date', value)}
              mode="outlined" placeholder={`Oggi · ${today}`} error={Boolean(errors.date)} onBlur={() => onBlur('date')} style={styles.dateInput}
              accessibilityLabel="Data della spesa, facoltativa, formato AAAA-MM-GG" disabled={disabled} autoCorrect={false}
              left={leadingIcon(iconShapes.calendar)} />
            <ChoiceChips label="Scorciatoie data" value={dateChoice} disabled={disabled}
              onChange={(choice) => onChange('date', choice === 'yesterday' ? yesterday : '')}
              options={[{ value: 'today', label: 'Oggi' }, { value: 'yesterday', label: 'Ieri' }]} />
          </View>
          {errors.date && <HelperText type="error" accessibilityRole="alert">{errors.date}</HelperText>}
        </View>
      )}
      <View style={styles.group} role="group" aria-label="Categoria">
        <Text variant="titleSmall">Categoria{categoryRequired ? '' : ' (facoltativa)'}</Text>
        <CategoryPicker categories={categories} selectedId={values.categoryId}
          onChange={(id) => onChange('categoryId', id)} disabled={disabled} />
        {categories.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Puoi creare categorie nella sezione Categorie.</Text>}
        {errors.categoryId && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{errors.categoryId}</HelperText>}
      </View>
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.md },
  amountText: { fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: spacing.xs },
  helper: { flex: 1, paddingBottom: 0, minHeight: 20 },
  group: { gap: spacing.sm },
  dateRow: { gap: spacing.sm },
  dateRowWide: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateInput: { flex: 1, minWidth: 0 },
});
