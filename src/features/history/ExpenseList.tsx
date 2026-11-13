import { useI18n } from '../../i18n/I18nProvider';
import { Fragment, memo, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import { searchAndSort, sortLabels, sortOptions, type Occurrence, type SortOption } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { leadingIcon } from '../../components/FieldIcon';
import { MenuSelect } from '../../components/MenuSelect';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { usePresence, useOverlayMotion } from '../../components/Overlay';
import { fadeTransition } from '../../theme/motion';
import { inputOutline, motion, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { expenseMonths } from './expenseMonths';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  onEdit?: (expenseId: string) => void;
  renderDelete?: (expenseId: string) => ReactNode;
  // Expenses that registered a shopping list → the products bought (marked «Lista spesa», listed in the details).
  listItems?: ReadonlyMap<string, readonly string[]>;
};

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormat = (locale: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthLabel = (month: string, formatter: Intl.DateTimeFormat, locale: string) => {
  const name = formatter.format(new Date(`${month}-01T00:00:00Z`));
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
};

// Filter values: every category, those without a (still existing) category, or one category ID.
const ALL = 'all';
const pageSize = 50;

export const ExpenseList = memo(ExpenseListView);

function ExpenseListView({ occurrences, categories, error, onEdit, renderDelete, listItems }: Props) {
  const { t, locale } = useI18n();
  const dates = useMemo(() => dateFormat(locale), [locale]);
  const shortDates = useMemo(() => shortDateFormat(locale), [locale]);
  const months = useMemo(() => monthFormat(locale), [locale]);
  const amounts = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }), [locale]);
  const theme = useTheme();
  const size = useSizeClass();
  const compact = size === 'compact';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  // A deleted category leaves expenses pointing at a missing ID: they count as uncategorised.
  const known = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const filter = categoryFilter === ALL || known.has(categoryFilter) ? categoryFilter : ALL;
  const results = useMemo(() => {
    const scoped = filter === ALL ? occurrences
      : occurrences.filter((item) => item.category_id === filter);
    return searchAndSort(scoped, query, sort);
  }, [occurrences, filter, query, sort]);
  const summaries = useMemo(() => expenseMonths(results), [results]);
  const byDate = sort === 'date-desc' || sort === 'date-asc';
  const sortChoices = sortOptions.map((value) => ({ value, label: t(sortLabels[value]) }));
  const categoryChoices = [{ value: ALL, label: t("Tutte le categorie") }, ...categories.map((category) => ({ value: category.id, label: category.label }))];

  const filters = (
    <>
      <View style={styles.toolbar}>
        <TextInput outlineStyle={inputOutline} label={t("Cerca per nome")} accessibilityLabel={t("Cerca per nome")} mode="outlined" value={query}
          onChangeText={(value) => { setQuery(value); setVisibleCount(pageSize); }} autoCorrect={false} style={styles.search}
          left={leadingIcon(iconShapes.search)}
          right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => { setQuery(''); setVisibleCount(pageSize); }}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        <MenuSelect label={t("Ordina")} icon={iconShapes.sort} options={sortChoices} value={sort}
          onChange={(value) => { setSort(value); setVisibleCount(pageSize); }} style={styles.select} />
        <MenuSelect label={t("Categoria")} icon={iconShapes.filter} options={categoryChoices} value={filter}
          onChange={(value) => { setCategoryFilter(value); setVisibleCount(pageSize); }} style={styles.select} />
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </>
  );

  return (
    <View style={styles.root}>
      {filters}
      <View role="list">
        {results.slice(0, visibleCount).map((item, index) => {
          return <ExpenseRow key={item.key} item={item} index={index}
            heading={byDate && (index === 0 || results[index - 1]!.date.slice(0, 7) !== item.date.slice(0, 7))}
            summary={summaries.get(item.date.slice(0, 7))!} category={categoryById.get(item.category_id ?? '')}
            products={listItems?.get(item.expenseId)} open={expanded.has(item.key)} setExpanded={setExpanded}
            dates={dates} shortDates={shortDates} months={months} amounts={amounts} onEdit={onEdit} renderDelete={renderDelete} />;
        })}
        {occurrences.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessuna spesa.")}</Text>}
        {occurrences.length > 0 && results.length === 0 && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessun risultato.")}</Text>
            <View style={styles.start}><Button mode="outlined" onPress={() => { setQuery(''); setCategoryFilter(ALL); setVisibleCount(pageSize); }}>{t("Azzera filtri")}</Button></View>
          </View>
        )}
      </View>
      {results.length > visibleCount && <View style={styles.empty}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
          {t("Mostrate {p0} di {p1} spese", { p0: visibleCount, p1: results.length })}
        </Text>
        <View style={styles.start}><Button mode="outlined" onPress={() => setVisibleCount((count) => count + pageSize)}>{t("Mostra altre spese")}</Button></View>
      </View>}
    </View>
  );
}

