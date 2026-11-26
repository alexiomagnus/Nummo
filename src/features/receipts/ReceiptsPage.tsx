import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, HelperText, Text, useTheme } from 'react-native-paper';
import { Button, DangerButton } from '../../components/Button';
import { ListGrid, ListGroup, RowBody, StatusRow } from '../../components/ActionList';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DeleteDialog } from '../../components/DeleteAction';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { SameWidthGroup } from '../../components/SameWidth';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { ExpenseRecord } from '../../domain/contract';
import { aiProviderLabels } from '../../domain/receiptAi';
import type { ScannedReceipt } from '../../domain/scannedReceipt';
import { useI18n } from '../../i18n/I18nProvider';
import { radius } from '../../theme/tokens';
import { DetailHero, DetailScreen, InfoGroup, InfoRow } from '../history/DetailScreen';
import { ProductsDialog } from '../history/ProductsDialog';
import { ReceiptAiCard } from './ReceiptAiCard';
import type { RemoteReceipts } from './useRemoteReceipts';

type Props = {
  remote: RemoteReceipts;
  // Every expense of the archive and the categories: each receipt shows the expense it belongs to.
  expenses: readonly ExpenseRecord[];
  categories: readonly Category[];
};

// The expense a receipt belongs to (same ID), with its category; undefined when it is no longer there.
type Linked = { description: string; category?: Category } | undefined;

// «Lista scontrini» (account menu, under Templates; 26 November, on request): the receipt scan settings, moved here from
// Settings, and every receipt read by a scan and saved with its expense, newest first. A tap opens what was read; a receipt
// can be removed on its own (the expense stays). No photo: it was never kept.
export function ReceiptsPage({ remote, expenses, categories }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);
  const linked = useMemo(() => {
    const byCategory = new Map(categories.map((c) => [c.id, c]));
    return new Map(expenses.map((e) => [e.id, { description: e.description, category: e.category_id ? byCategory.get(e.category_id) : undefined }]));
  }, [expenses, categories]);
  const open = openId ? remote.receipts.find((r) => r.id === openId) ?? null : null;
  const count = (n: number) => n === 1 ? t("1 prodotto") : t("{p0} prodotti", { p0: n });
  const subtitle = (r: ScannedReceipt) => [r.date ? formatDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' }) : t("Data non letta"),
    ...(r.items.length > 0 ? [count(r.items.length)] : [])].join(' · ');
  return (
    // The AI card's two actions share one width from medium (they did in Settings, with «Ripristina predefiniti»).
    <SameWidthGroup>
    <ListGrid>
      <ReceiptAiCard />
      {/* The same grouped rows as «Info» (27 November, on request). */}
      <ListGroup icon={iconShapes.receipt} label={t("Scontrini scansionati")}>
        {/* The note about what is kept (the data read, never the photo) is gone (27 November, on request); only an error is shown here. */}
        {remote.error && <RowBody><HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText></RowBody>}
        {remote.ready && remote.receipts.length === 0 && <StatusRow icon={iconShapes.receipt} tone="secondary" title={t("Nessuno scontrino.")} />}
        <View role="list" accessibilityLabel={t("Scontrini scansionati")}>
          {remote.receipts.map((r, index) => {
            const title = r.merchant ?? t("Esercente non letto");
            return <ListRow key={r.id} icon={linked.get(r.id)?.category?.icon ?? null} title={title} subtitle={subtitle(r)}
              divider={index < remote.receipts.length - 1} opens onPress={() => setOpenId(r.id)} pressLabel={t("Dettagli dello scontrino di {p0}", { p0: title })}
              trailing={r.total_minor !== null ? <Text variant="bodyLarge" style={listRowStyles.amount}>{formatAmount(r.total_minor)}</Text> : undefined} />;
          })}
        </View>
      </ListGroup>
      <ReceiptDetail receipt={open} linked={open ? linked.get(open.id) : undefined} onClose={() => setOpenId(null)} onRemove={remote.remove} />
    </ListGrid>
    </SameWidthGroup>
  );
}

