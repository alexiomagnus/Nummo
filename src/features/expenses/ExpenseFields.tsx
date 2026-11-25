import { useI18n } from '../../i18n/I18nProvider';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { Category } from '../../domain/category';
import { clipToLength, expensePolicy } from '../../domain/policy';
import { amountInputFits } from '../../domain/expense';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DateField } from '../../components/DateField';
import { SelectField } from '../../components/SelectField';
import { leadingIcon } from '../../components/FieldIcon';
import { iconShapes } from '../../components/SvgIcon';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { NoFundAvatar } from '../funds/FundAvatar';
import type { RankedMerchant } from '../../domain/merchant';
import { MerchantField } from './MerchantField';

export type BaseField = 'amount' | 'description' | 'categoryId' | 'date';
type Props = {
  values: Record<BaseField, string>;
  errors: Partial<Record<BaseField, string>>;
  categories: readonly Category[];
  dataState?: 'loading' | 'ready' | 'error';
  disabled?: boolean;
  // A shorter, denser form: the desktop new-expense page, the receipt review and the editors (expense, series, template, list).
  dense?: boolean;
  // Rendered below the category picker (the repeat switch and its options).
  extra?: ReactNode;
  // Rendered to the right of the category picker, in halves (from medium up: the fund field of Nuova spesa).
  // Fondo of Nuova spesa: beside Categoria, in halves, or (`fundBelow`, phones) on its own row below it.
  fund?: ReactNode;
  fundBelow?: boolean;
  // «Esercente», after the description: only the new-expense form and the expense editor show it.
  merchant?: { value: string; merchants: readonly RankedMerchant[]; error?: string; onChange: (value: string) => void };
  // Templates: no date field (22 November, on request); the amount takes the whole first row.
  withoutDate?: boolean;
  // The editors (expense, series, template, list): with `dense`, a three-line description (104) instead of two (user's request,
  // 24 November: «ingrandisci un po' di più la descrizione»); the desktop new-expense page and the receipt review keep two.
  // 'tall': four lines (128), only «Modifica spesa» of a one-off expense, which has room to spare (user's request, 25 November).
  editor?: boolean | 'tall';
  onChange: (field: BaseField, value: string) => void;
  onBlur: (field: BaseField) => void;
};

// Shared by the new-expense form and the edit dialog, so both look and validate alike: one column,
// amount (the prominent field) + date on the first row (also on phones, where they share it in halves), then description, merchant (optional), category and `extra` (repeat).
// Every other field is required; the screen does not star them one by one.
export function ExpenseFields({ values, errors, categories, dataState = 'ready', disabled, dense = false, extra, fund, fundBelow = false, merchant, withoutDate = false, editor = false, onChange, onBlur }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const length = Array.from(values.description).length;
  const compact = useSizeClass() === 'compact';
  // «Nessuna categoria» (the dashed icon of «Nessun fondo») is what an empty choice shows: no preferred
  // category means no category picked yet, never the first one of the list. Saving still asks for a category.
  const options = useMemo(() => [
    { value: '', label: t("Nessuna categoria"), icon: <NoFundAvatar size={24} /> },
    ...categories.map((category) => ({
      value: category.id, label: category.label, icon: category.icon ? <CategoryGlyph icon={category.icon} size={20} /> : undefined,
    })),
  ], [categories, t]);
  return (
    <View style={[styles.layout, dense && styles.denseLayout]} aria-busy={dataState === 'loading'}>
      <View>
        <View style={[styles.firstRow, compact && styles.firstRowCompact]}>
          <View style={[styles.amount, compact && styles.amountCompact]}>
            <TextInput outlineStyle={inputOutline} label={t("Importo")} value={values.amount} onChangeText={(value) => { if (amountInputFits(value)) onChange('amount', value); }}
              mode="outlined" inputMode="decimal" placeholder={locale === 'it-IT' ? '0,00' : '0.00'} error={Boolean(errors.amount)} readOnly={disabled} aria-disabled={disabled}
              onBlur={() => onBlur('amount')} accessibilityLabel={t("Importo in euro, obbligatorio")}
              contentStyle={[styles.amountText, compact && styles.amountTextCompact, compact && amountSize(values.amount)]} left={leadingIcon(iconShapes.euro)} />
          </View>
          {!withoutDate && <View style={[styles.date, compact && styles.dateCompact]}>
            <DateField value={values.date} disabled={disabled} error={Boolean(errors.date)} onChange={(date) => onChange('date', date)} />
          </View>}
        </View>
        {errors.amount && <HelperText type="error" accessibilityRole="alert">{t(errors.amount)}</HelperText>}
        {!withoutDate && errors.date && <HelperText type="error" accessibilityRole="alert">{t(errors.date)}</HelperText>}
      </View>
      <View>
        <TextInput outlineStyle={inputOutline} label={t("Descrizione")} value={values.description} mode="outlined" error={Boolean(errors.description)}
          multiline numberOfLines={dense ? (editor === 'tall' ? 4 : editor ? 3 : 2) : fundBelow ? 3 : 4} style={[styles.description, dense && styles.denseDescription, fundBelow && styles.shortDescription, dense && editor && styles.editorDescription, dense && editor === 'tall' && styles.tallDescription]}
          onChangeText={(value) => onChange('description', clipToLength(value, expensePolicy.maxDescriptionLength))} onBlur={() => onBlur('description')}
          accessibilityLabel={t("Descrizione, obbligatoria")} readOnly={disabled} aria-disabled={disabled} contentStyle={styles.text} />
        {/* The counter appears with the first character: in the flow it pushed every field below, and «Salva» with them,
            while typing (user's report, 22 November). Alone, it sits in the gap before the next field, out of the flow; the
            row joins the flow only with an error (after «Salva», never while typing) or in the dense review, where the gap is too small. */}
        {(errors.description || length > 0) && <View style={[styles.helperRow, !errors.description && !dense && styles.counterOnly]}>
          <HelperText type="error" visible={Boolean(errors.description)} accessibilityRole="alert" style={styles.helper}>{t(errors.description ?? ' ')}</HelperText>
          {length > 0 && <Text variant="bodySmall" style={{ color: length > expensePolicy.maxDescriptionLength ? colors.error : colors.onSurfaceVariant }}>{length}/{expensePolicy.maxDescriptionLength}</Text>}
        </View>}
      </View>
      {merchant && <MerchantField value={merchant.value} merchants={merchant.merchants} error={merchant.error} disabled={disabled} onChange={merchant.onChange} />}
      <View style={fund ? (fundBelow ? styles.categoryColumn : styles.categoryRow) : undefined}>
        <View style={fund && !fundBelow ? styles.half : undefined}>
        {dataState !== 'ready' ? (
          // Keep the category field's footprint while reading: [] is not an empty archive yet.
          <TextInput outlineStyle={inputOutline} label={t("Categoria")} mode="outlined" readOnly aria-disabled
            value={dataState === 'loading' ? t("Caricamento…") : t("Dati non disponibili")}
            accessibilityLabel={dataState === 'loading' ? t("Categoria: caricamento in corso") : t("Categoria: dati non disponibili")} />
        ) : categories.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.elevation.level2 }]} role="group" aria-label={t("Categoria")}>
            <View style={styles.emptyText}>
              <Text variant="titleSmall">{t("Nessuna categoria")}</Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{t("Serve almeno una categoria per salvare la spesa: creala nella pagina Categorie.")}</Text>
            </View>
            {errors.categoryId && <HelperText type="error" accessibilityRole="alert" style={styles.helper}>{t(errors.categoryId)}</HelperText>}
          </View>
        ) : (
          <SelectField panel label={t("Categoria")} options={options} value={values.categoryId} onChange={(id) => onChange('categoryId', id)}
            disabled={disabled} error={errors.categoryId} />
        )}
        </View>
        {fund ? <View style={fundBelow ? undefined : styles.half}>{fund}</View> : null}
      </View>
      {extra ? <View style={[styles.extra, dense && styles.denseExtra]}>{extra}</View> : null}
    </View>
  );
}

