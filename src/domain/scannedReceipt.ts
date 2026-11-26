// Scanned receipts (pure, no SDK; 26 November 2026, on request: the «Lista scontrini» page). Until then a scan kept nothing:
// now what the AI read from a receipt is kept, never the photo, and only when the expense filled from it is saved with
// «Salva» (no write of its own, never a receipt without its expense). One receipt per expense: its ID is the expense's ID,
// so deleting the expense deletes it in the same write, and «Elimina tutte le spese» takes them all. Immutable: a receipt
// is what was read on that day; editing the expense later does not change it.
// Archive data in both modes (Firestore `receipts/{expense id}`, IndexedDB store `receipts`), in backups from v12.
import { isUtcTimestamp, isUuid } from './contract.ts';
import { parseAmountMinor } from './expense.ts';
import { merchantPolicy, normalizeMerchantName } from './merchant.ts';
import { clipToLength, expensePolicy, isValidDate, listPolicy } from './policy.ts';
import { aiProviders, type AiProvider } from './receiptAi.ts';

export const scannedReceiptPolicy = { maxItems: listPolicy.maxItems, maxItemLength: listPolicy.maxItemLength, maxDate: '2099-12-31' } as const;

export type ScannedReceiptData = Readonly<{
  // Shop name as reviewed (normalised, at most 60 characters); null when not read.
  merchant: string | null;
  // Total as reviewed, in cents; null when not read or not usable.
  total_minor: number | null;
  // Civil date printed on the receipt, as reviewed; null when not read.
  date: string | null;
  // Products read (names only, at most 500 of 60 characters), in the receipt's order.
  items: readonly string[];
  // Discount total read, in cents; null when none.
  discount_minor: number | null;
  // The AI service that read it.
  provider: AiProvider;
}>;
export type ScannedReceipt = Readonly<ScannedReceiptData & { id: string; created_at: string }>;

const validAmount = (value: unknown) => value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= expensePolicy.maxAmountMinor);
const validItem = (value: unknown) => typeof value === 'string' && value !== '' && value === value.replace(/\s+/gu, ' ').trim()
  && Array.from(value).length <= scannedReceiptPolicy.maxItemLength;
const validMerchant = (value: unknown) => value === null || (typeof value === 'string' && value !== '' && normalizeMerchantName(value) === value
  && Array.from(value).length <= merchantPolicy.maxNameLength);
const validDate = (value: unknown) => value === null || (typeof value === 'string' && isValidDate(value) && value >= expensePolicy.minDate && value <= scannedReceiptPolicy.maxDate);

// Untrusted input (a stored document, a backup): the same limits as the scan.
export function parseScannedReceiptData(v: Record<string, unknown>): ScannedReceiptData | null {
  const items = v.items;
  const ok = validMerchant(v.merchant) && validAmount(v.total_minor) && validDate(v.date) && validAmount(v.discount_minor)
    && Array.isArray(items) && items.length <= scannedReceiptPolicy.maxItems && items.every(validItem)
    && (aiProviders as readonly unknown[]).includes(v.provider);
  return ok ? { merchant: v.merchant as string | null, total_minor: v.total_minor as number | null, date: v.date as string | null,
    items: [...(items as string[])], discount_minor: v.discount_minor as number | null, provider: v.provider as AiProvider } : null;
}
export function parseScannedReceipt(value: unknown): ScannedReceipt | null {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!v || !isUuid(v.id) || !isUtcTimestamp(v.created_at)) return null;
  const data = parseScannedReceiptData(v);
  return data ? { ...data, id: v.id as string, created_at: v.created_at as string } : null;
}

export const scannedReceiptFields = (d: ScannedReceiptData): ScannedReceiptData => ({ merchant: d.merchant, total_minor: d.total_minor, date: d.date,
  items: [...d.items], discount_minor: d.discount_minor, provider: d.provider });
export const sameScannedReceipt = (a: ScannedReceipt, b: ScannedReceipt): boolean => a.id === b.id && a.created_at === b.created_at
  && a.merchant === b.merchant && a.total_minor === b.total_minor && a.date === b.date && a.discount_minor === b.discount_minor
  && a.provider === b.provider && a.items.length === b.items.length && a.items.every((item, i) => item === b.items[i]);

// Newest first: by the date on the receipt (or the day it was saved, when the date was not read), then by when it was saved.
export const sortScannedReceipts = <T extends ScannedReceipt>(items: readonly T[]): T[] => {
  const day = (r: T) => r.date ?? r.created_at.slice(0, 10);
  return [...items].sort((a, b) => day(b).localeCompare(day(a)) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
};

// What a reviewed scan keeps: shop, total and date as the user left them in the review (a value cleared or not usable is
// null), products and discount as read. Nothing else of the scan (description and category are the model's guesses, and
// the expense keeps the chosen ones).
export function receiptFromScan(reviewed: Readonly<{ merchant: string; amount: string; date: string }>,
  read: Readonly<{ items: readonly string[]; discountMinor: number | null }>, provider: AiProvider): ScannedReceiptData {
  const merchant = clipToLength(normalizeMerchantName(reviewed.merchant), merchantPolicy.maxNameLength).trim();
  const amount = reviewed.amount.trim() ? parseAmountMinor(reviewed.amount.trim()) : null;
  const date = reviewed.date.trim();
  const items = read.items.map((item) => clipToLength(item.replace(/\s+/gu, ' ').trim(), scannedReceiptPolicy.maxItemLength).trim())
    .filter(Boolean).slice(0, scannedReceiptPolicy.maxItems);
  return {
    merchant: merchant && validMerchant(merchant) ? merchant : null,
    total_minor: amount !== null && validAmount(amount) ? amount : null,
    date: date && validDate(date) ? date : null,
    items, discount_minor: read.discountMinor !== null && validAmount(read.discountMinor) ? read.discountMinor : null, provider,
  };
}
