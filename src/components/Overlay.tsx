import { useI18n } from '../i18n/I18nProvider';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Portal, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transitions } from '../theme/motion';
import { motion, radius, spacing } from '../theme/tokens';
import { useReducedMotion } from '../theme/useSizeClass';
import { menuHorizontalBounds, menuVerticalPlacement, sheetDragOutcome } from './menuGeometry';

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

// Escape closes the topmost overlay only while it is open.
function useEscape(active: boolean, onEscape: () => void) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') latest.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}

// Focus moves to the first item once the overlay is shown (as Paper's menu did) and goes back, without scrolling, to the
// element that had it when the overlay opened (the field), unless the user has meanwhile moved it elsewhere.
function useFocusHandoff(visible: boolean, shown: boolean, container: { current: unknown }) {
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
    const first = node.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]), [tabindex="0"]');
    first?.focus({ preventScroll: true });
  }, [shown, container]);
}

const scrimEnter = transitions([['opacity', motion.medium]]);
const scrimExit = transitions([['opacity', motion.short, motion.exitEasing]]);

// Transparent full-screen catcher (menus) or scrim (sheets, dialogs); not a Tab stop: Escape closes from the keyboard.
export function Scrim({ visible, shown, color, label, onPress }: { visible: boolean; shown: boolean; color?: string; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} focusable={false} onPress={onPress} disabled={!onPress}
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
// and the keyboard area, and holds a long list with its own scroll. Scrim, Escape or dragging the handle down close it.
export function BottomSheet({ visible, onDismiss, title, children }: { visible: boolean; onDismiss: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(visible, motion.exit, animate);
  const container = useRef<ComponentRef<typeof View>>(null);
  const header = useRef<ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useEscape(visible, onDismiss);
  useFocusHandoff(visible, shown, container);
  useSheetDrag(mounted, header, container, onDismiss);
  if (!mounted) return null;
  return (
    <Portal>
      <Scrim visible={visible} shown={shown} color={colors.backdrop} label={t('Chiudi')} onPress={onDismiss} />
      <View ref={container} role="dialog" aria-modal aria-label={title} pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.sheet, {
          backgroundColor: colors.elevation.level1, maxHeight: Math.max(0, height - insets.top - spacing.xxxl),
          paddingBottom: insets.bottom + spacing.sm, transform: [{ translateY: shown ? 0 : '100%' }],
        }, shown ? sheetEnter : sheetExit]}>
        <View ref={header} style={styles.sheetHeader}>
          <View style={[styles.handle, { backgroundColor: colors.onSurfaceVariant }]} />
          <Text variant="titleMedium" accessibilityRole="header" numberOfLines={1} style={styles.sheetTitle}>{title}</Text>
        </View>
        <ScrollView role="menu" aria-label={title} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetList}>{children}</ScrollView>
      </View>
    </Portal>
  );
}

// Dragging the header follows the finger (downwards only, without transition) and either closes the sheet or lets it
// settle back with its own transition. DOM pointer events on the header, as for the navigation pill.
function useSheetDrag(active: boolean, header: { current: unknown }, sheet: { current: unknown }, onDismiss: () => void) {
  const latest = useRef(onDismiss);
  latest.current = onDismiss;
  useEffect(() => {
    const handle = header.current;
    const node = sheet.current;
    if (!active || !(handle instanceof HTMLElement) || !(node instanceof HTMLElement)) return;
    handle.style.touchAction = 'none';
    let start: { id: number; y: number; time: number; transform: string; duration: string } | null = null;
    let offset = 0;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      start = { id: event.pointerId, y: event.clientY, time: event.timeStamp, transform: node.style.transform, duration: node.style.transitionDuration };
      offset = 0;
      try { handle.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    };
    const move = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      offset = Math.max(0, event.clientY - start.y);
      node.style.transitionDuration = '0ms';
      node.style.transform = `translateY(${offset}px)`;
    };
    const end = (event: PointerEvent, commit: boolean) => {
      if (!start || event.pointerId !== start.id) return;
      const { transform, duration, time } = start;
      start = null;
      node.style.transitionDuration = duration;
      if (offset === 0) return;
      if (commit && sheetDragOutcome(offset, event.timeStamp - time, node.offsetHeight) === 'dismiss') { latest.current(); return; }
      void node.offsetHeight; // apply the restored duration before settling back
      node.style.transform = transform;
    };
    const up = (event: PointerEvent) => end(event, true);
    const cancel = (event: PointerEvent) => end(event, false);
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', cancel);
    return () => {
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', cancel);
    };
  }, [active, header, sheet]);
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
