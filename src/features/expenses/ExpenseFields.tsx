import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { expensePolicy } from '../../domain/policy';
import { DateButton, DateCalendar } from '../../components/DateField';
import { leadingIcon } from '../../components/FieldIcon';
import { iconShapes } from '../../components/SvgIcon';
import { spacing, inputOutline } from '../../theme/tokens';
import { CategoryPicker } from './CategoryPicker';

export type BaseField = 'amount' | 'description' | 'categoryId' | 'date';
type Props = {
  values: Record<BaseField, string>;
  errors: Partial<Record<BaseField, string>>;
  categories: readonly Category[];
  disabled?: boolean;
  // Rendered below the category picker (the repeat switch and its options).
  extra?: ReactNode;
  onChange: (field: BaseField, value: string) => void;
  onBlur: (field: BaseField) => void;
};

// Shared by the new-expense form and the edit dialog, so both look and validate alike: one column,
// amount + date on the first row, then description, category and `extra` (repeat).
// Every field is required; the screen does not star them one by one.
export function ExpenseFields({ values, errors, categories, disabled, extra, onChange, onBlur }: Props) {
  const { colors } = useTheme();
  const length = Array.from(values.description).length;
  const [calendar, setCalendar] = useState(false);
  return (
    <View style={styles.layout}>
      <View>
        <View style={styles.firstRow}>
          <View style={styles.amount}>
            <TextInput outlineStyle={inputOutline} label="Importo" value={values.amount} onChangeText={(value) => onChange('amount', value)}
              mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)} disabled={disabled}
              onBlur={() => onBlur('amount')} accessibilityLabel="Importo in euro, obbligatorio"
              contentStyle={styles.amountText} left={leadingIcon(iconShapes.euro)} />
          </View>
          <View style={styles.date}>
            <DateButton value={values.date} open={calendar} disabled={disabled} error={Boolean(errors.date)} onToggle={() => setCalendar(!calendar)} />
          </View>
        </View>
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
        {errors.date && <HelperText type="error" accessibilityRole="alert">{errors.date}</HelperText>}
      </View>
      {calendar && <DateCalendar value={values.date} onChange={(date) => { onChange('date', date); setCalendar(false); }} />}
      <View>
        <TextInput outlineStyle={inputOutline} label="Descrizione" value={values.description} mode="outlined" error={Boolean(errors.description)}
          onChangeText={(value) => onChange('description', value)} onBlur={() => onBlur('description')}
          accessibilityLabel="Descrizione, obbligatoria" disabled={disabled} contentStyle={styles.text} />
        {(errors.description || length > 0) && <View style={styles.helperRow}>
          <HelperText type="error" visible={Boolean(errors.description)} accessibilityRole="alert" style={styles.helper}>{errors.description ?? ' '}</HelperText>
          {length > 0 && <Text variant="bodySmall" style={{ color: length > expensePolicy.maxDescriptionLength ? colors.error : colors.onSurfaceVariant }}>{length}/{expensePolicy.maxDescriptionLength}</Text>}
        </View>}
      </View>
      <View style={styles.group} role="group" aria-label="Categoria">
        <Text variant="titleMedium">Categoria</Text>
        <CategoryPicker categories={categories} selectedId={values.categoryId}
          onChange={(id) => onChange('categoryId', id)} disabled={disabled} />
        {categories.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Nessuna categoria: creala in Categorie.</Text>}
        {errors.categoryId && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{errors.categoryId}</HelperText>}
      </View>
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.lg },
  firstRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  amount: { flex: 1, minWidth: 0 },
  // Paper's 56 dp outlined field reserves 6 dp above its box for the floating label: align the date button with the box.
  date: { width: 148, flexShrink: 0, marginTop: 6 },
  text: { fontSize: 18 },
  amountText: { fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: spacing.xs },
  helper: { flex: 1, paddingBottom: 0, minHeight: 20 },
  group: { gap: spacing.sm, marginTop: spacing.sm },
});
