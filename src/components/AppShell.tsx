import { useI18n } from '../i18n/I18nProvider';
import { Logo } from './Logo';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Animated, Easing, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { FAB, Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useInsets } from '../theme/insets';
import { layerTransition, transitions } from '../theme/motion';
import { detailSpring } from '../theme/containerTransform';
import { springEasing } from '../theme/themeTransition';
import { layout, motion, radius, shape, spacing, spatialSpring, stateOpacity } from '../theme/tokens';
import { floatingBarBottomSpace, floatingBarSideSpace, isHorizontalDrag, isIPhone, pillGeometry, slotAt, slotWithHysteresis } from './navIndicator';
import { glassOf, panelColor } from '../theme/theme';
import { withAlpha } from '../theme/palette';
import { useReducedMotion, useSizeClass } from '../theme/useSizeClass';
import { batchKeyboardReports, observeViewportShrink, revealFocusedField, observeVirtualKeyboard, type KeyboardState } from '../theme/viewport';
import { readDrawerFolded, writeDrawerFolded } from '../services/drawerState';
import { useHaptics } from './Haptics';
import { Disclosure } from './Disclosure';
import { usePresence } from './Overlay';
import { SnackbarProvider } from './SnackbarHost';
import { StateLayerPressable } from './StateLayerPressable';
import { iconShapes, SvgIcon } from './SvgIcon';
import { Orbs } from './Orbs';
import { inAndroidApp } from '../services/androidApp';

export type Destination<T extends string = string> = { value: T; label: string; icon: string };

