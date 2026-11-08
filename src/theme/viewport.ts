// The keyboard may resize only the visual viewport. Keep pinch zoom independent
// of layout: resizing the app to the magnified viewport would reflow its contents.
export function visibleViewportHeight(layoutHeight: number, visual?: { height: number; scale: number } | null): number | null {
  if (visual && Math.abs(visual.scale - 1) > 0.01) return null;
  const height = visual?.height ?? layoutHeight;
  return Number.isFinite(height) && height > 0 ? Math.round(height) : null;
}

export function observeViewportHeight(target: Window, update: (height: number) => void): () => void {
  const visual = target.visualViewport;
  let previous: number | null = null;
  const resize = () => {
    const height = visibleViewportHeight(target.innerHeight, visual);
    if (height !== null && height !== previous) { previous = height; update(height); }
  };
  resize();
  target.addEventListener('resize', resize);
  visual?.addEventListener('resize', resize);
  return () => {
    target.removeEventListener('resize', resize);
    visual?.removeEventListener('resize', resize);
  };
}
