import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { glassSurface } from '../../theme/theme';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button, CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { QuietToggle } from '../../components/ActionList';
import { Reveal } from '../../components/Reveal';
import { SelectField } from '../../components/SelectField';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { parseSyncedExpense, type SyncedExpense, type SyncedFund } from '../../domain/firestore';
import {
  addMonths, firstOverviewMonth, fundInUse, hasBalanceData, monthOf, monthOverview, unassignedExpenses,
  type FundMonth, type MonthKind, type MovementKind,
} from '../../domain/funds';
import type { ExpenseRecord } from '../../domain/contract';
import { useI18n } from '../../i18n/I18nProvider';
import { groupGap, radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { BudgetMeter } from './BudgetMeter';
import { FundAvatar } from './FundAvatar';
import { FundDetail, fundCardId } from './FundDetail';
import { FundEditor } from './FundEditor';
import { MovementDialog } from './MovementDialog';
import { MovementsSection } from './MovementsSection';
import type { RemoteFunds } from './useRemoteFunds';

type Props = {
  remote: RemoteFunds;
  expenses: readonly ExpenseRecord[];
  today: string;
  // Writes need a complete, confirmed view of the data (online, nothing pending, not from cache).
  canWrite: boolean;
  defaultFundId: string;
  onSetDefault: (id: string) => void;
  notify: (message: string) => void;
  // Display preference (Settings → Features): offers the archived funds.
  showArchivedFunds: boolean;
};

const kindLabels: Record<MonthKind, string> = { past: 'Mese concluso', current: 'Mese in corso', future: 'Previsione' };

export const FundsPage = memo(FundsPageView);

function FundsPageView({ remote, expenses, today, canWrite, defaultFundId, onSetDefault, notify, showArchivedFunds }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const sizeClass = useSizeClass();
  const compact = sizeClass === 'compact';
  // Tablets: compact buttons with a tighter gap, so the actions fit one row from 600 dp.
  const tablet = sizeClass === 'medium';
  const [month, setMonth] = useState(monthOf(today));
  const [editing, setEditing] = useState<SyncedFund | 'new' | null>(null);
  const [moving, setMoving] = useState<{ kind: MovementKind; to?: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // The fund whose screen is open (FundDetail), by ID: it follows the month shown and closes if the fund is deleted.
  const [detailId, setDetailId] = useState<string | null>(null);
  const { funds, movements } = remote;
  const sources = useMemo(() => ({ funds, movements, expenses }), [funds, movements, expenses]);
  // A fund with expenses (subscriptions too) or movements is never deleted (it is archived): the delete dialog says why, with
  // «Chiudi» only (22 November, user's request). Checked again at the confirmation on the latest data (the dialog keeps the
  // action seen when it opened, so a ref).
  const usageText = (fundId: string, archived = false): string | undefined => {
    const spent = expenses.filter((e) => e.fund_id === fundId).length;
    const moved = movements.filter((m) => m.to_fund_id === fundId || m.from_fund_id === fundId).length;
    if (spent + moved === 0) return undefined;
    const parts = [spent ? (spent === 1 ? t("1 spesa") : t("{p0} spese", { p0: spent })) : '', moved ? (moved === 1 ? t("1 movimento") : t("{p0} movimenti", { p0: moved })) : ''].filter(Boolean);
    const users = parts.length === 2 ? t("{p0} e {p1}", { p0: parts[0] ?? '', p1: parts[1] ?? '' }) : parts[0] ?? '';
    return archived ? t("Lo usano {p0}, quindi non si può eliminare: resta archiviato.", { p0: users })
      : t("Lo usano {p0}, quindi non si può eliminare. Se non ti serve più, archivialo dalla sua scheda.", { p0: users });
  };
  const latestSources = useRef(sources);
  latestSources.current = sources;
  const removeIfUnused = async (fund: SyncedFund) => {
    if (fundInUse(fund.id, latestSources.current)) { notify("Il fondo è in uso: non è stato eliminato."); return false; }
    const done = await remote.removeFund(fund);
    if (done) notify("Fondo eliminato.");
    return done;
  };
  const overview = useMemo(() => monthOverview(sources, month, today), [sources, month, today]);
  const active = overview.funds.filter((item) => !item.fund.archived);
  const archived = overview.funds.filter((item) => item.fund.archived);
  const activeFunds = funds.filter((fund) => !fund.archived);
  // Money can be added or moved only between funds that keep a balance (a recharge, an initial balance or movements); the
  // others are plain spending groups. No balance figure is shown: the expanded card only says what came in and what went out.
  const balanceFunds = useMemo(() => new Set(funds.filter((fund) => hasBalanceData(fund, movements)).map((fund) => fund.id)), [funds, movements]);
  const movableFunds = activeFunds.filter((fund) => balanceFunds.has(fund.id));
  const balances = useMemo(() => new Map(overview.funds.map((item) => [item.fund.id, item.balance])), [overview]);
  const orphans = useMemo(() => unassignedExpenses(expenses, funds), [expenses, funds]);
  // Earliest month with data (first fund start or oldest expense), up to one year ahead (forecasts only).
  const first = useMemo(() => firstOverviewMonth(funds, expenses, today), [funds, expenses, today]);
  const last = addMonths(monthOf(today), 12);
  const monthLabel = formatDate(`${month}-01`, { month: 'long', year: 'numeric' });
  const forecast = overview.kind === 'future';
  const muted = { color: colors.onSurfaceVariant };
  const detail = detailId ? overview.funds.find((item) => item.fund.id === detailId) ?? null : null;
  useEffect(() => { if (detailId && !detail) setDetailId(null); }, [detailId, detail]);

  const archive = async (fund: SyncedFund, value: boolean) => {
    const { id: _id, created_at: _c, revision: _r, updated_at: _u, ...data } = fund;
    if (await remote.updateFund(fund, { ...data, archived: value })) {
      if (value && defaultFundId === fund.id) onSetDefault('');
      notify(value ? "Fondo archiviato." : "Fondo ripristinato.");
    }
  };

  // The month's spending is the page's key figure: highlighted like the «Totale» card of Spese.
  const highlight = (label: string, value: string, detail?: string) => {
    const tone = { color: colors.onPrimaryContainer };
    return (
      <View style={[styles.highlight, { backgroundColor: colors.primaryContainer }]} role="group"
        aria-label={`${label}: ${value}${detail ? `, ${detail}` : ''}`}>
        <View style={[styles.highlightIcon, { backgroundColor: colors.primary }]}>
          <SvgIcon shape={iconShapes.wallet} size={26} color={colors.onPrimary} />
        </View>
        <View style={styles.highlightText}>
          <Text variant="titleMedium" style={[tone, styles.strong]}>{label}</Text>
          <Text variant="headlineMedium" style={[tone, styles.number, styles.strong]}>{value}</Text>
          {detail ? <Text variant="bodySmall" style={tone}>{detail}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
      <View style={styles.monthBar}>
        <IconButton disabled={month <= first} accessibilityLabel={t("Mese precedente")} onPress={() => setMonth(addMonths(month, -1))}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronLeft} size={size} color={color} />} />
        <View style={styles.monthTitle} aria-live="polite">
          <Text variant="titleLarge" style={styles.capitalize}>{monthLabel}</Text>
          <Text variant="labelMedium" style={[muted, forecast && { color: colors.tertiary }]}>{t(kindLabels[overview.kind])}</Text>
        </View>
        <IconButton disabled={month >= last} accessibilityLabel={t("Mese successivo")} onPress={() => setMonth(addMonths(month, 1))}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.chevronRight} size={size} color={color} />} />
        {month !== monthOf(today) && <Button mode="text" compact onPress={() => setMonth(monthOf(today))}>{t("Oggi")}</Button>}
      </View>

      {/* What was spent in the month (every fund and «Senza fondo»). */}
      {funds.length > 0 && highlight(forecast ? t("Spese previste") : t("Speso nel mese"), formatAmount(forecast ? overview.forecastSpent : overview.spent),
          !forecast && overview.forecastSpent > 0 ? t("Altri {p0} di rinnovi previsti", { p0: formatAmount(overview.forecastSpent) }) : undefined)}
      {/* Short visible labels keep the actions on one row from tablet width up; accessible names stay complete. */}
      <View style={[styles.actions, compact && styles.actionsCompact, tablet && styles.actionsTablet]}>
        <Button compact={tablet} mode="contained" disabled={!canWrite} onPress={() => setEditing('new')}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{t("Nuovo fondo")}</Button>
        {movableFunds.length > 0 && <Button compact={tablet} mode="contained-tonal" disabled={!canWrite} onPress={() => setMoving({ kind: 'income' })}
          accessibilityLabel={t("Aggiungi denaro")}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.euro} size={size} color={color} />}>{t("Aggiungi")}</Button>}
        {movableFunds.length > 1 && <Button compact={tablet} mode="contained-tonal" disabled={!canWrite} onPress={() => setMoving({ kind: 'transfer' })}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.swap} size={size} color={color} />}>{t("Trasferisci")}</Button>}
      </View>
      {!canWrite && <Text variant="bodySmall" style={muted}>{t("Le modifiche ai fondi richiedono la connessione e dati sincronizzati.")}</Text>}

      {funds.length === 0 && remote.ready && <View style={[styles.empty, glassSurface(colors)]}>
        <SvgIcon shape={iconShapes.wallet} size={32} color={colors.primary} />
        <Text variant="titleMedium">{t("Nessun fondo")}</Text>
        <Text variant="bodyMedium" style={muted}>{t("I fondi sono facoltativi: Nummo funziona normalmente anche senza.")}</Text>
      </View>}

      {funds.length > 0 && orphans.length > 0 && <View style={[styles.notice, glassSurface(colors)]}>
        <View style={styles.grow}>
          <Text variant="titleSmall">{orphans.length === 1 ? t("Una spesa senza fondo") : t("{p0} spese senza fondo", { p0: orphans.length })}</Text>
          <Text variant="bodyMedium" style={muted}>{t("Restano valide. Nel mese mostrato: {p0}.", { p0: formatAmount(overview.unassigned.spent) })}</Text>
        </View>
        <Button mode="outlined" disabled={!canWrite || activeFunds.length === 0} onPress={() => setAssigning(true)}>{t("Assegna a un fondo")}</Button>
      </View>}

      {active.length > 0 && <Text variant="titleMedium" accessibilityRole="header" aria-level={2} style={styles.listTitle}>{t("I tuoi fondi")}</Text>}
      <View role="list" accessibilityLabel={t("Fondi")} style={styles.list}>
        {active.map((item) => <FundCard key={item.fund.id} item={item} isDefault={item.fund.id === defaultFundId} onOpen={setDetailId} />)}
      </View>

      {showArchivedFunds && archived.length > 0 && <View style={styles.list}>
        <QuietToggle open={showArchived} title={t("Fondi archiviati ({p0})", { p0: archived.length })} onPress={() => setShowArchived(!showArchived)} />
        {showArchived && <Reveal role="list" accessibilityLabel={t("Fondi archiviati")} style={styles.list}>
          {archived.map((item) => <FundCard key={item.fund.id} item={item} isDefault={false} onOpen={setDetailId} />)}
        </Reveal>}
      </View>}

      {/* The month's incomes and transfers, each deletable (27 November, on request). */}
      {funds.length > 0 && <MovementsSection all={movements} funds={funds} canWrite={canWrite}
        onRemove={async (movement) => {
          const done = await remote.removeMovement(movement);
          if (done) notify(movement.kind === 'transfer' ? "Trasferimento eliminato." : "Entrata eliminata.");
          return done;
        }} />}

      {/* Before the editors: opened from the fund's screen, their screens mount later and stay above it. */}
      {detail && <FundDetail item={detail} monthLabel={monthLabel} isDefault={detail.fund.id === defaultFundId} hasBalance={balanceFunds.has(detail.fund.id)}
        canWrite={canWrite} onClose={() => setDetailId(null)}
        onEdit={() => setEditing(detail.fund as SyncedFund)}
        onArchive={(value) => void archive(detail.fund as SyncedFund, value)}
        remove={{ blocked: usageText(detail.fund.id, true),
          title: usageText(detail.fund.id) ? t("Il fondo {p0} è in uso", { p0: detail.fund.name }) : t("Eliminare il fondo {p0}?", { p0: detail.fund.name }),
          description: t("Il fondo non ha spese collegate. L’operazione non può essere annullata."), onDelete: () => removeIfUnused(detail.fund as SyncedFund) }} />}
      {editing && <FundEditor record={editing === 'new' ? undefined : editing} funds={funds} ready={canWrite} error={remote.error}
        onSave={async (data) => {
          const saved = editing === 'new' ? await remote.createFund(data) : await remote.updateFund(editing, data);
          if (saved) notify(editing === 'new' ? "Fondo creato." : "Fondo aggiornato.");
          return saved;
        }} close={() => { setEditing(null); remote.clearError(); }}
        remove={editing === 'new' ? undefined : { blocked: usageText(editing.id), onDelete: () => removeIfUnused(editing) }} />}
      {moving && <MovementDialog funds={movableFunds} balances={balances} kind={moving.kind} to={moving.to} ready={canWrite} error={remote.error}
        onCreate={async (id, data) => {
          const saved = await remote.createMovement(id, data);
          if (saved) notify(data.kind === 'transfer' ? "Trasferimento registrato." : "Entrata registrata.");
          return saved;
        }} close={() => { setMoving(null); remote.clearError(); }} />}
      {assigning && <AssignDialog funds={activeFunds} orphans={orphans} ready={canWrite} error={remote.error} defaultFundId={defaultFundId}
        onAssign={async (fundId) => {
          const records = orphans.map((record) => parseSyncedExpense(record)).filter((r): r is SyncedExpense => r !== null);
          const saved = await remote.assignFund(records, fundId);
          if (saved) notify("Spese assegnate al fondo.");
          return saved;
        }} close={() => { setAssigning(false); remote.clearError(); }} />}
    </View>
  );
}