// Phones: the amount shrinks so that the largest one («999999999,99») fits half of a 360 px row: 98 dp of text, tabular
// digits about 0.6 em wide and the separator about 0.3 em (measured on 22 November). 28 px up to 6 characters
// (`amountText`), then at most 24: «1234,56» 24, «123456789» 18, «999999999,99» 14.
function amountSize(amount: string) {
  if (amount.length < 7) return null;
  const digits = amount.replace(/\D/g, '').length;
  return { fontSize: Math.min(24, Math.floor(98 / (digits * 0.6 + (amount.length - digits) * 0.3))) };
}

const styles = StyleSheet.create({
  layout: { gap: spacing.lg },
  denseLayout: { gap: spacing.md },
  denseDescription: { minHeight: 80 },
  editorDescription: { minHeight: 104 },
  tallDescription: { minHeight: 128 },
  // Phones with Fondo on its own row: the room it takes comes from here, so «Salva» stays whole above the navigation.
  shortDescription: { minHeight: 96 },
  denseExtra: { marginTop: 0 },
  // Layout gap (16) + 8 = the 24 dp used between repeat and promo price.
  extra: { marginTop: spacing.sm },
  firstRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  categoryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  categoryColumn: { gap: spacing.lg },
  half: { flex: 1, minWidth: 0 },
  amount: { flex: 1, minWidth: 0 },
  // Same length as the amount from medium too (user's request, 23 November; it was 200 wide beside a stretched amount).
  date: { flex: 1, minWidth: 0 },
  // Phones: date to the right of the amount, the row split in two equal halves, as long as each half holds its value: below
  // 2 × 156 + gap the row wraps and each field takes the whole width (edit dialog at 360–390 px, where the halves cut
  // «19 nov 2026» and the amount; 21 November). 156 = leading icon area + «19 nov 2026» + padding, and «1234,56» at 28 px.
  firstRowCompact: { flexWrap: 'wrap', rowGap: spacing.md },
  amountCompact: { flexGrow: 1, flexShrink: 1, flexBasis: 156 },
  dateCompact: { flexGrow: 1, flexShrink: 1, flexBasis: 156, width: 'auto', minWidth: 0 },
  text: { fontSize: 18 },
  description: { minHeight: 128 },
  amountText: { fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  // No trailing icon: Paper's 16 dp after the value would only cut it sooner on phones. Paper's own `paddingHorizontal`
  // is overridden only by the same shorthand on RN Web (paddingRight/paddingEnd were ignored); its paddingLeft 0 stays.
  amountTextCompact: { paddingHorizontal: spacing.xs },
  // The counter row under the description would add its whole height to the gap before the next field (Esercente):
  // 8 dp of it overlap that gap (user's request, 17 November).
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: spacing.xs, paddingTop: spacing.xs, marginBottom: -spacing.sm },
  helper: { flex: 1, paddingBottom: 0, minHeight: 20 },
  // Counter only: out of the flow, in the 16 dp gap under the description (right-aligned, clear of the next field's label).
  counterOnly: { position: 'absolute', top: '100%', left: 0, right: 0, paddingTop: 0, marginBottom: 0, pointerEvents: 'none' },
  empty: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg },
  emptyText: { flex: 1, minWidth: 180, gap: spacing.xs },
});
