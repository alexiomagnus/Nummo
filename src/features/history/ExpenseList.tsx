import { useI18n } from '../../i18n/I18nProvider';
import { Fragment, memo, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { usePresence, useOverlayMotion } from '../../components/Overlay';
import { fadeTransition } from '../../theme/motion';
import { inputOutline, motion, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { expenseMonths } from './expenseMonths';
import { ProductsDialog } from './ProductsDialog';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  onEdit?: (expenseId: string) => void;
  // Expenses that registered a shopping list → the products bought (marked «Lista spesa», listed in the details).
  listItems?: ReadonlyMap<string, readonly string[]>;
  // Shown instead of «Nessuna spesa.» when the list is empty because of the fund filter (source text, translated here).
  emptyLabel?: string;
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

function ExpenseListView({ occurrences, categories, error, onEdit, listItems, emptyLabel }: Props) {
  const { t, locale } = useI18n();
  const dates = useMemo(() => dateFormat(locale), [locale]);
  const shortDates = useMemo(() => shortDateFormat(locale), [locale]);
  const months = useMemo(() => monthFormat(locale), [locale]);
  // Month of a date as the search reads it, in the current language: full and short name («novembre nov»); the year is added
  // by the search itself.
  const periodText = useMemo(() => {
    const long = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
    return (date: string) => { const day = new Date(`${date}T00:00:00Z`); return `${long.format(day)} ${short.format(day)}`; };
  }, [locale]);
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
    return searchAndSort(scoped, query, sort, periodText);
  }, [occurrences, filter, query, sort, periodText]);
  const summaries = useMemo(() => expenseMonths(results), [results]);
  const resultsTotal = useMemo(() => results.reduce((sum, item) => sum + item.amount_minor, 0), [results]);
  const byDate = sort === 'date-desc' || sort === 'date-asc';
  const sortChoices = sortOptions.map((value) => ({ value, label: t(sortLabels[value]) }));
  const categoryChoices = [{ value: ALL, label: t("Tutte le categorie"), icon: <SvgIcon shape={iconShapes.filter} size={20} color={theme.colors.onSurfaceVariant} /> },
    ...categories.map((category) => ({ value: category.id, label: category.label, icon: category.icon ? <CategoryGlyph icon={category.icon} size={20} /> : undefined }))];

  const filters = (
    <>
      <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
        <TextInput outlineStyle={inputOutline} label={t("Cerca per nome, mese o anno")} accessibilityLabel={t("Cerca per nome, mese o anno")} mode="outlined" value={query}
          onChangeText={(value) => { setQuery(value); setVisibleCount(pageSize); }} autoCorrect={false} style={compact ? styles.searchCompact : styles.search}
          left={leadingIcon(iconShapes.search)}
          right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => { setQuery(''); setVisibleCount(pageSize); }}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        {/* Secondary filters: they sit side by side under the search on phones, in the same line on wider pages. */}
        <View style={compact ? styles.selectsCompact : styles.selects}>
          <MenuSelect label={t("Ordina")} icon={iconShapes.sort} options={sortChoices} value={sort}
            onChange={(value) => { setSort(value); setVisibleCount(pageSize); }} style={styles.select} />
          <MenuSelect label={t("Categoria")} icon={iconShapes.filter} options={categoryChoices} value={filter}
            onChange={(value) => { setCategoryFilter(value); setVisibleCount(pageSize); }} style={styles.select} />
        </View>
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </>
  );

  const totalCount = results.length === 1 ? t("1 spesa") : t("{p0} spese", { p0: results.length });
  const tone = { color: theme.colors.onPrimaryContainer };

  return (
    <View style={styles.root}>
      {filters}
      {/* Total of every result (all months, not only the loaded page), so it follows Fondo, the search and Categoria. */}
      {results.length > 0 && (
        <View style={[styles.total, { backgroundColor: theme.colors.primaryContainer }]} role="group"
          accessibilityLabel={t("Totale: {p0}, {p1}", { p0: amounts.format(resultsTotal / 100), p1: totalCount })}>
          <View style={[styles.totalTile, { backgroundColor: theme.colors.primary }]}>
            <SvgIcon shape={iconShapes.euro} size={26} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.totalText}>
            <Text variant="titleMedium" style={[tone, styles.strong]}>{t("Totale")}</Text>
            <Text variant="bodyLarge" style={tone}>
              <Text variant="headlineSmall" style={[tone, styles.amount, styles.strong]}>{amounts.format(resultsTotal / 100)}</Text> · {totalCount}
            </Text>
          </View>
        </View>
      )}
      <View role="list">
        {results.slice(0, visibleCount).map((item, index) => {
          return <ExpenseRow key={item.key} item={item} index={index}
            heading={byDate && (index === 0 || results[index - 1]!.date.slice(0, 7) !== item.date.slice(0, 7))}
            summary={summaries.get(item.date.slice(0, 7))!} category={categoryById.get(item.category_id ?? '')}
            products={listItems?.get(item.expenseId)} open={expanded.has(item.key)} setExpanded={setExpanded}
            dates={dates} shortDates={shortDates} months={months} amounts={amounts} onEdit={onEdit} />;
        })}
        {occurrences.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t(emptyLabel ?? "Nessuna spesa.")}</Text>}
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
  dates, shortDates, months, amounts, onEdit }: {
  item: Occurrence; index: number; heading: boolean; summary: { count: number; total: number };
  category?: Category; products?: readonly string[]; open: boolean;
  setExpanded: Dispatch<SetStateAction<ReadonlySet<string>>>;
  dates: Intl.DateTimeFormat; shortDates: Intl.DateTimeFormat; months: Intl.DateTimeFormat; amounts: Intl.NumberFormat;
  onEdit?: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(open, motion.fade, animate);
  // Phones: «Modifica» at the right of the last line (see the details below); wider pages keep it at the end of the line,
  // after the products.
  const compact = useSizeClass() === 'compact';
  const [showProducts, setShowProducts] = useState(false);
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
          const editButton = onEdit && <View style={styles.editRow}>
            <Button mode="outlined" accessibilityLabel={t("Modifica {p0}", { p0: item.description })}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
              onPress={() => onEdit(item.expenseId)}>{t("Modifica")}</Button>
          </View>;
          const fields = <>
            <View style={styles.detailField}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Data")}</Text>
              <Text variant="bodyMedium">{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailField}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Categoria")}</Text>
              <Text variant="bodyMedium">{category?.label ?? t("Senza categoria")}</Text>
            </View>
            {item.recurrence && <View style={styles.detailField}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Ripetizione")}</Text>
              <Text variant="bodyMedium">{t(recurrenceLabels[item.recurrence])}</Text>
            </View>}
          </>;
          // Products of a registered list: a tonal button opens them all in a dialog (never an inline run of names).
          const productsField = products && (products.length === 0
            ? <View style={styles.detailField}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Prodotti acquistati")}</Text>
              <Text variant="bodyMedium">{t("Nessun prodotto spuntato")}</Text>
            </View>
            : <View style={styles.start}>
              <Button mode="contained-tonal" aria-haspopup="dialog" onPress={() => setShowProducts(true)}
                accessibilityLabel={t("Prodotti acquistati di {p0}, {p1}", { p0: item.description, p1: products.length })}
                icon={({ size, color }) => <SvgIcon shape={iconShapes.checklist} size={size} color={color} />}>
                {t("Prodotti ({p0})", { p0: products.length })}
              </Button>
            </View>);
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
                  style={[compact ? styles.compactDetails : styles.details, { borderColor: theme.colors.outlineVariant, opacity: shown ? 1 : 0 }, animate && fadeTransition]}>
                  {compact ? <>
                    {/* Phones: «Modifica» closes the last line (beside the products, or beside the fields without them), never
                        a line of its own; the fields wrap in the room left of it. */}
                    <View style={styles.compactLine}>
                      <View style={styles.compactFields}>{fields}</View>
                      {!productsField && editButton}
                    </View>
                    {productsField && <View style={styles.compactLine}>{productsField}{editButton}</View>}
                  </> : <>
                    {fields}
                    {productsField}
                    {editButton}
                  </>}
                </View>}
              </ListRow>
              {showProducts && products && <ProductsDialog description={item.description} products={products} onClose={() => setShowProducts(false)} />}
              </View>
            </Fragment>
          );
});

