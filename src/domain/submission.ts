import { isUtcTimestamp, type Receipt } from './contract.ts';
import type { ExpenseRequest } from './expense.ts';

export type { Receipt };
export type Submission =
  | { status: 'draft' }
  | { status: 'sending'; request: ExpenseRequest }
  | { status: 'uncertain'; request: ExpenseRequest }
  | { status: 'confirmed'; request: ExpenseRequest; receipt: Receipt }
  | { status: 'rejected'; request: ExpenseRequest; message: string };

export type SubmissionEvent =
  | { type: 'send'; request: ExpenseRequest }
  | { type: 'uncertain' }
  | { type: 'retry' }
  | { type: 'confirmed'; receipt: Receipt }
  // Only an authoritative rejection that guarantees no write may unlock editing.
  | { type: 'rejected'; message: string }
  | { type: 'new-draft' };

export function submissionReducer(state: Submission, event: SubmissionEvent): Submission {
  switch (event.type) {
    case 'send':
      if (state.status !== 'draft' && state.status !== 'rejected') return state;
      if (state.status === 'rejected' && state.request.expense_id === event.request.expense_id) return state;
      return { status: 'sending', request: Object.freeze({ ...event.request }) };
    case 'uncertain':
      return state.status === 'sending' ? { status: 'uncertain', request: state.request } : state;
    case 'retry':
      return state.status === 'uncertain' ? { status: 'sending', request: state.request } : state;
    case 'confirmed':
      if (state.status !== 'sending' && state.status !== 'uncertain') return state;
      if (event.receipt.expense_id !== state.request.expense_id || !isUtcTimestamp(event.receipt.created_at)) {
        return { status: 'uncertain', request: state.request };
      }
      return { status: 'confirmed', request: state.request, receipt: Object.freeze({ ...event.receipt }) };
    case 'rejected':
      return state.status === 'sending'
        ? { status: 'rejected', request: state.request, message: event.message } : state;
    case 'new-draft':
      return state.status === 'confirmed' || state.status === 'rejected' ? { status: 'draft' } : state;
  }
}

// Callable error codes that guarantee nothing was written (checked before any reservation).
// Anything else, including network failures and timeouts, leaves the outcome uncertain.
const definitiveRejections = new Set(['invalid-argument', 'already-exists', 'permission-denied', 'unauthenticated']);

export function isDefinitiveRejection(code: string): boolean {
  return definitiveRejections.has(code.replace(/^functions\//, ''));
}
