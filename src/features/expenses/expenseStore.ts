import type { ExpenseRecord } from '../../domain/contract';
import type { ExpenseData } from '../../domain/expense';
import type { Submission } from '../../domain/submission';

// What the sections need, whether expenses live in this browser or behind the backend.
export type ExpenseStore = Readonly<{
  expenses: readonly ExpenseRecord[];
  ready: boolean;
  error: string | null;
  submission: Submission;
  submit: (data: ExpenseData) => void;
  // Same expense_id and data as the uncertain attempt.
  retry: () => void;
  // After a confirmation or a definitive rejection.
  startNew: () => void;
  // Absent when deleting is not supported (backend: outside the MVP).
  remove?: (id: string) => boolean;
  storageNote: string;
}>;