function ReceiptDetail({ receipt, linked, onClose, onRemove }: { receipt: ScannedReceipt | null; linked: Linked; onClose: () => void;
  onRemove: (receipt: ScannedReceipt) => boolean }) {
  const { t } = useI18n();
  return <DetailScreen value={receipt} cardId={(shown) => `receipt-${shown.id}`}
    label={(shown) => t("Dettagli dello scontrino di {p0}", { p0: shown.merchant ?? t("Esercente non letto") })} backLabel={t("Torna agli scontrini")} onClose={onClose}>
    {(shown) => <ReceiptContent receipt={shown} linked={linked} onRemove={() => { if (onRemove(shown)) { onClose(); return true; } return false; }} />}
  </DetailScreen>;
}

function ReceiptContent({ receipt, linked, onRemove }: { receipt: ScannedReceipt; linked: Linked; onRemove: () => boolean }) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const [showProducts, setShowProducts] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const muted = colors.onSurfaceVariant;
  const title = receipt.merchant ?? t("Esercente non letto");
  const longDate = receipt.date ? formatDate(receipt.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const products = receipt.items.length;
  const rows = [
    <InfoRow key="date" icon={<SvgIcon shape={iconShapes.calendar} size={24} color={muted} />} label={t("Data")}
      value={longDate ? longDate.charAt(0).toLocaleUpperCase() + longDate.slice(1) : t("Non letta")} />,
    <InfoRow key="expense" icon={linked?.category?.icon ? <CategoryGlyph icon={linked.category.icon} size={24} color={muted} />
      : <SvgIcon shape={iconShapes.tag} size={24} color={muted} />} label={t("Spesa")}
      value={linked ? (linked.category ? `${linked.description} · ${linked.category.label}` : linked.description) : t("La spesa non esiste più")} />,
  ];
  if (receipt.discount_minor !== null) rows.push(<InfoRow key="discount" icon={<SvgIcon shape={iconShapes.tag} size={24} color={muted} />}
    label={t("Sconto")} value={formatAmount(receipt.discount_minor)} />);
  rows.push(<InfoRow key="products" icon={<SvgIcon shape={iconShapes.checklist} size={24} color={muted} />} label={t("Prodotti letti")}
    value={products === 0 ? t("Nessun prodotto letto") : products === 1 ? t("1 prodotto") : t("{p0} prodotti", { p0: products })}
    action={products > 0 ? <Button mode="contained-tonal" aria-haspopup="dialog" onPress={() => setShowProducts(true)}
      accessibilityLabel={t("Prodotti letti dallo scontrino di {p0}, {p1}", { p0: title, p1: products })}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.checklist} size={size} color={color} />}>
      {t("Prodotti ({p0})", { p0: products })}</Button> : undefined} />);
  rows.push(<InfoRow key="provider" icon={<SvgIcon shape={iconShapes.receipt} size={24} color={muted} />} label={t("Letto con")}
    value={aiProviderLabels[receipt.provider]} />);
  return <>
    <DetailHero icon={linked?.category?.icon ?? null} title={title} amount={receipt.total_minor !== null ? formatAmount(receipt.total_minor) : t("Totale non letto")}
      muted={receipt.total_minor === null} />
    <InfoGroup rows={rows} />
    {/* Red pill, as every labelled «Elimina»: only the receipt goes, the expense stays. */}
    <DangerButton style={styles.remove} accessibilityLabel={t("Elimina lo scontrino di {p0}", { p0: title })} onPress={() => setConfirm(true)}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />}>{t("Elimina scontrino")}</DangerButton>
    <DeleteDialog visible={confirm} name={title} title={t("Eliminare questo scontrino?")}
      description={t("La spesa resta com’è: si eliminano solo i dati letti dallo scontrino. L’operazione non può essere annullata.")}
      onDismiss={() => setConfirm(false)} onConfirm={onRemove} />
    {showProducts && <ProductsDialog description={title} products={receipt.items} onClose={() => setShowProducts(false)} />}
  </>;
}

const styles = StyleSheet.create({
  remove: { borderRadius: radius.pill },
});
