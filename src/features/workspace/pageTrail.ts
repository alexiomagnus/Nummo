// Pages visited before the current one, for Android/browser Back (user's request, 22 November: «exactly one step back»,
// not always to «Nuova spesa»). Presentation state only, never saved: it starts empty at every launch.
//
// Each navigation to a different page adds the page being left; Back goes to the last one and drops it. «Fatto» of an
// account page goes back to the page it was opened from as a step back (see `done`), never adding the account page.
// The trail is capped: the oldest steps are forgotten, and Back from a page with an empty trail goes to «Nuova spesa»
// (the start), from where Back leaves the app.

export const maxTrail = 20;

export type Trail<T> = readonly T[];

export function visit<T>(trail: Trail<T>, from: T, to: T): Trail<T> {
  if (from === to) return trail;
  const next = [...trail, from];
  return next.length > maxTrail ? next.slice(next.length - maxTrail) : next;
}

// The page Back opens and the trail left, or null when Back has nowhere to go inside the app (start page, empty trail).
export function stepBack<T>(trail: Trail<T>, current: T, start: T): { to: T; trail: Trail<T> } | null {
  const last = trail[trail.length - 1];
  if (last !== undefined) return { to: last, trail: trail.slice(0, -1) };
  return current === start ? null : { to: start, trail };
}

// «Fatto» of an account page: back to the page it was opened from, dropping the account pages visited since (Impostazioni →
// Categorie → Fatto: Back afterwards must not reopen them). A plain visit when that page is no longer in the trail.
export function done<T>(trail: Trail<T>, current: T, returnTo: T): { to: T; trail: Trail<T> } {
  const at = trail.lastIndexOf(returnTo);
  return at >= 0 ? { to: returnTo, trail: trail.slice(0, at) } : { to: returnTo, trail: visit(trail, current, returnTo) };
}
