import { useI18n } from '../i18n/I18nProvider';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Portal, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transitions } from '../theme/motion';
import { motion, radius, spacing } from '../theme/tokens';
import { useReducedMotion } from '../theme/useSizeClass';
import { initialFocusAllowed } from '../theme/viewport';
import { menuHorizontalBounds, menuVerticalPlacement, recentVelocity, sheetDragOutcome, sheetGestureOwner, type DragSample } from './menuGeometry';

// Shared overlay layer for menus, bottom sheets and dialogs. Every surface stays opaque while it moves: entering, it
// becomes solid within `motion.fade` while a short transform settles it; leaving, scrim and surface fade together on the
// accelerating curve, so no half-transparent copy of the content lingers over the page. CSS transitions (opacity and
// transform only) run on the compositor; with reduced motion the global CSS rule makes them instant and the overlay
// mounts shown and unmounts at once.

// Mount → paint hidden → show (two frames, so the hidden state is painted and the transition can run); hide → keep
// mounted for the exit duration. An exit interrupted by a new opening reverses from where it is.
export function usePresence(visible: boolean, exitMs: number, animate = true): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(!animate && visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (!animate) { setShown(true); return; }
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setShown(false);
    if (!animate || exitMs <= 0) { setMounted(false); return; }
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [visible, exitMs, animate]);
  return { mounted: visible || mounted, shown: visible && (shown || !animate) };
}

// The system reduced-motion preference. Not Paper's `theme.animation.scale`: PaperProvider replaces it with its own
// state, which stays 1 whenever a theme is passed, so the value set by createTheme never reaches it.
export function useOverlayMotion(): boolean {
  return !useReducedMotion();
}

// Portals may nest a selector or a confirmation above a dialog. Only the last opened overlay handles Escape.
const escapeStack: object[] = [];
export function useEscape(active: boolean, onEscape: () => void) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const entry = {};
    escapeStack.push(entry);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || escapeStack.at(-1) !== entry) return;
      event.preventDefault();
      latest.current();
    };
    // RN Web TextInput stops bubbling key events, including Escape.
    document.addEventListener('keydown', onKey, true);
    return () => { escapeStack.splice(escapeStack.indexOf(entry), 1); document.removeEventListener('keydown', onKey, true); };
  }, [active]);
}

// Focus moves to the first item once the overlay is shown (as Paper's menu did) and goes back, without scrolling, to the
// element that had it when the overlay opened (the field), unless the user has meanwhile moved it elsewhere. On
// touch-first devices a text field is not focused on opening (the overlay itself takes the focus instead), unless the
// caller asks for it with `textEntry`.
export function useFocusHandoff(visible: boolean, shown: boolean, container: { current: unknown }, textEntry = false) {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    return () => {
      const node = container.current;
      const now = document.activeElement;
      const inside = node instanceof HTMLElement && now instanceof Node && node.contains(now);
      if ((inside || now === document.body || now === null) && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, [visible, container]);
  useEffect(() => {
    const node = container.current;
    if (!shown || !(node instanceof HTMLElement)) return;
    const first = node.querySelector<HTMLElement>('input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), button:not([disabled]):not([tabindex="-1"]):not([aria-hidden="true"]), [role="menuitem"]:not([aria-disabled="true"]), [tabindex="0"]');
    if (!first) return;
    const touchFirst = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (initialFocusAllowed(first, touchFirst, textEntry)) { first.focus({ preventScroll: true }); return; }
    // The overlay itself takes the focus, out of the page behind: Tab still reaches the field, Escape still closes.
    if (!node.hasAttribute('tabindex')) { node.setAttribute('tabindex', '-1'); node.style.outline = 'none'; }
    node.focus({ preventScroll: true });
  }, [shown, container, textEntry]);
}

const scrimEnter = transitions([['opacity', motion.medium]]);
const scrimExit = transitions([['opacity', motion.short, motion.exitEasing]]);

// Transparent full-screen catcher (menus) or scrim (sheets, dialogs); not a Tab stop: Escape closes from the keyboard.
export function Scrim({ ref, visible, shown, color, label, onPress }: { ref?: Ref<ComponentRef<typeof Pressable>>; visible: boolean; shown: boolean; color?: string; label: string; onPress?: () => void }) {
  return (
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} focusable={false} onPress={onPress} disabled={!onPress}
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.scrim, color !== undefined && [{ backgroundColor: color, opacity: shown ? 1 : 0 }, shown ? scrimEnter : scrimExit]]} />
  );
}

