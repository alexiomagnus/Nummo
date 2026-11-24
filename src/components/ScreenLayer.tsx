import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scrimOpacity, slideSpring, slideTimings, type Box } from '../theme/containerTransform';
import { springEasing } from '../theme/themeTransition';
import { overrideDocumentChrome } from '../theme/bootTheme';
import { motion, radius, sizeClassOf, spacing, type SizeClass } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { useEscape, useFocusHandoff, useOverlayMotion } from './Overlay';
import { useI18n } from '../i18n/I18nProvider';
import { detailGestureOwner, detentOutcome, fittedPeek, peekOffset, recentVelocity, sheetDragOutcome, sheetDragSlop, sheetGestureOwner, type Detent, type DragSample } from './menuGeometry';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// A full screen of the app (23 November, on request): the detail of an expense or a subscription and every editor or content
// panel that used to be a centred dialog (AppDialog without `variant="alert"`). A layer of the shared overlay level (Paper
// portals, like menus and sheets): the page under it stays mounted and untouched (search, filters, scroll, drafts), so
// closing restores it exactly, with no render of the page. It covers the whole app on phones (its own top bar with a round
// Back button, safe areas inside) and the content panel from medium up (navigation and top bar stay visible).
//
// Every layer, whole screen or sheet, rises from the bottom edge and goes back down (`slide`, user's choice of 24 November among
// three trial pairs; until then a Material 3 container transform from the pressed element, history in docs/architecture.md). On
// phones the app's top bar and floating navigation fade out as a whole screen opens and back in as it closes (`holdChrome`).
// A screen usually closes by unmounting (`{editing && <Editor />}`): the cleanup clones the layer as it is at that moment
// and plays the way back on the copy (inert, outside React), so every screen also closes smoothly and the page is usable at
// once. Web Animations only (transform, opacity, shadow and corners); with reduced motion everything is instant.

export type ScreenLayerProps = {
  // Accessible name of the screen.
  label: string;
  // DOM id of the card the screen belongs to. Unused since the slide (24 November): nothing grows from it any more; still accepted
  // from the callers, to be removed with them.
  originId?: string;
  // Title in the top bar, beside Back (editors); details put their own heading in the content.
  title?: ReactNode;
  backLabel: string;
  onBack: () => void;
  // Back disabled while an operation runs (Escape and the system Back are refused too, through `onEscape`).
  backDisabled?: boolean;
  // Escape and the system Back: return false to refuse.
  onEscape: () => boolean | void;
  // Wrap the content in a scroll view (details); editors bring their own scroll area and actions.
  scroll?: boolean;
  // Focus the first text field on opening also on touch-first devices (Nuova lista, Nuovo fondo).
  textEntry?: boolean;
  // Colours of a screen that continues a coloured card (the «Prossimo mese» card: its container colour fills the screen, so the
  // card turns into it without a change of colour). Default: the page's background and the tonal Back button.
  tone?: ScreenTone;
  // A bottom sheet as tall as its content instead of the whole screen (short forms: Nuova lista, a product; user's request,
  // 23 November): handle on top instead of Back (drag it down to close), the page dimmed behind it (a tap there closes too),
  // at most 640 wide on large screens. It still grows from the element that opened it.
  sheet?: boolean;
  // Details (expense, subscription, fund) on phones: dragged down they stop halfway («peek», the top half of the screen over the
  // dimmed page) and from there go back up whole or down and closed (user's request, 24 November). A handle on top shows it and is
  // also a button (shrink / expand) for who cannot drag.
  // No Back button on phones with three positions (user's request, 24 November: it closes by dragging, the handle, a tap above, the
  // system Back). `panel` (user's request, 24 November: Template, Scansiona scontrino, the date, Categoria and Fondo, Nuovo fondo and
  // the fund movements): the same three positions, but in peek the screen gets shorter instead of only moving down, so its scroll area
  // and its actions at the bottom fit the visible half; it opens whole, or in peek with `opensHalf`. A text field focused in peek opens
  // it whole. («Apri a metà schermo» of Settings, 24 November, is gone the same day on request.)
  detents?: boolean | 'panel';
  // A panel that opens in peek on phones (user's request, 24 November: Categoria, Fondo and Template «di base non aprire tutto il
  // pannello»; then every ChoiceScreen).
  opensHalf?: boolean;
  // A panel whose peek shows all its content, higher than half if needed (`fittedPeek`; the date picker: the whole month stays in
  // view when lowered, user's request of 24 November). Measured at opening and again when the content changes height (a month
  // with six weeks).
  fitPeek?: boolean;
  children: ReactNode;
};


export type ScreenTone = { background: string; content: string; button: string; onButton: string };

