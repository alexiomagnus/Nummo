import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator, HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button, compactIconPadding } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DeleteAction } from '../../components/DeleteAction';
import { PageHeader } from '../../components/PageHeader';
import { Reveal } from '../../components/Reveal';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { leadingIcon } from '../../components/FieldIcon';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { parseAmountMinor, type ExpenseData } from '../../domain/expense';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { itemNameError, listState, progress, type ListState } from '../../domain/shoppingList';
import { useI18n } from '../../i18n/I18nProvider';
import { transition } from '../../theme/motion';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import type { FundChoice } from '../funds/FundField';
import { ItemEditor, ListEditor } from './ListDialogs';
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

  if (open) return <>
    <ListDetail key={open.id} list={open} items={remote.itemsFor(open.id)} state={listState(open, expenseIds)} remote={remote} categories={categories}
      expense={open.expense_id ? expenses.find((e) => e.id === open.expense_id) : undefined}
      fundChoices={fundChoices} defaultFundId={defaultFundId} canRegister={canRegister} notify={notify}
      onBack={() => setOpenId(null)} onEdit={() => setEditing(open)} onOpen={setOpenId} />
    {editor}
  </>;

  const card = (list: SyncedList) => {
    const items = remote.itemsFor(list.id);
    const { done, total } = progress(items);
    const state = listState(list, expenseIds);
    const category = categories.find((c) => c.id === list.category_id);
    return (
      <View key={list.id} role="listitem">
        <StateLayerPressable layerColor={colors.onSurface} radius={radius.card} onPress={() => setOpenId(list.id)} accessibilityRole="button"
          accessibilityLabel={t("Apri {p0}, {p1} di {p2} acquistati", { p0: list.name, p1: done, p2: total })}
          style={[styles.card, { borderColor: colors.outlineVariant }]}>
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
      {/* The new-list action shares the title row (short label and balanced compact padding on phones); the title wraps
          before the button shrinks, so nothing overflows at 320 px. */}
      <PageHeader title={t("Liste della spesa")} style={styles.overviewHeader} action={
        <Button mode="contained" compact={compact} style={styles.headerButton} contentStyle={compact ? [compactIconPadding.roomy.content, styles.headerButtonContent] : styles.headerButtonContent}
          labelStyle={compact ? [compactIconPadding.roomy.label, styles.headerButtonLabel] : styles.headerButtonLabel} onPress={() => setEditing('new')} accessibilityLabel={t("Nuova lista")}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{compact ? t("Nuova") : t("Nuova lista")}</Button>} />
      {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
      {!remote.ready && !remote.error && <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("Caricamento delle liste")} /></View>}
      {remote.ready && remote.lists.length === 0 && <View style={[styles.empty, { backgroundColor: colors.elevation.level1 }]}>
        <SvgIcon shape={iconShapes.checklist} size={32} color={colors.primary} />
        <Text variant="titleMedium">{t("Nessuna lista")}</Text>
        <Text variant="bodyMedium" style={muted}>{t("Prepara la lista prima di uscire, spunta i prodotti mentre fai la spesa e registra il totale come una sola spesa.")}</Text>
        <Button mode="contained-tonal" onPress={() => setEditing('new')} icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{t("Crea la prima lista")}</Button>
      </View>}
      {active.length > 0 && <View role="list" accessibilityLabel={t("Liste attive")} style={styles.list}>{active.map(card)}</View>}
      {remote.ready && remote.lists.length > 0 && active.length === 0 && <Text variant="bodyMedium" style={muted}>{t("Nessuna lista attiva.")}</Text>}
      {showArchivedLists && archived.length > 0 && <View style={styles.list}>
        <Button mode="text" style={styles.start} aria-expanded={showArchived} onPress={() => setShowArchived(!showArchived)}
          icon={({ size, color }) => <SvgIcon shape={showArchived ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}>
          {t("Liste archiviate ({p0})", { p0: archived.length })}</Button>
        {showArchived && <Reveal role="list" accessibilityLabel={t("Liste archiviate")} style={styles.list}>{archived.map(card)}</Reveal>}
      </View>}
      {editor}
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
      <View style={styles.detailTop}>
        <IconButton accessibilityLabel={t("Torna alle liste")} onPress={onBack} style={styles.back}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />} />
        <PageHeader title={list.name} style={styles.grow} />
      </View>
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
              description={state === 'registered' ? t("La spesa già registrata resta nella sezione Spese con i suoi prodotti. L’operazione non può essere annullata.") : undefined}
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
            onChangeText={(value) => { setName(value); setNameError(null); }} onSubmitEditing={add} blurOnSubmit={false}
            error={Boolean(nameError)} accessibilityLabel={t("Nome del prodotto da aggiungere")} left={leadingIcon(iconShapes.plus)} />
          <Button mode="contained-tonal" style={styles.addButton} contentStyle={styles.addContent} onPress={add}>{t("Aggiungi")}</Button>
        </View>
        {nameError && <HelperText type="error" accessibilityRole="alert">{t(nameError)}</HelperText>}
      </View>}

      {items.length === 0 ? <Text variant="bodyMedium" style={muted}>{editable ? t("La lista è vuota: aggiungi il primo prodotto.") : t("Nessun prodotto.")}</Text>
        : <View role="list" accessibilityLabel={t("Prodotti di {p0}", { p0: list.name })}>
          {items.map((item, index) => (
            <View key={item.id} role="listitem" style={[styles.itemRow, index < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.outlineVariant }]}>
              <StateLayerPressable layerColor={colors.onSurface} radius={radius.control} disabled={!editable} accessibilityRole="checkbox" aria-checked={item.checked}
                aria-disabled={!editable || undefined} accessibilityLabel={item.name} style={styles.check}
                onPress={() => remote.updateItem(item, { checked: !item.checked })}>
                <View style={[styles.box, item.checked ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.onSurfaceVariant }, !editable && styles.dim]}>
                  {item.checked && <SvgIcon shape={iconShapes.check} size={16} color={colors.onPrimary} />}
                </View>
                <Text variant="bodyLarge" style={[styles.grow, item.checked && { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>{item.name}</Text>
              </StateLayerPressable>
              {editable && <IconButton style={styles.iconButton} accessibilityLabel={t("Modifica {p0}", { p0: item.name })} onPress={() => setEditingItem(item)}
                icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} />}
            </View>
          ))}
        </View>}

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

// Checklist writes change progress and synchronisation, not this field. Keep its
// Paper label/outline out of those renders while preserving editing and locale changes.
const ListTotalField = memo(function ListTotalField({ value, error, onChange, onSave }: {
  value: string; error: string | null; onChange: (value: string) => void; onSave: () => void;
}) {
  const { t } = useI18n();
  return <View style={styles.grow}>
    <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Totale spesa")} value={value} inputMode="decimal"
      placeholder="0,00" error={Boolean(error)} left={leadingIcon(iconShapes.euro)} accessibilityLabel={t("Totale spesa in euro, facoltativo")}
      onChangeText={onChange} onBlur={onSave} onSubmitEditing={onSave} />
    {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
  </View>;
});

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  list: { gap: spacing.md },
  loading: { alignItems: 'center', padding: spacing.xxl },
  empty: { borderRadius: radius.card, padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, minWidth: 0 },
  start: { alignSelf: 'flex-start' },
  // Title and lists are one block: `lg` between them instead of the page's section gap.
  overviewHeader: { marginBottom: spacing.lg - layout.sectionGap },
  headerButton: { flexShrink: 0 },
  // A little larger than the standard button (every width): 52 dp, 15/600 label (between the standard 48 dp and «Salva»).
  headerButtonContent: { minHeight: layout.minTouch + spacing.xs },
  headerButtonLabel: { fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.pill, transformOrigin: 'left center' } as ViewStyle,
  detailTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  back: { marginLeft: -spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: -spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summary: { gap: spacing.sm },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Paper's outlined field is 56 dp with 6 dp reserved above its box: the button takes the same box and offset.
  addButton: { marginTop: 6, height: layout.fieldBoxHeight },
  addContent: { height: '100%' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 56 },
  check: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouch, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.6 },
  iconButton: { margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 8 },
  checkout: { gap: spacing.sm },
});
