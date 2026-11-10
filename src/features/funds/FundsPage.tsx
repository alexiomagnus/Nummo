import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import { Reveal } from '../../components/Reveal';
import { SelectField } from '../../components/SelectField';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { parseSyncedExpense, type SyncedExpense, type SyncedFund, type SyncedMovement } from '../../domain/firestore';
import {
  addMonths, currentRecharge, fundInUse, generalBudgetMonth, hasBalanceData, monthOf, monthOverview, unassignedExpenses, type BudgetChange,
  type FundEntry, type FundMonth, type MonthKind, type MovementKind,
} from '../../domain/funds';
import type { ExpenseRecord } from '../../domain/contract';
import { useI18n } from '../../i18n/I18nProvider';
import { radius, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { BudgetMeter } from './BudgetMeter';
import { FundAvatar } from './FundAvatar';
import { FundEditor } from './FundEditor';
import { GeneralBudgetDialog } from './GeneralBudgetDialog';
import { MovementDialog } from './MovementDialog';
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
};

const kindLabels: Record<MonthKind, string> = { past: 'Mese concluso', current: 'Mese in corso', future: 'Previsione' };
const entryLabels: Record<FundEntry['kind'], string> = {
  initial: 'Saldo iniziale', recharge: 'Ricarica mensile', income: 'Entrata', 'transfer-in': 'Trasferimento ricevuto',
  'transfer-out': 'Trasferimento inviato', expense: 'Spesa',
};

export const FundsPage = memo(FundsPageView);

