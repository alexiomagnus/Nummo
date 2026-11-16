import type { ExpenseRecord } from '../../domain/contract';
import type { ExpenseData } from '../../domain/expense';
import type { Merchant } from '../../domain/merchant';
import type { Submission } from '../../domain/submission';

// UI-facing contract; persistence and synchronization stay in the service/hooks.
export type ExpenseStore = Readonly<{
  expenses: readonly ExpenseRecord[];
  ready: boolean;
  error: string | null;
  submission: Submission;
  // `merchant`: a merchant used for the first time, saved with the expense.
  submit: (data: ExpenseData, merchant?: Merchant | null) => void;
  // Read-only server verification of the uncertain attempt; SDK owns retries.
  retry: () => void;
  // After a confirmation or a definitive rejection.
  startNew: () => void;
  // Async mutations report success only after their server transaction.
  remove?: (record: ExpenseRecord) => boolean | Promise<boolean>;
  update?: (record: ExpenseRecord, data: ExpenseData, merchant?: Merchant | null) => Promise<boolean>;
  recovery?: readonly ExpenseRecord[];
  sync?: Readonly<{ fromCache: boolean; pending: boolean }>;
  storageNote: string;
  // The archive is on this device: a save is final at once, nothing waits for a server.
  local?: boolean;
}>;
