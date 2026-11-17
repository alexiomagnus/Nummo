import { useEffect, useLayoutEffect } from 'react';
import { useTheme } from 'react-native-paper';
import { applyDocumentTheme, bootThemeKey, makeBootTheme, type BootTheme } from './bootTheme';
import type { Accent, ColorMode } from './palette';
import { observeScrolling, observeViewportHeight, scrollingAttribute, stickyBottomProperty } from './viewport';

// Web-only rules RN Web cannot express: the font family (the @font-face rules live in public/index.html, so the font
// is available from the first render), visible keyboard focus, dynamic
// viewport height (virtual keyboard friendly), reduced motion and the browser/system bar colour
// (`theme-color` follows `colors.background`, the colour of the top bar and navigation bar).
type Props = { mode: BootTheme['mode']; accent: Accent; colorMode: ColorMode };

export function GlobalStyle({ mode, accent, colorMode }: Props) {
  const { colors, dark, fonts } = useTheme();
  const family = fonts.bodyMedium.fontFamily;
  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.id = 'nummo-global';
    style.textContent = `
      body { overflow: hidden; margin: 0; font-family: ${family}; background: ${colors.background}; color-scheme: ${dark ? 'dark' : 'light'}; }
      /* Slim scrollbars (no scrollbar-gutter: on RN Web views, which clip with overflow hidden, it shrinks their content). */
      * { scrollbar-width: thin; scrollbar-color: ${colors.outline} transparent; }
      /* Dialogs and sheets: the scrollbar shows only while the content scrolls, then disappears (observeScrolling).
         No transition here: a rule on every element would override RN Web's own transitions. */
      [role='dialog'] * { scrollbar-color: transparent transparent; }
      [role='dialog'] [${scrollingAttribute}] { scrollbar-color: ${colors.outline} transparent; }
      :focus { outline: none; }
      :focus-visible { outline: 3px solid ${colors.primary}; outline-offset: 2px; }
      /* Keep focus within the actual control: outer rings are clipped by pills, menus and scroll containers. */
      [data-focus-ring='control']:focus-visible { outline-offset: -3px; }
      /* Paper puts keyboard focus on an inner ripple, while its outer Surface owns the rounded shape. */
      [data-testid$='-container'] > [role='button']:focus-visible { border-radius: inherit; outline-offset: -3px; }
      input:focus-visible, textarea:focus-visible { outline: none; }
      /* Colour Paper's own outline and label: a second ring cannot follow its floating-label notch. */
      [data-focus-ring='field']:focus-visible { outline: none; }
      html[data-input='key'] [data-focus-ring='field']:focus-visible [data-testid='text-input-outline'] {
        border-color: ${colors.primary} !important; border-width: 2px !important;
      }
      html[data-input='key'] [data-focus-ring='field']:focus-visible [data-testid$='-label-inactive'] {
        color: ${colors.primary} !important;
      }
      html[data-input='key'] [data-focus-ring='field'][aria-invalid='true']:focus-visible [data-testid='text-input-outline'] {
        border-color: ${colors.error} !important;
      }
      html[data-input='key'] [data-focus-ring='field'][aria-invalid='true']:focus-visible [data-testid$='-label-inactive'] {
        color: ${colors.error} !important;
      }
      /* Tab must not land a field under a sticky bottom bar (see reserveScrollPadding in viewport.ts). */
      html[data-input='key'] [style*='${stickyBottomProperty}'] { scroll-padding-bottom: var(${stickyBottomProperty}); }
      /* Menu items sit flush with the menu edge: draw the ring inside, rounded, so it is not clipped or square. */
      [role='menuitem']:focus-visible { outline-offset: -3px; border-radius: 12px; }
      /* Programmatic focus on load (Paper Menu anchors) must not draw a ring: only after a real key press. */
      html:not([data-input='key']) :focus-visible { outline: none; }
      /* Touch-first devices: a double tap or long press on a label must not select it (and open the browser's search
         sheet or callout, as Chrome Android's Touch to Search does). Fields and the values meant to be copied
         (Text with \`selectable\`, which sets user-select: text on itself) stay selectable. Desktop unchanged. */
      @media (hover: none) and (pointer: coarse) {
        body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        input, textarea, [contenteditable='true'] { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
        /* No pinch zoom on the page (user's request, 17 November): only panning. Element rules (touch-action: none
           of drag handles) are more specific and win; the viewport meta and the gesture guard below do the rest. */
        * { touch-action: pan-x pan-y; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [colors.background, colors.primary, colors.error, colors.outline, dark, family]);
  // The next start paints this scheme's background before the bundle runs (boot script in index.html).
  useEffect(() => {
    try { localStorage.setItem(bootThemeKey, JSON.stringify(makeBootTheme({ theme: mode, accent, colorMode }))); } catch { /* storage denied */ }
  }, [mode, accent, colorMode]);
  useEffect(() => {
    const root = document.documentElement;
    const stop = observeViewportHeight(window, (height) => root.style.setProperty('--nummo-viewport-height', `${height}px`));
    return () => { stop(); root.style.removeProperty('--nummo-viewport-height'); };
  }, []);
  useEffect(() => observeScrolling(document), []);
  // Safari on iOS ignores user-scalable=no in the viewport meta: its own gesture events are the only way to stop a
  // pinch zoom there (other browsers never fire them).
  useEffect(() => {
    const stop = (event: Event) => event.preventDefault();
    const names = ['gesturestart', 'gesturechange'] as const;
    for (const name of names) document.addEventListener(name, stop, { passive: false });
    return () => { for (const name of names) document.removeEventListener(name, stop); };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event: KeyboardEvent) => { if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key !== 'Shift') root.dataset.input = 'key'; };
    const onPointer = () => { root.dataset.input = 'pointer'; };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onPointer, true); };
  }, []);
  useLayoutEffect(() => {
    applyDocumentTheme(document, colors.background, dark);
  }, [colors.background, dark]);
  return null;
}