function FundsPageView({ remote, expenses, today, canWrite, defaultFundId, onSetDefault, notify }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [month, setMonth] = useState(monthOf(today));
  const [editing, setEditing] = useState<SyncedFund | 'new' | null>(null);
  const [moving, setMoving] = useState<{ kind: MovementKind; to?: string } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const { funds, movements } = remote;
  const sources = useMemo(() => ({ funds, movements, expenses }), [funds, movements, expenses]);
  const overview = useMemo(() => monthOverview(sources, month, today), [sources, month, today]);
  const active = overview.funds.filter((item) => !item.fund.archived);
  const archived = overview.funds.filter((item) => item.fund.archived);
  const activeFunds = funds.filter((fund) => !fund.archived);
  // Balances, recharges and manual money movements only exist for funds that already had them (earlier versions): new funds are
  // plain spending groups. Their data stays; their buttons appear only while some fund still carries them.
  const balanceFunds = useMemo(() => new Set(funds.filter((fund) => hasBalanceData(fund, movements)).map((fund) => fund.id)), [funds, movements]);
  const anyBalance = balanceFunds.size > 0;
  const general = useMemo(() => generalBudgetMonth(remote.budgets, overview), [remote.budgets, overview]);
  const balances = useMemo(() => new Map(overview.funds.map((item) => [item.fund.id, item.balance])), [overview]);
  const orphans = useMemo(() => unassignedExpenses(expenses, funds), [expenses, funds]);
  // Earliest month with data (first fund start), up to one year ahead (forecasts only).
  const first = funds.reduce((min, fund) => (monthOf(fund.start_date) < min ? monthOf(fund.start_date) : min), monthOf(today));
  const last = addMonths(monthOf(today), 12);
  const monthLabel = formatDate(`${month}-01`, { month: 'long', year: 'numeric' });
  const forecast = overview.kind === 'future';
  const muted = { color: colors.onSurfaceVariant };
  const toggle = (id: string) => setOpen((all) => { const next = new Set(all); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const archive = async (fund: SyncedFund, value: boolean) => {
    const { id: _id, created_at: _c, revision: _r, updated_at: _u, ...data } = fund;
    if (await remote.updateFund(fund, { ...data, archived: value })) {
      if (value && defaultFundId === fund.id) onSetDefault('');
      notify(value ? "Fondo archiviato: saldo e storico restano consultabili." : "Fondo ripristinato.");
    }
  };

  const tile = (label: string, value: string, detail?: string, tone?: string) => (
    <View style={[styles.tile, { backgroundColor: colors.elevation.level1 }]} role="group" aria-label={`${label}: ${value}${detail ? `, ${detail}` : ''}`}>
      <Text variant="labelLarge" style={muted}>{label}</Text>
      <Text variant="headlineSmall" style={[styles.number, tone ? { color: tone } : null]}>{value}</Text>
      {detail ? <Text variant="bodySmall" style={muted}>{detail}</Text> : null}
    </View>
  );

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

      {/* Spending overview first: what was spent in the month (every fund and «Senza fondo»). Balances only for funds that keep them. */}
      {(funds.length > 0 || general.budget !== null) && <View style={styles.tiles}>
        {tile(forecast ? t("Spese previste") : t("Speso nel mese"), formatAmount(forecast ? overview.forecastSpent : overview.spent),
          !forecast && overview.forecastSpent > 0 ? t("Altri {p0} di rinnovi previsti", { p0: formatAmount(overview.forecastSpent) }) : undefined)}
        {anyBalance && tile(t("Disponibile ora"), formatAmount(overview.available), undefined, overview.available < 0 ? colors.error : undefined)}
        {anyBalance && tile(overview.kind === 'past' ? t("Saldo a fine mese") : t("Saldo previsto a fine mese"), formatAmount(overview.closing))}
      </View>}
      {general.budget !== null && <View style={[styles.budget, { backgroundColor: colors.elevation.level1 }]}>
        <View style={styles.budgetHeader}>
          <Text variant="titleMedium" style={styles.bold}>{t("Budget mensile")}</Text>
          <Text variant="titleMedium" style={styles.number}>{formatAmount(general.budget)}</Text>
        </View>
        <BudgetMeter label={t("Budget mensile")} spent={general.spent} budget={general.budget} state={general.state} forecast={forecast} />
        <Button mode="text" style={styles.start} disabled={!canWrite || !remote.budgetReady} onPress={() => setEditingBudget(true)}>{t("Modifica budget")}</Button>
      </View>}

      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Button mode="contained" disabled={!canWrite} onPress={() => setEditing('new')}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />}>{t("Nuovo fondo")}</Button>
        {general.budget === null && <Button mode="outlined" disabled={!canWrite || !remote.budgetReady} onPress={() => setEditingBudget(true)}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.chart} size={size} color={color} />}>{t("Imposta un budget mensile")}</Button>}
        {anyBalance && <Button mode="contained-tonal" disabled={!canWrite || activeFunds.length === 0} onPress={() => setMoving({ kind: 'income' })}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.euro} size={size} color={color} />}>{t("Aggiungi denaro")}</Button>}
        {anyBalance && <Button mode="contained-tonal" disabled={!canWrite || activeFunds.length < 2} onPress={() => setMoving({ kind: 'transfer' })}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.swap} size={size} color={color} />}>{t("Trasferisci")}</Button>}
      </View>
      {!canWrite && <Text variant="bodySmall" style={muted}>{t("Le modifiche ai fondi richiedono la connessione e dati sincronizzati.")}</Text>}

      {funds.length === 0 && remote.ready && <View style={[styles.empty, { backgroundColor: colors.elevation.level1 }]}>
        <SvgIcon shape={iconShapes.wallet} size={32} color={colors.primary} />
        <Text variant="titleMedium">{t("Nessun fondo")}</Text>
        <Text variant="bodyMedium" style={muted}>{t("I fondi sono facoltativi: Nummo funziona normalmente anche senza.")}</Text>
      </View>}

      {funds.length > 0 && orphans.length > 0 && <View style={[styles.notice, { borderColor: colors.outlineVariant }]}>
        <View style={styles.grow}>
          <Text variant="titleSmall">{orphans.length === 1 ? t("Una spesa senza fondo") : t("{p0} spese senza fondo", { p0: orphans.length })}</Text>
          <Text variant="bodyMedium" style={muted}>{t("Restano valide. Nel mese mostrato: {p0}.", { p0: formatAmount(overview.unassigned.spent) })}</Text>
        </View>
        <Button mode="outlined" disabled={!canWrite || activeFunds.length === 0} onPress={() => setAssigning(true)}>{t("Assegna a un fondo")}</Button>
      </View>}

      <View role="list" accessibilityLabel={t("Fondi")} style={styles.list}>
        {active.map((item) => <FundCard key={item.fund.id} item={item} funds={funds} open={open.has(item.fund.id)} onToggle={() => toggle(item.fund.id)}
          isDefault={item.fund.id === defaultFundId} canWrite={canWrite} tracksBalance={balanceFunds.has(item.fund.id)}
          inUse={fundInUse(item.fund.id, sources)}
          onEdit={() => setEditing(item.fund as SyncedFund)} onDefault={() => { onSetDefault(item.fund.id === defaultFundId ? '' : item.fund.id); notify(item.fund.id === defaultFundId ? "Nessun fondo predefinito." : "Fondo predefinito aggiornato."); }}
          onArchive={() => void archive(item.fund as SyncedFund, true)}
          onDelete={async () => { const done = await remote.removeFund(item.fund as SyncedFund); if (done) notify("Fondo eliminato."); return done; }}
          onAdd={() => setMoving({ kind: 'income', to: item.fund.id })}
          onRemoveMovement={async (id) => {
            const movement = movements.find((m) => m.id === id);
            const done = movement ? await remote.removeMovement(movement) : false;
            if (done) notify("Movimento eliminato.");
            return done;
          }} movements={movements} />)}
      </View>

      {archived.length > 0 && <View style={styles.list}>
        <Button mode="text" style={styles.start} aria-expanded={showArchived} onPress={() => setShowArchived(!showArchived)}
          icon={({ size, color }) => <SvgIcon shape={showArchived ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}>
          {t("Fondi archiviati ({p0})", { p0: archived.length })}</Button>
        {showArchived && <Reveal role="list" accessibilityLabel={t("Fondi archiviati")} style={styles.list}>
          {archived.map((item) => (
            <View key={item.fund.id} role="listitem" style={[styles.card, { borderColor: colors.outlineVariant }]}>
              <View style={styles.cardHeader}>
                <FundAvatar fund={item.fund} />
                <View style={styles.grow}>
                  <Text variant="titleMedium">{item.fund.name}</Text>
                  <Text variant="bodySmall" style={muted}>{t("Archiviato")}</Text>
                </View>
                {balanceFunds.has(item.fund.id) && <Text variant="titleMedium" style={styles.number}>{formatAmount(item.balance)}</Text>}
              </View>
              <View style={styles.cardActions}>
                <Button mode="text" disabled={!canWrite} onPress={() => void archive(item.fund as SyncedFund, false)}>{t("Ripristina")}</Button>
              </View>
            </View>
          ))}
        </Reveal>}
      </View>}

      {editing && <FundEditor record={editing === 'new' ? undefined : editing} funds={funds} ready={canWrite} error={remote.error}
        onSave={async (data) => {
          const saved = editing === 'new' ? await remote.createFund(data) : await remote.updateFund(editing, data);
          if (saved) notify(editing === 'new' ? "Fondo creato." : "Fondo aggiornato.");
          return saved;
        }} close={() => { setEditing(null); remote.clearError(); }} />}
      {editingBudget && <GeneralBudgetDialog budgets={remote.budgets} month={month} today={today} ready={canWrite && remote.budgetReady} error={remote.error}
        onSave={async (budgets: BudgetChange[]) => { const saved = await remote.saveBudget(budgets); if (saved) notify("Budget mensile aggiornato."); return saved; }}
        close={() => { setEditingBudget(false); remote.clearError(); }} />}
      {moving && <MovementDialog funds={activeFunds} balances={balances} kind={moving.kind} to={moving.to} ready={canWrite} error={remote.error}
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

type CardProps = {
  // Fund with balance data from earlier versions: shows balance, recharge and movements (read-only plus the old entries).
  tracksBalance: boolean;
  item: FundMonth; funds: readonly SyncedFund[]; movements: readonly SyncedMovement[]; open: boolean; isDefault: boolean; canWrite: boolean; inUse: boolean;
  onToggle: () => void; onEdit: () => void; onDefault: () => void; onArchive: () => void; onAdd: () => void;
  onDelete: () => Promise<boolean>; onRemoveMovement: (id: string) => Promise<boolean>;
};

function FundCard({ tracksBalance, item, funds, open, isDefault, canWrite, inUse, onToggle, onEdit, onDefault, onArchive, onAdd, onDelete, onRemoveMovement }: CardProps) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const { fund } = item;
  const recharge = currentRecharge(fund);
  const muted = { color: colors.onSurfaceVariant };
  const forecast = item.kind === 'future';
  const rechargeText = !recharge ? t("Senza ricarica") : recharge.active
    ? t("Ricarica di {p0} il giorno {p1}", { p0: formatAmount(recharge.amount_minor), p1: recharge.day }) : t("Ricarica sospesa");
  const detailsId = `fund-${fund.id}`;
  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name ?? t("Fondo eliminato");
  const row = (label: string, value: number, options: { sign?: boolean; strong?: boolean; hint?: string } = {}) => (
    <View style={styles.line} role="listitem">
      <Text variant={options.strong ? 'titleSmall' : 'bodyMedium'} style={[styles.grow, !options.strong && muted]}>{label}{options.hint ? ` · ${options.hint}` : ''}</Text>
      <Text variant={options.strong ? 'titleSmall' : 'bodyMedium'} style={[styles.number, value < 0 && options.strong ? { color: colors.error } : null]}>
        {options.sign && value > 0 ? '+' : ''}{formatAmount(value)}</Text>
    </View>
  );
  const spentNow = forecast ? item.forecastSpent : item.spent;
  const expenses = item.entries.filter((entry) => entry.kind === 'expense');
  return (
    <View role="listitem" style={[styles.card, { borderColor: colors.outlineVariant }]}>
      <View style={styles.cardHeader}>
        <FundAvatar fund={fund} />
        <View style={styles.grow}>
          <View style={styles.nameRow}>
            <Text variant="titleMedium" numberOfLines={2} style={styles.shrink}>{fund.name}</Text>
            {isDefault && <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
              <SvgIcon shape={iconShapes.star} size={14} color={colors.onSecondaryContainer} />
              <Text variant="labelSmall" style={{ color: colors.onSecondaryContainer }}>{t("Predefinito")}</Text>
            </View>}
          </View>
          {tracksBalance && <Text variant="bodySmall" style={muted}>{rechargeText}</Text>}
        </View>
        <View style={styles.balance}>
          <Text variant="titleLarge" style={styles.number}>{formatAmount(spentNow)}</Text>
          <Text variant="labelSmall" style={muted}>{forecast ? t("previsti") : t("speso nel mese")}</Text>
        </View>
      </View>
      {item.budget !== null && <BudgetMeter label={t("Budget di {p0}", { p0: fund.name })}
        spent={spentNow} budget={item.budget} state={item.state} forecast={forecast} />}
      <View style={styles.cardActions}>
        <Button mode="text" aria-expanded={open} aria-controls={open ? detailsId : undefined} onPress={onToggle}
          icon={({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}>
          {open ? t("Nascondi spese") : t("Spese del mese")}</Button>
        <View style={styles.spacer} />
        {tracksBalance && <IconButton disabled={!canWrite} accessibilityLabel={t("Aggiungi denaro a {p0}", { p0: fund.name })} onPress={onAdd}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />} />}
        <IconButton disabled={!canWrite} accessibilityLabel={t("Modifica {p0}", { p0: fund.name })} onPress={onEdit}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} />
      </View>
      {open && <Reveal nativeID={detailsId} role="group" accessibilityLabel={t("Dettagli di {p0}", { p0: fund.name })} style={[styles.details, { borderColor: colors.outlineVariant }]}>
        {expenses.length === 0 ? <Text variant="bodyMedium" style={muted}>{t("Nessuna spesa in questo mese.")}</Text>
          : <View role="list" accessibilityLabel={t("Spese del mese")}>
            {[...expenses].reverse().map((entry) => (
              <View key={entry.key} role="listitem" style={[styles.entry, { borderColor: colors.outlineVariant }]}>
                <View style={styles.grow}>
                  <Text variant="bodyLarge" style={entry.forecast ? muted : null}>{entry.label}</Text>
                  <Text variant="bodySmall" style={muted}>{[formatDate(entry.date), entry.forecast ? t("previsto") : ''].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text variant="bodyLarge" style={[styles.number, entry.forecast && muted]}>{formatAmount(0 - entry.amount_minor)}</Text>
              </View>
            ))}
          </View>}
        {tracksBalance && <>
          <Text variant="titleSmall" style={styles.subheading}>{t("Saldo e movimenti")}</Text>
          <Text variant="bodySmall" style={muted}>{t("Dati di una versione precedente: restano conservati e consultabili.")}</Text>
          <View role="list" accessibilityLabel={t("Riepilogo del mese")}>
            {row(t("Saldo a inizio mese"), item.opening, { strong: true })}
            {item.initial > 0 && row(t("Saldo iniziale"), item.initial, { sign: true })}
            {row(t("Ricariche ricevute"), item.recharges, { sign: true })}
            {item.forecastRecharges > 0 && row(t("Ricariche previste"), item.forecastRecharges, { sign: true })}
            {item.income > 0 && row(t("Entrate"), item.income, { sign: true })}
            {item.transfersIn > 0 && row(t("Trasferimenti ricevuti"), item.transfersIn, { sign: true })}
            {item.transfersOut > 0 && row(t("Trasferimenti inviati"), 0 - item.transfersOut, { sign: true })}
            {row(t("Spese"), 0 - item.spent, { sign: true })}
            {item.forecastSpent > 0 && row(t("Rinnovi previsti"), 0 - item.forecastSpent, { sign: true })}
            {row(item.kind === 'past' ? t("Saldo a fine mese") : t("Saldo previsto a fine mese"), item.closing, { strong: true })}
          </View>
          {item.entries.some((entry) => entry.kind !== 'expense') && <View role="list" accessibilityLabel={t("Movimenti del mese")}>
            {[...item.entries].reverse().filter((entry) => entry.kind !== 'expense').map((entry) => {
              const kind = t(entryLabels[entry.kind]);
              const other = entry.kind === 'transfer-in' ? t("da {p0}", { p0: fundName(entry.otherFundId) }) : entry.kind === 'transfer-out' ? t("a {p0}", { p0: fundName(entry.otherFundId) }) : '';
              const title = [kind, other].filter(Boolean).join(' ');
              const subtitle = [formatDate(entry.date), entry.label, entry.forecast ? t("previsto") : ''].filter(Boolean).join(' · ');
              return (
                <View key={entry.key} role="listitem" style={[styles.entry, { borderColor: colors.outlineVariant }]}>
                  <View style={styles.grow}>
                    <Text variant="bodyLarge" style={entry.forecast ? muted : null}>{title}</Text>
                    <Text variant="bodySmall" style={muted}>{subtitle}</Text>
                  </View>
                  <Text variant="bodyLarge" style={[styles.number, entry.forecast && muted]}>{entry.amount_minor > 0 ? '+' : ''}{formatAmount(entry.amount_minor)}</Text>
                  {entry.movementId && !entry.forecast && canWrite ? <DeleteAction name={title} description={t("Il saldo dei fondi coinvolti viene ricalcolato. L’operazione non può essere annullata.")}
                    onDelete={() => onRemoveMovement(entry.movementId!)} /> : <View style={styles.iconSlot} />}
                </View>
              );
            })}
          </View>}
        </>}
        <View style={styles.cardActions}>
          <Button mode="text" disabled={!canWrite} onPress={onDefault}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.star} size={size} color={color} />}>
            {isDefault ? t("Togli come predefinito") : t("Usa come predefinito")}</Button>
          <Button mode="text" disabled={!canWrite} onPress={onArchive}
            icon={({ size, color }) => <SvgIcon shape={iconShapes.archive} size={size} color={color} />}>{t("Archivia")}</Button>
          {!inUse && <DeleteAction labeled disabled={!canWrite} name={fund.name} title={t("Eliminare il fondo {p0}?", { p0: fund.name })}
            description={t("Il fondo non ha movimenti né spese collegate. L’operazione non può essere annullata.")} onDelete={onDelete} />}
        </View>
        {inUse && <Text variant="bodySmall" style={muted}>{t("Un fondo con movimenti o spese collegate non si può eliminare: archivialo per toglierlo dalle scelte senza perdere lo storico.")}</Text>}
      </Reveal>}
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
          {t("{p0} spese registrate senza fondo (di cui {p1} ricorrenti) verranno assegnate al fondo scelto: il suo saldo diminuirà di quanto già pagato. Importi, date e categorie non cambiano.", { p0: orphans.length, p1: series })}</Text>
        <SelectField label={t("Fondo")} value={fundId} disabled={busy || !ready} onChange={setFundId}
          options={funds.map((fund) => ({ value: fund.id, label: fund.name, icon: <FundAvatar fund={fund} size={24} /> }))} />
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t("Puoi sempre cambiare il fondo di una singola spesa dalla sua modifica.")}</Text>
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </Dialog.Content>
      <Dialog.Actions>
        <Button disabled={busy} onPress={close}>{t("Annulla")}</Button>
        <Button mode="contained" disabled={busy || !ready || !fundId} loading={busy} onPress={async () => {
          setBusy(true);
          try { if (await onAssign(fundId)) close(); } finally { setBusy(false); }
        }}>{t("Assegna")}</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: spacing.lg },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  monthTitle: { alignItems: 'center', minWidth: 160 },
  capitalize: { textTransform: 'capitalize' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexGrow: 1, flexBasis: 160, minWidth: 0, borderRadius: radius.card, padding: spacing.lg, gap: spacing.xs },
  budget: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  bold: { fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionsCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  empty: { borderRadius: radius.card, padding: spacing.xl, gap: spacing.sm, alignItems: 'flex-start' },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.card, padding: spacing.lg },
  list: { gap: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  balance: { alignItems: 'flex-end', flexShrink: 0 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginHorizontal: -spacing.sm },
  spacer: { flexGrow: 1 },
  details: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  subheading: { marginTop: spacing.md },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs },
  iconSlot: { width: 48 },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  number: { fontVariant: ['tabular-nums'] },
  start: { alignSelf: 'flex-start' },
  dialogContent: { gap: spacing.md },
});
