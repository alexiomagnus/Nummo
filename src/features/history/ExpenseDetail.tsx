import { useState } from 'react';
import { useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { Fund } from '../../domain/funds';
import type { Occurrence } from '../../domain/history';
import { recurrenceLabels } from '../../domain/recurrence';
import { useI18n } from '../../i18n/I18nProvider';
import { FundAvatar, NoFundAvatar } from '../funds/FundAvatar';
import { DetailHero, DetailMarks, DetailMerchant, DetailScreen, InfoGroup, InfoRow, Mark, PrimaryAction } from './DetailScreen';
import { ProductsDialog } from './ProductsDialog';

// Detail screen of one expense of the Spese list (shell and Back in DetailScreen.tsx). Modifica opens the usual
// editor above it; deleting stays in the editor (no second way with its own logic).

// DOM id of the element around each card of the list (ExpenseList), a stable hook for checks in the browser.
export const expenseCardId = (expenseId: string) => `expense-card-${expenseId}`;

export type ExpenseDetailValue = {
  item: Occurrence; category?: Category;
  // undefined: no funds at all (no row); null: the expense has no fund (or a fund no longer listed).
  fund?: Fund | null;
  merchant?: string; products?: readonly string[]; pending: boolean;
};

export function ExpenseDetail({ value, onClose, onEdit }: { value: ExpenseDetailValue | null; onClose: () => void; onEdit?: (expenseId: string) => void }) {
  const { t } = useI18n();
  return <DetailScreen value={value} cardId={(shown) => expenseCardId(shown.item.expenseId)}
    label={(shown) => t("Dettagli di {p0}", { p0: shown.item.description })} backLabel={t("Torna alle uscite")} onClose={onClose}>
    {(shown) => <ExpenseContent {...shown} onEdit={onEdit} />}
  </DetailScreen>;
}

function ExpenseContent({ item, category, fund, merchant, products, pending, onEdit }: ExpenseDetailValue & { onEdit?: (expenseId: string) => void }) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const [showProducts, setShowProducts] = useState(false);
  const muted = colors.onSurfaceVariant;
  const longDate = formatDate(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const rows = [
    <InfoRow key="date" icon={<SvgIcon shape={iconShapes.calendar} size={24} color={muted} />} label={t("Data")}
      value={longDate.charAt(0).toLocaleUpperCase() + longDate.slice(1)} />,
    <InfoRow key="category" icon={category?.icon ? <CategoryGlyph icon={category.icon} size={24} color={muted} />
      : <SvgIcon shape={iconShapes.tag} size={24} color={muted} />} label={t("Categoria")} value={category?.label ?? t("Senza categoria")} />,
  ];
  if (fund !== undefined) rows.push(<InfoRow key="fund" icon={fund ? <FundAvatar fund={fund} size={28} /> : <NoFundAvatar size={28} />}
    label={t("Fondo")} value={fund ? fund.name : t("Nessun fondo")} />);
  if (item.recurrence) rows.push(<InfoRow key="repeat" icon={<SvgIcon shape={iconShapes.rotateCcw} size={24} color={muted} />}
    label={t("Ripetizione")} value={t(recurrenceLabels[item.recurrence])} />);
  if (products) rows.push(<InfoRow key="products" icon={<SvgIcon shape={iconShapes.checklist} size={24} color={muted} />}
    label={t("Prodotti acquistati")} value={products.length === 0 ? t("Nessun prodotto spuntato") : products.length === 1 ? t("1 prodotto") : t("{p0} prodotti", { p0: products.length })}
    action={products.length > 0 ? <Button mode="contained-tonal" aria-haspopup="dialog" onPress={() => setShowProducts(true)}
      accessibilityLabel={t("Prodotti acquistati di {p0}, {p1}", { p0: item.description, p1: products.length })}
      icon={({ size, color }) => <SvgIcon shape={iconShapes.checklist} size={size} color={color} />}>
      {t("Prodotti ({p0})", { p0: products.length })}</Button> : undefined} />);
  return <>
    <DetailHero icon={category?.icon ?? null} title={item.description} amount={formatAmount(item.amount_minor)}>
      {merchant && <DetailMerchant name={merchant} label={t("Esercente")} />}
      {(products || pending) && <DetailMarks>
        {products && <Mark icon={iconShapes.checklist} label={t("Lista spesa")} background={colors.secondaryContainer} color={colors.onSecondaryContainer} />}
        {pending && <Mark icon={iconShapes.sync} label={t("In attesa di invio")} background={colors.surfaceVariant} color={colors.onSurfaceVariant} />}
      </DetailMarks>}
    </DetailHero>
    <InfoGroup rows={rows} />
    {onEdit && <PrimaryAction label={t("Modifica")} accessibilityLabel={t("Modifica {p0}", { p0: item.description })} icon={iconShapes.pencil}
      onPress={() => onEdit(item.expenseId)} />}
    {showProducts && products && <ProductsDialog description={item.description} products={products} onClose={() => setShowProducts(false)} />}
  </>;
}
