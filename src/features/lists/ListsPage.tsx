import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { glassSurface } from '../../theme/theme';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator, HelperText, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { Button, compactIconPadding, DangerButton } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DeleteAction, DeleteDialog } from '../../components/DeleteAction';
import { PageHeader } from '../../components/PageHeader';
import { QuietToggle } from '../../components/ActionList';
import { Reveal } from '../../components/Reveal';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { leadingIcon } from '../../components/FieldIcon';
import type { Category } from '../../domain/category';
import { clipToLength, listPolicy } from '../../domain/policy';
import type { ExpenseRecord } from '../../domain/contract';
import { amountInputFits, parseAmountMinor, type ExpenseData } from '../../domain/expense';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { itemNameError, listState, progress, type ListState } from '../../domain/shoppingList';
import { useI18n } from '../../i18n/I18nProvider';
import { transition } from '../../theme/motion';
import { groupGap, inputOutline, layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { FundChoice } from '../funds/FundField';
import { ItemEditor, ListEditor } from './ListDialogs';
import { ScreenLayer } from '../../components/ScreenLayer';

// DOM id of each list card, a stable hook for checks in the browser.
const listCardId = (id: string) => `list-card-${id}`;
import { RegisterListDialog } from './RegisterListDialog';
import type { RemoteLists } from './useRemoteLists';

type Props = {
  remote: RemoteLists;
  categories: readonly Category[];
  // Preferred category for new lists (Settings), '' for none.
  defaultCategoryId: string;
  expenses: readonly ExpenseRecord[];
  fundChoices: readonly FundChoice[];
  defaultFundId: string;
  // Registration needs the server (online, nothing pending, not from cache); checklist edits do not.
  canRegister: boolean;
  notify: (message: string) => void;
  // Display preference (Settings → Features): without it the archived lists are not offered at all.
  showArchivedLists: boolean;
};

const fillTransition = transition(['transform'], 400);

// «Liste della spesa»: overview of the lists (active first, archived on demand) or one list as a checklist.
// The page draws its own header, so the open list's name is the page title.
export const ListsPage = memo(ListsPageView);

function ListsPageView({ remote, categories, defaultCategoryId, expenses, fundChoices, defaultFundId, canRegister, notify, showArchivedLists }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SyncedList | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchived, setConfirmArchived] = useState(false);
  // An open list is a screen above the overview (23 November, on request): Back, Escape and its back button close it.
  const expenseIds = useMemo(() => new Set(expenses.map((e) => e.id)), [expenses]);
  const sorted = useMemo(() => [...remote.lists].sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)), [remote.lists]);
  const active = sorted.filter((l) => l.expense_id === null);
  const archived = sorted.filter((l) => l.expense_id !== null);
  const open = openId ? remote.lists.find((l) => l.id === openId) ?? null : null;
  // The open list was deleted (here or on another device): back to the overview. Only once it has been seen: a list just
  // created reaches the listener a moment after it is opened.
  const seen = useRef<string | null>(null);
  if (open) seen.current = open.id;
  useEffect(() => { if (openId && !open && seen.current === openId) setOpenId(null); }, [openId, open]);
  const muted = { color: colors.onSurfaceVariant };

  const editor = editing && <ListEditor record={editing === 'new' ? undefined : editing} categories={categories} defaultCategoryId={defaultCategoryId} close={() => setEditing(null)}
    onSave={(name, categoryId) => {
      if (editing === 'new') {
        const id = remote.createList({ name, category_id: categoryId });
        if (id) { setOpenId(id); notify("Lista creata."); }
        return id !== null;
      }
      const done = remote.updateList(editing, { name, category_id: categoryId });
      if (done) notify("Lista aggiornata.");
      return done;
    }} />;

  const card = (list: SyncedList) => {
    const items = remote.itemsFor(list.id);
    const { done, total } = progress(items);
    const state = listState(list, expenseIds);
    const category = categories.find((c) => c.id === list.category_id);
    return (
      <View key={list.id} nativeID={listCardId(list.id)} role="listitem" {...{ dataSet: { glassItem: 'true' } }} style={[styles.cardBox, glassSurface(colors)]}>
        <StateLayerPressable layerColor={colors.onSurface} onPress={() => setOpenId(list.id)} accessibilityRole="button"
          accessibilityLabel={t("Apri {p0}, {p1} di {p2} acquistati", { p0: list.name, p1: done, p2: total })}
          style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: state === 'active' ? colors.secondaryContainer : colors.surfaceVariant }]}>
              {category?.icon ? <CategoryGlyph icon={category.icon} size={22} color={colors.onSecondaryContainer} />
                : <SvgIcon shape={state === 'active' ? iconShapes.checklist : iconShapes.archive} size={22} color={colors.onSecondaryContainer} />}
            </View>
            <View style={styles.grow}>
              <Text variant="titleMedium" numberOfLines={2}>{list.name}</Text>
              <Text variant="bodySmall" style={muted}>{stateText(t, state, done, total)}</Text>
            </View>
            <SvgIcon shape={iconShapes.chevronRight} size={24} color={colors.onSurfaceVariant} />
          </View>
          {state === 'active' && <ProgressBar done={done} total={total} />}
        </StateLayerPressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* The new-list action shares the title row («Nuova lista» at every size since 22 November, balanced compact padding on phones); the title wraps
          before the button shrinks, so nothing overflows at 320 px. */}
      <PageHeader title={t("Liste")} style={styles.overviewHeader} action={
        <Button mode="contained" compact={compact} style={styles.headerButton} contentStyle={compact ? [compactIconPadding.roomy.content, styles.headerButtonContent] : styles.headerButtonContent}
          labelStyle={compact ? [compactIconPadding.roomy.label, styles.headerButtonLabel] : styles.headerButtonLabel} onPress={() => setEditing('new')} accessibilityLabel={t("Nuova lista")}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{t("Nuova lista")}</Button>} />
      {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
      {!remote.ready && !remote.error && <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("Caricamento delle liste")} /></View>}
      {remote.ready && remote.lists.length === 0 && <View style={[styles.empty, glassSurface(colors)]}>
        <SvgIcon shape={iconShapes.checklist} size={32} color={colors.primary} />
        <Text variant="titleMedium">{t("Nessuna lista")}</Text>
        <Text variant="bodyMedium" style={muted}>{t("Prepara la lista prima di uscire, spunta i prodotti mentre fai la spesa e registra il totale come una sola spesa.")}</Text>
        <Button mode="contained-tonal" onPress={() => setEditing('new')} icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{t("Crea la prima lista")}</Button>
      </View>}
      {active.length > 0 && <View role="list" accessibilityLabel={t("Liste attive")} style={styles.list}>{active.map(card)}</View>}
      {remote.ready && remote.lists.length > 0 && active.length === 0 && <Text variant="bodyMedium" style={muted}>{t("Nessuna lista attiva.")}</Text>}
      {showArchivedLists && archived.length > 0 && <View style={styles.list}>
        <QuietToggle open={showArchived} title={t("Liste archiviate ({p0})", { p0: archived.length })} onPress={() => setShowArchived(!showArchived)} />
        {showArchived && <Reveal role="list" accessibilityLabel={t("Liste archiviate")} style={styles.list}>{archived.map(card)}</Reveal>}
        {/* All the archived lists at once (user's request, 22 November); their expenses stay in Spese with the products. */}
        {showArchived && <DangerButton style={[compact ? styles.full : styles.start, styles.archivedDelete]}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />} onPress={() => setConfirmArchived(true)}>
          {t("Elimina le liste archiviate")}</DangerButton>}
      </View>}
      <DeleteDialog visible={confirmArchived} name={t("le liste archiviate")}
        title={archived.length === 1 ? t("Eliminare 1 lista archiviata?") : t("Eliminare {p0} liste archiviate?", { p0: archived.length })}
        description={t("Le spese già registrate restano nella sezione Uscite con i loro prodotti. L’operazione non può essere annullata.")}
        onDismiss={() => setConfirmArchived(false)}
        onConfirm={() => {
          const all = archived.length;
          const removed = remote.removeLists(archived);
          if (removed > 0) notify(removed === 1 ? t("1 lista eliminata.") : t("{p0} liste eliminate.", { p0: removed }));
          if (removed === all) setShowArchived(false);
          return true;
        }} />
      {editor}
          {/* The open list, as a screen sliding up from the bottom; the overview stays under it, untouched. */}
      {open && <Portal><ScreenLayer key={open.id} label={open.name} title={open.name}
        backLabel={t("Torna alle liste")} onBack={() => setOpenId(null)} onEscape={() => setOpenId(null)}>
        <ListDetail key={open.id} list={open} items={remote.itemsFor(open.id)} state={listState(open, expenseIds)} remote={remote} categories={categories}
          expense={open.expense_id ? expenses.find((e) => e.id === open.expense_id) : undefined}
          fundChoices={fundChoices} defaultFundId={defaultFundId} canRegister={canRegister} notify={notify}
          onBack={() => setOpenId(null)} onEdit={() => setEditing(open)} onOpen={setOpenId} />
      </ScreenLayer></Portal>}
