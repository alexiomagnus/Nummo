import { setPageScale } from './viewport.ts';

// «Scala dell'interfaccia» (27 November 2026, on request, after Morphe): the whole page drawn larger or smaller, like Android's
// «display size». Done with the viewport meta tag, so the layout width (and with it window sizes, size classes, menus, the
// visual viewport) simply becomes the real width divided by the scale: no CSS zoom, no per-component scaling. It works where the
// browser honours the tag (phones, tablets, the Android app 0.3.14+, whose WebView uses the wide viewport); a desktop browser
// ignores it (it has its own zoom), so the setting is offered only on touch devices.
export const uiScaleMin = 75;
export const uiScaleMax = 125;
export const uiScaleStep = 5;
export const uiScaleDefault = 100;

// Untrusted input: a number, rounded to the step and kept inside the range; anything else is the default.
export function parseUiScale(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return uiScaleDefault;
  const stepped = Math.round(value / uiScaleStep) * uiScaleStep;
  return Math.min(uiScaleMax, Math.max(uiScaleMin, stepped));
}

const tail = 'user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';
// The `content` of the viewport meta tag. 100 % is the page's own tag (index.html), unchanged. Otherwise the layout width is
// stated (`deviceWidth` in CSS px at scale 1 divided by the scale) together with the scale, so the page fills the screen exactly:
// a zoom alone would keep the device width and show only part of it.
export function viewportContent(scale: number, deviceWidth: number): string {
  const percent = parseUiScale(scale);
  if (percent === uiScaleDefault || !(deviceWidth > 0)) return `width=device-width, initial-scale=1, maximum-scale=1, ${tail}`;
  const factor = percent / 100;
  return `width=${Math.round(deviceWidth / factor)}, initial-scale=${factor}, minimum-scale=${factor}, maximum-scale=${factor}, ${tail}`;
}

type ViewportTarget = { querySelector(selector: string): { setAttribute(name: string, value: string): void } | null };
export function applyUiScale(doc: ViewportTarget, scale: number, deviceWidth: number): void {
  doc.querySelector('meta[name="viewport"]')?.setAttribute('content', viewportContent(scale, deviceWidth));
}

// Applies the scale now and again when the screen turns (the device width changes), until the returned function is called.
export function watchUiScale(scale: number): () => void {
  if (typeof document === 'undefined') return () => undefined;
  // The viewport code must know this scale is the page's own, not a pinch (viewport.ts, `setPageScale`), and measure again once
  // the new viewport has settled.
  setPageScale(scale / 100);
  const apply = () => applyUiScale(document, scale, window.screen?.width ?? 0);
  apply();
  const settle = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
  const orientation = window.screen?.orientation;
  orientation?.addEventListener?.('change', apply);
  return () => { window.clearTimeout(settle); orientation?.removeEventListener?.('change', apply); };
}