export type MenuAnchor = { x: number; y: number; width: number; height: number };
type MenuProps = {
  visible: boolean;
  onDismiss: () => void;
  // Trigger rectangle in window coordinates (measureInWindow).
  anchor: MenuAnchor;
  // Exact width (selectors: at least the field); without it the menu fits its content.
  width?: number;
  // Content-sized menus: left edge on the trigger's left edge (start) or right edge on its right edge (end).
  align?: 'start' | 'end';
  maxHeight?: number;
  label?: string;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

const MENU_MAX_HEIGHT = 360;
// Below this much room under the trigger the menu opens above it, if there is more room there.
const MENU_MIN_BELOW = 192;
const menuEnter = transitions([['opacity', motion.fade], ['transform', motion.medium, motion.enter]]);
const menuExit = transitions([['opacity', motion.fade, motion.exitEasing]]);

// Material 3 menu anchored to its trigger: below it, or above when the room below is too small, always inside the
// viewport and safe area, with its own scroll. Opens with a short fade and a 4 dp slide/scale from the trigger side.
export function AnchoredMenu({ visible, onDismiss, anchor, width, align = 'start', maxHeight = MENU_MAX_HEIGHT, label, contentStyle, children }: MenuProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(visible, motion.fade, animate);
  const container = useRef<ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  useEscape(visible, onDismiss);
  useFocusHandoff(visible, shown, container);
  if (!mounted) return null;
  // iOS shrinks only the visual viewport for the keyboard: the smaller of the two is what can be seen.
  const viewportHeight = Math.min(screen.height, globalThis.visualViewport?.height ?? screen.height);
  const place = menuVerticalPlacement(anchor.y, anchor.y + anchor.height, viewportHeight, insets.top, insets.bottom, spacing.lg, spacing.xs, maxHeight, MENU_MIN_BELOW);
  const margin = spacing.sm;
  const available = Math.max(0, screen.width - insets.left - insets.right - 2 * margin);
  const horizontal: ViewStyle = width !== undefined
    ? menuHorizontalBounds(anchor.x, width, screen.width, insets.left, insets.right, spacing.lg)
    : align === 'end'
      ? { right: Math.max(insets.right + margin, screen.width - anchor.x - anchor.width), maxWidth: available }
      : { left: Math.max(insets.left + margin, anchor.x), maxWidth: available };
  const below = place.side === 'below';
  // Above the trigger, a box ending at its top edge holds the menu at its bottom: no need to know the menu's height.
  const vertical: ViewStyle = below ? { top: place.top } : { top: 0, height: place.bottom, justifyContent: 'flex-end' };
  const offset = below ? -spacing.xs : spacing.xs;
  return (
    <Portal>
      <Scrim visible={visible} shown={shown} label={t('Chiudi menu')} onPress={onDismiss} />
      <View pointerEvents="box-none" style={[styles.menuBox, vertical, horizontal]}>
        <View ref={container} role="menu" aria-label={label} pointerEvents={visible ? 'auto' : 'none'}
          style={[{ opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : offset }, { scale: shown ? 1 : 0.96 }],
            transformOrigin: below ? 'top' : 'bottom' } as ViewStyle, shown ? menuEnter : menuExit]}>
          <Surface elevation={2} style={[styles.menu, { backgroundColor: colors.elevation.level2, maxHeight: place.maxHeight }, contentStyle]}>
            <ScrollView style={{ maxHeight: Math.max(0, place.maxHeight - 2 * spacing.xs) }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Surface>
        </View>
      </View>
    </Portal>
  );
}

const sheetEnter = transitions([['transform', motion.long, motion.enter]]);
const sheetExit = transitions([['transform', motion.exit, motion.exitEasing]]);

