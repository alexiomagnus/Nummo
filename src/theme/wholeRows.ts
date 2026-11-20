// Desktop panel (AppShell): a row is shown whole or not at all at the bottom edge (user's request, 21 November). Rows
// opt in with `dataSet={{ wholeRow: 'true' }}` (Spese/Categorie rows, month headings, fund cards); the one that starts
// inside the panel but runs past its bottom gets `data-clipped`, which GlobalStyle makes invisible and not clickable,
// so the panel ends on the last whole row. It appears again as soon as it fits. Pure geometry here, DOM wiring below.

export const wholeRowSelector = '[data-whole-row]';
export const clippedAttribute = 'data-clipped';

export type Edge = { top: number; bottom: number };

// Indexes of the rows to hide: they start inside the view and end below its bottom. A row that starts above the view or
// is taller than it could never be shown whole, so it is never hidden (an expanded row with long details stays readable).
export function clippedRows(rows: readonly Edge[], view: Edge, tolerance = 0.5): number[] {
  const height = view.bottom - view.top;
  const hidden: number[] = [];
  rows.forEach((row, index) => {
    const size = row.bottom - row.top;
    if (size <= 0 || size > height) return;
    if (row.top >= view.top - tolerance && row.top < view.bottom && row.bottom > view.bottom + tolerance) hidden.push(index);
  });
  return hidden;
}

// Keeps `data-clipped` up to date on the marked rows of one scroller: after scrolling, resizing and content changes
// (one update per frame). A row holding the focus is never hidden. Returns the cleanup.
export function observeWholeRows(scroller: HTMLElement): () => void {
  let frame = 0;
  // Rows shown whole at the last update, with their top: one that grows in place (details opened) past the bottom is
  // scrolled into view instead of disappearing under the user's pointer.
  let shown = new Map<HTMLElement, number>();
  const update = () => {
    frame = 0;
    const box = scroller.getBoundingClientRect();
    const rows = Array.from(scroller.querySelectorAll<HTMLElement>(wholeRowSelector));
    const edges = rows.map((row) => { const rect = row.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom }; });
    const hidden = new Set(clippedRows(edges, { top: box.top, bottom: box.bottom }));
    const grown = rows.findIndex((row, index) => hidden.has(index) && Math.abs((shown.get(row) ?? Number.NaN) - edges[index]!.top) < 1);
    if (grown >= 0) {
      shown = new Map();
      scroller.scrollBy({ top: Math.ceil(edges[grown]!.bottom - box.bottom) });
      return; // the scroll event schedules the next update
    }
    const focused = document.activeElement;
    const next = new Map<HTMLElement, number>();
    rows.forEach((row, index) => {
      const hide = hidden.has(index) && !(focused && row.contains(focused));
      const edge = edges[index]!;
      if (!hide && edge.bottom > edge.top && edge.top >= box.top && edge.bottom <= box.bottom + 0.5) next.set(row, edge.top);
      if (hide !== row.hasAttribute(clippedAttribute)) {
        if (hide) row.setAttribute(clippedAttribute, ''); else row.removeAttribute(clippedAttribute);
      }
    });
    shown = next;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  scroller.addEventListener('scroll', schedule, { passive: true });
  scroller.addEventListener('focusin', schedule);
  const resize = new ResizeObserver(schedule);
  resize.observe(scroller);
  const content = scroller.firstElementChild;
  if (content) resize.observe(content);
  const mutations = new MutationObserver(schedule);
  mutations.observe(scroller, { childList: true, subtree: true });
  schedule();
  return () => {
    if (frame) cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', schedule);
    scroller.removeEventListener('focusin', schedule);
    resize.disconnect();
    mutations.disconnect();
    for (const row of Array.from(scroller.querySelectorAll(`[${clippedAttribute}]`))) row.removeAttribute(clippedAttribute);
  };
}
