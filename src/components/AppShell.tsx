import { useI18n } from '../i18n/I18nProvider';
import { Logo } from './Logo';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { FAB, Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layerTransition } from '../theme/motion';
import { layout, motion, radius, shape, spacing, spatialSpring, stateOpacity } from '../theme/tokens';
import { floatingBarBottomSpace, floatingBarSideSpace, isHorizontalDrag, isIPhone, pillGeometry, slotAt } from './navIndicator';
import { panelColor } from '../theme/theme';
import { useReducedMotion, useSizeClass } from '../theme/useSizeClass';
import { observeVirtualKeyboard } from '../theme/viewport';
import { SnackbarProvider } from './SnackbarHost';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon } from './SvgIcon';

export type Destination<T extends string = string> = { value: T; label: string; icon: string };

type Props<T extends string> = {
  destinations?: readonly Destination<T>[];
  selected?: T;
  onSelect?: (value: T) => void;
  // Right side of the top app bar (sync chip, theme toggle, account).
  actions?: ReactNode;
  // Primary action (new expense): extended FAB on compact, FAB in the rail, extended FAB in the drawer.
  // Hidden on compact while its own screen is open. It is not part of `destinations`.
  fab?: { label: string; icon: string; target: T };
  // Without navigation (sign-in, guide): makes the brand a button, e.g. back to the sign-in.
  brand?: { label: string; onPress: () => void };
  children: ReactNode;
};

// Virtual keyboard open (inferred, see viewport.ts). Pages read it to give the fields the room left above the keyboard.
const KeyboardContext = createContext(false);
// Fixed for the session: only the iPhone lowers the floating bar into its home-indicator area.
const iPhone = typeof navigator !== 'undefined' && isIPhone(navigator.userAgent);
const barSide = floatingBarSideSpace(iPhone, spacing.md, spacing.xs);
export const useKeyboardOpen = () => useContext(KeyboardContext);

function useVirtualKeyboard() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => (typeof window === 'undefined' ? undefined : observeVirtualKeyboard(window, setOpen, setConfirmed)), []);
  return { open, confirmed };
}