export function ScreenLayer({ label, title, backLabel, onBack, backDisabled = false, onEscape, scroll = true, textEntry = false, tone, sheet = false, detents = false, opensHalf = false, fitPeek = false, children }: ScreenLayerProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { colors } = theme;
  // A sheet stands above the dimmed page in the raised surface colour of the bottom sheets (BottomSheet in Overlay.tsx).
  const background = tone?.background ?? (sheet ? colors.elevation.level1 : colors.background);
  // With a tone, everything inside reads its colours from it (texts, icons, the notches of outlined fields); a sheet at least
  // its background, for the notches.
  const toned = useMemo(() => tone ? { ...theme, colors: { ...theme.colors, background: tone.background, surface: tone.background,
    onBackground: tone.content, onSurface: tone.content, onSurfaceVariant: tone.content } }
    : sheet ? { ...theme, colors: { ...theme.colors, background } } : theme, [theme, tone?.background, tone?.content, sheet, background]);
  const button = tone ? { background: tone.button, color: tone.onButton } : { background: colors.secondaryContainer, color: colors.onSecondaryContainer };
  const size = useSizeClass();
  const compact = size === 'compact';
  const insets = useSafeAreaInsets();
  const animate = useOverlayMotion();
  const [frame, setFrame] = useState<Box>(() => measureFrame(size));
  const root = useRef<ComponentRef<typeof View>>(null);
  const surface = useRef<ComponentRef<typeof View>>(null);
  const frameRadius = size === 'expanded' ? radius.dialog : 0;
  // Three positions on phones (details and panels: see `detents`); a panel may open in peek.
  const stops = Boolean(detents) && compact && !sheet;
  const fit = detents === 'panel';
  const [detent, setDetent] = useState<Detent>(() => stops && fit && opensHalf ? 'peek' : 'full');
  const detentRef = useRef(detent);
  detentRef.current = detent;
  // Where peek is: half the screen, or as high as the content needs (`fitPeek`, measured).
  const [fitted, setFitted] = useState<number | null>(null);
  const fittedRef = useRef<number | null>(null);
  const peekAt = (height: number) => fittedRef.current ?? peekOffset(height);
  // `rise`: only ever higher than now (a month with one week more raises it; one less leaves it, so it does not jump at every month).
  const fitTo = (node: HTMLElement | null, height: number, rise = false): number => {
    const need = fitPeek && fit && stops && node ? contentNeed(parts(node).surface) : 0;
    const found = need > 0 ? fittedPeek(height, need) : null;
    const now = fittedRef.current;
    const next = rise && now !== null && (found === null || found > now) ? now : found;
    fittedRef.current = next;
    setFitted(next);
    return next ?? peekOffset(height);
  };
  const latest = useRef({ frame, frameRadius, backdrop: colors.backdrop, animate, sheet, onBack, backDisabled, fit });
  latest.current = { frame, frameRadius, backdrop: colors.backdrop, animate, sheet, onBack, backDisabled, fit };
  // A sheet slides by its own height (measured: it is as tall as its content).
  const settingsFor = (node: HTMLElement): Settings => {
    const { frame: box, frameRadius: corner, backdrop, sheet: isSheet } = latest.current;
    if (!isSheet) return { frame: box, frameRadius: corner, backdrop, sheet: false };
    const height = parts(node).surface?.getBoundingClientRect().height ?? box.height;
    return { frame: { ...box, height }, frameRadius: radius.dialog, backdrop, sheet: true };
  };

  // The frame follows the window (rotation, a resized desktop window, the keyboard shrinking #root), and the size class:
  // the rail or drawer appears and the panel moves, after the shell has rendered.
  useLayoutEffect(() => { setFrame(measureFrame(size)); }, [size]);
  useEffect(() => {
    const update = () => setFrame(measureFrame(sizeClassOf(window.innerWidth)));
    window.addEventListener('resize', update);
    globalThis.visualViewport?.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); globalThis.visualViewport?.removeEventListener('resize', update); };
  }, []);

  // A coloured screen covering the whole phone screen colours the system bars too (bootTheme.ts), until it closes.
  useLayoutEffect(() => {
    if (!tone || !compact || sheet || typeof document === 'undefined') return undefined;
    return overrideDocumentChrome(document, tone.background, theme.dark);
  }, [tone?.background, compact, sheet, theme.dark]);

  useEscape(true, onEscape);
  useFocusHandoff(true, true, surface, textEntry);
  // Closed together when the app goes to another page (closeAllScreens).
  const latestEscape = useRef(onEscape);
  latestEscape.current = onEscape;
  useEffect(() => {
    const close = () => { latestEscape.current(); };
    openScreens.add(close);
    return () => { openScreens.delete(close); };
  }, []);

  const chrome = useRef<((delay: number) => void) | null>(null);
  // Opening in the commit that inserts the layer, before the first paint; closing from the cleanup, on a copy.
  useLayoutEffect(() => {
    const node = dom(root.current);
    // A panel opening in peek is put there before the first paint, then rises to it like a sheet (the page stays, dimmed).
    const half = detentRef.current === 'peek';
    const { surface: opened, scrim: dimmed } = node ? parts(node) : { surface: null, scrim: null };
    const whole = latest.current.frame.height;
    // Measured whole, before it is put in peek.
    const peek = fitTo(node, whole);
    if (half && opened) pose(opened, dimmed, peek, whole, latest.current.backdrop, true, peek);
    if (!latest.current.animate || !node || typeof node.animate !== 'function') return undefined;
    const opening = settingsFor(node);
    let run: Run | null = slide(parts(node), node, half ? { ...opening, frame: { ...opening.frame, height: whole - peek }, sheet: true } : opening, true);
    // Phones, a whole screen: the top bar and the navigation of the page under it go away with the opening (and come back while it is
    // in peek, see below).
    chrome.current = compact && !latest.current.sheet && !half ? holdChrome() : null;
    void run.finished.then((done) => { if (done && run) { run.cancel(); run = null; } });
    return () => {
      const { animate: moving } = latest.current;
      const live = parts(node);
      const scrimNow = live.scrim ? Number(getComputedStyle(live.scrim).opacity) : scrimOpacity;
      const dragged = live.surface?.dataset.dragged === 'true' ? live.surface.getBoundingClientRect().height : null;
      const shift = live.surface?.style.transform ?? '';
      const lowered = shift !== '' || (live.surface?.style.top ?? '') !== '';
      const settings = settingsFor(node);
      run?.cancel();
      const host = document.getElementById('root');
      if (!moving || !host || !node.isConnected) { chrome.current?.(0); chrome.current = null; return; }
      const copy = node.cloneNode(true) as HTMLElement;
      copy.setAttribute('inert', '');
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      const { frame: box } = latest.current;
      Object.assign(copy.style, { position: 'absolute', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
        zIndex: '1000', pointerEvents: 'none' });
      host.appendChild(copy);
      // Pulled down, or in peek: it goes on down from where it is.
      const back = dragged !== null || lowered ? slideDown(parts(copy), shift, dragged ?? live.surface?.getBoundingClientRect().height ?? box.height, scrimNow)
        : slide(parts(copy), copy, settings, false);
      // The top bar and the navigation come back while it goes down.
      chrome.current?.(0);
      chrome.current = null;
      let ended = false;
      const end = () => { if (!ended) { ended = true; copy.remove(); } };
      void back.finished.then(end);
      setTimeout(end, back.duration + 1500);
    };
  }, []);

  // Sheet: dragged down it closes (as the selectors' bottom sheets: `sheetDragOutcome`), from anywhere on it with a finger (user's
  // request, 24 November: «in tutto il pannello», not only the handle; the content keeps scrolling when it is not at its top) and
  // from the handle with a mouse. The surface follows without transition and the scrim fades with the distance; let go far or fast
  // enough it closes, otherwise it settles back.
  const handle = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const grip = dom(handle.current);
    const node = dom(root.current);
    const { surface: sheetNode, scrim } = node ? parts(node) : { surface: null, scrim: null };
    if (!sheet || !node || !sheetNode) return undefined;
    let drag: { y: number; samples: DragSample[]; offset: number } | null = null;
    return watchDrag(node, sheetNode, grip ? [grip] : [], {
      owner: (dx, dy, scrolled) => latest.current.backDisabled ? 'list' : sheetGestureOwner(dx, dy, scrolled ? 1 : 0),
      begin: (y, time) => { drag = { y, samples: [{ t: time, y }], offset: 0 }; },
      follow: (y, time) => {
        if (!drag) return;
        drag.offset = Math.max(0, y - drag.y);
        drag.samples.push({ t: time, y });
        if (drag.samples.length > 32) drag.samples.shift();
        sheetNode.style.transform = `translateY(${drag.offset}px)`;
        if (scrim) scrim.style.opacity = String(scrimOpacity * Math.max(0, 1 - drag.offset / Math.max(1, sheetNode.offsetHeight)));
      },
      finish: (y, time, commit) => {
        if (!drag) return false;
        const { offset, samples } = drag;
        drag = null;
        if (offset === 0) return false;
        if (commit && sheetDragOutcome(offset, recentVelocity([...samples, { t: time, y }]), sheetNode.offsetHeight) === 'dismiss') {
          sheetNode.dataset.dragged = 'true';
          latest.current.onBack();
          return true;
        }
        sheetNode.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0px)' }], { duration: motion.medium, easing: bezier(motion.enter) });
        sheetNode.style.transform = '';
        if (scrim) scrim.style.opacity = '';
        return true;
      },
    });
  }, [sheet]);

  // ——— Details on phones: whole, peek, closed ———
  const topBar = useRef<ComponentRef<typeof View>>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  // Moves the screen to a position (animated from where it is, on the opening's spring) and keeps it there with an inline transform.
  const settle = useCallback((target: Detent, from?: number) => {
    const node = dom(root.current);
    const { surface: moving, scrim } = node ? parts(node) : { surface: null, scrim: null };
    if (!moving) return;
    const height = latest.current.frame.height;
    const peek = peekAt(height);
    const y = target === 'peek' ? peek : 0;
    const sizing = latest.current.fit;
    const start = from ?? (target === 'peek' ? 0 : peek);
    const fade = (at: number) => String(detentScrim(at, height, peek));
    pose(moving, null, y, height, latest.current.backdrop, sizing, peek);
    if (scrim) scrim.style.opacity = y ? fade(y) : '';
    if (latest.current.animate && start !== y) {
      const spring = springEasing(slideSpring, slideTimings.precision);
      const easing = CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : bezier(motion.enter);
      // Corners and shadow travel with it: squared off only as it lands whole.
      const look = (at: number) => ({ ...(sizing ? { top: `${at}px` } : { transform: `translateY(${at}px)` }), borderTopLeftRadius: `${at > 0 ? slideTimings.corner : 0}px`,
        borderTopRightRadius: `${at > 0 ? slideTimings.corner : 0}px`, boxShadow: `0px ${at > 0 ? -12 : 0}px ${at > 0 ? 32 : 0}px ${latest.current.backdrop}` });
      moving.animate([look(start), look(y)], { duration: spring.duration, easing });
      scrim?.animate({ opacity: [fade(start), y ? fade(y) : '0'] }, { duration: spring.duration, easing: 'linear' });
    }
    // In peek the page's top bar and navigation show again above the screen (dimmed); whole, they go away again.
    if (target === 'peek') { chrome.current?.(0); chrome.current = null; } else if (!chrome.current) chrome.current = holdChrome();
    setDetent(target);
  }, []);
  // The height changes (rotation, the browser's bars): peek keeps its place (half, or fitted again to the content).
  useEffect(() => {
    if (!stops) return;
    const before = peekAt(frame.height);
    fitTo(dom(root.current), frame.height);
    if (detentRef.current === 'peek') settle('peek', before);
  }, [frame.height]); // eslint-disable-line react-hooks/exhaustive-deps
  // A fitted panel follows its content upwards: a month with one week more raises peek (never lowered while open).
  useEffect(() => {
    const node = dom(root.current);
    const surfaceNode = node ? parts(node).surface : null;
    const scrollerNode = surfaceNode ? findScroller(surfaceNode) : null;
    const inner = scrollerNode?.firstElementChild;
    if (!fitPeek || !fit || !stops || !node || !inner || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      const before = peekAt(latest.current.frame.height);
      const next = fitTo(node, latest.current.frame.height, true);
      if (next !== before && detentRef.current === 'peek') settle('peek', before);
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [fitPeek, fit, stops]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const node = dom(root.current);
    const bar = dom(topBar.current);
    const list = (scroller.current as { getScrollableNode?: () => unknown } | null)?.getScrollableNode?.();
    const content = list instanceof HTMLElement ? list : null;
    const moving = node ? parts(node).surface : null;
    const scrim = node ? parts(node).scrim : null;
    if (!stops || !node || !moving) return undefined;
    let drag: { start: number; base: number; samples: DragSample[]; y: number } | null = null;
    const height = () => latest.current.frame.height;
    const begin = (y: number, time: number) => {
      moving.getAnimations().forEach((animation) => animation.cancel());
      scrim?.getAnimations().forEach((animation) => animation.cancel());
      const base = detentRef.current === 'peek' ? peekAt(height()) : 0;
      drag = { start: y, base, samples: [{ t: time, y }], y: base };
    };
    const follow = (y: number, time: number) => {
      if (!drag) return;
      drag.y = Math.max(0, drag.base + y - drag.start);
      drag.samples.push({ t: time, y });
      if (drag.samples.length > 32) drag.samples.shift();
      pose(moving, scrim, drag.y, height(), latest.current.backdrop, latest.current.fit, peekAt(height()));
    };
    // Returns whether the screen moved, so the click that may follow is not taken by what is under the finger.
    const finish = (y: number, time: number, commit: boolean): boolean => {
      if (!drag) return false;
      const { y: at, base, samples } = drag;
      drag = null;
      if (at === base) return false;
      const outcome = commit ? detentOutcome(at, recentVelocity([...samples, { t: time, y }]), height(), detentRef.current, peekAt(height())) : detentRef.current;
      if (outcome === 'dismiss') {
        if (latest.current.backDisabled) { settle(detentRef.current, at); return true; }
        moving.dataset.dragged = 'true';
        latest.current.onBack();
        return true;
      }
      settle(outcome, at);
      return true;
    };
    if (content) content.style.overscrollBehaviorY = 'contain'; // no pull-to-refresh or scroll chaining to the page behind
    // A panel in peek opens whole when a text field takes the focus: the keyboard would leave almost nothing of it.
    const typing = (event: FocusEvent) => {
      const target = event.target;
      if (detentRef.current === 'peek' && target instanceof HTMLElement && target.matches('input, textarea, [contenteditable="true"]')) settle('full');
    };
    moving.addEventListener('focusin', typing);
    // From anywhere on the screen with a finger (user's request, 24 November), from the top bar with a mouse.
    const stop = watchDrag(node, moving, bar ? [bar] : [], {
      owner: (dx, dy, scrolled) => detailGestureOwner(dx, dy, scrolled ? 1 : 0, detentRef.current),
      begin, follow, finish,
    });
    return () => { stop(); moving.removeEventListener('focusin', typing); if (content) content.style.overscrollBehaviorY = ''; };
  }, [stops, settle]);

  // Details use the page's margins; editors keep the 24 of their blocks (Paper's Content/Actions), and the top bar lines up with them.
  const padding = !scroll ? spacing.xl : compact ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const side = compact ? Math.max(insets.left, insets.right) : 0;
  return (<>
    {/* From medium the screen covers only the content panel: a transparent layer over the rest (navigation, top bar, account menu)
        keeps them from being pressed while it is open, as the dialogs' scrim did (user's request, 24 November: opening Settings or
        other panels from under a screen gave display problems). */}
    {!compact && <View aria-hidden style={[StyleSheet.absoluteFill, styles.blocker]} />}
    <View ref={root} role="dialog" aria-modal aria-label={label} {...part('root')}
      style={[styles.root, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }]}>
      {sheet ? <Pressable {...part('scrim')} accessibilityRole="button" accessibilityLabel={backLabel} focusable={false} disabled={backDisabled} onPress={onBack}
        style={[StyleSheet.absoluteFill, styles.sheetScrim, { backgroundColor: colors.backdrop, opacity: scrimOpacity, borderRadius: frameRadius }]} />
        : <View {...part('scrim')} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop, opacity: 0, borderRadius: frameRadius }]} />}
      {/* In peek the dimmed page above the screen closes it at a tap, like the scrim of a sheet. */}
      {stops && detent === 'peek' && <Pressable accessibilityRole="button" accessibilityLabel={backLabel} focusable={false} disabled={backDisabled} onPress={onBack}
        style={[styles.catcher, { height: fitted ?? peekOffset(frame.height) }]} />}
      <View ref={surface} {...part('surface')} style={sheet
        ? [styles.sheet, styles.surface, { backgroundColor: background, maxHeight: Math.max(0, frame.height - (compact ? insets.top : 0) - spacing.xxxl) }]
        : [StyleSheet.absoluteFill, styles.surface, { borderRadius: frameRadius, backgroundColor: background }]}>
        <View {...part('content')} style={sheet ? styles.sheetContent : styles.content}>
          {sheet ? <View style={[styles.sheetTop, { paddingLeft: padding + side, paddingRight: padding + side }]}>
            {/* The drag handle (user's request, 23 November: «per buttare giù la scheda»); a wide hit area around the small bar. */}
            <View ref={handle} {...part('handle')} aria-hidden style={styles.handleArea}><View style={[styles.handle, { backgroundColor: colors.onSurfaceVariant }]} /></View>
            {title !== undefined && <Text variant="titleLarge" accessibilityRole="header" aria-level={1} numberOfLines={2} style={[styles.sheetTitle, tone && { color: tone.content }]}>{title}</Text>}
          </View> : <View ref={topBar} style={[styles.topBar, { paddingTop: (compact ? insets.top : 0) + (stops ? handleClearance : spacing.lg), paddingLeft: padding + side, paddingRight: padding + side }]}>
            {/* The handle of a detail on phones: shows that it can be pulled down, and shrinks or expands it at a tap. */}
            {stops && <Pressable accessibilityRole="button" accessibilityLabel={detent === 'peek' ? t("Espandi i dettagli") : t("Riduci i dettagli")}
              onPress={() => settle(detent === 'peek' ? 'full' : 'peek')} style={[styles.detentHandle, { top: insets.top + spacing.xs }]}>
              <View style={[styles.handle, { backgroundColor: colors.onSurfaceVariant }]} />
            </Pressable>}
            {/* Tonal round button, larger than a bare icon (user's request, 23 November), a little below the edge. */}
            {!stops && <StateLayerPressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} disabled={backDisabled}
              layerColor={button.color} radius={radius.pill} style={[styles.back, { backgroundColor: button.background }]}>
              <SvgIcon shape={iconShapes.chevronLeft} size={28} color={button.color} />
            </StateLayerPressable>}
            {title !== undefined && <Text variant="titleLarge" accessibilityRole="header" aria-level={1} numberOfLines={2} style={[styles.title, tone && { color: tone.content }]}>{title}</Text>}
          </View>}
          {scroll ? <ScrollView ref={scroller} style={styles.grow} keyboardShouldPersistTaps="handled" {...(size === 'expanded' ? { dataSet: { panelScroll: 'true' } } : null)}
            contentContainerStyle={[styles.scroll, { paddingHorizontal: padding + side, paddingBottom: padding + insets.bottom }]}>
            <ThemeProvider theme={toned}>{children}</ThemeProvider>
          </ScrollView> : <View style={[sheet ? styles.sheetBody : styles.grow, { paddingLeft: side, paddingRight: side, paddingBottom: insets.bottom }]}><ThemeProvider theme={toned}>{children}</ThemeProvider></View>}
        </View>
      </View>
    </View>
  </>
  );
}