// Stable props let expanding one detail or appending a page leave existing rows alone.
const ExpenseRow = memo(function ExpenseRow({ item, index, heading, summary, category, products, open, setExpanded,
  dates, shortDates, months, amounts, onEdit, renderDelete }: {
  item: Occurrence; index: number; heading: boolean; summary: { count: number; total: number };
  category?: Category; products?: readonly string[]; open: boolean;
  setExpanded: Dispatch<SetStateAction<ReadonlySet<string>>>;
  dates: Intl.DateTimeFormat; shortDates: Intl.DateTimeFormat; months: Intl.DateTimeFormat; amounts: Intl.NumberFormat;
  onEdit?: (id: string) => void;
  renderDelete?: (id: string) => ReactNode;
}) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(open, motion.fade, animate);
  const formatDate = (date: string) => dates.format(new Date(`${date}T00:00:00Z`));
  const formatAmount = (minor: number) => amounts.format(minor / 100);
          const month = item.date.slice(0, 7);
          const monthCount = `${summary.count} ${summary.count === 1 ? t("spesa") : t("spese")}`;
          const detailsId = `expense-details-${item.key}`;
          // Discreet mark (tonal chip with the lists icon) for expenses registered from a shopping list.
          const listMark = products && <View style={[styles.listMark, { backgroundColor: theme.colors.secondaryContainer }]}>
            <SvgIcon shape={iconShapes.checklist} size={14} color={theme.colors.onSecondaryContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>{t("Lista spesa")}</Text>
          </View>;
          return (
            <Fragment key={item.key}>
              {heading && (
                <View style={[styles.month, index === 0 && styles.firstMonth]} accessibilityRole="header">
                  <View style={styles.monthLabel}>
                    <Text variant="titleSmall" style={[styles.monthName, { color: theme.colors.primary }]}>{monthLabel(month, months, locale)}</Text>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{monthCount}</Text>
                  </View>
                  <Text variant="labelLarge" style={[styles.amount, { color: theme.colors.onSurfaceVariant }]}>{formatAmount(summary.total)}</Text>
                </View>
              )}
              <View>
              <ListRow outlined dense icon={category?.icon ?? null} title={item.description}
                subtitle={shortDates.format(new Date(`${item.date}T00:00:00Z`))}
                meta={listMark}
                expanded={open} controls={open ? detailsId : undefined}
                pressLabel={t("{p0} dettagli di {p1}, {p2}", { p0: open ? t("Nascondi") : t("Mostra"), p1: item.description, p2: formatDate(item.date) })}
                onPress={() => setExpanded((previous) => {
                  const next = new Set(previous);
                  if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
                  return next;
                })}
                trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount]}>{formatAmount(item.amount_minor)}</Text>}>
                {mounted && <View nativeID={detailsId} role="group" accessibilityLabel={t("Dettagli di {p0}", { p0: item.description })}
                  style={[styles.details, { borderColor: theme.colors.outlineVariant, opacity: shown ? 1 : 0 }, animate && fadeTransition]}>
                  <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Data")}</Text>
                    <Text variant="bodyMedium">{formatDate(item.date)}</Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Categoria")}</Text>
                    <Text variant="bodyMedium">{category?.label ?? t("Senza categoria")}</Text>
                  </View>
                  {products && <View style={styles.products}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Prodotti acquistati")}</Text>
                    {products.length === 0 ? <Text variant="bodyMedium">{t("Nessun prodotto spuntato")}</Text>
                      : <View role="list" accessibilityLabel={t("Prodotti acquistati")} style={styles.productList}>
                        {products.map((name, i) => <Text key={i} role="listitem" variant="bodyMedium" style={styles.product}>{`• ${name}`}</Text>)}
                      </View>}
                  </View>}
                  {item.recurrence && <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Ripetizione")}</Text>
                    <Text variant="bodyMedium">{t(recurrenceLabels[item.recurrence])}</Text>
                  </View>}
                  {(onEdit || renderDelete) && <View style={styles.editRow}>
                    {renderDelete?.(item.expenseId)}
                    {onEdit && <Button mode="outlined" accessibilityLabel={t("Modifica {p0}", { p0: item.description })}
                    icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
                    onPress={() => onEdit(item.expenseId)}>{t("Modifica")}</Button>}
                  </View>}
                </View>}
              </ListRow>
              </View>
            </Fragment>
          );
});

const styles = StyleSheet.create({
  // Search grows twice as much as each selector; everything wraps naturally when space runs out.
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.md },
  search: { flexGrow: 2, flexBasis: 240, minWidth: 0 },
  select: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  root: { gap: spacing.lg },
  // The first month already sits below the root gap (lg) plus lg of padding; later months get the same total (xxl = 2 × lg) from the previous row.
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  firstMonth: { paddingTop: spacing.lg },
  monthLabel: { flex: 1, minWidth: 0, gap: spacing.xs },
  monthName: { fontWeight: '700', fontSize: 15, lineHeight: 22 },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowAmount: { minWidth: 80, textAlign: 'right' },
  editRow: { flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  detailField: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs },
  empty: { gap: spacing.sm },
  listMark: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 2 },
  products: { flexBasis: '100%', gap: spacing.xs },
  productList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: 2 },
  product: { minWidth: 140 },
  start: { alignSelf: 'flex-start' },
});
