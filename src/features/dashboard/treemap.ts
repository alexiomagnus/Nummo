// Squarified treemap (Bruls, Huizing, van Wijk): pure layout, no rendering.
export type Rect = { x: number; y: number; w: number; h: number };
export type TreemapItem<T> = { item: T; value: number };
export type TreemapTile<T> = Rect & { item: T };

// Worst aspect ratio of a row of areas laid along a side of length `side`.
function worst(areas: readonly number[], side: number): number {
  const sum = areas.reduce((a, b) => a + b, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

// Items with value <= 0 are dropped. Tiles fill `width` × `height` exactly; larger values come first.
export function treemap<T>(items: readonly TreemapItem<T>[], width: number, height: number): TreemapTile<T>[] {
  const sorted = items.filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, entry) => sum + entry.value, 0);
  if (!sorted.length || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  const queue = sorted.map((entry) => ({ item: entry.item, area: entry.value * scale }));
  const tiles: TreemapTile<T>[] = [];
  let free: Rect = { x: 0, y: 0, w: width, h: height };
  let row: typeof queue = [];

  const flush = () => {
    if (!row.length) return;
    const sum = row.reduce((a, b) => a + b.area, 0);
    if (free.w >= free.h) { // row is a column on the left edge
      const colWidth = sum / free.h;
      let y = free.y;
      for (const entry of row) { const h = entry.area / colWidth; tiles.push({ item: entry.item, x: free.x, y, w: colWidth, h }); y += h; }
      free = { x: free.x + colWidth, y: free.y, w: free.w - colWidth, h: free.h };
    } else { // row along the top edge
      const rowHeight = sum / free.w;
      let x = free.x;
      for (const entry of row) { const w = entry.area / rowHeight; tiles.push({ item: entry.item, x, y: free.y, w, h: rowHeight }); x += w; }
      free = { x: free.x, y: free.y + rowHeight, w: free.w, h: free.h - rowHeight };
    }
    row = [];
  };

  for (const entry of queue) {
    const side = Math.min(free.w, free.h);
    if (row.length && worst([...row, entry].map((e) => e.area), side) > worst(row.map((e) => e.area), side)) flush();
    row.push(entry);
  }
  flush();
  return tiles;
}
