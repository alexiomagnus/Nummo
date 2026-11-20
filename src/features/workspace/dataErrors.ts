// Error shown by a data hook (expenses, categories, funds, lists), kept apart by origin. A failed listener is final for
// that mount (Firestore ends the subscription), so its message must stay until that same listener delivers a snapshot:
// a snapshot of another listener, a later successful operation or a dismissed dialog must never hide it, or the page
// would wait forever with no message (`ready` stays false). Operation errors keep their usual life: a new operation,
// a dismissal (`clearError`) or any snapshot clears them.
export type DataErrors = Readonly<{ listeners: Readonly<Record<string, string>>; action: string | null }>;

export const noDataErrors: DataErrors = { listeners: {}, action: null };

export function listenerFailed(state: DataErrors, source: string, message: string): DataErrors {
  return { ...state, listeners: { ...state.listeners, [source]: message } };
}

// A snapshot arrived from `source`: its own failure is over; the other listeners' and the operation's messages stay.
export function listenerRecovered(state: DataErrors, source: string): DataErrors {
  if (!(source in state.listeners)) return state;
  const listeners = { ...state.listeners };
  delete listeners[source];
  return { ...state, listeners };
}

// The same, for hooks where a fresh snapshot also clears an operation message (expenses, categories, funds). Not for
// the lists: there a queued write's error arrives together with the snapshot that rolls it back, and must stay.
export function snapshotReceived(state: DataErrors, source: string): DataErrors {
  const recovered = listenerRecovered(state, source);
  return recovered.action === null ? recovered : { ...recovered, action: null };
}

export function actionFailed(state: DataErrors, message: string): DataErrors {
  return state.action === message ? state : { ...state, action: message };
}

// An operation succeeded or its message was dismissed: listener failures stay.
export function actionCleared(state: DataErrors): DataErrors {
  return state.action === null ? state : { ...state, action: null };
}

// The message to show: the latest operation error first, otherwise the first failed listener (in failure order).
export function visibleError(state: DataErrors): string | null {
  return state.action ?? Object.values(state.listeners)[0] ?? null;
}
