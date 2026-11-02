import type { ExpenseRequest } from './expense.ts';

export type Receipt = Readonly<{ expense_id: string; created_at: string }>;
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

function isUtcTimestamp(value: string): boolean {
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === canonical;
}