// A destination that goes away (the «Liste» toggle, 28 November, on request) does not vanish: it stays in the navigation for the length of its
// exit and shrinks away (`NavPresence`), and one that comes back or is new grows in. What is there at the start simply is there.
type NavEntry<T extends string> = { item: Destination<T>; present: boolean; visible: number; enter: boolean };
function useNavEntries<T extends string>(destinations: readonly Destination<T>[] | undefined): NavEntry<T>[] {
  const list = destinations ?? [];
  const key = list.map((item) => item.value).join('|');
  // Derived in the render (not in an effect): the entry that goes must never be missing from a single render, or it would unmount
  // and lose its exit.
  const [seen, setSeen] = useState<{ key: string; list: readonly Destination<T>[]; leaving: { item: Destination<T>; at: number }[] }>({ key, list, leaving: [] });
  let leaving = seen.leaving;
  if (seen.key !== key) {
    const gone = seen.list.map((item, at) => ({ item, at })).filter(({ item }) => !list.some((now) => now.value === item.value));
    leaving = [...seen.leaving.filter(({ item }) => !list.some((now) => now.value === item.value)), ...gone.filter(({ item }) => !seen.leaving.some((entry) => entry.item.value === item.value))];
    setSeen({ key, list, leaving });
  }
  useEffect(() => {
    if (leaving.length === 0) return undefined;
    const timer = setTimeout(() => setSeen((old) => ({ ...old, leaving: [] })), motion.medium + 80);
    return () => clearTimeout(timer);
  }, [leaving.length, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const started = useRef(false);
  useEffect(() => { started.current = true; }, []);
  const entries: NavEntry<T>[] = list.map((item) => ({ item, present: true, visible: 0, enter: started.current }));
  for (const { item, at } of leaving) if (!list.some((now) => now.value === item.value)) entries.splice(Math.min(at, entries.length), 0, { item, present: false, visible: 0, enter: false });
  let count = 0;
  return entries.map((entry) => ({ ...entry, visible: entry.present ? count++ : -1 }));
}

// One entry of the navigation that appears and disappears: the pill (a row) grows its share and fades, the rail and the drawer (a
// column) their height (`Disclosure grow`). Left out of the tab order and inert while it goes.
function NavPresence({ present, enter, row, children }: { present: boolean; enter: boolean; row?: boolean; children: ReactNode }) {
  const animate = !useReducedMotion();
  const presence = usePresence(present, motion.fade, animate);
  if (!row) return <Disclosure grow open={present} appear={enter}>{children}</Disclosure>;
  if (!presence.mounted) return null;
  const on = presence.shown || (!enter && present);
  return (
    <View {...{ inert: present ? undefined : true }} aria-hidden={present ? undefined : true}
      style={[{ flexGrow: on ? 1 : 0, flexShrink: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row', opacity: on ? 1 : 0 }, animate && transitions([['flex-grow', motion.medium, motion.enter], ['opacity', motion.fade]])]}>
      {children}
    </View>
  );
}

type Props<T extends string> = {
  destinations?: readonly Destination<T>[];
  selected?: T;
  onSelect?: (value: T) => void;
  // Right side of the top app bar (sync chip, theme toggle, account).
  actions?: ReactNode;
  // Primary action (new expense): extended FAB on compact, FAB in the rail, extended FAB in the drawer.
  // Hidden on compact while its own screen is open. It is not part of `destinations`.
  fab?: { label: string; icon: string; target: T };
  // Desktop drawer: offer the «Comprimi» row (default). Off, the drawer is always open, whatever was saved.
  drawerToggle?: boolean;
  // Without navigation (sign-in, guide): makes the brand a button, e.g. back to the sign-in.
  brand?: { label: string; onPress: () => void };
  children: ReactNode;
};

// Virtual keyboard open (inferred, see viewport.ts), for pages that need the room left above the keyboard. No page reads it
// today: the shell itself hides the navigation bar and scrolls the focused field into view.
const KeyboardContext = createContext(false);
// Fixed for the session: only the iPhone lowers the floating bar into its home-indicator area.
const iPhone = typeof navigator !== 'undefined' && isIPhone(navigator.userAgent);
const barSide = floatingBarSideSpace(iPhone, spacing.md, spacing.xs);
export const useKeyboardOpen = () => useContext(KeyboardContext);
// The shared page scroller back to its top. `selected` already does it between pages; a page that swaps its own content in place
// (the guide opened from Info, from the mode choice or the sign-in) uses `useScrollToTopOn` so the new view opens at its top
// (28 November, on report: the guide opened where Info had been scrolled, mid-text).
const ScrollTopContext = createContext<() => void>(() => undefined);
export function useScrollToTopOn(key: unknown) {
  const toTop = useContext(ScrollTopContext);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    toTop();
  }, [key, toTop]);
}

function useVirtualKeyboard() {
  const [state, setState] = useState<KeyboardState>({ open: false, confirmed: false });
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Commit in the same frame as the viewport change. The keyboard resizes the viewport in the browser's resize step
    // and the page's new height is painted in that frame (GlobalStyle sets --nummo-viewport-height from the same
    // event), but React renders an update from a native `resize` listener in a later task, one frame late: the shrunken
    // page would still reserve the hidden bar's room for a frame (content jumping twice), and on closing it would show
    // an empty strip before the bar returns. The reports are gathered in a microtask (still before the paint) into one
    // synchronous render, which also runs the shell's layout effect (focused field scrolled into view). Only DOM events
    // and timers call back here, never a render.
    const reports = batchKeyboardReports((value) => flushSync(() => setState((previous) =>
      (previous.open === value.open && previous.confirmed === value.confirmed ? previous : value))));
    const stop = observeVirtualKeyboard(window, reports.open, reports.confirmed);
    return () => { reports.cancel(); stop(); };
  }, []);
  return state;
}

// Room left between the focused field and the virtual keyboard when the field is brought into view.
const keyboardFieldMargin = spacing.xl;

// Adaptive Material 3 shell: top app bar + navigation bar (compact), rail (medium) or
// standing drawer (expanded). The content scrolls inside the shell, nothing is position: fixed.
export function AppShell<T extends string>({ destinations, selected, onSelect, actions, fab, brand, drawerToggle = true, children }: Props<T>) {
  const theme = useTheme();
  const { colors } = theme;
  const size = useSizeClass();
  const reduceMotion = useReducedMotion();
  const { open: keyboard, confirmed: keyboardConfirmed } = useVirtualKeyboard();
  // Once the keyboard changes the layout, bring the focused field back into view. The confirmation is committed with
  // flushSync inside the viewport's resize event (see useVirtualKeyboard), so the layout is final here: scrolling now
  // lands in the same frame as the new height (a frame later the field would show cut by the keyboard for a frame).
  // The confirmation comes at the first step past the threshold, but iOS shrinks its visual viewport in steps during the
  // keyboard animation: while the keyboard is open every further shrinking brings the field back into view too
  // (observeViewportShrink; DOM only, no render per step). `nearest` honours the scroll padding reserved by sticky bars.
  // A margin under the field, only for this scroll: without it the field ended flush on the keyboard (360×640 with a
  // 300 px keyboard) and what is right under it (the counter of «Descrizione») stayed covered.
  useLayoutEffect(() => {
    if (!keyboardConfirmed || typeof document === 'undefined') return undefined;
    const reveal = () => revealFocusedField(document, keyboardFieldMargin);
    reveal();
    return observeViewportShrink(window, reveal);
  }, [keyboardConfirmed]);
  const page = useRef<ComponentRef<typeof View>>(null);
  const previousSection = useRef(selected);
  // Animate the existing DOM container: no per-frame React/JS updates or remount of drafts.
  useLayoutEffect(() => {
    const changed = previousSection.current !== selected;
    previousSection.current = selected;
    // Every page opens at its top, however it was reached (navigation, a page of the account menu, «Fatto», Back, the brand): the
    // page scroller is shared, and it was reset only by a tap on the navigation, so a page opened from the account menu or with
    // «Fatto» started where the previous one had been scrolled (user's report, 26 November). Before the paint, in the same commit.
    if (changed) scroller.current?.scrollTo({ y: 0, animated: false });
    const node = page.current as unknown as HTMLElement | null;
    if (!changed || reduceMotion || theme.animation.scale === 0 || !node?.animate) return;
    // Every page enters fully: first the account menu's pages (Impostazioni, Notifiche, Categorie…, user's request, 23
    // November), then also the destinations and Nuova spesa (user's request, 24 November): from slightly smaller and lower on
    // the screens' spring, its opacity a little quicker.
    const spring = springEasing(detailSpring);
    const easing = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : `cubic-bezier(${motion.enter.join(',')})`;
    const moves = [
      node.animate([{ transform: `translateY(${spacing.xl}px) scale(0.97)` }, { transform: 'translateY(0) scale(1)' }], { duration: spring.duration, easing, fill: 'both' }),
      node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: motion.long, easing: 'linear', fill: 'both' }),
    ];
    void Promise.all(moves.map((animation) => animation.finished)).then(() => moves.forEach((animation) => animation.cancel()), () => undefined);
    return () => moves.forEach((animation) => animation.cancel());
  }, [selected, reduceMotion, theme.animation.scale]);
  const insets = useInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  // The page goes back to its top when `selected` changes (layout effect above), whoever changed it; a tap on the destination
  // already shown takes it back to its top too, as before.
  const select = useCallback((value: T) => {
    if (value === previousSection.current) scroller.current?.scrollTo({ y: 0, animated: false });
    onSelect?.(value);
  }, [onSelect]);
  const scrollToTop = useCallback(() => scroller.current?.scrollTo({ y: 0, animated: false }), []);
  const navEntries = useNavEntries(destinations);
  const hasNav = Boolean(destinations?.length);
  // Desktop: the drawer folds to icons only (user's request, 27 November), giving the panel the room. Remembered in this browser (services/drawerState.ts).
  const [drawerFolded, setDrawerFolded] = useState(readDrawerFolded);
  const toggleDrawer = useCallback(() => setDrawerFolded((value) => { writeDrawerFolded(!value); return !value; }), []);
  // Hide on touch, but keep its space until the viewport confirms the keyboard. Removing it on pointerdown would
  // clamp scrollTop near the bottom, shifting another control under the finger before pointerup/click.
  const navMounted = hasNav && size === 'compact';
  const bottomBar = navMounted && !keyboard;
  // Compact: floating toolbar (destinations pill + round primary action) in the layout flow, above the bottom inset.
  const barBottom = floatingBarBottomSpace(insets.bottom, spacing.md, iPhone);
  const barHeight = layout.floatingBar + spacing.md + barBottom;
  const showFab = bottomBar && fab && selected !== fab.target;
  // Phones: the top bar and the navigation float over the page, which scrolls under them (blurred glass, as in Morphe: 26 November,
  // on request); the page keeps their room as padding. The navigation keeps its room while it is visible and, as before, while the
  // keyboard is not yet confirmed (the target under the finger must not move between press and release).
  const overlayBars = size === 'compact';
  // Blurred glass bars only in the Android app, where the bars of the system take the page's colour; in the browser and the
  // installed web app the system bars keep a fixed colour and a translucent bar next to them looked wrong (28 November, on request).
  const blurBars = inAndroidApp();
  const navRoom = navMounted && (bottomBar || (keyboard && !keyboardConfirmed));
  const topRoom = layout.topBarHeight + insets.top;
  const padding = size === 'compact' ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const compact = size === 'compact';
  const expanded = size === 'expanded';
  const showPanel = expanded && hasNav; // no panel on the sign-in and guide screens
  // Inside the panel, `background` is the panel colour so outlined-field label notches and sticky bars blend in.
  // On phones and tablets there is no lighter panel (desktop only): the page sits on the plain background.
  const panelBg = !showPanel ? colors.background : panelColor(colors);
  const glass = glassOf(colors);
  const panelTheme = useMemo(() => ({ ...theme, colors: { ...colors, background: panelBg } }), [theme, colors, panelBg]);
  // 16 around the panel on the right and below (32 until 24 November: a larger panel, user's request).
  // The panel is glass too: the circles of the background show through it a little.
  const panel = !showPanel ? { borderRadius: 0 } : { borderRadius: radius.dialog, marginTop: spacing.md, marginRight: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: glass.glassBorder };
  // The scroller fills the rounded panel, which clips it: content scrolls out of view at the panel's own edge, never at
  // a line inside it. The scrollbar would run straight through the corners (browsers do not bend it to the radius):
  // `data-panel-scroll` lets GlobalStyle stop its track a corner radius short of both ends.
  // A row cut by the bottom edge stays as it is, plain and usable: the fade that hinted at more below (21 November)
  // was removed on 26 November, on request, on every size.
  // `pageScroll` only names the page scroller for the manual checks (scripts/check-keyboard.mjs).
  // Fields and focus brought into view (keyboard, Tab) stop below the floating top bar and above the floating navigation.
  useLayoutEffect(() => {
    const node = (scroller.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node?.style) return;
    node.style.scrollPaddingTop = overlayBars ? `${topRoom}px` : '';
    node.style.scrollPaddingBottom = overlayBars && navRoom ? `${barHeight}px` : '';
  }, [overlayBars, topRoom, navRoom, barHeight]);
  // The scrollbar only when the page really needs it (28 November, on request): the page's own bottom padding does not count. A page that
  // fits but for that padding (Nuova spesa on a window a few pixels short) showed a nearly full thumb for nothing; it appears as soon as the
  // content is taller (Ricorrente opened). Desktop panel only: the phone shows no scrollbar.
  useLayoutEffect(() => {
    const node = (scroller.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    const content = node?.firstElementChild as HTMLElement | null | undefined;
    if (!node || !content || !showPanel || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const bottom = parseFloat(getComputedStyle(content).paddingBottom) || 0;
      node.style.overflowY = content.getBoundingClientRect().height - bottom <= node.clientHeight + 0.5 ? 'hidden' : '';
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observer.observe(content);
    return () => { observer.disconnect(); node.style.overflowY = ''; };
  }, [showPanel]);
  const scrollMarks = hasNav ? { dataSet: showPanel ? { panelScroll: 'true', pageScroll: 'true' } : { pageScroll: 'true' } } : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Orbs color={glass.orb} />
      <SnackbarProvider bottomOffset={bottomBar ? barHeight : insets.bottom}>
      {/* `appChrome`: faded out on phones while a whole screen is open (ScreenLayer, holdChrome). On phones a blurred glass bar
          over the page; elsewhere in the flow, on the background. */}
      <View role="banner" {...{ dataSet: overlayBars && blurBars ? { appChrome: 'true', glassBar: 'true' } : { appChrome: 'true' } }}
        style={[styles.topBar, overlayBars ? [styles.overlayTop, { backgroundColor: blurBars ? withAlpha(colors.background, 0.62) : colors.background, left: insets.left, right: insets.right }] : null,
          { paddingTop: insets.top, paddingHorizontal: padding, height: topRoom }]}>
        {fab && hasNav ? (
          // The brand leads to the primary screen (new expense); on it, it does nothing.
          <StateLayerPressable layerColor="transparent" accessibilityRole="button" accessibilityLabel={`Nummo, ${fab.label}`}
            onPress={() => { if (selected !== fab.target) select(fab.target); }} style={[styles.brand, styles.noRing]}>
            <Logo size={32} color={colors.primary} />
            <Text variant="titleLarge" style={[styles.brandName, { color: colors.primary }]}>Nummo</Text>
          </StateLayerPressable>
        ) : brand ? (
          <StateLayerPressable layerColor="transparent" accessibilityRole="button" accessibilityLabel={`Nummo, ${brand.label}`}
            onPress={brand.onPress} style={[styles.brand, styles.noRing]}>
            <Logo size={32} color={colors.primary} />
            <Text variant="titleLarge" style={[styles.brandName, { color: colors.primary }]}>Nummo</Text>
          </StateLayerPressable>
        ) : (
          <View style={styles.brand}>
            <Logo size={32} color={colors.primary} />
            <Text variant="titleLarge" style={[styles.brandName, { color: colors.primary }]}>Nummo</Text>
          </View>
        )}
        <View style={styles.actions}>{actions}</View>
      </View>
        <View style={styles.body}>
          {hasNav && size === 'medium' && <Rail destinations={destinations!} entries={navEntries} selected={selected} onSelect={select} fab={fab} />}
          {hasNav && size === 'expanded' && <Drawer destinations={destinations!} entries={navEntries} selected={selected} onSelect={select} fab={fab} folded={drawerToggle && drawerFolded} onToggle={drawerToggle ? toggleDrawer : undefined} />}
          {/* `appPanel`: the area a page-level layer covers from medium up (the expense detail, ExpenseDetail.tsx). */}
          <View {...{ dataSet: { appPanel: 'true' } }} style={[styles.scroll, panel, styles.panelClip, { backgroundColor: showPanel ? withAlpha(panelBg, 0.7) : 'transparent' }]}>
          <ScrollView ref={scroller} style={styles.scroll} {...scrollMarks} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, padding, paddingTop: padding + (overlayBars ? topRoom : 0),
              paddingBottom: padding + (overlayBars ? (navRoom ? barHeight : insets.bottom) : bottomBar ? 0 : insets.bottom) }}>
            <ThemeProvider theme={panelTheme}>
              <ScrollTopContext.Provider value={scrollToTop}>
              <KeyboardContext.Provider value={keyboard}>
              <View ref={page} role="main" style={[styles.content, size === 'compact' && { gap: spacing.lg }, compact && fab && selected === fab.target && { justifyContent: 'center' }]}>{children}</View>
              </KeyboardContext.Provider>
              </ScrollTopContext.Provider>
            </ThemeProvider>
          </ScrollView>
          </View>
        </View>
        {navMounted && <NavigationBar destinations={destinations!} entries={navEntries} selected={selected} onSelect={select} bottomSpace={barBottom} fab={showFab ? fab : undefined} reserveFab={Boolean(fab)} hidden={!bottomBar} reserveSpace={keyboard && !keyboardConfirmed} />}
      </SnackbarProvider>
    </View>
  );
}