// Adaptive Material 3 shell: top app bar + navigation bar (compact), rail (medium) or
// standing drawer (expanded). The content scrolls inside the shell, nothing is position: fixed.
export function AppShell<T extends string>({ destinations, selected, onSelect, actions, fab, brand, children }: Props<T>) {
  const theme = useTheme();
  const { colors } = theme;
  const size = useSizeClass();
  const reduceMotion = useReducedMotion();
  const { open: keyboard, confirmed: keyboardConfirmed } = useVirtualKeyboard();
  // Once the keyboard changes the layout, bring the focused field back
  // into view once it has settled. `nearest` honours the scroll padding reserved by sticky bars.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (keyboardConfirmed && active instanceof HTMLElement && active !== document.body) active.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboardConfirmed]);
  const page = useRef<ComponentRef<typeof View>>(null);
  const previousSection = useRef(selected);
  // Animate the existing DOM container: no per-frame React/JS updates or remount of drafts.
  useLayoutEffect(() => {
    const changed = previousSection.current !== selected;
    previousSection.current = selected;
    const node = page.current as unknown as HTMLElement | null;
    if (!changed || reduceMotion || theme.animation.scale === 0 || !node?.animate) return;
    const animation = node.animate([
      { opacity: 0, transform: `translateY(${spacing.sm}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: motion.medium * theme.animation.scale, easing: `cubic-bezier(${motion.enter.join(',')})` });
    return () => animation.cancel();
  }, [selected, reduceMotion, theme.animation.scale]);
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const select = useCallback((value: T) => {
    onSelect?.(value);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [onSelect]);
  const hasNav = Boolean(destinations?.length);
  // Hide on touch, but keep its space until the viewport confirms the keyboard. Removing it on pointerdown would
  // clamp scrollTop near the bottom, shifting another control under the finger before pointerup/click.
  const navMounted = hasNav && size === 'compact';
  const bottomBar = navMounted && !keyboard;
  // Compact: floating toolbar (destinations pill + round primary action) in the layout flow, above the bottom inset.
  const barBottom = floatingBarBottomSpace(insets.bottom, spacing.md, iPhone);
  const barHeight = layout.floatingBar + spacing.md + barBottom;
  const showFab = bottomBar && fab && selected !== fab.target;
  const padding = size === 'compact' ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const compact = size === 'compact';
  const expanded = size === 'expanded';
  const showPanel = expanded && hasNav; // no panel on the sign-in and guide screens
  // Inside the panel, `background` is the panel colour so outlined-field label notches and sticky bars blend in.
  // On phones and tablets there is no lighter panel (desktop only): the page sits on the plain background.
  const panelBg = !showPanel ? colors.background : panelColor(colors);
  const panelTheme = useMemo(() => ({ ...theme, colors: { ...colors, background: panelBg } }), [theme, colors, panelBg]);
  const panel = !showPanel ? { borderRadius: 0 } : { borderRadius: radius.dialog, marginTop: spacing.md, marginRight: padding, marginBottom: padding };
  // The scrollbar of a rounded scroller runs straight through its corners (browsers do not bend it to the radius): the
  // rounded panel clips, and the scroller inside keeps a corner-radius margin above and below, so the bar sits only on
  // the straight part of the edge. The content padding loses the same amount: the page does not move.
  const scrollInset = showPanel ? Math.min(radius.dialog, padding) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <SnackbarProvider bottomOffset={bottomBar ? barHeight : insets.bottom}>
      <View role="banner" style={[styles.topBar, { backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: padding, height: layout.topBarHeight + insets.top }]}>
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
          {hasNav && size === 'medium' && <Rail destinations={destinations!} selected={selected} onSelect={select} fab={fab} />}
          {hasNav && size === 'expanded' && <Drawer destinations={destinations!} selected={selected} onSelect={select} fab={fab} />}
          <View style={[styles.scroll, panel, styles.panelClip, { backgroundColor: panelBg }]}>
          <ScrollView ref={scroller} style={[styles.scroll, { marginVertical: scrollInset }]} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, padding, paddingTop: padding - scrollInset, paddingBottom: padding - scrollInset + (bottomBar ? 0 : insets.bottom) }}>
            <ThemeProvider theme={panelTheme}>
              <KeyboardContext.Provider value={keyboard}>
              <View ref={page} role="main" style={[styles.content, size === 'compact' && { gap: spacing.lg }, compact && fab && selected === fab.target && { justifyContent: 'center' }]}>{children}</View>
              </KeyboardContext.Provider>
            </ThemeProvider>
          </ScrollView>
          </View>
        </View>
        {navMounted && <NavigationBar destinations={destinations!} selected={selected} onSelect={select} bottomSpace={barBottom} fab={showFab ? fab : undefined} reserveFab={Boolean(fab)} hidden={!bottomBar} reserveSpace={keyboard && !keyboardConfirmed} />}
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
type NavProps<T extends string> = { destinations: readonly Destination<T>[]; selected?: T; onSelect: (value: T) => void; fab?: Fab<T> };

function NavigationBar<T extends string>({ destinations, selected, onSelect, bottomSpace, fab, reserveFab, hidden, reserveSpace }: NavProps<T> & { bottomSpace: number; reserveFab: boolean; hidden: boolean; reserveSpace: boolean }) {
  const { t } = useI18n();
  const { colors, fonts } = useTheme();
  const reduceMotion = useReducedMotion();
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
    Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', fontFamily,
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
  const { pill, indicator, focus, suppressPressed } = useSlidingIndicator(destinations, index, onSelect, reduceMotion);
  const shownIndex = focus ?? index;
  return (
    <View aria-hidden={hidden} {...{ inert: hidden ? true : undefined }} pointerEvents={hidden ? 'none' : 'auto'}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={[styles.floating, { paddingBottom: bottomSpace, paddingHorizontal: barSide }, hidden && (reserveSpace ? { opacity: 0 } : styles.hidden)]}>
      <View ref={pill.ref} onLayout={pill.onLayout} role="navigation" aria-label={t("Sezioni")} style={[styles.pill, { backgroundColor: colors.elevation.level3 }]}>
        {/* One active indicator for the whole pill: it slides between destinations (and follows a finger dragged along
            the pill) instead of each item switching its own fill. Until the pill is measured, the item draws it. */}
        {indicator && <Animated.View pointerEvents="none" style={[styles.indicator, indicator.style, { backgroundColor: colors.primaryContainer }]} />}
        {destinations.map((item, i) => {
          const active = i === shownIndex;
          const color = active ? colors.onPrimaryContainer : colors.onSurfaceVariant;
          return (
            <StateLayerPressable key={item.value} layerColor={focus === null ? color : 'transparent'} radius={radius.pill} accessibilityRole="button"
              suppressPressed={suppressPressed}
              aria-current={item.value === selected ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)}
              style={[styles.pillItem, active && !indicator && { backgroundColor: colors.primaryContainer }]}>
              <SvgIcon shape={item.icon} size={24} color={color} />
              <Text variant={tight ? 'labelSmall' : 'labelMedium'} numberOfLines={1} style={{ maxWidth: '100%', textAlign: 'center', color, fontWeight: active ? '700' : '500', ...(tight ? { letterSpacing: 0 } : null) }}>{item.label}</Text>
            </StateLayerPressable>
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
            onPress={() => onSelect(action.target)} style={[styles.roundAction, { backgroundColor: colors.primary }]}>
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
function useSlidingIndicator<T extends string>(destinations: readonly Destination<T>[], index: number, onSelect: (value: T) => void, reduceMotion: boolean) {
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
  const latest = useRef({ destinations, index, onSelect, reduceMotion });
  latest.current = { destinations, index, onSelect, reduceMotion };

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
      }
      event.preventDefault();
      const value = at(event.clientX);
      position.setValue(value);
      setFocus(Math.round(value));
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
      const target = commit ? Math.round(at(event.clientX)) : current;
      if (target < 0) { fade(0); return; }
      moveTo(target);
      const item = items[target];
      if (commit && item && target !== current) select(item.value);
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

function Rail<T extends string>({ destinations, selected, onSelect, fab }: NavProps<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <ScrollView role="navigation" aria-label={t("Sezioni")} style={[styles.rail, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.railContent} keyboardShouldPersistTaps="handled">
      {fab && (
        <FAB mode="flat" icon={({ size, color }) => <SvgIcon shape={fab.icon} size={size} color={color} />} accessibilityLabel={fab.label}
          onPress={() => onSelect(fab.target)} color={colors.onPrimaryContainer}
          style={[styles.railFab, { backgroundColor: colors.primaryContainer }]} />
      )}
      {destinations.map((item) => {
        const active = item.value === selected;
        return (
          <StateLayerPressable key={item.value} layerColor="transparent" accessibilityRole="button"
            aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)} style={styles.railItem}>
            {(state) => <>
            <View style={[styles.railIndicator, active && { backgroundColor: colors.secondaryContainer }]}>
              <HoverLayer state={state} color={colors.onSurface} />
              <SvgIcon shape={item.icon} size={24} color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
            </View>
            <Text variant="labelMedium" numberOfLines={1} style={{ color: active ? colors.onSurface : colors.onSurfaceVariant, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
            </>}
          </StateLayerPressable>
        );
      })}
    </ScrollView>
  );
}

function Drawer<T extends string>({ destinations, selected, onSelect, fab }: NavProps<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View role="navigation" aria-label={t("Sezioni")} style={[styles.drawer, { backgroundColor: colors.background }]}>
      {fab && (
        <FAB mode="flat" customSize={60} label={fab.label} icon={({ size, color }) => <SvgIcon shape={fab.icon} size={size} color={color} />}
          accessibilityLabel={fab.label} onPress={() => onSelect(fab.target)} color={colors.onPrimaryContainer}
          style={[styles.drawerFab, { backgroundColor: colors.primaryContainer }]} />
      )}
      {destinations.map((item) => {
        const active = item.value === selected;
        const color = active ? colors.onSecondaryContainer : colors.onSurfaceVariant;
        return (
          <StateLayerPressable key={item.value} layerColor={color} accessibilityRole="button" radius={radius.nav}
            aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)}
            style={[styles.drawerItem, active && { backgroundColor: colors.secondaryContainer }]}>
            <SvgIcon shape={item.icon} size={24} color={color} />
            <Text variant="titleSmall" style={{ color, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
          </StateLayerPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, width: '100%' },
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
  floating: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.xs },
  // display: none also removes it from the accessibility tree and the Tab order while the keyboard is open.
  hidden: { display: 'none' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', height: layout.floatingBar, borderRadius: radius.pill, padding: pillPadding, gap: pillGap },
  indicator: { position: 'absolute', left: pillPadding, top: pillPadding, height: layout.floatingBar - pillPadding * 2, borderRadius: radius.pill },
  // The rounded state layer clips itself; clipping the entire button would cut label glyphs at the bottom corners.
  pillItem: { flex: 1, minWidth: 0, height: layout.floatingBar - spacing.xs * 2, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill, overflow: 'visible' },
  actionSlot: { height: layout.floatingBar, overflow: 'hidden' },
  roundAction: { width: layout.floatingBar, height: layout.floatingBar, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rail: { width: layout.railWidth, flexGrow: 0, flexShrink: 0 },
  railContent: { paddingTop: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center', gap: spacing.lg + 4 },
  railFab: { marginTop: spacing.lg, marginBottom: spacing.md, borderRadius: radius.button },
  railItem: { width: layout.railWidth - spacing.sm, alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  railIndicator: { overflow: 'hidden', width: 56, height: 32, borderRadius: radius.nav, alignItems: 'center', justifyContent: 'center' },
  drawer: { width: layout.drawerWidth, padding: spacing.md, paddingTop: spacing.lg, gap: spacing.lg + 4 },
  drawerFab: { alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.md, marginLeft: spacing.xs, borderRadius: radius.button },
  drawerItem: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
});