// Drag of a screen or a sheet. Touch: from anywhere on `surface`; the gesture goes to the screen only when `owner` says so
// (decided once, past the slop; `scrolled`: the content under the finger is not at its top), otherwise it stays a native scroll.
// Mouse and pen: from the `handles` (a sheet's handle, a detail's top bar), past the slop, so a click on Back stays a click. A
// click that follows a drag at once (the browser may send it to what was under the finger) is dropped. Returns the cleanup.
type DragOps = {
  owner: (dx: number, dy: number, scrolled: boolean) => 'pending' | 'sheet' | 'list';
  begin: (y: number, time: number) => void;
  follow: (y: number, time: number) => void;
  // Whether the screen moved.
  finish: (y: number, time: number, commit: boolean) => boolean;
};
function watchDrag(root: HTMLElement, surface: HTMLElement, handles: HTMLElement[], { owner, begin, follow, finish }: DragOps): () => void {
  const cleanups: (() => void)[] = [];
  const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let swallowUntil = 0;
  const done = (moved: boolean) => { if (moved) swallowUntil = performance.now() + 500; };
  for (const grip of handles) {
    const previous = grip.style.touchAction;
    grip.style.touchAction = 'none';
    cleanups.push(() => { grip.style.touchAction = previous; });
    let press: { id: number; y: number; dragging: boolean } | null = null;
    listen(grip, 'pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary) return; // fingers: the touch events below
      press = { id: event.pointerId, y: event.clientY, dragging: false };
    });
    listen(grip, 'pointermove', (event) => {
      if (!press || event.pointerId !== press.id) return;
      if (!press.dragging) {
        if (event.clientY - press.y < sheetDragSlop && press.y - event.clientY < sheetDragSlop) return;
        press.dragging = true;
        begin(event.clientY, event.timeStamp);
        try { grip.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
      }
      follow(event.clientY, event.timeStamp);
    });
    const end = (event: PointerEvent, commit: boolean) => {
      if (!press || event.pointerId !== press.id) return;
      const dragging = press.dragging;
      press = null;
      if (dragging) done(finish(event.clientY, event.timeStamp, commit));
    };
    listen(grip, 'pointerup', (event) => end(event, true));
    listen(grip, 'pointercancel', (event) => end(event, false));
  }
  let touch: { id: number; x: number; y: number; scrolled: boolean; owner: 'pending' | 'sheet' | 'list' } | null = null;
  const find = (touches: TouchList) => touch ? Array.from(touches).find((item) => item.identifier === touch?.id) : undefined;
  listen(surface, 'touchstart', (event) => {
    const first = event.touches[0];
    if (event.touches.length !== 1 || !first) {
      if (touch?.owner === 'sheet') finish(touch.y, event.timeStamp, false);
      touch = null;
      return;
    }
    touch = { id: first.identifier, x: first.clientX, y: first.clientY, scrolled: scrolledBetween(event.target, surface), owner: 'pending' };
  }, { passive: true });
  listen(surface, 'touchmove', (event) => {
    const point = find(event.changedTouches);
    if (!touch || !point || touch.owner === 'list') return;
    if (touch.owner === 'pending') {
      touch.owner = owner(point.clientX - touch.x, point.clientY - touch.y, touch.scrolled);
      if (touch.owner !== 'sheet') return;
      begin(point.clientY, event.timeStamp); // from here, so the screen does not jump by the slop
    }
    if (event.cancelable) event.preventDefault(); // nothing scrolls or overscrolls under a drag of the screen
    follow(point.clientY, event.timeStamp);
  }, { passive: false });
  const end = (event: TouchEvent, commit: boolean) => {
    const point = find(event.changedTouches);
    if (!touch || !point) return;
    const was = touch.owner;
    touch = null;
    if (was === 'sheet') done(finish(point.clientY, event.timeStamp, commit));
  };
  listen(surface, 'touchend', (event) => end(event, true));
  listen(surface, 'touchcancel', (event) => end(event, false));
  listen(root, 'click', (event) => {
    if (performance.now() > swallowUntil) return;
    swallowUntil = 0;
    event.stopPropagation();
    event.preventDefault();
  }, { capture: true });
  return () => cleanups.forEach((cleanup) => cleanup());
}