</View>
  );
}

function stateText(t: ReturnType<typeof useI18n>["t"], state: ListState, done: number, total: number) {
  if (state === 'detached') return t("Archiviata · spesa non più presente");
  if (state === 'registered') return t("Registrata · {p0} di {p1} acquistati", { p0: done, p1: total });
  return total === 0 ? t("Nessun prodotto") : t("{p0} di {p1} acquistati", { p0: done, p1: total });
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const share = total > 0 ? done / total : 0;
  return (
    <View role="progressbar" aria-label={t("Avanzamento: {p0} di {p1} acquistati", { p0: done, p1: total })} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
      style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.fill, { backgroundColor: colors.primary, transform: [{ scaleX: share }] } as ViewStyle, fillTransition]} />
    </View>
  );
}

type DetailProps = {
  list: SyncedList; items: readonly SyncedListItem[]; state: ListState; expense?: ExpenseRecord; remote: RemoteLists;
  categories: readonly Category[]; fundChoices: readonly FundChoice[]; defaultFundId: string; canRegister: boolean;
  notify: (message: string) => void; onBack: () => void; onEdit: () => void; onOpen: (id: string) => void;
};

function ListDetail({ list, items, state, expense, remote, categories, fundChoices, defaultFundId, canRegister, notify, onBack, onEdit, onOpen }: DetailProps) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const editable = state === 'active';
  const { done, total } = progress(items);
  const remaining = total - done;
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SyncedListItem | null>(null);
  const [registering, setRegistering] = useState(false);
  const typedTotal = (minor: number | null) => minor === null ? '' : `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;
  const [totalText, setTotalText] = useState(typedTotal(list.total_minor));
  const [totalError, setTotalError] = useState<string | null>(null);
  // Another device changed the total: show it, unless the field holds the same amount typed differently.
  useEffect(() => {
    if ((totalText.trim() === '' ? null : parseAmountMinor(totalText)) !== list.total_minor) setTotalText(typedTotal(list.total_minor));
  }, [list.total_minor]);
  const muted = { color: colors.onSurfaceVariant };

  const add = () => {
    const problem = itemNameError(name, total);
    setNameError(problem);
    if (!problem && remote.addItem(list.id, name)) setName('');
  };
  // Saved when the field is left (or Enter): '' clears the total, an invalid amount is not saved.
  const updateList = remote.updateList;
  const saveTotal = useCallback(() => {
    const minor = totalText.trim() === '' ? null : parseAmountMinor(totalText);
    if (totalText.trim() !== '' && minor === null) { setTotalError("Importo non valido (es. 12,50)."); return; }
    setTotalError(null);
    if (minor !== list.total_minor) updateList(list, { total_minor: minor });
  }, [totalText, list, updateList]);
  const changeTotal = useCallback((value: string) => { setTotalText(value); setTotalError(null); }, []);
  // Stable for the memoised rows: ticking one product re-renders that row only (up to 500 products since 22 November; every
  // row re-rendered on each tick took ~1.6 s with the CPU slowed 4×, as on a mid-range phone).
  const updateItem = useRef(remote.updateItem);
  updateItem.current = remote.updateItem;
  const toggleItem = useCallback((item: SyncedListItem, checked: boolean) => updateItem.current(item, { checked }), []);
  // A long list is drawn progressively: the first rows at once, the rest in chunks, each in an interruptible transition after
  // the previous one has been painted. 500 rows in one go blocked a mid-range phone for about 4 s (CPU slowed 4×); lists up to
  // `firstRows` products are drawn whole, as before. The component is keyed by list, so each list starts again.
  const [shownRows, setShownRows] = useState(firstRows);
  useEffect(() => {
    if (shownRows >= items.length) return;
    const timer = setTimeout(() => startTransition(() => setShownRows((rows) => rows + rowsPerChunk)), 0);
    return () => clearTimeout(timer);
  }, [shownRows, items.length]);
  const shownItems = shownRows >= items.length ? items : items.slice(0, shownRows);
  const copy = (onlyUnchecked: boolean) => {
    const id = remote.createList({ name: list.name, category_id: list.category_id }, { listId: list.id, onlyUnchecked });
    if (id) { notify(onlyUnchecked ? "Nuova lista creata con i prodotti non acquistati." : "Lista duplicata."); onOpen(id); }
  };
  const remove = () => {
    const done = remote.removeList(list);
    if (done) { notify("Lista eliminata."); onBack(); }
    return done;
  };

  return (
    <View style={styles.root}>
      {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}

      {/* Progress and list actions share one row, so a long name never pushes the actions off a phone screen. */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text variant="titleSmall" aria-live="polite" style={styles.grow}>{total === 0 ? t("Nessun prodotto") : t("{p0} di {p1} acquistati", { p0: done, p1: total })}</Text>
          <View style={styles.headerActions}>
            {editable && <IconButton style={styles.iconButton} accessibilityLabel={t("Modifica {p0}", { p0: list.name })} onPress={onEdit}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} />}
            <IconButton style={styles.iconButton} accessibilityLabel={t("Duplica {p0}", { p0: list.name })} onPress={() => copy(false)}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.copy} size={size} color={color} />} />
            <DeleteAction name={list.name} title={t("Eliminare la lista {p0}?", { p0: list.name })}
              description={state === 'registered' ? t("La spesa già registrata resta nella sezione Uscite con i suoi prodotti. L’operazione non può essere annullata.") : undefined}
              onDelete={remove} />
          </View>
        </View>
        <ProgressBar done={done} total={total} />
      </View>

      {state !== 'active' && <View style={[styles.notice, { backgroundColor: colors.secondaryContainer }]}>
        <SvgIcon shape={state === 'registered' ? iconShapes.checkCircle : iconShapes.alert} size={20} color={colors.onSecondaryContainer} />
        <View style={styles.grow}>
          <Text variant="titleSmall" style={{ color: colors.onSecondaryContainer }}>
            {state === 'registered' && expense ? t("Registrata il {p0}: {p1}", { p0: formatDate(expense.expense_date), p1: formatAmount(expense.amount_minor) })
              : t("La spesa di questa lista non è più presente")}</Text>
          <Text variant="bodySmall" style={{ color: colors.onSecondaryContainer }}>
            {state === 'registered' ? t("Lista archiviata: puoi consultarla o duplicarla per un nuovo acquisto.")
              : t("Puoi riportarla tra le liste attive e registrarla di nuovo.")}</Text>
        </View>
        {state === 'detached' && <Button mode="text" textColor={colors.onSecondaryContainer}
          onPress={() => { if (remote.reopenList(list)) notify("Lista riportata tra quelle attive."); }}>{t("Riattiva")}</Button>}
      </View>}

      {editable && <View>
        <View style={styles.addRow}>
          <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Aggiungi prodotto")} value={name} style={styles.grow}
            onChangeText={(value) => { setName(clipToLength(value, listPolicy.maxItemLength)); setNameError(null); }} onSubmitEditing={add} blurOnSubmit={false} returnKeyType="done" enterKeyHint="done"
            error={Boolean(nameError)} accessibilityLabel={t("Nome del prodotto da aggiungere")} left={leadingIcon(iconShapes.plus)} />
          <Button mode="contained-tonal" style={styles.addButton} contentStyle={styles.addContent} onPress={add}>{t("Aggiungi")}</Button>
        </View>
        {nameError && <HelperText type="error" accessibilityRole="alert">{t(nameError)}</HelperText>}
      </View>}

      {items.length === 0 ? <Text variant="bodyMedium" style={muted}>{editable ? t("La lista è vuota: aggiungi il primo prodotto.") : t("Nessun prodotto.")}</Text>
        // The products as grouped glass rows (26 November, on request, after Morphe): each a card of its own, 3 apart.
        : <View {...{ dataSet: { glassGroup: 'true' } }}><View role="list" accessibilityLabel={t("Prodotti di {p0}", { p0: list.name })}>
          {shownItems.map((item, index) => (
            <ItemRow key={item.id} item={item} editable={editable} last={index === items.length - 1} onToggle={toggleItem} onEdit={setEditingItem} />
          ))}
        </View></View>}

      {editable && <View style={styles.checkout}>
        <View style={styles.addRow}>
          <ListTotalField value={totalText} error={totalError} onChange={changeTotal} onSave={saveTotal} />
          {/* Opening the dialog does not write an expense; only its confirmation requires synchronised data. */}
          <Button mode="contained" style={styles.addButton} contentStyle={styles.addContent}
            onPress={() => { saveTotal(); remote.clearError(); setRegistering(true); }}>{t("Registra spesa")}</Button>
        </View>
      </View>}

      {!editable && remaining > 0 && <View style={styles.start}>
        <Button mode="contained-tonal" onPress={() => copy(true)} icon={({ size, color }) => <SvgIcon shape={iconShapes.copy} size={size} color={color} />}>
          {remaining === 1 ? t("Nuova lista con 1 prodotto non acquistato") : t("Nuova lista con {p0} prodotti non acquistati", { p0: remaining })}</Button>
      </View>}

      {editingItem && <ItemEditor item={editingItem} close={() => setEditingItem(null)}
        onSave={(next) => remote.updateItem(editingItem, { name: next })}
        onDelete={() => remote.removeItem(editingItem)} />}
      {registering && <RegisterListDialog list={list} initialAmount={totalText} items={items} categories={categories} fundChoices={fundChoices} defaultFundId={defaultFundId}
        canRegister={canRegister} error={remote.error} close={() => setRegistering(false)}
        onRegister={async (expenseId: string, data: ExpenseData, remember: boolean) => {
          const saved = await remote.register(list, expenseId, data, remember);
          if (saved) notify("Spesa registrata: la lista è stata archiviata.");
          return saved;
        }}
        onMoveRemaining={(categoryId) => { const id = remote.createList({ name: list.name, category_id: categoryId }, { listId: list.id, onlyUnchecked: true }); if (id) onOpen(id); }} />}
    </View>
  );
}

const firstRows = 50;
const rowsPerChunk = 100;

// One product of the checklist. Memoised on its fields (the store rebuilds the item objects at every snapshot), so a tick
// re-renders only the row that changed.
const ItemRow = memo(function ItemRow({ item, editable, last, onToggle, onEdit }: {
  item: SyncedListItem; editable: boolean; last: boolean; onToggle: (item: SyncedListItem, checked: boolean) => boolean; onEdit: (item: SyncedListItem) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  // The tick shows at once: the store's snapshot comes back only after the write (in Standard an IndexedDB transaction with strict
  // durability, tens of ms or more), so the box looked unresponsive (28 November, on report). Dropped when the snapshot arrives
  // or when the write is refused.
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => setPending(null), [item.checked]);
  const checked = pending ?? item.checked;
  const toggle = () => { const next = !checked; setPending(next); if (!onToggle(item, next)) setPending(null); };
  return (
    <View role="listitem" style={styles.itemRow}>
      <StateLayerPressable layerColor={colors.onSurface} disabled={!editable} accessibilityRole="checkbox" aria-checked={checked}
        aria-disabled={!editable || undefined} accessibilityLabel={item.name} style={styles.check} onPress={toggle}>
        <View style={[styles.box, checked ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.onSurfaceVariant }, !editable && styles.dim]}>
          {checked && <SvgIcon shape={iconShapes.check} size={16} color={colors.onPrimary} />}
        </View>
        <Text variant="bodyLarge" style={[styles.grow, checked && { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>{item.name}</Text>
      </StateLayerPressable>
      {editable && <IconButton style={styles.itemEdit} accessibilityLabel={t("Modifica {p0}", { p0: item.name })} onPress={() => onEdit(item)}
        icon={pencilIcon} />}
    </View>
  );
}, (a, b) => a.editable === b.editable && a.last === b.last && a.onToggle === b.onToggle && a.onEdit === b.onEdit
  && a.item.id === b.item.id && a.item.name === b.item.name && a.item.checked === b.item.checked
  && a.item.list_id === b.item.list_id && a.item.position === b.item.position);
const pencilIcon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />;

// Checklist writes change progress and synchronisation, not this field. Keep its
// Paper label/outline out of those renders while preserving editing and locale changes.
const ListTotalField = memo(function ListTotalField({ value, error, onChange, onSave }: {
  value: string; error: string | null; onChange: (value: string) => void; onSave: () => void;
}) {
  const { t } = useI18n();
  return <View style={styles.grow}>
    <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Totale spesa")} value={value} inputMode="decimal"
      placeholder="0,00" error={Boolean(error)} left={leadingIcon(iconShapes.euro)} accessibilityLabel={t("Totale spesa in euro, facoltativo")}
      onChangeText={(next) => { if (amountInputFits(next)) onChange(next); }} onBlur={onSave} onSubmitEditing={onSave} />
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
});

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  // List cards of the glass language: one group, 3 apart (GlobalStyle, `data-glass-item`).
  list: { gap: groupGap },
  loading: { alignItems: 'center', padding: spacing.xxl },
  empty: { borderRadius: radius.group, padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  // The box of the grouped rows (dialog corner, level-1 fill, 1 px outline), like the fund cards (user's request, 27 November).
  cardBox: { borderRadius: radius.group, overflow: 'hidden' },
  card: { padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, minWidth: 0 },
  start: { alignSelf: 'flex-start' },
  // «Elimina le liste archiviate» as wide as the section on phones (user's request, 26 November).
  full: { alignSelf: 'stretch' },
  // Room between the last archived card and the red button (27 November, on request: they touched).
  archivedDelete: { marginTop: spacing.md },
  // Title and lists are one block: `lg` between them instead of the page's section gap.
  overviewHeader: { marginBottom: spacing.lg - layout.sectionGap },
  headerButton: { flexShrink: 0 },
  // A little larger than the standard button (every width): 52 dp, 15/600 label (between the standard 48 dp and «Salva»).
  headerButtonContent: { minHeight: layout.minTouch },
  headerButtonLabel: { fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' } as ViewStyle,
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: -spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summary: { gap: spacing.sm },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Paper's outlined field is 56 dp with 6 dp reserved above its box: the button takes the same box and offset.
  addButton: { marginTop: 6, height: layout.fieldBoxHeight },
  addContent: { height: '100%' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 56 },
  // Flush with its card on the left, top and bottom (the card clips the hover layer to its own corners: 26 November, on request,
  // a rounded pill a few pixels inside the card did not follow its outline); the pencil button closes it on the right.
  check: { flex: 1, minWidth: 0, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouch, paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.6 },
  iconButton: { margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 8 },
  // The pencil of a product row, like its check on the left: flush with the card on the right, top and bottom, square, so the card's
  // own corners clip the mouse's hover layer and it follows the outline (27 November, on request; it was a rounded square inside).
  itemEdit: { margin: 0, width: layout.minTouch, height: 'auto', alignSelf: 'stretch', borderRadius: 0 },
  checkout: { gap: spacing.sm },
});