// A fund's card: avatar, name, the month's spending and the budget; a tap opens its screen (FundDetail, 23 November, on request),
// where the month's summary and the actions are. Archived funds open theirs too (Ripristina, Elimina).
function FundCard({ item, isDefault, onOpen }: { item: FundMonth; isDefault: boolean; onOpen: (id: string) => void }) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const { fund } = item;
  const muted = { color: colors.onSurfaceVariant };
  const forecast = item.kind === 'future';
  const spentNow = forecast ? item.forecastSpent : item.spent;
  const caption = fund.archived ? t("Archiviato") : forecast ? t("previsti") : t("speso nel mese");
  return (
    <View role="listitem" nativeID={fundCardId(fund.id)} {...{ dataSet: { glassItem: 'true' } }} style={[styles.card, glassSurface(colors)]}>
      <StateLayerPressable onPress={() => onOpen(fund.id)} accessibilityRole="button" aria-haspopup="dialog" layerColor={colors.onSurface}
        accessibilityLabel={t("Apri i dettagli di {p0}, {p1}", { p0: fund.name, p1: fund.archived ? t("Archiviato") : `${formatAmount(spentNow)} ${caption}` })}
        style={styles.cardPress}>
        <View style={styles.cardHeader}>
          <FundAvatar fund={fund} />
          <View style={styles.grow}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" numberOfLines={2} style={styles.shrink}>{fund.name}</Text>
              {isDefault && <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
                <SvgIcon shape={iconShapes.star} size={14} color={colors.onSecondaryContainer} />
                <Text variant="labelSmall" style={{ color: colors.onSecondaryContainer }}>{t("Preferito")}</Text>
              </View>}
            </View>
            {fund.archived && <Text variant="bodySmall" style={muted}>{t("Archiviato")}</Text>}
          </View>
          {!fund.archived && <View style={styles.balance}>
            <Text variant="titleLarge" style={styles.number}>{formatAmount(spentNow)}</Text>
            <Text variant="labelSmall" style={muted}>{caption}</Text>
          </View>}
          <SvgIcon shape={iconShapes.chevronRight} size={24} color={colors.onSurfaceVariant} />
        </View>
        {!fund.archived && item.budget !== null && <BudgetMeter label={t("Budget di {p0}", { p0: fund.name })}
          spent={spentNow} budget={item.budget} state={item.state} forecast={forecast} />}
      </StateLayerPressable>
    </View>
  );
}