// Whether some scroll container between the touched element and the surface is scrolled away from its top.
function scrolledBetween(target: EventTarget | null, surface: HTMLElement): boolean {
  for (let node = target instanceof Element ? target : null; node && node !== surface; node = node.parentElement) {
    if (node.scrollTop > 0) return true;
  }
  return false;
}

// A detail moved down by `y` (dragged, or in peek): the screen's edge shows as during the slide, with round top corners and a
// shadow above it, and the page above is dimmed as under a sheet, fading only past the peek position on the way to closing.
function detentScrim(y: number, height: number, peek = peekOffset(height)): number {
  return y <= peek ? scrimOpacity * Math.min(1, y / Math.max(1, peek)) : scrimOpacity * Math.max(0, 1 - (y - peek) / Math.max(1, height - peek));
}
// `sizing` (a panel): the top edge moves and the screen gets shorter, instead of a transform of the whole screen.
function pose(surface: HTMLElement, scrim: HTMLElement | null, y: number, height: number, backdrop: string, sizing = false, peek = peekOffset(height)): void {
  const lifted = y > 0;
  if (sizing) surface.style.top = lifted ? `${y}px` : '';
  else surface.style.transform = lifted ? `translateY(${y}px)` : '';
  surface.style.borderTopLeftRadius = lifted ? `${slideTimings.corner}px` : '';
  surface.style.borderTopRightRadius = lifted ? `${slideTimings.corner}px` : '';
  surface.style.boxShadow = lifted ? `0px -12px 32px ${backdrop}` : '';
  if (scrim) scrim.style.opacity = lifted ? String(detentScrim(y, height, peek)) : '';
}

