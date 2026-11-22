// Android Back (and the browser's Back) closes what is open, one layer at a time, instead of leaving the app.
//
// The app has no router: pages, the open list and every overlay are React state. Each of them registers a layer while it
// is open; the history holds **one** extra entry (the guard) above the page's own entry while at least one layer is open.
// Back consumes the guard: the topmost layer closes and, if layers remain, the guard comes back. A layer closed from the
// interface (Annulla, Fatto, the scrim, Escape) consumes the guard silently when it was the last one.
//
// Why a single guard and not one entry per layer: Chrome skips, on Back, the entries a page added without a user gesture,
// and the guard pushed again after a Back has none. A skipped entry in the middle would make Back leave the app; the
// guard is always the top entry, so only the page's own entry (a real navigation, never skipped) is below it.
//
// Pure: the window is injected (tests use a fake history); `components/BackNavigation.ts` binds it to the page.

export type BackHistory = {
  readonly state: unknown;
  pushState(data: unknown, unused: string, url?: string | null): void;
  back(): void;
};

export type BackWindow = {
  history: BackHistory;
  location: { readonly href: string };
  addEventListener(type: 'popstate', listener: () => void): void;
};

// Higher levels close first; within a level, the most recently opened. A page and the detail inside it may register in
// the same commit, children first (React runs child effects first): the level keeps the order right anyway.
export const backLevels = { page: 0, detail: 1, overlay: 2 } as const;
export type BackLevel = (typeof backLevels)[keyof typeof backLevels];

// `onBack` closes the layer and returns true, or returns false to refuse (a dialog busy with an operation): the layer
// stays and the guard comes back.
export type BackStack = { register(level: BackLevel, onBack: () => boolean): () => void; readonly depth: number };

const guardKey = 'nummoBack';
export const guardState = Object.freeze({ [guardKey]: true });
export const isGuard = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>)[guardKey] === true;

type Layer = { level: number; order: number; onBack: () => boolean };

export function createBackStack(win: BackWindow, schedule: (run: () => void) => void = queueMicrotask): BackStack {
  const layers: Layer[] = [];
  let order = 0;
  // Our own `history.back()` calls whose popstate has not arrived yet: until then nothing is pushed.
  let silent = 0;
  let scheduled = false;
  // Whether the current entry was the guard at the last observation (popstate does not say where it came from).
  let onGuard = isGuard(win.history.state);

  const top = () => layers.reduce<Layer | undefined>((best, layer) =>
    !best || layer.level > best.level || (layer.level === best.level && layer.order > best.order) ? layer : best, undefined);

  // Several layers open and close in one commit (a menu item opening a page): only the final count matters.
  const sync = () => {
    scheduled = false;
    if (silent > 0) return;
    const atGuard = isGuard(win.history.state);
    if (layers.length > 0 && !atGuard) win.history.pushState(guardState, '', win.location.href);
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
    if (silent > 0) { silent -= 1; request(); return; }
    // Back from the guard: the user's own. Any other move (the guide's own entry, Forward onto a guard) only resyncs.
    if (fromGuard && !onGuard) {
      const layer = top();
      if (layer) {
        layers.splice(layers.indexOf(layer), 1);
        if (!layer.onBack()) layers.push(layer);
      }
    }
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