function AssignDialog({ funds, orphans, ready, error, defaultFundId, onAssign, close }: {
  funds: readonly SyncedFund[]; orphans: readonly ExpenseRecord[]; ready: boolean; error: string | null; defaultFundId: string;
  onAssign: (fundId: string) => Promise<boolean>; close: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [fundId, setFundId] = useState(funds.some((f) => f.id === defaultFundId) ? defaultFundId : funds[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const series = orphans.filter((e) => e.recurrence !== null).length;
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }} style={{ maxWidth: 480 }}>
      <Dialog.Title>{t("Assegna le spese senza fondo")}</Dialog.Title>
      <Dialog.Content style={styles.dialogContent}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          {t("{p0} spese registrate senza fondo (di cui {p1} ricorrenti) verranno assegnate al fondo scelto. Importi, date e categorie non cambiano.", { p0: orphans.length, p1: series })}</Text>
        <SelectField panel whole label={t("Fondo")} value={fundId} disabled={busy || !ready} onChange={setFundId}
          options={funds.map((fund) => ({ value: fund.id, label: fund.name, icon: <FundAvatar fund={fund} size={24} /> }))} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Puoi sempre cambiare il fondo di una singola spesa dalla sua modifica.")}</Text>
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </Dialog.Content>
      <Dialog.Actions style={dialogActionsRow}>
        <CancelButton disabled={busy} onPress={close}>{t("Annulla")}</CancelButton>
        <ConfirmButton disabled={busy || !ready || !fundId} loading={busy} onPress={async () => {
          setBusy(true);
          try { if (await onAssign(fundId)) close(); } finally { setBusy(false); }
        }}>{t("Assegna")}</ConfirmButton>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: spacing.lg },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  monthTitle: { alignItems: 'center', minWidth: 160 },
  capitalize: { textTransform: 'capitalize' },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 96, borderRadius: radius.group,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  highlightIcon: { width: 48, height: 48, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  highlightText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  actionsTablet: { gap: spacing.xs },
  empty: { borderRadius: radius.group, padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.group, padding: spacing.lg },
  // Fund cards of the glass language: one group, 3 apart (GlobalStyle, `data-glass-item`).
  list: { gap: groupGap },
  // Heading above the fund cards, as written; the root's gap is wider than the title needs to its cards.
  listTitle: { paddingHorizontal: spacing.sm, marginBottom: -spacing.sm },
  // The same box as the grouped rows of the other pages (ListGroup: dialog corner, level-1 fill, 1 px outline), so the cards and
  // «Tutte le operazioni» read as one family (user's request, 27 November).
  card: { borderRadius: radius.group, overflow: 'hidden' },
  cardPress: { padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  balance: { alignItems: 'flex-end', flexShrink: 0 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginHorizontal: -spacing.sm },
  spacer: { flexGrow: 1 },
  details: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  strong: { fontWeight: '600' },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  number: { fontVariant: ['tabular-nums'] },
  start: { alignSelf: 'flex-start' },
  dialogContent: { gap: spacing.md },
});
