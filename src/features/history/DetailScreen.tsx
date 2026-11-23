import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { useEscape, useFocusHandoff, useOverlayMotion } from '../../components/Overlay';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { CategoryIcon } from '../../domain/category';
import { cardFill } from '../../theme/theme';
import { springEasing } from '../../theme/themeTransition';
import { layout, motion, radius, sizeClassOf, spacing, type SizeClass } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
import { cardClip, cardShift, crossfade, detailSpring, fullClip, usableCard, type Box } from './detailMotion';

// Detail screen of one card of the Spese page (23 November, on request, in place of the details opened inside the card):
// one shell for the expenses (ExpenseDetail) and the subscriptions (SubscriptionDetail).
// A layer of the shared overlay level (a Paper portal, like dialogs and sheets): the list stays mounted under it, so its
// search, filters, order, loaded pages and scroll position are exactly as they were when the detail closes, with no
// render of the list at all. It covers the whole app on phones (its own top bar with Back, safe areas inside) and the
// content panel from medium up (navigation and top bar stay). Opening is a Material 3 container transform: the detail's
// surface grows from the tapped card's rectangle on a spring while a copy of the card fades out and the detail's content
// fades in; closing runs back into the card (re-measured: it may have moved), or simply fades when the card is not in view.
// Back (Android, browser), Escape and the back button close it; dialogs opened from it (edit, status, payments) sit above.

type ShellProps<T> = {
  // The item shown, null when closed. The last one stays drawn while the detail closes (or fades after a deletion).
  value: T | null;
  // DOM id of the element around the item's card in the list: the origin and the destination of the transform.
  cardId: (value: T) => string;
  label: (value: T) => string;
  backLabel: string;
  onClose: () => void;
  children: (value: T) => ReactNode;
};

export function DetailScreen<T>({ value, cardId, label, backLabel, onClose, children }: ShellProps<T>) {
  const last = useRef<T | null>(null);
  if (value) last.current = value;
  const [mounted, setMounted] = useState(Boolean(value));
  useEffect(() => { if (value) setMounted(true); }, [value]);
  const shown = last.current;
  if (!shown || !(value || mounted)) return null;
  const id = cardId(shown);
  return <Portal><DetailLayer key={id} cardId={id} label={label(shown)} backLabel={backLabel} open={Boolean(value)} onClose={onClose}
    onClosed={() => setMounted(false)}>{children(shown)}</DetailLayer></Portal>;
}

type Running = { animations: Animation[]; ghost: HTMLElement | null; opening: boolean };