// The scroller of a panel: its first descendant that scrolls vertically (the ScrollView inside the dialog's scroll area).
function findScroller(surface: HTMLElement): HTMLElement | null {
  return [...surface.querySelectorAll<HTMLElement>('*')].find((node) => /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) ?? null;
}
// The height a panel takes to show all its content: its own height, less what its scroller shows, plus what its scroller holds.
// The same whether the panel is whole (spare room in the scroller) or in peek (content cut): the rest (bars, actions) is fixed.
function contentNeed(surface: HTMLElement | null): number {
  const scroller = surface ? findScroller(surface) : null;
  const inner = scroller?.firstElementChild;
  if (!surface || !scroller || !inner) return 0;
  return surface.getBoundingClientRect().height - scroller.clientHeight + inner.getBoundingClientRect().height;
}

// Every open screen, newest last. Going to another page (a destination, a page of the account menu, «Fatto») closes them all
// first (user's report, 23 November: the date picker stayed above Settings opened from the account menu on desktop). Each
// closes as its own Back/Escape would; one that refuses (an operation running) stays.
const openScreens = new Set<() => void>();
let screensClosedForNavigation = -Infinity;
export function closeAllScreens(): void {
  if (openScreens.size) screensClosedForNavigation = performance.now();
  [...openScreens].reverse().forEach((close) => close());
}

