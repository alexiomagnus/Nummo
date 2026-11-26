import { useEffect, useLayoutEffect } from 'react';
import { useTheme } from 'react-native-paper';
import { applyDocumentTheme, bootThemeKey, makeBootTheme, type BootTheme } from './bootTheme';
import type { Accent, ColorMode } from './palette';
import { themeSwitchAttribute } from './themeTransition';
import { glassOf } from './theme';
import { groupGap, radius } from './tokens';
import { observeScrolling, observeViewportHeight, observeViewportTop, scrollingAttribute, stickyBottomProperty } from './viewport';

// Web-only rules RN Web cannot express: the font family (the @font-face rules live in public/index.html, so the font
// is available from the first render), visible keyboard focus, dynamic
// viewport height (virtual keyboard friendly), reduced motion and the browser/system bar colour
// (`theme-color` follows `colors.background`, the colour of the top bar and navigation bar).
type Props = { mode: BootTheme['mode']; accent: Accent; colorMode: ColorMode; amoled?: boolean };

export function GlobalStyle({ mode, accent, colorMode, amoled = false }: Props) {
  const { colors, dark, fonts } = useTheme();
  const family = fonts.bodyMedium.fontFamily;
  const glass = glassOf(colors);
  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.id = 'nummo-global';
    style.textContent = `
      body { overflow: hidden; margin: 0; font-family: ${family}; background: ${colors.background}; color-scheme: ${dark ? 'dark' : 'light'}; }
      /* Slim scrollbars (no scrollbar-gutter: on RN Web views, which clip with overflow hidden, it shrinks their content). */
      * { scrollbar-width: thin; scrollbar-color: ${colors.outline} transparent; }
      /* Dialogs and sheets: the scrollbar shows only while the content scrolls, then disappears (observeScrolling).
         No transition here: a rule on every element would override RN Web's own transitions. */
      /* Light ↔ dark switch (themeTransition.ts): the new page is revealed by a circle animated from script, never
         cross-faded; while it is snapshotted, colour transitions are off so it already has its final colours. */
      ::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
      [${themeSwitchAttribute}] *, [${themeSwitchAttribute}] *::before, [${themeSwitchAttribute}] *::after { transition: none !important; }
      [role='dialog'] * { scrollbar-color: transparent transparent; }
      [role='dialog'] [${scrollingAttribute}] { scrollbar-color: ${colors.outline} transparent; }
      /* Desktop panel (AppShell): the track stops a corner radius short of both ends, so the bar runs only along the
         straight edge of the rounded panel. Track margins exist only for WebKit scrollbars, which Chromium ignores while
         scrollbar-width/color are set: reset them here. Firefox keeps the thin standard bar, clipped by the corners. */
      /* With a mouse or touchpad (any pointer but a coarse one), Chromium draws the standard bar (scrollbar-width/color) with arrow buttons at both ends: the WebKit
         bar below has none (user's request, 21 November: a cleaner bar), the same thin thumb, transparent track, and in
         dialogs the same «only while scrolling». Touch screens keep the overlay bar; Firefox keeps the standard thin one. */
      @supports selector(::-webkit-scrollbar) {
        @media not (pointer: coarse) {
          *, [role='dialog'] *, [role='dialog'] [${scrollingAttribute}] { scrollbar-width: auto; scrollbar-color: auto; }
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-button { display: none; }
          ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${colors.outline}; background-clip: padding-box; border: 2px solid transparent; border-radius: 5px; }
          [role='dialog'] ::-webkit-scrollbar-thumb { background: transparent; }
          [role='dialog'] [${scrollingAttribute}]::-webkit-scrollbar-thumb { background: ${colors.outline}; background-clip: padding-box; }
        }
        [data-panel-scroll] { scrollbar-width: auto; scrollbar-color: auto; }
        [data-panel-scroll]::-webkit-scrollbar { width: 10px; }
        [data-panel-scroll]::-webkit-scrollbar-button { display: none; }
        [data-panel-scroll]::-webkit-scrollbar-track { background: transparent; margin-block: ${radius.dialog}px; }
        [data-panel-scroll]::-webkit-scrollbar-thumb { background: ${colors.outline}; background-clip: padding-box; border: 2px solid transparent; border-radius: 5px; }
        /* Anchored menus (Overlay.tsx): same bar, a menu corner radius (radius.group) short of both ends. */
        [data-menu-scroll] { scrollbar-width: auto; scrollbar-color: auto; }
        [data-menu-scroll]::-webkit-scrollbar { width: 10px; }
        [data-menu-scroll]::-webkit-scrollbar-button { display: none; }
        [data-menu-scroll]::-webkit-scrollbar-track { background: transparent; margin-block: ${radius.group}px; }
        [data-menu-scroll]::-webkit-scrollbar-thumb { background: ${colors.outline}; background-clip: padding-box; border: 2px solid transparent; border-radius: 5px; }
      }
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
        /* Every icon is a react-native-web Image: a transparent <img> over a background. A long press on it opened Chrome
           Android's image menu («svg>.bin», Copia/Scarica immagine: 22 November, user's request). The touch goes to the
           container instead (the pressable around it still gets it); no image is ever meant to be saved from the page. */
        img { pointer-events: none; -webkit-user-drag: none; }
        /* No pinch zoom on the page (user's request, 17 November): only panning. Element rules (touch-action: none
           of drag handles) are more specific and win; the viewport meta and the gesture guard below do the rest. */
        * { touch-action: pan-x pan-y; }
      }
      /* Glass language (26 November, on request, after Morphe). Grouped rows (ListGroup, data-glass-group): every direct child
         of the group, and every item of a list inside it, is a translucent card of its own, a little apart from the next; the
         outer corners of the group are large and the corners where two cards meet small. Radii win over the inline corners
         of the pressable rows (StateLayerPressable sets them inline); an inline background (a selected row) still wins. */
      [data-glass-group] > :not([role='list']), [data-glass-group] > [role='list'] > * {
        background-color: ${glass.glass}; border: 1px solid ${glass.glassBorder}; border-radius: ${radius.groupInner}px !important; overflow: hidden;
      }
      [data-glass-group] > [role='list'] { gap: ${groupGap}px; }
      [data-glass-group] > :not([role='list']):first-child, [data-glass-group] > [role='list'] > :first-child {
        border-top-left-radius: ${radius.group}px !important; border-top-right-radius: ${radius.group}px !important;
      }
      [data-glass-group] > :not([role='list']):last-child, [data-glass-group] > [role='list'] > :last-child {
        border-bottom-left-radius: ${radius.group}px !important; border-bottom-right-radius: ${radius.group}px !important;
      }
      /* Outlined fields are see-through: on the page the background (and its circles) shows inside them, in a card the card's
         glass. Paper paints their box with the theme's background, which is also the patch behind the floating label: on the
         page that is the page colour, in a card the card's colour (ListGroup), so the notch still matches. */
      [data-testid='text-input-outline'] { background-color: transparent !important; }
      /* Cards of a list (ListRow outlined, data-glass-item: Spese, Abbonamenti): consecutive cards form one group, broken by
         anything else (a month heading, «Carica altre»), so the outer corners of each run are large and the inner ones small. */
      [data-glass-item] { border-radius: ${radius.groupInner}px !important; }
      [data-glass-item]:first-child, :not([data-glass-item]) + [data-glass-item] {
        border-top-left-radius: ${radius.group}px !important; border-top-right-radius: ${radius.group}px !important;
      }
      [data-glass-item]:last-child, [data-glass-item]:has(+ :not([data-glass-item])) {
        border-bottom-left-radius: ${radius.group}px !important; border-bottom-right-radius: ${radius.group}px !important;
      }
      /* Bars over the content (top bar and navigation pill on phones, screen bars): what scrolls under them is blurred. */
      [data-glass-bar] { -webkit-backdrop-filter: blur(22px) saturate(1.4); backdrop-filter: blur(22px) saturate(1.4); }
      /* The circles behind the pages drift very slowly; still with reduced motion (the rule below stops them). */
      @keyframes nummo-orb-drift {
        0% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(var(--orb-dx, 24px), var(--orb-dy, -32px)) scale(1.08); }
        100% { transform: translate(0, 0) scale(1); }
      }
      [data-orb] { animation: nummo-orb-drift 38s ease-in-out infinite; will-change: transform; }
      [data-orb='1'] { --orb-dx: -28px; --orb-dy: 36px; animation-duration: 46s; }
      [data-orb='2'] { --orb-dx: 32px; --orb-dy: 20px; animation-duration: 52s; animation-delay: -12s; }
      [data-orb='3'] { --orb-dx: -20px; --orb-dy: -28px; animation-duration: 42s; animation-delay: -20s; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [colors.background, colors.primary, colors.error, colors.outline, glass.glass, glass.glassBorder, dark, family]);
  // The next start paints this scheme's background before the bundle runs (boot script in index.html).
  useEffect(() => {
    try { localStorage.setItem(bootThemeKey, JSON.stringify(makeBootTheme({ theme: mode, accent, colorMode, amoled }))); } catch { /* storage denied */ }
  }, [mode, accent, colorMode, amoled]);
  useEffect(() => {
    const root = document.documentElement;
    // Height and top of the visible part of the page: #root (index.html) and the lock screen cover exactly that area.
    const stopHeight = observeViewportHeight(window, (height) => root.style.setProperty('--nummo-viewport-height', `${height}px`));
    const stopTop = observeViewportTop(window, (top) => root.style.setProperty('--nummo-viewport-top', `${top}px`));
    return () => { stopHeight(); stopTop(); root.style.removeProperty('--nummo-viewport-height'); root.style.removeProperty('--nummo-viewport-top'); };
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