const styles = StyleSheet.create({
  // Search grows twice as much as each selector; everything wraps naturally when space runs out.
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.md },
  toolbarCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  search: { flexGrow: 2, flexBasis: 240, minWidth: 0 },
  searchCompact: { minWidth: 0 },
  // Ordina and Categoria stay one group: equal halves of the row, or of what the search leaves.
  selects: { flexGrow: 2, flexBasis: 340, flexDirection: 'row', gap: spacing.md, minWidth: 0 },
  selectsCompact: { flexDirection: 'row', gap: spacing.md },
  select: { flex: 1, minWidth: 0 },
  root: { gap: spacing.lg },
  // The first month already sits below the root gap (lg) plus lg of padding; later months get the same total (xxl = 2 × lg) from the previous row.
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  firstMonth: { paddingTop: spacing.lg },
  monthLabel: { flex: 1, minWidth: 0, gap: spacing.xs },
  monthName: { fontWeight: '700', fontSize: 15, lineHeight: 22 },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowAmount: { minWidth: 80, textAlign: 'right' },
  // Pushed to the right end of the last line of fields: beside them when there is room, on its own line otherwise.
  editRow: { marginLeft: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  // Fields only as wide as their text, side by side: no half-row columns with empty space between them.
  details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xxl, rowGap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  detailField: { minWidth: 0, gap: spacing.xs },
  compactDetails: { gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, paddingBottom: spacing.md,
    paddingHorizontal: spacing.md },
  compactLine: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  compactFields: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xxl, rowGap: spacing.md },
  empty: { gap: spacing.sm },
  listMark: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 2 },
  start: { alignSelf: 'flex-start' },
  // Total of the filtered results, same footprint and tone as the «Prossimo mese» card of the subscriptions view.
  total: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 80, borderRadius: radius.control,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  totalTile: { width: 44, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  totalText: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
});