// ——— the app's chrome on phones ———

// On phones a screen covers the whole app, top bar and floating navigation included, but it covers them only at the end of
// its growth and uncovers them at once when it starts shrinking: they showed over the growing screen and over its Back button
// (user's report, 24 November). While at least one whole screen is open they fade out (marked `data-app-chrome` in AppShell),
// with the opening, and come back with the closing of the last one, after its content has gone. Web Animations only, so the
// shell renders nothing and keeps its own opacity (the navigation hidden for the keyboard).
let chromeHolders = 0;
let chromeFades: Animation[] = [];
function holdChrome(): (delay: number) => void {
  chromeHolders += 1;
  if (chromeHolders === 1) {
    chromeFades = [...document.querySelectorAll<HTMLElement>('[data-app-chrome]')].map((element) =>
      element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: motion.short, easing: 'linear', fill: 'forwards' }));
  }
  let released = false;
  return (delay) => {
    if (released) return;
    released = true;
    chromeHolders = Math.max(0, chromeHolders - 1);
    if (chromeHolders > 0) return;
    const fades = chromeFades;
    chromeFades = [];
    for (const fade of fades) {
      const element = (fade.effect as KeyframeEffect | null)?.target;
      if (element?.isConnected) element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: motion.medium, delay, easing: 'linear', fill: 'backwards' });
      fade.cancel();
    }
  };
}