// Material 3 modal bottom sheet for choices on phones: it rises from the bottom edge over a scrim, above the navigation
// and the keyboard area, and holds a long list with its own scroll. Scrim, Escape, dragging the handle down, or swiping
// down on the list while it is at its top close it.
export function BottomSheet({ visible, onDismiss, title, children }: { visible: boolean; onDismiss: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(visible, motion.exit, animate);
  const container = useRef<ComponentRef<typeof View>>(null);
  // Paper's Portal renders its children in a later commit than this component: the drag listeners must wait for the
  // real nodes (state from callback refs), an effect keyed on `mounted` alone would run while the refs are still empty.
  const [nodes, setNodes] = useState<SheetNodes>({});
  const sheetRef = useCallback((node: unknown) => { container.current = node as ComponentRef<typeof View>; setNodes((n) => ({ ...n, sheet: domNode(node) })); }, []);
  const headerRef = useCallback((node: unknown) => setNodes((n) => ({ ...n, header: domNode(node) })), []);
  const listRef = useCallback((node: unknown) => setNodes((n) => ({ ...n, list: domNode(node) })), []);
  const scrimRef = useCallback((node: unknown) => setNodes((n) => ({ ...n, scrim: domNode(node) })), []);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useEscape(visible, onDismiss);
  useFocusHandoff(visible, shown, container);
  useSheetDrag(visible, nodes, onDismiss);
  if (!mounted) return null;
  return (
    <Portal>
      <Scrim ref={scrimRef} visible={visible} shown={shown} color={colors.backdrop} label={t('Chiudi')} onPress={onDismiss} />
      <View ref={sheetRef} role="dialog" aria-modal aria-label={title} pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.sheet, {
          backgroundColor: colors.elevation.level1, maxHeight: Math.max(0, height - insets.top - spacing.xxxl),
          paddingBottom: insets.bottom + spacing.sm, transform: [{ translateY: shown ? 0 : '100%' }],
        }, shown ? sheetEnter : sheetExit]}>
        <View ref={headerRef} style={styles.sheetHeader}>
          <View style={[styles.handle, { backgroundColor: colors.onSurfaceVariant }]} />
          <Text variant="titleMedium" accessibilityRole="header" numberOfLines={1} style={styles.sheetTitle}>{title}</Text>
        </View>
        <ScrollView ref={listRef} role="menu" aria-label={title} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetList}>{children}</ScrollView>
      </View>
    </Portal>
  );
}

type SheetNodes = { sheet?: HTMLElement | null; header?: HTMLElement | null; list?: HTMLElement | null; scrim?: HTMLElement | null };

// RN Web refs are DOM elements; a ScrollView ref may instead expose its scrollable node.
function domNode(node: unknown): HTMLElement | null {
  if (typeof HTMLElement === 'undefined' || !node) return null;
  if (node instanceof HTMLElement) return node;
  const scrollable = (node as { getScrollableNode?: () => unknown }).getScrollableNode?.();
  return scrollable instanceof HTMLElement ? scrollable : null;
}

