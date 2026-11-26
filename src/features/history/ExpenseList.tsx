import { useI18n } from '../../i18n/I18nProvider';
import { Fragment, memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import { clipToLength, searchPolicy } from '../../domain/policy';
import { searchAndSort, sortLabels, sortOptions, type Occurrence, type SortOption } from '../../domain/history';
import { leadingIcon } from '../../components/FieldIcon';
import { MenuSelect } from '../../components/MenuSelect';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { inputOutline, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { expenseMonths } from './expenseMonths';
import { expenseCardId } from './ExpenseDetail';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  // Opens the expense's detail screen (ExpenseDetail, drawn by the workspace above the list).
  onOpen?: (expenseId: string) => void;
  // Expenses that registered a shopping list → the products bought (marked «Lista spesa», listed in the details).
  listItems?: ReadonlyMap<string, readonly string[]>;
  // Merchant name of each expense (by expense ID); expenses without one have no entry.
  merchantNames?: ReadonlyMap<string, string>;
  // Expenses written on this device and not yet confirmed by the server (Advanced mode, offline): «In attesa di invio».
  pendingIds?: ReadonlySet<string>;
  // Shown instead of «Nessuna spesa.» when the list is empty because of the fund filter (source text, translated here).
  emptyLabel?: string;
};

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

function ExpenseListView({ occurrences, categories, error, onOpen, listItems, merchantNames, pendingIds, emptyLabel }: Props) {
  const { t, locale } = useI18n();
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
  const sortIcons: Record<(typeof sortOptions)[number], string> = { 'date-desc': iconShapes.sortNewest, 'date-asc': iconShapes.sortOldest, 'amount-desc': iconShapes.sortAmountHigh, 'amount-asc': iconShapes.sortAmountLow };
  const sortChoices = sortOptions.map((value) => ({ value, label: t(sortLabels[value]), icon: <SvgIcon shape={sortIcons[value]} size={20} color={theme.colors.onSurfaceVariant} /> }));
  const categoryChoices = [{ value: ALL, label: t("Tutte"), icon: <SvgIcon shape={iconShapes.filter} size={20} color={theme.colors.onSurfaceVariant} /> },
    ...categories.map((category) => ({ value: category.id, label: category.label, icon: category.icon ? <CategoryGlyph icon={category.icon} size={20} /> : undefined }))];

  const filters = (
    <>
      <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
        <TextInput outlineStyle={inputOutline} label={t("Cerca per nome, mese o anno")} accessibilityLabel={t("Cerca per nome, mese o anno")} mode="outlined" value={query}
          onChangeText={(value) => { setQuery(clipToLength(value, searchPolicy.maxQueryLength)); setVisibleCount(pageSize); }} autoCorrect={false} style={compact ? styles.searchCompact : styles.search}
          left={leadingIcon(iconShapes.search)}
          right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => { setQuery(''); setVisibleCount(pageSize); }}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        {/* Secondary filters: they sit side by side under the search on phones, in the same line on wider pages. */}
        <View style={compact ? styles.selectsCompact : styles.selects}>
          <MenuSelect panel iconOnPhones label={t("Ordina")} icon={iconShapes.sort} options={sortChoices} value={sort}
            onChange={(value) => { setSort(value); setVisibleCount(pageSize); }} style={styles.select} />
          <MenuSelect panel whole iconOnPhones label={t("Categoria")} icon={iconShapes.filter} options={categoryChoices} value={filter}
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
            <View style={styles.figures}>
              <Text variant="headlineSmall" style={[tone, styles.amount, styles.strong]}>{amounts.format(resultsTotal / 100)}</Text>
              <View aria-hidden style={[styles.figureDivider, { backgroundColor: theme.colors.onPrimaryContainer }]} />
              <Text variant="bodyLarge" style={tone}>{totalCount}</Text>
            </View>
          </View>
        </View>
      )}
      <View role="list">
        {results.slice(0, visibleCount).map((item, index) => {
          return <ExpenseRow key={item.key} item={item} index={index}
            heading={byDate && (index === 0 || results[index - 1]!.date.slice(0, 7) !== item.date.slice(0, 7))}
            summary={summaries.get(item.date.slice(0, 7))!} category={categoryById.get(item.category_id ?? '')}
            products={listItems?.get(item.expenseId)} merchant={merchantNames?.get(item.expenseId)} pending={pendingIds?.has(item.expenseId) ?? false}
            shortDates={shortDates} months={months} amounts={amounts} onOpen={onOpen} />;
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

// Stable props let appending a page leave existing rows alone. A tap opens the expense's detail screen (ExpenseDetail,
// 23 November, on request: it replaced the details opened inside the card); the element around the card carries a stable
// id (`expenseCardId`), a hook for checks in the browser.
const ExpenseRow = memo(function ExpenseRow({ item, index, heading, summary, category, products, merchant, pending,
  shortDates, months, amounts, onOpen }: {
  item: Occurrence; index: number; heading: boolean; summary: { count: number; total: number };
  category?: Category; products?: readonly string[]; merchant?: string; pending: boolean;
  shortDates: Intl.DateTimeFormat; months: Intl.DateTimeFormat; amounts: Intl.NumberFormat;
  onOpen?: (expenseId: string) => void;
}) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const formatAmount = (minor: number) => amounts.format(minor / 100);
  const month = item.date.slice(0, 7);
  const monthCount = `${summary.count} ${summary.count === 1 ? t("spesa") : t("spese")}`;
  const shortDate = shortDates.format(new Date(`${item.date}T00:00:00Z`));
  // Discreet mark (tonal chip with the lists icon) for expenses registered from a shopping list.
  const listMark = products && <View style={[styles.listMark, { backgroundColor: theme.colors.secondaryContainer }]}>
    <SvgIcon shape={iconShapes.checklist} size={14} color={theme.colors.onSecondaryContainer} />
    <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>{t("Lista spesa")}</Text>
  </View>;
  // Written on this device, not yet on the server (offline): a discreet tonal chip, gone once the server confirms.
  const pendingMark = pending && <View style={[styles.listMark, { backgroundColor: theme.colors.surfaceVariant }]}>
    <SvgIcon shape={iconShapes.sync} size={14} color={theme.colors.onSurfaceVariant} />
    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("In attesa di invio")}</Text>
  </View>;
  const marks = listMark && pendingMark ? <View style={styles.marks}>{listMark}{pendingMark}</View> : listMark || pendingMark;
  // Merchant beside the date, in the accent colour with the shop icon, so it reads apart from the date; one line,
  // a long name ends with «…» (whole in the detail screen).
  const merchantMark = merchant && <View style={styles.merchantMark}>
    <SvgIcon shape={iconShapes.store} size={14} color={theme.colors.primary} />
    <Text variant="labelMedium" numberOfLines={1} style={[styles.merchantName, { color: theme.colors.primary }]}>{merchant}</Text>
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
      <View nativeID={expenseCardId(item.expenseId)}>
        <ListRow outlined dense opens icon={category?.icon ?? null} title={item.description} subtitle={shortDate}
          meta={marks || undefined} subtitleExtra={merchantMark}
          pressLabel={t("Apri i dettagli di {p0}, {p1}", { p0: item.description, p1: (merchant ? `${shortDate}, ${merchant}` : shortDate) + (pending ? `, ${t("In attesa di invio")}` : '') })}
          onPress={onOpen ? () => onOpen(item.expenseId) : undefined}
          trailing={<Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount]}>{formatAmount(item.amount_minor)}</Text>} />
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
  empty: { gap: spacing.sm },
  merchantMark: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  merchantName: { flexShrink: 1, minWidth: 0 },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  listMark: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 2 },
  start: { alignSelf: 'flex-start' },
  // Total of the filtered results, same footprint and tone as the «Prossimo mese» card of the subscriptions view.
  total: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 80, borderRadius: radius.control,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  totalTile: { width: 44, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  totalText: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  // Total and count apart, with a thin vertical line between them (22 November, on request: the «·» was too close and
  // a «–» did not please). Text on one baseline; wraps on a very narrow card.
  figures: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.md },
  figureDivider: { width: 1, height: 20, alignSelf: 'center', opacity: 0.4 },
});
