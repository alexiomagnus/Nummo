import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Menu, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import type { Category } from '../../domain/category';
import { formatAmountMinor } from '../../domain/expense';
import { searchAndSort, sortLabels, sortOptions, type Occurrence, type SortOption } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { DeleteAction, DeleteDialog } from '../../components/DeleteAction';
import { leadingIcon } from '../../components/FieldIcon';
import { MenuSelect } from '../../components/MenuSelect';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';

type Props = {
  occurrences: readonly Occurrence[];
  categories: readonly Category[];
  error: string | null;
  // Absent when the archive does not support deleting.
  onDelete?: (expenseId: string) => boolean | Promise<boolean>;
  onEdit?: (expenseId: string) => void;
};

const dateFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthOf = (date: string) => monthFormat.format(new Date(`${date.slice(0, 7)}-01T00:00:00Z`));
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

type Anchor = { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void; focus?: () => void };

// Filter values: every category, those without a (still existing) category, or one category ID.
const ALL = 'all';
const NONE = 'none';

export function ExpenseList({ occurrences, categories, error, onDelete, onEdit }: Props) {
  const theme = useTheme();
  const size = useSizeClass();
  const compact = size === 'compact';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  // One shared action menu for the whole list, anchored to coordinates: Paper focuses the anchor of
  // every Menu that mounts closed (web), so one Menu per row would scroll the page to the last row.
  const [menu, setMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const anchors = useRef(new Map<string, Anchor | null>());
  const [deleting, setDeleting] = useState<{ name: string; description: string; run: () => boolean | Promise<boolean> } | null>(null);
  // A deleted category leaves expenses pointing at a missing ID: they count as uncategorised.
  const known = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const filter = categoryFilter === ALL || categoryFilter === NONE || known.has(categoryFilter) ? categoryFilter : ALL;
  const results = useMemo(() => {
    const scoped = filter === ALL ? occurrences
      : occurrences.filter((item) => (filter === NONE ? !item.category_id || !known.has(item.category_id) : item.category_id === filter));
    return searchAndSort(scoped, query, sort);
  }, [occurrences, known, filter, query, sort]);
  const menuItem = menu ? results.find((entry) => entry.key === menu.key) : undefined;
  // Closing returns the focus to the row button that opened the menu (keyboard users).
  const closeMenu = () => { const key = menu?.key; setMenu(null); if (key) setTimeout(() => anchors.current.get(key)?.focus?.(), 0); };
  const byDate = sort === 'date-desc' || sort === 'date-asc';
  const total = results.reduce((sum, item) => sum + item.amount_minor, 0);
  const filtered = query.trim() !== '' || filter !== ALL;
  const seriesNote = 'Eliminando una ricorrenza si elimina l’intera serie. L’operazione non può essere annullata.';
  const sortChoices = sortOptions.map((value) => ({ value, label: sortLabels[value] }));
  const categoryChoices = [{ value: ALL, label: 'Tutte le categorie' }, ...categories.map((category) => ({ value: category.id, label: category.label })),
    { value: NONE, label: 'Senza categoria' }];

  const filters = (
    <>
      <View style={styles.toolbar}>
        <TextInput outlineStyle={inputOutline} label="Cerca per nome" accessibilityLabel="Cerca per nome" mode="outlined" value={query}
          onChangeText={setQuery} autoCorrect={false} style={styles.search}
          left={leadingIcon(iconShapes.search)}
          right={query ? <TextInput.Icon accessibilityLabel="Cancella ricerca" onPress={() => setQuery('')}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        <MenuSelect label="Ordina" icon={iconShapes.sort} options={sortChoices} value={sort} onChange={setSort} style={styles.select} />
        <MenuSelect label="Categoria" icon={iconShapes.filter} options={categoryChoices} value={filter} onChange={setCategoryFilter} style={styles.select} />
      </View>
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <View style={styles.summary}>
        <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.onSurfaceVariant }}>
          {results.length === 1 ? (filtered ? '1 spesa trovata' : '1 spesa') : `${results.length} spese${filtered ? ' trovate' : ''}`}
        </Text>
        <Text variant="titleMedium" style={styles.amount}>{formatAmountMinor(total)}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      {filters}
      <View role="list">
        {results.map((item, index) => {
          const month = monthOf(item.date);
          const heading = byDate && (index === 0 || monthOf(results[index - 1]!.date) !== month);
          const monthTotal = heading ? results.filter((entry) => monthOf(entry.date) === month).reduce((sum, entry) => sum + entry.amount_minor, 0) : 0;
          // Dividers only between rows: none after the last row of a month group (the next heading separates it) or of the list.
          const next = results[index + 1];
          const lastOfGroup = !next || (byDate && monthOf(next.date) !== month);
          const category = categories.find((entry) => entry.id === item.category_id);
          const details = [formatDate(item.date), category?.label, item.recurrence && recurrenceLabels[item.recurrence]]
            .filter(Boolean).join(' · ');
          const name = item.recurrence ? `la serie ${item.description}` : item.description;
          return (
            <View key={item.key}>
              {heading && (
                <View style={styles.month} accessibilityRole="header">
                  <Text variant="titleSmall" style={[styles.monthName, { color: theme.colors.primary }]}>{month}</Text>
                  <Text variant="labelLarge" style={[styles.amount, { color: theme.colors.onSurfaceVariant }]}>{formatAmountMinor(monthTotal)}</Text>
                </View>
              )}
              <ListRow outlined icon={category?.icon ?? null} title={item.description} subtitle={details}
                meta={compact ? <Text variant="titleSmall" style={listRowStyles.amount}>{formatAmountMinor(item.amount_minor)}</Text> : undefined}
                trailing={<>
                  {!compact && <Text variant="titleMedium" style={[listRowStyles.amount, styles.rowAmount]}>{formatAmountMinor(item.amount_minor)}</Text>}
                  {compact ? (onEdit || onDelete) && (
                    <IconButton accessibilityLabel={`Azioni per ${item.description}`} aria-haspopup="menu" style={listRowStyles.iconButton}
                      ref={(node) => { anchors.current.set(item.key, node as unknown as Anchor | null); }}
                      icon={({ size, color }) => <SvgIcon shape={iconShapes.dots} size={size} color={color} />}
                      onPress={() => anchors.current.get(item.key)?.measureInWindow((x, y, width, height) => setMenu({ key: item.key, x: x + width, y: y + height }))} />
                  ) : <>
                    {onEdit && <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                      accessibilityLabel={`Modifica ${item.description}`} onPress={() => onEdit(item.expenseId)} />}
                    {onDelete && <DeleteAction name={name} description={item.recurrence ? seriesNote : undefined}
                      onDelete={() => onDelete(item.expenseId)} />}
                  </>}
                </>} />
            </View>
          );
        })}
        {occurrences.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessuna spesa. Aggiungi la prima con «Nuova spesa».</Text>}
        {occurrences.length > 0 && results.length === 0 && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessun risultato.</Text>
            <View style={styles.start}><Button mode="outlined" onPress={() => { setQuery(''); setCategoryFilter(ALL); }}>Azzera filtri</Button></View>
          </View>
        )}
      </View>
      <Menu visible={menu !== null && menuItem !== undefined} onDismiss={closeMenu} anchor={{ x: menu?.x ?? 0, y: menu?.y ?? 0 }}
        contentStyle={{ backgroundColor: theme.colors.elevation.level2, borderRadius: radius.control }}>
        {onEdit && <Menu.Item title="Modifica" leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
          onPress={() => { if (menuItem) onEdit(menuItem.expenseId); closeMenu(); }} />}
        {onDelete && <Menu.Item title="Elimina" leadingIcon={({ size, color }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />}
          onPress={() => {
            if (menuItem) {
              const target = menuItem;
              setDeleting({ name: target.recurrence ? `la serie ${target.description}` : target.description, description: target.recurrence ? seriesNote : 'L’operazione non può essere annullata.', run: () => onDelete(target.expenseId) });
            }
            closeMenu();
          }} />}
      </Menu>
      <DeleteDialog visible={deleting !== null} name={deleting?.name ?? ''} description={deleting?.description}
        onDismiss={() => setDeleting(null)} onConfirm={() => deleting ? deleting.run() : false} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Search grows twice as much as each selector; everything wraps naturally when space runs out.
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.md },
  search: { flexGrow: 2, flexBasis: 240, minWidth: 0 },
  select: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  root: { gap: spacing.lg },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: spacing.xl, paddingBottom: spacing.md },
  monthName: { textTransform: 'capitalize' },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowAmount: { minWidth: 96, textAlign: 'right' },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
});