// ——— the transform ———

type Parts = { surface: HTMLElement | null; scrim: HTMLElement | null };
// `duration`: the whole run in ms.
type Run = { finished: Promise<boolean>; cancel: () => void; duration: number };
// `frame`: the area the screen covers (a sheet: its own height); `frameRadius`: its corners once open (the rounded desktop panel).
type Settings = { frame: Box; frameRadius: number; backdrop: string; sheet: boolean };

const part = (name: string) => ({ dataSet: { screenPart: name } }) as object;
function parts(node: HTMLElement): Parts {
  const find = (name: string) => node.querySelector<HTMLElement>(`[data-screen-part="${name}"]`);
  return { surface: find('surface'), scrim: find('scrim') };
}

// Every layer, whole screen or sheet (user's choice, 24 November, among three trial pairs; sheets too the same day): it rises
// from the bottom edge on a soft spring with no overshoot, with a soft shadow above its edge (in the dark theme screen and page share
// their colour: without it the edge could not be seen) and, for a whole screen, round top corners, both gone as it lands, while the
// page under a whole screen steps back a little; the scrim dims the page (a sheet keeps it). It goes back down on the accelerating
// curve, a little quicker, while the page comes forward again. Nothing comes out of the element that opened it, which stays in place.
function slide({ surface, scrim }: Parts, root: HTMLElement, { frame, frameRadius, backdrop, sheet }: Settings, opening: boolean): Run {
  const animations: Animation[] = [];
  const both = 'both' as const;
  const { close, pageScale, corner, precision } = slideTimings;
  let duration = 0;
  const previous = root.style.overflow;
  if (surface && scrim) {
    const spring = springEasing(slideSpring, precision);
    const view = surface.ownerDocument.defaultView;
    const rising = view?.CSS?.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : bezier(motion.enter);
    duration = opening ? spring.duration : close;
    const curve = opening ? rising : bezier(motion.exitEasing);
    root.style.overflow = 'hidden'; // the frame's edge, not the window's, ends the slide
    // A sheet also travels the height of its shadow, so nothing of it is left at the bottom edge.
    const away = `translateY(${frame.height + (sheet ? spacing.xxxl : 0)}px)`;
    animations.push(surface.animate({ transform: opening ? [away, 'translateY(0px)'] : ['translateY(0px)', away] }, { duration, easing: curve, fill: both }));
    // Shadow (and, for a whole screen, round top corners: a sheet always has them) while it moves; radius, not a clip, so the shadow shows.
    const lifted = { boxShadow: `0px -12px 32px ${backdrop}`, ...(sheet ? null : { borderTopLeftRadius: `${corner}px`, borderTopRightRadius: `${corner}px` }) };
    const flat = { boxShadow: `0px 0px 0px ${backdrop}`, ...(sheet ? null : { borderTopLeftRadius: `${frameRadius}px`, borderTopRightRadius: `${frameRadius}px` }) };
    animations.push(surface.animate(opening ? [lifted, { ...lifted, offset: 0.6 }, flat] : [flat, { ...lifted, offset: 0.3 }, lifted],
      { duration, easing: 'linear', fill: both }));
    // The page under a whole screen steps back a little (around the centre of what is in view) and comes forward on the way down;
    // not under a sheet (it stays in view above it), nor when the screens close because the app goes to another page (that page
    // makes its own entrance).
    const page = sheet || (!opening && performance.now() - screensClosedForNavigation < 1000) ? null : pageUnder(frame);
    if (page) {
      page.node.style.transformOrigin = page.origin;
      const behind = page.node.animate({ transform: opening ? ['scale(1)', `scale(${pageScale})`] : [`scale(${pageScale})`, 'scale(1)'] },
        { duration, easing: opening ? curve : bezier(motion.easing), fill: both });
      animations.push(behind);
      // Let go as soon as it ends: opening, the page is covered by then (its scale back to 1 is never seen); closing it ends at 1.
      // A finished animation left filling would keep a transform on the page for good.
      void behind.finished.then(() => { behind.cancel(); page.node.style.transformOrigin = ''; }, () => undefined);
    }
    // The scrim: a whole screen covers it once open; a sheet keeps it (its own style), and takes it away as it goes down.
    const resting = sheet ? scrimOpacity : 0;
    animations.push(scrim.animate({ opacity: opening ? [0, scrimOpacity] : [Number(getComputedStyle(scrim).opacity) || resting || scrimOpacity, 0] },
      { duration, easing: 'linear', fill: both }));
  }
  const cancel = () => {
    animations.forEach((animation) => animation.cancel());
    const page = document.querySelector<HTMLElement>('[role="main"]');
    if (page && !sheet) page.style.transformOrigin = '';
    root.style.overflow = previous;
  };
  const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => true, () => false);
  return { finished, cancel, duration };
}

