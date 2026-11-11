import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { expensePolicy } from '../../domain/policy';
import { Button } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DateField } from '../../components/DateField';
import { SelectField } from '../../components/SelectField';
import { leadingIcon } from '../../components/FieldIcon';
import { iconShapes } from '../../components/SvgIcon';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

export type BaseField = 'amount' | 'description' | 'categoryId' | 'date';
type Props = {
  values: Record<BaseField, string>;
  errors: Partial<Record<BaseField, string>>;
  categories: readonly Category[];
  dataState?: 'loading' | 'ready' | 'error';
  disabled?: boolean;
  // Only the desktop new-expense page opts into a shorter, denser form.
  dense?: boolean;
  // Rendered below the category picker (the repeat switch and its options).
  extra?: ReactNode;
  // Shown as an action when there are no categories yet (opens the Categories section).
  onCreateCategory?: () => void;
  // Creates a category in place (new-expense form): last row of the picker and the empty-archive action,
  // shown disabled with `addCategoryDisabled` (offline: the save needs the server).
  onAddCategory?: () => void;
  addCategoryDisabled?: boolean;
  onChange: (field: BaseField, value: string) => void;
  onBlur: (field: BaseField) => void;
};

// Shared by the new-expense form and the edit dialog, so both look and validate alike: one column,
// amount (the prominent field) + date on the first row, then description, category and `extra` (repeat).
// Every field is required; the screen does not star them one by one.
export function ExpenseFields({ values, errors, categories, dataState = 'ready', disabled, dense = false, extra, onCreateCategory, onAddCategory, addCategoryDisabled = false, onChange, onBlur }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const length = Array.from(values.description).length;
  const compact = useSizeClass() === 'compact';
  const options = useMemo(() => categories.map((category) => ({
    value: category.id, label: category.label, icon: category.icon ? <CategoryGlyph icon={category.icon} size={20} /> : undefined,
  })), [categories]);
  return (
    <View style={[styles.layout, dense && styles.denseLayout]} aria-busy={dataState === 'loading'}>
      <View>
        <View style={[styles.firstRow, compact && styles.firstRowCompact]}>
          <View style={[styles.amount, compact && styles.amountCompact]}>
            <TextInput outlineStyle={inputOutline} label={t("Importo")} value={values.amount} onChangeText={(value) => onChange('amount', value)}
              mode="outlined" inputMode="decimal" placeholder={locale === 'it-IT' ? '0,00' : '0.00'} error={Boolean(errors.amount)} readOnly={disabled} aria-disabled={disabled}
              onBlur={() => onBlur('amount')} accessibilityLabel={t("Importo in euro, obbligatorio")}
              contentStyle={styles.amountText} left={leadingIcon(iconShapes.euro)} />
          </View>
          <View style={[styles.date, compact && styles.dateCompact]}>
            <DateField value={values.date} disabled={disabled} error={Boolean(errors.date)} onChange={(date) => onChange('date', date)} />
          </View>
        </View>
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{t(errors.amount)}</HelperText>}
        {errors.date && <HelperText type="error" accessibilityRole="alert">{t(errors.date)}</HelperText>}
      </View>
      <View>
        <TextInput outlineStyle={inputOutline} label={t("Descrizione")} value={values.description} mode="outlined" error={Boolean(errors.description)}
          multiline numberOfLines={dense ? 2 : 4} style={[styles.description, dense && styles.denseDescription]}
          onChangeText={(value) => onChange('description', value)} onBlur={() => onBlur('description')}
          accessibilityLabel={t("Descrizione, obbligatoria")} readOnly={disabled} aria-disabled={disabled} contentStyle={styles.text} />
        {(errors.description || length > 0) && <View style={styles.helperRow}>
          <HelperText type="error" visible={Boolean(errors.description)} accessibilityRole="alert" style={styles.helper}>{t(errors.description ?? ' ')}</HelperText>
          {length > 0 && <Text variant="bodySmall" style={{ color: length > expensePolicy.maxDescriptionLength ? colors.error : colors.onSurfaceVariant }}>{length}/{expensePolicy.maxDescriptionLength}</Text>}
        </View>}
      </View>
      {dataState !== 'ready' ? (
        // Keep the category field's footprint while reading: [] is not an empty archive yet.
        <TextInput outlineStyle={inputOutline} label={t("Categoria")} mode="outlined" readOnly aria-disabled
          value={dataState === 'loading' ? t("Caricamento…") : t("Dati non disponibili")}
          accessibilityLabel={dataState === 'loading' ? t("Categoria: caricamento in corso") : t("Categoria: dati non disponibili")} />
      ) : categories.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.elevation.level2 }]} role="group" aria-label={t("Categoria")}>
          <View style={styles.emptyText}>
            <Text variant="titleSmall">{t("Nessuna categoria")}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Serve almeno una categoria per salvare la spesa.")}</Text>
          </View>
          {(onAddCategory ?? onCreateCategory) && <Button mode="contained-tonal" onPress={onAddCategory ?? onCreateCategory} disabled={disabled || (Boolean(onAddCategory) && addCategoryDisabled)}>{t("Crea categoria")}</Button>}
          {errors.categoryId && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(errors.categoryId)}</HelperText>}
        </View>
      ) : (
        <SelectField label={t("Categoria")} options={options} value={values.categoryId} onChange={(id) => onChange('categoryId', id)}
          disabled={disabled} error={errors.categoryId} action={onAddCategory && { label: t("Nuova categoria"), onPress: onAddCategory, disabled: addCategoryDisabled }} />
      )}
      {extra ? <View style={[styles.extra, dense && styles.denseExtra]}>{extra}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.lg },
  denseLayout: { gap: spacing.md },
  denseDescription: { minHeight: 80 },
  denseExtra: { marginTop: 0 },
  // Layout gap (16) + 8 = the 24 dp used between repeat and promo price.
  extra: { marginTop: spacing.sm },
  firstRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  firstRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  dateCompact: { width: '100%', marginTop: 0 },
  amount: { flex: 1, minWidth: 0 },
  amountCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  date: { width: 200, flexShrink: 0 },
  text: { fontSize: 18 },
  description: { minHeight: 128 },
  amountText: { fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: spacing.xs, paddingTop: spacing.xs },
  helper: { flex: 1, paddingBottom: 0, minHeight: 20 },
  empty: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg },
  emptyText: { flex: 1, minWidth: 180, gap: spacing.xs },
});
