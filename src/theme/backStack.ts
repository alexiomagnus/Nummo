// Android Back (and the browser's Back) closes what is open, one layer at a time, instead of leaving the app.
//
// The app has no router: pages, the open list and every overlay are React state. Each of them registers a layer while it
// is open; the history holds **one** extra entry (the guard) above the page's own entry while at least one layer is open.
// Back consumes the guard: the topmost layer closes and, if layers remain, the guard comes back. A layer closed from the
// interface (Annulla, Fatto, the scrim, Escape) consumes the guard silently when it was the last one.
//
// Why a single guard and not one entry per layer: Chrome skips, on Back, the entries a page added without a user gesture.
// A skipped entry in the middle would make Back leave the app; the guard is always the top entry, so only the page's own
// entry (a real navigation) is below it.
//
// Why the guard comes back with `history.forward()` and never with a new `pushState` after a Back (22 November, on report:
// «Back goes back one or two steps, then leaves the app»): Chrome's history manipulation intervention marks **every**
// entry of the document as skippable when it adds an entry without a user activation, and after a back/forward it no
// longer honours the earlier activation (crbug.com/1248529). The guard pushed again right after Back had none, so the next
// Back skipped the whole app and closed it. After a Back the guard is still the forward entry: moving onto it adds
// nothing, and the History API is not subject to the intervention. `pushState` is left for a guard opened by a tap (the
// first layer), when there is no guard ahead. If the forward entry is not the guard (the guide pushed its own entry in the
// meantime) the stack steps back and pushes; if there is no forward entry at all, a timeout pushes.
//
// Pure: the window is injected (tests use a fake history); `components/BackNavigation.ts` binds it to the page.

export type BackHistory = {
  readonly state: unknown;
  pushState(data: unknown, unused: string, url?: string | null): void;
  back(): void;
  forward(): void;
};

export type BackWindow = {
  history: BackHistory;
  location: { readonly href: string };
  addEventListener(type: 'popstate', listener: () => void): void;
};

// Higher levels close first; within a level, the most recently opened. A page and the detail inside it may register in
// the same commit, children first (React runs child effects first): the level keeps the order right anyway.
// `lock`: the app lock screen (features/lock), above everything; it refuses, so Back does nothing while locked.
export const backLevels = { page: 0, detail: 1, overlay: 2, lock: 3 } as const;
export type BackLevel = (typeof backLevels)[keyof typeof backLevels];

// `onBack` closes the layer and returns true, or returns false to refuse (a dialog busy with an operation): the layer
// stays and the guard comes back.
export type BackStack = { register(level: BackLevel, onBack: () => boolean): () => void; readonly depth: number };

const guardKey = 'nummoBack';
export const guardState = Object.freeze({ [guardKey]: true });
export const isGuard = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>)[guardKey] === true;

type Layer = { level: number; order: number; onBack: () => boolean };

// Time to wait for the popstate of a `history.forward()` before concluding there was no entry ahead.
export const forwardTimeout = 400;

export function createBackStack(win: BackWindow, schedule: (run: () => void) => void = queueMicrotask,
  wait: (run: () => void, ms: number) => () => void = (run, ms) => { const id = setTimeout(run, ms); return () => clearTimeout(id); }): BackStack {
  const layers: Layer[] = [];
  let order = 0;
  // Our own `history.back()` calls whose popstate has not arrived yet: until then nothing is pushed.
  let silent = 0;
  // Our own `history.forward()` onto the guard, until its popstate (or the timeout) arrives.
  let forwarding: (() => void) | null = null;
  // Whether the entry ahead is the guard (left by Back, ours or the user's): it is reached again with forward().
  let guardAhead = false;
  let scheduled = false;
  // Whether the current entry was the guard at the last observation (popstate does not say where it came from).
  let onGuard = isGuard(win.history.state);

  const top = () => layers.reduce<Layer | undefined>((best, layer) =>
    !best || layer.level > best.level || (layer.level === best.level && layer.order > best.order) ? layer : best, undefined);

  // Several layers open and close in one commit (a menu item opening a page): only the final count matters.
  const sync = () => {
    scheduled = false;
    if (silent > 0 || forwarding) return;
    const atGuard = isGuard(win.history.state);
    if (layers.length > 0 && !atGuard) {
      if (guardAhead) {
        const cancel = wait(() => { forwarding = null; guardAhead = false; request(); }, forwardTimeout);
        forwarding = cancel;
        win.history.forward();
        return;
      }
      win.history.pushState(guardState, '', win.location.href);
      guardAhead = false;
    }
    // Checked on the real state, never on a belief: a stray `back()` in a browser tab would leave the site.
    else if (layers.length === 0 && atGuard) { silent += 1; win.history.back(); }
    onGuard = isGuard(win.history.state);
  };
  const request = () => {
    if (scheduled) return;
    scheduled = true;
    schedule(sync);
  };

  // The entry is read from the history, not from the event: the guide dispatches a synthetic popstate (state null) without
  // moving, and it must not count as a Back.
  win.addEventListener('popstate', () => {
    const fromGuard = onGuard;
    onGuard = isGuard(win.history.state);
    if (forwarding) {
      forwarding();
      forwarding = null;
      if (!onGuard) {
        // Ahead was another entry (the guide's): back where we were, then a new guard.
        guardAhead = false;
        silent += 1;
        win.history.back();
        return;
      }
      request();
      return;
    }
    if (silent > 0) {
      silent -= 1;
      if (fromGuard && !onGuard) guardAhead = true;
      request();
      return;
    }
    // Back from the guard: the user's own. Any other move (the guide's own entry, Forward onto a guard) only resyncs.
    if (fromGuard && !onGuard) {
      guardAhead = true;
      const layer = top();
      if (layer) {
        layers.splice(layers.indexOf(layer), 1);
        if (!layer.onBack()) layers.push(layer);
      }
    } else if (!fromGuard && !onGuard) guardAhead = false; // a move elsewhere (the guide): no longer known
    request();
  });
  // A reload on the guard leaves it with nothing open: it goes away at the first sync.
  request();

  return {
    register(level, onBack) {
      const layer: Layer = { level, order: order++, onBack };
      layers.push(layer);
      request();
      return () => {
        const index = layers.indexOf(layer);
        if (index < 0) return; // already closed by Back
        layers.splice(index, 1);
        request();
      };
    },
    get depth() { return layers.length; },
  };
}
