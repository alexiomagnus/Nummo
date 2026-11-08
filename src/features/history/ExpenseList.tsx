import { useI18n } from '../../i18n/I18nProvider';
import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import { searchAndSort, sortLabels, sortOptions, type Occurrence, type SortOption } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { leadingIcon } from '../../components/FieldIcon';
import { MenuSelect } from '../../components/MenuSelect';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { inputOutline, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  onEdit?: (expenseId: string) => void;
};

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFormat = (locale: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthOf = (date: string, locale: string) => {
  const name = monthFormat(locale).format(new Date(`${date.slice(0, 7)}-01T00:00:00Z`));
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
};
const formatDate = (date: string, locale: string) => dateFormat(locale).format(new Date(`${date}T00:00:00Z`));

// Filter values: every category, those without a (still existing) category, or one category ID.
const ALL = 'all';

export function ExpenseList({ occurrences, categories, error, onEdit }: Props) {
  const { t, locale, formatAmount } = useI18n();
  const theme = useTheme();
  const size = useSizeClass();
  const compact = size === 'compact';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  // A deleted category leaves expenses pointing at a missing ID: they count as uncategorised.
  const known = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const filter = categoryFilter === ALL || known.has(categoryFilter) ? categoryFilter : ALL;
  const results = useMemo(() => {
    const scoped = filter === ALL ? occurrences
      : occurrences.filter((item) => item.category_id === filter);
    return searchAndSort(scoped, query, sort);
  }, [occurrences, known, filter, query, sort]);
  const byDate = sort === 'date-desc' || sort === 'date-asc';
  const sortChoices = sortOptions.map((value) => ({ value, label: t(sortLabels[value]) }));
  const categoryChoices = [{ value: ALL, label: t("Tutte le categorie") }, ...categories.map((category) => ({ value: category.id, label: category.label }))];

  const filters = (
    <>
      <View style={styles.toolbar}>
        <TextInput outlineStyle={inputOutline} label={t("Cerca per nome")} accessibilityLabel={t("Cerca per nome")} mode="outlined" value={query}
          onChangeText={setQuery} autoCorrect={false} style={styles.search}
          left={leadingIcon(iconShapes.search)}
          right={query ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setQuery('')}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        <MenuSelect label={t("Ordina")} icon={iconShapes.sort} options={sortChoices} value={sort} onChange={setSort} style={styles.select} />
        <MenuSelect label={t("Categoria")} icon={iconShapes.filter} options={categoryChoices} value={filter} onChange={setCategoryFilter} style={styles.select} />
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </>
  );

  return (
    <View style={styles.root}>
      {filters}
      <View role="list">
        {results.map((item, index) => {
          const month = monthOf(item.date, locale);
          const heading = byDate && (index === 0 || monthOf(results[index - 1]!.date, locale) !== month);
          const inMonth = heading ? results.filter((entry) => monthOf(entry.date, locale) === month) : [];
          const monthTotal = inMonth.reduce((sum, entry) => sum + entry.amount_minor, 0);
          const monthCount = `${inMonth.length} ${inMonth.length === 1 ? t("spesa") : t("spese")}`;
          // Dividers only between rows: none after the last row of a month group (the next heading separates it) or of the list.
          const next = results[index + 1];
          const lastOfGroup = !next || (byDate && monthOf(next.date, locale) !== month);
          const category = categories.find((entry) => entry.id === item.category_id);
          const open = expanded.has(item.key);
          const detailsId = `expense-details-${item.key}`;
          return (
            <Fragment key={item.key}>
              {heading && (
                <View style={[styles.month, index === 0 && styles.firstMonth]} accessibilityRole="header">
                  <View style={styles.monthLabel}>
                    <Text variant="titleSmall" style={[styles.monthName, { color: theme.colors.primary }]}>{month}</Text>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{monthCount}</Text>
                  </View>
                  <Text variant="labelLarge" style={[styles.amount, { color: theme.colors.onSurfaceVariant }]}>{formatAmount(monthTotal)}</Text>
                </View>
              )}
              <View>
              <ListRow outlined icon={category?.icon ?? null} title={item.description}
                meta={compact ? <Text variant="titleSmall" style={listRowStyles.amount}>{formatAmount(item.amount_minor)}</Text> : undefined}
                trailing={<>
                  {!compact && <Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount]}>{formatAmount(item.amount_minor)}</Text>}
                  <IconButton style={listRowStyles.iconButton} aria-expanded={open} aria-controls={open ? detailsId : undefined}
                    accessibilityLabel={t("{p0} dettagli di {p1}, {p2}", { p0: open ? t("Nascondi") : t("Mostra"), p1: item.description, p2: formatDate(item.date, locale) })}
                    icon={({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}
                    onPress={() => setExpanded((previous) => {
                      const next = new Set(previous);
                      if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
                      return next;
                    })} />
                  {onEdit && <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                    accessibilityLabel={t("Modifica {p0}", { p0: item.description })} onPress={() => onEdit(item.expenseId)} />}
                </>}>
                {open && <View nativeID={detailsId} role="group" accessibilityLabel={t("Dettagli di {p0}", { p0: item.description })}
                  style={[styles.details, { borderColor: theme.colors.outlineVariant }]}>
                  <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Data")}</Text>
                    <Text variant="bodyMedium">{formatDate(item.date, locale)}</Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Categoria")}</Text>
                    <Text variant="bodyMedium">{category?.label ?? t("Senza categoria")}</Text>
                  </View>
                  {item.recurrence && <View style={styles.detailField}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("Ripetizione")}</Text>
                    <Text variant="bodyMedium">{t(recurrenceLabels[item.recurrence])}</Text>
                  </View>}
                </View>}
              </ListRow>
              </View>
            </Fragment>
          );
        })}
        {occurrences.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessuna spesa.")}</Text>}
        {occurrences.length > 0 && results.length === 0 && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessun risultato.")}</Text>
            <View style={styles.start}><Button mode="outlined" onPress={() => { setQuery(''); setCategoryFilter(ALL); }}>{t("Azzera filtri")}</Button></View>
          </View>
        )}
      </View>
    </View>
  );
}

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
  rowAmount: { minWidth: 96, textAlign: 'right', marginRight: spacing.md },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md, paddingBottom: spacing.sm },
  detailField: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: spacing.xs },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
});
