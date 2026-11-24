// The prefill link of «Nuova spesa» (`domain/prefillLink.ts`) as the browser gives it: from the address at start (a link opened
// from an automation loads the page) or from a hash change in a page already open. The address is cleaned at once, so a reload
// or Back never fills the form again. The workspace listens while mounted; a link read before it is ready (Auth, mode choice,
// sign-in) waits and is delivered at subscription, as a tapped notification is (`pushNotifications.ts`).
import { readPrefillHash, type PrefillLink } from '../domain/prefillLink';

let pending: PrefillLink | null = null;
const listeners = new Set<(link: PrefillLink) => void>();

function take(): PrefillLink | null {
  const link = readPrefillHash(window.location.hash);
  if (link) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  return link;
}

if (typeof window !== 'undefined') {
  pending = take();
  window.addEventListener('hashchange', () => {
    const link = take();
    if (!link) return;
    if (listeners.size === 0) pending = link;
    listeners.forEach((listener) => listener(link));
  });
}

export function onPrefillLink(listener: (link: PrefillLink) => void): () => void {
  listeners.add(listener);
  if (pending) { const link = pending; pending = null; listener(link); }
  return () => listeners.delete(listener);
}