function DetailLayer({ cardId, label, backLabel, open, onClose, onClosed, children }: {
  cardId: string; label: string; backLabel: string; open: boolean; onClose: () => void; onClosed: () => void; children: ReactNode;
}) {
  const { colors } = useTheme();
  const size = useSizeClass();
  const compact = size === 'compact';
  const insets = useSafeAreaInsets();
  const animate = useOverlayMotion();
  const [frame, setFrame] = useState<Box>(() => measureFrame(size));
  const layer = useRef<ComponentRef<typeof View>>(null);
  const body = useRef<ComponentRef<typeof View>>(null);
  const ghostHost = useRef<ComponentRef<typeof View>>(null);
  const running = useRef<Running | null>(null);
  const frameRadius = size === 'expanded' ? radius.dialog : 0;
  // Latest values for the animation code, which runs from effects.
  const latest = useRef({ frame, frameRadius, background: colors.background, onClosed, animate });
  latest.current = { frame, frameRadius, background: colors.background, onClosed, animate };

  // The frame follows the window (rotation, a resized desktop window, the iOS keyboard moving #root), and the size class:
  // the rail or drawer appears and the panel moves, after the shell has rendered.
  useLayoutEffect(() => { setFrame(measureFrame(size)); }, [size]);
  useEffect(() => {
    const update = () => setFrame(measureFrame(sizeClassOf(window.innerWidth)));
    window.addEventListener('resize', update);
    globalThis.visualViewport?.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); globalThis.visualViewport?.removeEventListener('resize', update); };
  }, []);

  useEscape(open, onClose);
  useFocusHandoff(open, open, layer);

  // Opening: in the commit that inserts the layer, before the first paint, so the first frame already shows the card.
  useLayoutEffect(() => {
    if (animate) play(true);
    return () => { const current = running.current; running.current = null; current?.animations.forEach((a) => a.cancel()); current?.ghost?.remove(); };
  }, []);
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    if (wasOpen.current === open) return;
    wasOpen.current = open;
    const current = running.current;
    // Interrupted halfway: the same animations run back from where they are.
    if (current && current.opening !== open) {
      current.opening = open;
      current.animations.forEach((a) => a.reverse());
      void settle(current);
      return;
    }
    if (open) { if (latest.current.animate) play(true); return; }
    if (!latest.current.animate || !play(false)) onClosed();
  }, [open]);

  // Starts the transform (`opening`) or its way back; false when there is nothing to animate.
  function play(opening: boolean): boolean {
    const surface = dom(layer.current);
    const content = dom(body.current);
    const host = dom(ghostHost.current);
    if (!surface || !content || !host || typeof surface.animate !== 'function') return false;
    const { frame: box, frameRadius: corner, background } = latest.current;
    const card = findCard(cardId);
    const view = surface.ownerDocument.defaultView;
    const spring = springEasing(detailSpring);
    const springy = view?.CSS?.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : bezier(motion.enter);
    const ordered = <T,>(frames: T[]) => (opening ? frames : [...frames].reverse());
    const animations: Animation[] = [];
    let ghost: HTMLElement | null = null;
    if (card && usableCard(card.box, box)) {
      const options: KeyframeAnimationOptions = { duration: spring.duration, easing: springy, fill: 'both' };
      animations.push(surface.animate({ clipPath: ordered([cardClip(card.box, box, radius.control), fullClip(corner)]),
        backgroundColor: ordered([card.background ?? background, background]) }, options));
      // A copy of the card on top, at the card's place, moving with the container's corner while it fades out.
      ghost = card.node.cloneNode(true) as HTMLElement;
      ghost.setAttribute('aria-hidden', 'true');
      ghost.setAttribute('inert', '');
      ghost.removeAttribute('id');
      Object.assign(ghost.style, { position: 'absolute', left: `${card.box.left - box.left}px`, top: `${card.box.top - box.top}px`,
        width: `${card.box.width}px`, height: `${card.box.height}px`, margin: '0', boxSizing: 'border-box', pointerEvents: 'none' });
      host.appendChild(ghost);
      const shift = cardShift(card.box, box);
      animations.push(ghost.animate({ transform: ordered(['translate(0px, 0px)', `translate(${shift.x}px, ${shift.y}px)`]) }, options));
      const fade = { duration: spring.duration, easing: 'linear', fill: 'both' } as const;
      const { open: inbound, close: outbound } = crossfade;
      animations.push(ghost.animate(opening ? [{ opacity: 1, offset: 0 }, { opacity: 0, offset: inbound.cardOut }, { opacity: 0, offset: 1 }]
        : [{ opacity: 0, offset: 0 }, { opacity: 0, offset: outbound.cardIn }, { opacity: 1, offset: outbound.cardShown }, { opacity: 1, offset: 1 }], fade));
      animations.push(content.animate(opening ? [{ opacity: 0, offset: 0 }, { opacity: 0, offset: inbound.contentIn },
        { opacity: 1, offset: inbound.contentShown }, { opacity: 1, offset: 1 }]
        : [{ opacity: 1, offset: 0 }, { opacity: 0, offset: outbound.contentOut }, { opacity: 0, offset: 1 }], fade));
      animations.push(content.animate({ transform: ordered([`translateY(${spacing.xl}px)`, 'translateY(0px)']) }, options));
    } else {
      // No card to grow from or return to (another view, scrolled away, deleted): a short fade with a slight scale.
      animations.push(surface.animate({ opacity: ordered([0, 1]), transform: ordered(['scale(0.98)', 'scale(1)']) },
        opening ? { duration: motion.medium, easing: bezier(motion.enter), fill: 'both' } : { duration: motion.exit, easing: bezier(motion.exitEasing), fill: 'both' }));
    }
    const current: Running = { animations, ghost, opening };
    running.current = current;
    void settle(current);
    return true;
  }

  // Once the animations end: an opening hands the final state back to the styles (no fill left over, so a theme change
  // while open still recolours the surface); a closing unmounts, keeping its last frame (the card) until then.
  async function settle(current: Running) {
    try { await Promise.all(current.animations.map((a) => a.finished)); } catch { return; }
    if (running.current !== current) return;
    running.current = null;
    if (current.opening) { current.animations.forEach((a) => a.cancel()); current.ghost?.remove(); }
    else latest.current.onClosed();
  }

  const padding = compact ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  return (
    <View ref={layer} role="dialog" aria-modal aria-label={label} pointerEvents={open ? 'auto' : 'none'}
      style={[styles.layer, { left: frame.left, top: frame.top, width: frame.width, height: frame.height, borderRadius: frameRadius,
        backgroundColor: colors.background }]}>
      <View ref={body} style={styles.body}>
        {/* A little below the edge (user's request, 23 November), on phones under the status bar's safe area. */}
        <View style={[styles.topBar, { paddingTop: (compact ? insets.top : 0) + spacing.lg,
          paddingLeft: padding + (compact ? insets.left : 0), paddingRight: padding + (compact ? insets.right : 0) }]}>
          {/* Tonal round button, larger than a plain icon (user's request, 23 November: the bare chevron was too small and faint). */}
          <StateLayerPressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onClose}
            layerColor={colors.onSecondaryContainer} radius={radius.pill} style={[styles.back, { backgroundColor: colors.secondaryContainer }]}>
            <SvgIcon shape={iconShapes.chevronLeft} size={28} color={colors.onSecondaryContainer} />
          </StateLayerPressable>
        </View>
        <ScrollView style={styles.grow} {...(size === 'expanded' ? { dataSet: { panelScroll: 'true' } } : null)}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: padding + (compact ? Math.max(insets.left, insets.right) : 0),
            paddingBottom: padding + insets.bottom }]}>
          {children}
        </ScrollView>
      </View>
      {/* The copy of the card during the transform (detailMotion.ts), above the content. */}
      <View ref={ghostHost} aria-hidden pointerEvents="none" style={StyleSheet.absoluteFill} />
    </View>
  );
}