// The page (AppShell's main) under a screen, with the centre of its part in view as the origin of a scale.
function pageUnder(frame: Box): { node: HTMLElement; origin: string } | null {
  const node = document.querySelector<HTMLElement>('[role="main"]');
  const root = rootBox();
  if (!node || !root) return null;
  const rect = node.getBoundingClientRect();
  const x = root.left + frame.left + frame.width / 2 - rect.left;
  const y = root.top + frame.top + frame.height / 2 - rect.top;
  return { node, origin: `${Math.round(x)}px ${Math.round(y)}px` };
}

// A sheet pulled down by its handle leaves downwards from where it is, the scrim fading with it.
function slideDown({ surface, scrim }: Parts, transform: string, height: number, scrimFrom: number): Run {
  const animations: Animation[] = [];
  const duration = motion.exit;
  const options = { duration, easing: bezier(motion.exitEasing), fill: 'both' as const };
  if (surface) animations.push(surface.animate({ transform: [transform || 'translateY(0px)', `translateY(${height}px)`] }, options));
  if (scrim) animations.push(scrim.animate({ opacity: [scrimFrom, 0] }, options));
  const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => true, () => false);
  return { finished, cancel: () => animations.forEach((animation) => animation.cancel()), duration };
}

// ——— frame ———

const bezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

function dom(node: unknown): HTMLElement | null {
  return typeof HTMLElement !== 'undefined' && node instanceof HTMLElement ? node : null;
}

// Coordinates of the portal layer: #root, which is fixed on the visible area (and moved down by iOS's keyboard pan).
function rootBox(): DOMRect | null {
  return typeof document === 'undefined' ? null : document.getElementById('root')?.getBoundingClientRect() ?? null;
}

// Phones: the whole app. From medium up: the content panel (AppShell marks it `data-app-panel`).
function measureFrame(size: SizeClass): Box {
  const root = rootBox();
  if (!root) return { left: 0, top: 0, width: 0, height: 0 };
  const panel = size === 'compact' ? null : document.querySelector('[data-app-panel]')?.getBoundingClientRect();
  if (!panel || !(panel.width > 0)) return { left: 0, top: 0, width: root.width, height: root.height };
  return { left: panel.left - root.left, top: panel.top - root.top, width: panel.width, height: panel.height };
}

// With the handle on top (details and panels on phones), what follows starts below it, not beside it (user's report, 24 November:
// the title touched the handle): the handle's 24-high target at 4 from the top, then 12.
const handleClearance = spacing.xs + 24 + spacing.md;

const styles = StyleSheet.create({
  root: { position: 'absolute' },
  blocker: { cursor: 'default' } as object,
  surface: { overflow: 'hidden' },
  content: { flex: 1 },
  grow: { flex: 1, minHeight: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  back: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, minWidth: 0 },
  scroll: { flexGrow: 1, gap: spacing.xl, paddingTop: spacing.sm },
  sheetScrim: { cursor: 'auto' } as object,
  catcher: { position: 'absolute', top: 0, left: 0, right: 0, cursor: 'auto' } as object,
  // Centred on the top edge of a detail, a wide target around the small bar.
  detentHandle: { position: 'absolute', left: '50%', marginLeft: -48, width: 96, height: 24, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as object,
  // Bottom of the frame, centred, at most 640 wide (Material 3 bottom sheet on large screens).
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 640, marginHorizontal: 'auto',
    borderTopLeftRadius: radius.dialog, borderTopRightRadius: radius.dialog },
  sheetContent: { flexShrink: 1, minHeight: 0 },
  sheetBody: { flexShrink: 1, minHeight: 0 },
  sheetTop: { alignItems: 'stretch', paddingTop: spacing.xs },
  handleArea: { alignSelf: 'center', width: 96, height: 32, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as object,
  handle: { width: 32, height: 4, borderRadius: 2, opacity: 0.4 },
  sheetTitle: { marginTop: spacing.xs },
});