// While dragged the sheet follows the finger downwards without transition and the scrim fades with the distance; on
// release it closes from where it is (the exit transition continues from that offset) or settles back with its own
// transition. Two entry points share it: the header with DOM pointer events (touch and mouse, `touch-action: none`) and
// the list with touch events, so a native scroll keeps working: the list only hands a gesture to the sheet when it
// started at its top and moved down (`sheetGestureOwner`). With reduced motion the global CSS rule makes both instant.
function useSheetDrag(active: boolean, { sheet, header, list, scrim }: SheetNodes, onDismiss: () => void) {
  const latest = useRef(onDismiss);
  latest.current = onDismiss;
  useEffect(() => {
    if (!active || !sheet) return;
    let drag: { y: number; samples: DragSample[]; transform: string; duration: string; scrimOpacity: string; scrimDuration: string } | null = null;
    let offset = 0;
    const begin = (y: number, time: number) => {
      drag = { y, samples: [{ t: time, y }], transform: sheet.style.transform, duration: sheet.style.transitionDuration,
        scrimOpacity: scrim?.style.opacity ?? '', scrimDuration: scrim?.style.transitionDuration ?? '' };
      offset = 0;
    };
    const follow = (y: number, time: number) => {
      if (!drag) return;
      offset = Math.max(0, y - drag.y);
      drag.samples.push({ t: time, y });
      if (drag.samples.length > 32) drag.samples.shift();
      sheet.style.transitionDuration = '0ms';
      sheet.style.transform = `translateY(${offset}px)`;
      if (scrim) {
        scrim.style.transitionDuration = '0ms';
        scrim.style.opacity = String(Math.max(0, 1 - offset / Math.max(1, sheet.offsetHeight)));
      }
    };
    // Returns whether the sheet moved, so the click that may follow is not also taken by the row under the finger.
    const finish = (y: number, time: number, commit: boolean): boolean => {
      if (!drag) return false;
      const { transform, duration, scrimOpacity, scrimDuration, samples } = drag;
      samples.push({ t: time, y: drag.y + offset });
      drag = null;
      sheet.style.transitionDuration = duration;
      if (scrim) scrim.style.transitionDuration = scrimDuration;
      if (offset === 0) return false;
      if (commit && sheetDragOutcome(offset, recentVelocity(samples), sheet.offsetHeight) === 'dismiss') { latest.current(); return true; }
      void sheet.offsetHeight; // apply the restored durations before settling back
      sheet.style.transform = transform;
      if (scrim) scrim.style.opacity = scrimOpacity;
      return true;
    };
    const cleanups: (() => void)[] = [];
    const listen = <K extends keyof HTMLElementEventMap>(node: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      node.addEventListener(type, handler, options);
      cleanups.push(() => node.removeEventListener(type, handler, options));
    };

    if (header) {
      const previous = header.style.touchAction;
      header.style.touchAction = 'none';
      cleanups.push(() => { header.style.touchAction = previous; });
      let pointer: number | null = null;
      listen(header, 'pointerdown', (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        pointer = event.pointerId;
        begin(event.clientY, event.timeStamp);
        try { header.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
      });
      listen(header, 'pointermove', (event) => { if (event.pointerId === pointer) follow(event.clientY, event.timeStamp); });
      const end = (event: PointerEvent, commit: boolean) => {
        if (event.pointerId !== pointer) return;
        pointer = null;
        finish(event.clientY, event.timeStamp, commit);
      };
      listen(header, 'pointerup', (event) => end(event, true));
      listen(header, 'pointercancel', (event) => end(event, false));
    }

    if (list) {
      const previous = list.style.overscrollBehaviorY;
      list.style.overscrollBehaviorY = 'contain'; // no scroll chaining or pull-to-refresh of the page behind
      cleanups.push(() => { list.style.overscrollBehaviorY = previous; });
      let touch: { id: number; x: number; y: number; scrollTop: number; owner: 'pending' | 'sheet' | 'list' } | null = null;
      let swallowClick = false;
      const find = (touches: TouchList) => touch ? Array.from(touches).find((item) => item.identifier === touch?.id) : undefined;
      listen(list, 'touchstart', (event) => {
        const first = event.touches[0];
        swallowClick = false;
        if (event.touches.length !== 1 || !first) {
          if (touch?.owner === 'sheet') finish(touch.y, event.timeStamp, false);
          touch = null;
          return;
        }
        touch = { id: first.identifier, x: first.clientX, y: first.clientY, scrollTop: list.scrollTop, owner: 'pending' };
      }, { passive: true });
      listen(list, 'touchmove', (event) => {
        const point = find(event.changedTouches);
        if (!touch || !point || touch.owner === 'list') return;
        if (touch.owner === 'pending') {
          touch.owner = sheetGestureOwner(point.clientX - touch.x, point.clientY - touch.y, touch.scrollTop);
          if (touch.owner !== 'sheet') return;
          begin(point.clientY, event.timeStamp); // from here, so the sheet does not jump by the slop
        }
        if (event.cancelable) event.preventDefault(); // the list must not scroll or overscroll under a sheet drag
        follow(point.clientY, event.timeStamp);
      }, { passive: false });
      const end = (event: TouchEvent, commit: boolean) => {
        const point = find(event.changedTouches);
        if (!touch || !point) return;
        const owner = touch.owner;
        touch = null;
        if (owner === 'sheet') swallowClick = finish(point.clientY, event.timeStamp, commit);
      };
      listen(list, 'touchend', (event) => end(event, true));
      listen(list, 'touchcancel', (event) => end(event, false));
      listen(list, 'click', (event) => {
        if (!swallowClick) return;
        swallowClick = false;
        event.stopPropagation();
        event.preventDefault();
      }, { capture: true });
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (drag) finish(drag.y + offset, performance.now(), false);
    };
  }, [active, sheet, header, list, scrim]);
}

const styles = StyleSheet.create({
  // Paper's own overlays have no pointer cursor on the catcher either.
  scrim: { cursor: 'auto' } as ViewStyle,
  menuBox: { position: 'absolute' },
  menu: { borderRadius: radius.control, paddingVertical: spacing.xs, overflow: 'hidden' },
  sheet: {
    position: 'absolute', bottom: 0, alignSelf: 'center', width: '100%', maxWidth: 640,
    borderTopLeftRadius: radius.dialog, borderTopRightRadius: radius.dialog, overflow: 'hidden',
  },
  sheetHeader: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm, paddingHorizontal: spacing.xl, gap: spacing.lg },
  handle: { width: 32, height: 4, borderRadius: 2, opacity: 0.4 },
  sheetTitle: { alignSelf: 'stretch' },
  sheetList: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
});