// What the item is and how much: icon, name, the figure first in weight, then what the caller adds (merchant, status, marks).
export function DetailHero({ icon, title, amount, muted, children }: { icon: CategoryIcon | null; title: string; amount: string; muted?: boolean; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hero}>
      <View style={[styles.heroTile, { backgroundColor: colors.primaryContainer }]}>
        {icon ? <CategoryGlyph icon={icon} size={40} color={colors.onPrimaryContainer} />
          : <SvgIcon shape={iconShapes.tag} size={36} color={colors.onPrimaryContainer} />}
      </View>
      <Text variant="headlineSmall" accessibilityRole="header" aria-level={1} style={styles.center}>{title}</Text>
      <Text variant="displaySmall" style={[styles.amount, { color: muted ? colors.onSurfaceVariant : colors.onSurface }]}>{amount}</Text>
      {children}
    </View>
  );
}

// Merchant under the amount, in the accent colour with the shop icon (as in the list rows), whole.
export function DetailMerchant({ name, label }: { name: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.merchant} accessibilityLabel={`${label}: ${name}`}>
      <SvgIcon shape={iconShapes.store} size={18} color={colors.primary} />
      <Text variant="titleSmall" numberOfLines={2} style={[styles.merchantName, { color: colors.primary }]}>{name}</Text>
    </View>
  );
}

export function DetailMarks({ children }: { children: ReactNode }) {
  return <View style={styles.marks}>{children}</View>;
}

export function Mark({ icon, label, background, color }: { icon: string; label: string; background: string; color: string }) {
  return (
    <View style={[styles.mark, { backgroundColor: background }]}>
      <SvgIcon shape={icon} size={16} color={color} />
      <Text variant="labelMedium" style={{ color }}>{label}</Text>
    </View>
  );
}

// The details: one group, rows apart by hairlines (no stack of cards); filled like the list cards in light, outlined in dark.
export function InfoGroup({ rows }: { rows: readonly ReactNode[] }) {
  const { colors } = useTheme();
  const fill = cardFill(colors);
  return (
    <View style={[styles.group, fill ? { backgroundColor: fill, borderColor: fill } : { borderColor: colors.outlineVariant }]}>
      {rows.map((row, index) => <View key={index} style={index > 0 && [styles.divided, { borderTopColor: colors.outlineVariant }]}>{row}</View>)}
    </View>
  );
}

export function InfoRow({ icon, label, value, action }: { icon: ReactNode; label: string; value: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View aria-hidden style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="bodyLarge">{value}</Text>
      </View>
      {action}
    </View>
  );
}

// The page's one primary action (Modifica): full width, pill-shaped, as «Salva» in Nuova spesa.
export function PrimaryAction({ label, accessibilityLabel, icon, onPress }: { label: string; accessibilityLabel?: string; icon: string; onPress: () => void }) {
  return (
    <View style={styles.actions}>
      <Button mode="contained" accessibilityLabel={accessibilityLabel} onPress={onPress}
        icon={({ size: iconSize, color }) => <SvgIcon shape={icon} size={iconSize} color={color} />}
        contentStyle={styles.actionContent} labelStyle={styles.actionLabel} style={styles.action}>{label}</Button>
    </View>
  );
}

const bezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

// RN Web refs are DOM elements.
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

// The card of the expense in the list, in the layer's coordinates, with its fill (light theme) for the start of the morph.
function findCard(cardId: string): { node: HTMLElement; box: Box; background: string | null } | null {
  const root = rootBox();
  const node = typeof document === 'undefined' ? null : document.getElementById(cardId)?.querySelector<HTMLElement>('[role="listitem"]');
  if (!root || !node) return null;
  const rect = node.getBoundingClientRect();
  const fill = getComputedStyle(node).backgroundColor;
  const background = !fill || fill === 'transparent' || /^rgba\(.*,\s*0\)$/.test(fill) ? null : fill;
  return { node, box: { left: rect.left - root.left, top: rect.top - root.top, width: rect.width, height: rect.height }, background };
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', overflow: 'hidden' },
  body: { flex: 1 },
  grow: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm },
  back: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, gap: spacing.xl, paddingTop: spacing.sm },
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  heroTile: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  amount: { fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  merchant: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  merchantName: { flexShrink: 1, fontWeight: '600' },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  mark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  group: { borderWidth: 1, borderRadius: radius.control, overflow: 'hidden' },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 64, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row' },
  action: { flexGrow: 1, borderRadius: radius.pill },
  actionContent: { minHeight: layout.controlHeight },
  actionLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