// Hover/pressed layer drawn on the coloured pill itself, so the highlight is exactly the pill's size.
function HoverLayer({ state, color }: { state: { pressed: boolean; hovered?: boolean }; color: string }) {
  const opacity = state.pressed ? stateOpacity.pressed : state.hovered ? stateOpacity.hover : 0;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }, layerTransition]} />;
}

type Fab<T extends string> = { label: string; icon: string; target: T };
type NavProps<T extends string> = { destinations: readonly Destination<T>[]; entries: NavEntry<T>[]; selected?: T; onSelect: (value: T) => void; fab?: Fab<T> };

function NavigationBar<T extends string>({ destinations, entries, selected, onSelect, bottomSpace, fab, reserveFab, hidden, reserveSpace }: NavProps<T> & { bottomSpace: number; reserveFab: boolean; hidden: boolean; reserveSpace: boolean }) {
  const { t } = useI18n();
  const { colors, fonts } = useTheme();
  const glass = glassOf(colors);
  const blurBars = inAndroidApp();
  const reduceMotion = useReducedMotion();
  // Phone only (this bar), in the Android app: a short vibration on every press of a destination or of the round action, and
  // the same one while a finger dragged along the pill enters another destination (see useSlidingIndicator). «Vibrazione» in Settings.
  const haptic = useHaptics();
  // The round action enters/leaves with width, opacity and scale; the pill is flex: 1, so it widens/narrows with it.
  // The action stays mounted until its exit animation has finished (an interrupted one must not unmount it).
  const lastFab = useRef(fab);
  if (fab) lastFab.current = fab;
  const [mounted, setMounted] = useState(Boolean(fab));
  const progress = useRef(new Animated.Value(fab ? 1 : 0)).current;
  const visible = Boolean(fab);
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0, duration: reduceMotion ? 0 : motion.medium, easing: Easing.bezier(...motion.easing), useNativeDriver: false,
    }).start(({ finished }) => { if (finished && !visible) setMounted(false); });
  }, [visible, progress, reduceMotion]);
  const action = fab ?? lastFab.current;
  const [barWidth, setBarWidth] = useState(0);
  // Size for the narrowest pill (with the primary action), even on New expense. This keeps typography stable throughout
  // the action's width animation. onLayout includes the shell's safe-area constraints, unlike window dimensions.
  const labelSlot = pillGeometry(barWidth - barSide * 2 - (reserveFab ? layout.floatingBar + spacing.xs : 0), destinations.length, pillPadding, pillGap)?.slot ?? 0;
  const [labelWidth, setLabelWidth] = useState<number | null>(null);
  const labels = JSON.stringify(destinations.map(({ label }) => label));
  const { fontFamily, fontSize, letterSpacing } = fonts.labelMedium;
  useLayoutEffect(() => {
    // Measure with the browser's font metrics, including the selected system fallback and the active (bold) weight.
    const probe = document.createElement('span');
    // Pinned to the top left corner: left at the end of <body> it would make the page 15 px taller than the window, so the
    // document could scroll and sheets and dialogs would leave a strip uncovered at the bottom.
    Object.assign(probe.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', visibility: 'hidden', whiteSpace: 'nowrap', fontFamily,
      fontSize: `${fontSize}px`, fontWeight: '700', letterSpacing: `${letterSpacing}px` });
    probe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(probe);
    const measure = () => {
      let widest = 0;
      for (const label of JSON.parse(labels) as string[]) {
        probe.textContent = label;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      }
      setLabelWidth(widest);
    };
    measure();
    document.fonts.addEventListener('loadingdone', measure);
    return () => { document.fonts.removeEventListener('loadingdone', measure); probe.remove(); };
  }, [labels, fontFamily, fontSize, letterSpacing]);
  const tight = labelWidth === null || labelWidth + spacing.xs > labelSlot;
  const index = destinations.findIndex((item) => item.value === selected);
  const { pill, indicator, focus, suppressPressed } = useSlidingIndicator(destinations, index, onSelect, reduceMotion, haptic);
  const shownIndex = focus ?? index;
  return (
    <View aria-hidden={hidden} {...{ inert: hidden ? true : undefined, dataSet: { appChrome: 'true' } }} pointerEvents={hidden ? 'none' : 'auto'}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={[styles.floating, { paddingBottom: bottomSpace, paddingHorizontal: barSide }, hidden && (reserveSpace ? { opacity: 0 } : styles.hidden)]}>
      {/* Blurred glass pill over the page, which scrolls under it (26 November, on request, after Morphe). */}
      <View ref={pill.ref} onLayout={pill.onLayout} role="navigation" aria-label={t("Sezioni")} {...{ dataSet: blurBars ? { glassBar: 'true' } : {} }}
        style={[styles.pill, { backgroundColor: blurBars ? glass.glassBar : glass.glassSolid }]}>
        {/* Hairline outline drawn as an overlay, so the border does not change the geometry the indicator is measured on. */}
        <View pointerEvents="none" style={[styles.pillOutline, { borderColor: glass.glassBorder }]} />
        {/* One active indicator for the whole pill: it slides between destinations (and follows a finger dragged along
            the pill) instead of each item switching its own fill. Until the pill is measured, the item draws it. */}
        {indicator && <Animated.View pointerEvents="none" style={[styles.indicator, indicator.style, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]} />}
        {entries.map(({ item, present, enter, visible: i }) => {
          const active = present && i === shownIndex;
          const color = active ? colors.onPrimaryContainer : colors.onSurfaceVariant;
          return (
            <NavPresence key={item.value} present={present} enter={enter} row>
            <StateLayerPressable layerColor={focus === null ? color : 'transparent'} radius={radius.pill} accessibilityRole="button"
              suppressPressed={suppressPressed}
              aria-current={item.value === selected ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => { haptic(); onSelect(item.value); }}
              style={[styles.pillItem, active && !indicator && { backgroundColor: colors.primaryContainer, borderWidth: 1, borderColor: colors.primary }]}>
              <SvgIcon shape={item.icon} size={24} color={color} />
              <Text variant={tight ? 'labelSmall' : 'labelMedium'} numberOfLines={1} style={{ maxWidth: '100%', textAlign: 'center', color, fontWeight: active ? '700' : '500', ...(tight ? { letterSpacing: 0 } : null) }}>{item.label}</Text>
            </StateLayerPressable>
            </NavPresence>
          );
        })}
      </View>
      {mounted && action && (
        // `inert`, not aria-hidden: the button usually still has focus when it hides (it was just pressed to open «Nuova»),
        // and aria-hidden on a focused element is blocked by the browser. inert also drops the focus and the a11y node.
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} {...{ inert: visible ? undefined : true }}
          style={[styles.actionSlot, {
            width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, layout.floatingBar] }),
            marginLeft: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spacing.xs] }),
            opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }]}>
          <StateLayerPressable layerColor={colors.onPrimary} radius={radius.pill} accessibilityRole="button" accessibilityLabel={action.label}
            tabIndex={visible ? 0 : -1}
            onPress={() => { haptic(); onSelect(action.target); }} style={[styles.roundAction, { backgroundColor: colors.primary }]}>
            <SvgIcon shape={action.icon} size={28} color={colors.onPrimary} />
          </StateLayerPressable>
        </Animated.View>
      )}
    </View>
  );
}

