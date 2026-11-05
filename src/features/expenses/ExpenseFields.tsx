import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { expensePolicy, todayInRome } from '../../domain/policy';
import { ChoiceChips } from '../../components/ChoiceChips';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { spacing, inputOutline } from '../../theme/tokens';
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
  // Two columns (amount, description, date | category, repeat) when the container is wide.
  split?: boolean;
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
export function ExpenseFields({ values, errors, categories, disabled, withDate, categoryRequired, extra, split, onChange, onBlur }: Props) {
  const { colors } = useTheme();
  // Wide new-expense page: two columns. The edit dialog (no date) stays a single column.
  const wide = Boolean(split && withDate);
  const length = Array.from(values.description).length;
  const today = todayInRome();
  const yesterday = yesterdayOf(today);
  // «Altra data» reveals the date field; it stays open while a date other than today/yesterday is typed.
  const [otherOpen, setOtherOpen] = useState(false);
  const other = otherOpen || (values.date !== '' && values.date !== today && values.date !== yesterday);
  const dateChoice = other ? 'other' : values.date === yesterday ? 'yesterday' : 'today';
  const amount = (
      <View>
        <TextInput outlineStyle={inputOutline} label="Importo" value={values.amount} onChangeText={(value) => onChange('amount', value)}
          mode="outlined" inputMode="decimal" placeholder="0,00" error={Boolean(errors.amount)} disabled={disabled}
          onBlur={() => onBlur('amount')} accessibilityLabel="Importo in euro, obbligatorio"
          contentStyle={styles.amountText}
          left={leadingIcon(iconShapes.euro)} />
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{errors.amount}</HelperText>}
      </View>
  );
  const description = (
      <View>
        <TextInput outlineStyle={inputOutline} label="Descrizione" value={values.description} mode="outlined" error={Boolean(errors.description)}
          onChangeText={(value) => onChange('description', value)} onBlur={() => onBlur('description')}
          accessibilityLabel="Descrizione, obbligatoria" disabled={disabled} />
        {(errors.description || length > 0) && <View style={styles.helperRow}>
          <HelperText type="error" visible={Boolean(errors.description)} accessibilityRole="alert" style={styles.helper}>{errors.description ?? ' '}</HelperText>
          {length > 0 && <Text variant="bodySmall" style={{ color: length > expensePolicy.maxDescriptionLength ? colors.error : colors.onSurfaceVariant }}>{length}/{expensePolicy.maxDescriptionLength}</Text>}
        </View>}
      </View>
  );
  const date = withDate ? (
    <View style={styles.group} role="group" aria-label="Data">
      <Text variant="titleSmall">Data</Text>
      <ChoiceChips label="Data della spesa" value={dateChoice} disabled={disabled}
        onChange={(choice) => {
          if (choice === 'other') { setOtherOpen(true); return; }
          setOtherOpen(false);
          onChange('date', choice === 'yesterday' ? yesterday : '');
        }}
        options={[{ value: 'today', label: 'Oggi' }, { value: 'yesterday', label: 'Ieri' },
          { value: 'other', label: 'Altra data', icon: <SvgIcon shape={iconShapes.calendar} size={18} color={colors.onSurfaceVariant} /> }]} />
      {other && (
        <TextInput outlineStyle={inputOutline} label="Data (AAAA-MM-GG)" value={values.date} onChangeText={(value) => onChange('date', value)}
          mode="outlined" placeholder={today} error={Boolean(errors.date)} onBlur={() => onBlur('date')}
          accessibilityLabel="Data della spesa, formato AAAA-MM-GG" disabled={disabled} autoCorrect={false}
          left={leadingIcon(iconShapes.calendar)} />
      )}
      {errors.date && <HelperText type="error" accessibilityRole="alert">{errors.date}</HelperText>}
    </View>
  ) : null;
  const category = (
      <View style={styles.group} role="group" aria-label="Categoria">
        <Text variant="titleSmall">Categoria{categoryRequired ? '' : ' (facoltativa)'}</Text>
        <CategoryPicker categories={categories} selectedId={values.categoryId}
          onChange={(id) => onChange('categoryId', id)} disabled={disabled} />
        {categories.length === 0 && <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Puoi creare categorie nella sezione Categorie.</Text>}
        {errors.categoryId && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{errors.categoryId}</HelperText>}
      </View>
  );
  // Wide: two columns (amount, description, date | category, options) that wrap into one when the
  // form is narrow. Narrow: everything stacked in the same order.
  return wide ? (
    <View style={styles.columns}>
      <View style={styles.column}>{amount}{description}{date}</View>
      <View style={styles.column}>{category}{extra}</View>
    </View>
  ) : (
    <View style={styles.layout}>
      {amount}
      {description}
      {date}
      {category}
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.md },
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md, columnGap: spacing.lg },
  column: { flexGrow: 1, flexBasis: 260, minWidth: 0, gap: spacing.md },
  amountText: { fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: spacing.xs },
  helper: { flex: 1, paddingBottom: 0, minHeight: 20 },
  group: { gap: spacing.sm },
});
