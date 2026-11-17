// Which edges of a scroll area hide content: the dividers of a scrollable dialog (Material 3) appear only on those, so a
// field cut by the edge reads as «more below» instead of a broken layout. Pure, measured in px; 1 px of tolerance for the
// fractional offsets of zoomed pages.
export type ScrollEdges = Readonly<{ above: boolean; below: boolean }>;

export const noScrollEdges: ScrollEdges = { above: false, below: false };

export function scrollEdges(offset: number, viewport: number, content: number): ScrollEdges {
  if (!(viewport > 0) || !(content > viewport + 1)) return noScrollEdges;
  return { above: offset > 1, below: offset + viewport < content - 1 };
}