const pillPadding = spacing.xs;
const pillGap = 0;

// Sliding active indicator of the compact pill, with drag-to-switch: press anywhere on the pill and slide horizontally,
// the indicator follows the finger (slightly lifted), the destination under it is highlighted, and releasing opens it.
// Taps, keyboard and screen readers keep using the item buttons; the drag is only a shortcut. Moves use the M3 Expressive
// spatial spring; with reduced motion the indicator jumps. Web only: native pointer events on the pill's DOM node.
function useSlidingIndicator<T extends string>(destinations: readonly Destination<T>[], index: number, onSelect: (value: T) => void, reduceMotion: boolean,
  haptic: () => void) {
  const count = destinations.length;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  // Keep a completed/cancelled drag suppressed until the next press: restoring the colour at pointerup can otherwise
  // reveal the origin's still-pressed layer for a frame, followed by its 100 ms fade. Hover feedback stays independent.
  const [suppressPressed, setSuppressPressed] = useState(false);
  const position = useRef(new Animated.Value(Math.max(index, 0))).current;
  const shown = useRef(new Animated.Value(index >= 0 ? 1 : 0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const goal = useRef<number | null>(index >= 0 ? index : null);
  // Latest values for the native listeners, which are attached once.
  const latest = useRef({ destinations, index, onSelect, reduceMotion, haptic });
  latest.current = { destinations, index, onSelect, reduceMotion, haptic };

  const moveTo = useCallback((target: number) => {
    goal.current = target;
    position.stopAnimation();
    if (latest.current.reduceMotion) position.setValue(target);
    else Animated.spring(position, { toValue: target, ...spatialSpring, useNativeDriver: false }).start();
  }, [position]);
  const fade = useCallback((value: 0 | 1) => {
    Animated.timing(shown, { toValue: value, duration: latest.current.reduceMotion ? 0 : motion.short, easing: Easing.bezier(...motion.easing), useNativeDriver: false }).start();
  }, [shown]);
  const setLift = useCallback((value: 0 | 1) => {
    if (latest.current.reduceMotion) lift.setValue(value);
    else Animated.spring(lift, { toValue: value, ...spatialSpring, useNativeDriver: false }).start();
  }, [lift]);

  // Selection changed from outside (tap, brand, primary action): slide there. Coming back from a screen without an active
  // destination (new expense) the indicator appears in place instead of travelling from the old one.
  const wasShown = useRef(index >= 0);
  useEffect(() => {
    if (dragging.current) return;
    if (index < 0) { goal.current = null; wasShown.current = false; fade(0); return; }
    if (!wasShown.current) { position.stopAnimation(); position.setValue(index); goal.current = index; }
    else if (goal.current !== index) moveTo(index);
    wasShown.current = true;
    fade(1);
  }, [index, moveTo, fade, position]);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    node.style.touchAction = 'none'; // the browser must not scroll or navigate back while the finger slides on the pill
    node.style.userSelect = 'none';
    let start: { id: number; x: number; y: number } | null = null;
    let active = false;
    let swallowClick = false;
    let slot: number | null = null; // destination under the finger during a drag: a vibration each time it changes
    const at = (clientX: number) => {
      const rect = node.getBoundingClientRect();
      return slotAt(clientX - rect.left, rect.width, latest.current.destinations.length, pillPadding, pillGap);
    };
    const down = (event: PointerEvent) => {
      swallowClick = false;
      if (event.button !== 0 || !event.isPrimary) return;
      setSuppressPressed(false);
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      if (!active) {
        if (!isHorizontalDrag(event.clientX - start.x, event.clientY - start.y)) return;
        active = true;
        dragging.current = true;
        setSuppressPressed(true);
        try { node.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
        position.stopAnimation();
        fade(1);
        setLift(1);
        slot = latest.current.index;
      }
      event.preventDefault();
      const value = at(event.clientX);
      position.setValue(value);
      const next = slotWithHysteresis(value, slot);
      if (next !== slot) { slot = next; latest.current.haptic(); }
      setFocus(next);
    };
    const end = (event: PointerEvent, commit: boolean) => {
      if (!start || event.pointerId !== start.id) return;
      start = null;
      if (!active) return;
      active = false;
      dragging.current = false;
      swallowClick = commit; // the click that follows a drag must not also press the button under the finger
      setFocus(null);
      setLift(0);
      const { destinations: items, index: current, onSelect: select } = latest.current;
      // The destination opened is the one highlighted (and vibrated) under the finger, dead band included.
      const target = commit ? slot ?? Math.round(at(event.clientX)) : current;
      if (target < 0) { fade(0); return; }
      moveTo(target);
      const item = items[target];
      if (commit && item && target !== current) { latest.current.haptic(); select(item.value); }
    };
    const up = (event: PointerEvent) => end(event, true);
    const cancel = (event: PointerEvent) => end(event, false);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // A keyboard activation is a new gesture, not the synthetic click left over from the drag.
        swallowClick = false;
        setSuppressPressed(false);
      }
    };
    const click = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', cancel);
    node.addEventListener('keydown', keydown);
    node.addEventListener('click', click, true);
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('keydown', keydown);
      node.removeEventListener('click', click, true);
    };
  }, [position, moveTo, fade, setLift]);

  const geometry = pillGeometry(width, count, pillPadding, pillGap);
  const indicator = geometry ? {
    style: {
      width: geometry.slot,
      opacity: shown,
      transform: [
        { translateX: Animated.multiply(position, geometry.step) },
        { scaleX: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
        { scaleY: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
      ],
    },
  } : null;
  return {
    pill: { ref, onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width) },
    indicator,
    focus,
    suppressPressed,
  };
}

// Icon of Paper's FAB. Paper cross-fades and rotates the icon (200 ms, a JS animation that ignores reduced motion) whenever
// the `icon` prop changes identity: an inline function restarted it on every render of the shell (each page change).
function useIconSource(shape: string | undefined) {
  return useCallback(({ size, color }: { size: number; color: string }) => <SvgIcon shape={shape ?? ''} size={size} color={color} />, [shape]);
}

function Rail<T extends string>({ entries, selected, onSelect, fab }: NavProps<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const fabIcon = useIconSource(fab?.icon);
  return (
    <ScrollView role="navigation" aria-label={t("Sezioni")} style={styles.rail}
      contentContainerStyle={styles.railContent} keyboardShouldPersistTaps="handled">
      {fab && (
        <FAB mode="flat" icon={fabIcon} accessibilityLabel={fab.label}
          onPress={() => onSelect(fab.target)} color={colors.onPrimaryContainer}
          style={[styles.railFab, { backgroundColor: colors.primaryContainer }]} />
      )}
      {entries.map(({ item, present, enter }) => {
        const active = item.value === selected;
        return (
          <NavPresence key={item.value} present={present} enter={enter}>
          <StateLayerPressable layerColor="transparent" accessibilityRole="button"
            aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)} style={styles.railItem}>
            {(state) => <>
            <View style={[styles.railIndicator, active && { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
              <HoverLayer state={state} color={colors.onSurface} />
              <SvgIcon shape={item.icon} size={24} color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
            </View>
            <Text variant="labelMedium" numberOfLines={1} style={{ color: active ? colors.onSurface : colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
            </>}
          </StateLayerPressable>
          </NavPresence>
        );
      })}
    </ScrollView>
  );
}

const drawerMotion = transitions([['width', motion.long]]);
const labelMotion = transitions([['opacity', motion.medium]]);

function Drawer<T extends string>({ entries, selected, onSelect, fab, folded, onToggle }: NavProps<T> & { folded: boolean; onToggle?: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const fabIcon = useIconSource(fab?.icon);
  const toggleLabel = folded ? t('Espandi il menu') : t('Comprimi il menu');
  // Folding is one movement (user's request, 27 November: the swap looked cheap): the drawer's width eases between 224 and 80 while the
  // labels fade (always mounted, clipped by the drawer) and the icons stay where they are; the button at the top, which changes shape
  // (extended ↔ icon), settles in from a little smaller. Nothing at the first render, nothing with reduced motion (the global rule).
  const reduced = useReducedMotion();
  const fabRef = useRef<ComponentRef<typeof View>>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const node = fabRef.current as unknown as HTMLElement | null;
    if (reduced || !node || typeof node.animate !== 'function') return undefined;
    const move = node.animate([{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }],
      { duration: motion.medium, easing: `cubic-bezier(${motion.easing.join(',')})`, fill: 'backwards' });
    return () => move.cancel();
  }, [folded, reduced]);
  return (
    <View role="navigation" aria-label={t("Sezioni")} style={[styles.drawer, folded && styles.drawerFolded, drawerMotion]}>
      <View ref={fabRef} style={styles.drawerFabBox}>
      {fab && (folded ? (
        <FAB mode="flat" icon={fabIcon} accessibilityLabel={fab.label} onPress={() => onSelect(fab.target)} color={colors.onPrimaryContainer}
          style={[styles.railFab, styles.drawerFabFolded, { backgroundColor: colors.primaryContainer }]} />
      ) : (
        <FAB mode="flat" customSize={60} label={fab.label} icon={fabIcon}
          accessibilityLabel={fab.label} onPress={() => onSelect(fab.target)} color={colors.onPrimaryContainer}
          style={[styles.drawerFab, { backgroundColor: colors.primaryContainer }]} />
      ))}
      </View>
      {entries.map(({ item, present, enter }) => {
        const active = item.value === selected;
        const color = active ? colors.onPrimaryContainer : colors.onSurfaceVariant;
        return (
          <NavPresence key={item.value} present={present} enter={enter}>
          <StateLayerPressable layerColor={color} accessibilityRole="button" radius={radius.pill}
            aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)}
            style={[styles.drawerItem, { borderColor: active ? colors.primary : 'transparent' }, active && { backgroundColor: colors.primaryContainer }]}>
            <SvgIcon shape={item.icon} size={24} color={color} />
            <Text variant="titleSmall" numberOfLines={1} aria-hidden={folded} style={[styles.drawerLabel, labelMotion, { color, fontWeight: active ? '700' : '500', opacity: folded ? 0 : 1 }]}>{item.label}</Text>
          </StateLayerPressable>
          </NavPresence>
        );
      })}
      {onToggle && <>
      {/* At the foot, a row like the destinations (same height, shape and colours), so it reads as part of the menu. */}
      <StateLayerPressable layerColor={colors.onSurfaceVariant} accessibilityRole="button" accessibilityLabel={toggleLabel} aria-expanded={!folded}
        radius={radius.pill} onPress={onToggle} style={[styles.drawerItem, styles.drawerToggle, { borderColor: 'transparent' }]}>
        <SvgIcon shape={folded ? iconShapes.chevronRight : iconShapes.chevronLeft} size={24} color={colors.onSurfaceVariant} />
        <Text variant="titleSmall" numberOfLines={1} aria-hidden={folded} style={[styles.drawerLabel, labelMotion, { color: colors.onSurfaceVariant, fontWeight: '500', opacity: folded ? 0 : 1 }]}>{t('Comprimi')}</Text>
      </StateLayerPressable>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, width: '100%', overflow: 'hidden' },
  overlayTop: { position: 'absolute', top: 0, zIndex: 2 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
  },
  // The logo shows no hover/pressed layer and no focus ring (clicking it must leave no highlight).
  noRing: { outlineStyle: 'none' } as object,
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1, minHeight: layout.minTouch, paddingHorizontal: spacing.sm, marginLeft: -spacing.sm },
  brandName: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  scroll: { flex: 1, minWidth: 0 },
  panelClip: { overflow: 'hidden' },
  // The page always fills the panel, on any monitor: no width cap or centred column.
  content: { width: '100%', flexGrow: 1, gap: spacing.xl },
  // Over the bottom of the page (which keeps its room as padding, see AppShell).
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  // display: none also removes it from the accessibility tree and the Tab order while the keyboard is open.
  hidden: { display: 'none' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', height: layout.floatingBar, borderRadius: radius.pill, padding: pillPadding, gap: pillGap },
  pillOutline: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 1, borderRadius: radius.pill },
  indicator: { position: 'absolute', left: pillPadding, top: pillPadding, height: layout.floatingBar - pillPadding * 2, borderRadius: radius.pill, borderWidth: 1 },
  // The rounded state layer clips itself; clipping the entire button would cut label glyphs at the bottom corners.
  pillItem: { flex: 1, minWidth: 0, height: layout.floatingBar - spacing.xs * 2, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill, overflow: 'visible' },
  actionSlot: { height: layout.floatingBar, overflow: 'hidden' },
  roundAction: { width: layout.floatingBar, height: layout.floatingBar, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rail: { width: layout.railWidth, flexGrow: 0, flexShrink: 0 },
  railContent: { paddingTop: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center', gap: spacing.lg + 4 },
  railFab: { marginTop: spacing.lg, marginBottom: spacing.md, borderRadius: radius.button },
  railItem: { width: layout.railWidth - spacing.sm, alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  railIndicator: { overflow: 'hidden', width: 56, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  drawer: { width: layout.drawerWidth, padding: spacing.md, paddingTop: spacing.lg, gap: spacing.lg + 4, overflow: 'hidden' },
  drawerFabBox: { alignSelf: 'stretch' },
  drawerLabel: { flexShrink: 0, whiteSpace: 'nowrap' } as object,
  drawerFab: { alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.md, marginLeft: spacing.xs, borderRadius: radius.button },
  drawerFolded: { width: layout.railWidth },
  drawerToggle: { marginTop: 'auto' },
  drawerFabFolded: { alignSelf: 'flex-start', marginLeft: 0, marginTop: 0, marginBottom: 0 },
  drawerItem: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, overflow: 'hidden', borderWidth: 1 },
});
