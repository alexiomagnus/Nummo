import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardClip, cardShift, contentScale, crossfade, detailSpring, fullClip, scrimOpacity, usableCard, type Box } from '../theme/containerTransform';
import { springEasing } from '../theme/themeTransition';
import { motion, radius, sizeClassOf, spacing, type SizeClass } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { useEscape, useFocusHandoff, useOverlayMotion } from './Overlay';
import { recentVelocity, sheetDragOutcome, type DragSample } from './menuGeometry';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

// A full screen of the app (23 November, on request): the detail of an expense or a subscription and every editor or content
// panel that used to be a centred dialog (AppDialog without `variant="alert"`). A layer of the shared overlay level (Paper
// portals, like menus and sheets): the page under it stays mounted and untouched (search, filters, scroll, drafts), so
// closing restores it exactly, with no render of the page. It covers the whole app on phones (its own top bar with a round
// Back button, safe areas inside) and the content panel from medium up (navigation and top bar stay visible).
//
// Opening and closing are a Material 3 container transform from and back into the element that opened it (the card, the
// button, the field: its id when given, otherwise the element last pressed or activated by the keyboard): the surface grows
// from that rectangle with its corner radius on a soft spring (`detailSpring`), the page beneath dims a little, a copy of
// the element moves with the container's corner and fades out while the screen's content fades in from slightly smaller.
// Closing runs the same way back, re-measuring the element (it may have moved); with no element in view, a short fade.
// A screen usually closes by unmounting (`{editing && <Editor />}`): the cleanup clones the layer as it is at that moment
// and plays the way back on the copy (inert, outside React), so every screen also closes smoothly and the page is usable at
// once. Web Animations only (clip-path, opacity, transform); with reduced motion everything is instant.

export type ScreenLayerProps = {
  // Accessible name of the screen.
  label: string;
  // DOM id of the element around the origin (a list card): found again even after the list re-renders.
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
  children: ReactNode;
};

export type ScreenTone = { background: string; content: string; button: string; onButton: string };

export function ScreenLayer({ label, originId, title, backLabel, onBack, backDisabled = false, onEscape, scroll = true, textEntry = false, tone, sheet = false, children }: ScreenLayerProps) {
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
  const latest = useRef({ frame, frameRadius, background, backdrop: colors.backdrop, animate, sheet, onBack, backDisabled });
  latest.current = { frame, frameRadius, background, backdrop: colors.backdrop, animate, sheet, onBack, backDisabled };
  // A sheet grows into its own rectangle (measured: its height is the content's), with round top corners only.
  const settingsFor = (node: HTMLElement): Settings => {
    const { frame: box, frameRadius: corner, background: fill, backdrop } = latest.current;
    if (!latest.current.sheet) return { frame: box, frameRadius: corner, background: fill, backdrop };
    const own = parts(node).surface?.getBoundingClientRect();
    const rootRect = rootBox();
    const area = own && rootRect ? { left: own.left - rootRect.left, top: own.top - rootRect.top, width: own.width, height: own.height } : box;
    return { frame: area, frameRadius: radius.dialog, background: fill, backdrop, whole: sheetClip, rest: scrimOpacity, rise: true };
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

  useEscape(true, onEscape);
  useFocusHandoff(true, true, surface, textEntry);

  // Opening in the commit that inserts the layer, before the first paint; closing from the cleanup, on a copy.
  useLayoutEffect(() => {
    const node = dom(root.current);
    if (!latest.current.animate || !node || typeof node.animate !== 'function') return undefined;
    const origin = pickOrigin(originId);
    let run: Run | null = play(parts(node), measureOrigin(origin), settingsFor(node), true, null);
    // The element that became the screen is left empty while it is open (user's request, 23 November: the date field, the
    // «Nuova lista» button stayed visible above a sheet): opacity only, so it keeps its place and can take the focus back.
    const previousOpacity = origin?.style.opacity ?? '';
    if (origin) origin.style.opacity = '0';
    void run.finished.then((done) => { if (done && run) { run.cancel(); run = null; } });
    return () => {
      const { animate: moving } = latest.current;
      const live = parts(node);
      const state = live.surface && live.content && live.scrim ? {
        clip: getComputedStyle(live.surface).clipPath, background: getComputedStyle(live.surface).backgroundColor,
        opacity: Number(getComputedStyle(live.content).opacity), scrim: Number(getComputedStyle(live.scrim).opacity),
      } : null;
      const settings = settingsFor(node);
      const dragged = live.surface?.dataset.dragged === 'true' ? live.surface.getBoundingClientRect().height : null;
      const shift = live.surface?.style.transform ?? '';
      run?.cancel();
      if (origin) origin.style.opacity = previousOpacity;
      const host = document.getElementById('root');
      if (!moving || !host || !node.isConnected) return;
      const copy = node.cloneNode(true) as HTMLElement;
      copy.setAttribute('inert', '');
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      const { frame: box } = latest.current;
      Object.assign(copy.style, { position: 'absolute', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
        zIndex: '1000', pointerEvents: 'none' });
      const copied = parts(copy);
      copied.ghostHost?.replaceChildren();
      host.appendChild(copy);
      // Pulled down by its handle: it goes on down, from where the finger left it, instead of flying back to its origin.
      const back = dragged !== null ? slideDown(copied, shift, dragged, state?.scrim ?? scrimOpacity)
        : play(copied, measureOrigin(originId ? pickOrigin(originId) : origin?.isConnected ? origin : null), settings, false, state);
      const remove = () => copy.remove();
      void back.finished.then(remove);
      // The element comes back as the screen lands on it (its copy fades in at the same time), not before.
      const target = originId ? pickOrigin(originId) : origin?.isConnected ? origin : null;
      target?.animate([{ opacity: 0 }, { opacity: 0, offset: dragged !== null ? 0.3 : crossfade.close.cardShown }, { opacity: 1 }],
        { duration: back.duration, easing: 'linear' });
      setTimeout(remove, back.duration + 400);
    };
  }, []);

  // Sheet: drag the handle down to close (as the selectors' bottom sheets: `sheetDragOutcome`). The surface follows the finger
  // without transition and the scrim fades with the distance; let go far or fast enough it closes, otherwise it settles back.
  const handle = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const grip = dom(handle.current);
    const node = dom(root.current);
    if (!sheet || !grip || !node) return undefined;
    grip.style.touchAction = 'none';
    let drag: { id: number; y: number; samples: DragSample[]; offset: number } | null = null;
    const { surface: sheetNode, scrim } = parts(node);
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || latest.current.backDisabled) return;
      drag = { id: event.pointerId, y: event.clientY, samples: [{ t: event.timeStamp, y: event.clientY }], offset: 0 };
      try { grip.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id || !sheetNode) return;
      drag.offset = Math.max(0, event.clientY - drag.y);
      drag.samples.push({ t: event.timeStamp, y: event.clientY });
      if (drag.samples.length > 32) drag.samples.shift();
      sheetNode.style.transform = `translateY(${drag.offset}px)`;
      if (scrim) scrim.style.opacity = String(scrimOpacity * Math.max(0, 1 - drag.offset / Math.max(1, sheetNode.offsetHeight)));
    };
    const up = (event: PointerEvent, commit: boolean) => {
      if (!drag || event.pointerId !== drag.id || !sheetNode) return;
      const { offset, samples } = drag;
      drag = null;
      if (offset === 0) return;
      if (commit && sheetDragOutcome(offset, recentVelocity([...samples, { t: event.timeStamp, y: event.clientY }]), sheetNode.offsetHeight) === 'dismiss') {
        sheetNode.dataset.dragged = 'true';
        latest.current.onBack();
        return;
      }
      sheetNode.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0px)' }], { duration: motion.medium, easing: bezier(motion.enter) });
      sheetNode.style.transform = '';
      if (scrim) scrim.style.opacity = '';
    };
    const release = (event: PointerEvent) => up(event, true);
    const cancel = (event: PointerEvent) => up(event, false);
    grip.addEventListener('pointerdown', down);
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', release);
    grip.addEventListener('pointercancel', cancel);
    return () => { grip.removeEventListener('pointerdown', down); grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', release); grip.removeEventListener('pointercancel', cancel); };
  }, [sheet]);

  // Details use the page's margins; editors keep the 24 of their blocks (Paper's Content/Actions), and the top bar lines up with them.
  const padding = !scroll ? spacing.xl : compact ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const side = compact ? Math.max(insets.left, insets.right) : 0;
  return (
    <View ref={root} role="dialog" aria-modal aria-label={label} {...part('root')}
      style={[styles.root, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }]}>
      {sheet ? <Pressable {...part('scrim')} accessibilityRole="button" accessibilityLabel={backLabel} focusable={false} disabled={backDisabled} onPress={onBack}
        style={[StyleSheet.absoluteFill, styles.sheetScrim, { backgroundColor: colors.backdrop, opacity: scrimOpacity, borderRadius: frameRadius }]} />
        : <View {...part('scrim')} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop, opacity: 0, borderRadius: frameRadius }]} />}
      <View ref={surface} {...part('surface')} style={sheet
        ? [styles.sheet, styles.surface, { backgroundColor: background, maxHeight: Math.max(0, frame.height - (compact ? insets.top : 0) - spacing.xxxl) }]
        : [StyleSheet.absoluteFill, styles.surface, { borderRadius: frameRadius, backgroundColor: background }]}>
        <View {...part('content')} style={sheet ? styles.sheetContent : styles.content}>
          {sheet ? <View style={[styles.sheetTop, { paddingLeft: padding + side, paddingRight: padding + side }]}>
            {/* The drag handle (user's request, 23 November: «per buttare giù la scheda»); a wide hit area around the small bar. */}
            <View ref={handle} {...part('handle')} aria-hidden style={styles.handleArea}><View style={[styles.handle, { backgroundColor: colors.onSurfaceVariant }]} /></View>
            {title !== undefined && <Text variant="titleLarge" accessibilityRole="header" aria-level={1} numberOfLines={2} style={[styles.sheetTitle, tone && { color: tone.content }]}>{title}</Text>}
          </View> : <View style={[styles.topBar, { paddingTop: (compact ? insets.top : 0) + spacing.lg, paddingLeft: padding + side, paddingRight: padding + side }]}>
            {/* Tonal round button, larger than a bare icon (user's request, 23 November), a little below the edge. */}
            <StateLayerPressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} disabled={backDisabled}
              layerColor={button.color} radius={radius.pill} style={[styles.back, { backgroundColor: button.background }]}>
              <SvgIcon shape={iconShapes.chevronLeft} size={28} color={button.color} />
            </StateLayerPressable>
            {title !== undefined && <Text variant="titleLarge" accessibilityRole="header" aria-level={1} numberOfLines={2} style={[styles.title, tone && { color: tone.content }]}>{title}</Text>}
          </View>}
          {scroll ? <ScrollView style={styles.grow} keyboardShouldPersistTaps="handled" {...(size === 'expanded' ? { dataSet: { panelScroll: 'true' } } : null)}
            contentContainerStyle={[styles.scroll, { paddingHorizontal: padding + side, paddingBottom: padding + insets.bottom }]}>
            <ThemeProvider theme={toned}>{children}</ThemeProvider>
          </ScrollView> : <View style={[sheet ? styles.sheetBody : styles.grow, { paddingLeft: side, paddingRight: side, paddingBottom: insets.bottom }]}><ThemeProvider theme={toned}>{children}</ThemeProvider></View>}
        </View>
        {/* The copy of the origin during the transform, above the content. */}
        <View {...part('ghosts')} aria-hidden pointerEvents="none" style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

// ——— origin: the element that opened the screen ———

// The element last pressed or activated from the keyboard: the screen opens a moment later (after a state change, sometimes
// after an async step), when the focus may already have moved. Safari does not focus buttons on click, hence pointerdown.
let lastActivation: { element: Element; at: number } | null = null;
if (typeof document !== 'undefined') {
  const note = (target: EventTarget | null) => { if (target instanceof Element) lastActivation = { element: target, at: performance.now() }; };
  document.addEventListener('pointerdown', (event) => note(event.target), true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') note(document.activeElement); }, true);
}
const recentMs = 4000;
const originSelector = '[role="listitem"], [role="button"], [role="menuitem"], button, a';

function pickOrigin(originId?: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (originId) {
    const host = document.getElementById(originId);
    return host?.querySelector<HTMLElement>('[role="listitem"]') ?? host;
  }
  const recent = lastActivation && performance.now() - lastActivation.at < recentMs ? lastActivation.element : null;
  const element = recent ?? (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
  const target = element?.closest<HTMLElement>(originSelector) ?? (element instanceof HTMLElement ? element : null);
  return target?.isConnected ? outermost(target) : null;
}

// The element as drawn: Paper's buttons put their fill and outline on a wrapper around the pressable (role=button), so the
// origin climbs to the outermost ancestor with the same rectangle. Its copy then carries the fill, and hiding it while the
// screen is open hides the whole button, not only its label (user's request, 23 November: «deve scomparire il tasto»).
function outermost(element: HTMLElement): HTMLElement {
  const box = element.getBoundingClientRect();
  let current = element;
  for (let parent = current.parentElement; parent && parent !== document.body && parent.id !== 'root'; parent = parent.parentElement) {
    const rect = parent.getBoundingClientRect();
    if (Math.abs(rect.left - box.left) > 1 || Math.abs(rect.top - box.top) > 1 || Math.abs(rect.width - box.width) > 1 || Math.abs(rect.height - box.height) > 1) break;
    current = parent;
  }
  return current;
}

type Origin = { node: HTMLElement; box: Box; background: string | null; radius: number };

function measureOrigin(node: HTMLElement | null): Origin | null {
  const root = rootBox();
  if (!node || !root || !node.isConnected) return null;
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  const fill = style.backgroundColor;
  const background = !fill || fill === 'transparent' || /^rgba\(.*,\s*0\)$/.test(fill) ? null : fill;
  // A pill (a full-width button) keeps its round ends while it grows.
  const corner = Math.min(parseFloat(style.borderTopLeftRadius) || radius.control, rect.height / 2);
  return { node, box: { left: rect.left - root.left, top: rect.top - root.top, width: rect.width, height: rect.height }, background, radius: corner };
}

// ——— the transform ———

type Parts = { surface: HTMLElement | null; content: HTMLElement | null; ghostHost: HTMLElement | null; scrim: HTMLElement | null };
type Run = { finished: Promise<boolean>; cancel: () => void; duration: number };
// `whole`: the clip of the open surface (a sheet: round top corners only); `rest`: the scrim's opacity once open (a sheet keeps it).
// `rise`: a sheet, whose origin may lie above it: the surface also travels vertically from the origin's height to its place.
type Settings = { frame: Box; frameRadius: number; background: string; backdrop: string; whole?: string; rest?: number; rise?: boolean };
type From = { clip: string; background: string; opacity: number; scrim: number } | null;

const part = (name: string) => ({ dataSet: { screenPart: name } }) as object;
function parts(node: HTMLElement): Parts {
  const find = (name: string) => node.querySelector<HTMLElement>(`[data-screen-part="${name}"]`);
  return { surface: find('surface'), content: find('content'), ghostHost: find('ghosts'), scrim: find('scrim') };
}

function play({ surface, content, ghostHost, scrim }: Parts, found: Origin | null, { frame, frameRadius, background, whole: wholeClip, rest = 0, rise = false }: Settings, opening: boolean, from: From): Run {
  const animations: Animation[] = [];
  let ghost: HTMLElement | null = null;
  const spring = springEasing(detailSpring);
  const view = surface?.ownerDocument.defaultView;
  const springy = view?.CSS?.supports?.('animation-timing-function', 'linear(0, 1)') ? spring.easing : bezier(motion.enter);
  const both = 'both' as const;
  let duration = spring.duration;
  // A sheet: the origin is lifted onto the sheet's top edge and the whole surface travels by the difference while it grows.
  const travel = rise && found ? found.box.top - frame.top : 0;
  const origin = found && rise ? { ...found, box: { ...found.box, top: frame.top } } : found;
  const usable = origin && (rise ? origin.box.width > 0 && origin.box.height > 0 : usableCard(origin.box, frame));
  if (surface && content && ghostHost && scrim && origin && usable) {
    const options = { duration, easing: springy, fill: both };
    const fade = { duration, easing: 'linear', fill: both };
    const { open: inbound, close: outbound } = crossfade;
    const small = cardClip(origin.box, frame, origin.radius);
    const whole = wholeClip ?? fullClip(frameRadius);
    const tint = origin.background ?? background;
    animations.push(surface.animate(opening ? { clipPath: [small, whole], backgroundColor: [tint, background] }
      : { clipPath: [from?.clip && from.clip !== 'none' ? from.clip : whole, small], backgroundColor: [from?.background ?? background, tint] }, options));
    if (travel !== 0) {
      const away = `translateY(${travel}px)`;
      animations.push(surface.animate({ transform: opening ? [away, 'translateY(0px)'] : ['translateY(0px)', away] }, options));
    }
    animations.push(scrim.animate({ opacity: opening ? [0, scrimOpacity] : [from?.scrim || scrimOpacity, 0] }, { duration, easing: bezier(motion.easing), fill: both }));
    // A copy of the origin at its place, moving with the container's corner: it fades out as the screen opens, in as it closes.
    ghost = origin.node.cloneNode(true) as HTMLElement;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');
    ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    ghost.removeAttribute('id');
    Object.assign(ghost.style, { position: 'absolute', left: `${origin.box.left - frame.left}px`, top: `${origin.box.top - frame.top}px`,
      width: `${origin.box.width}px`, height: `${origin.box.height}px`, margin: '0', boxSizing: 'border-box', pointerEvents: 'none' });
    ghostHost.appendChild(ghost);
    const shift = cardShift(origin.box, frame);
    const moved = `translate(${shift.x}px, ${shift.y}px)`;
    animations.push(ghost.animate({ transform: opening ? ['translate(0px, 0px)', moved] : [moved, 'translate(0px, 0px)'] }, options));
    animations.push(ghost.animate(opening ? [{ opacity: 1, offset: 0 }, { opacity: 0, offset: inbound.cardOut }, { opacity: 0, offset: 1 }]
      : [{ opacity: 0, offset: 0 }, { opacity: 0, offset: outbound.cardIn }, { opacity: 1, offset: outbound.cardShown }, { opacity: 1, offset: 1 }], fade));
    // The content grows from the origin's centre, slightly smaller, and fades in after the copy has gone (out first on closing).
    content.style.transformOrigin = `${origin.box.left - frame.left + origin.box.width / 2}px ${origin.box.top - frame.top + origin.box.height / 2}px`;
    const start = from?.opacity ?? 1;
    animations.push(content.animate(opening ? [{ opacity: 0, offset: 0 }, { opacity: 0, offset: inbound.contentIn },
      { opacity: 1, offset: inbound.contentShown }, { opacity: 1, offset: 1 }]
      : [{ opacity: start, offset: 0 }, { opacity: 0, offset: outbound.contentOut }, { opacity: 0, offset: 1 }], fade));
    animations.push(content.animate({ transform: opening ? [`scale(${contentScale})`, 'scale(1)'] : ['scale(1)', `scale(${contentScale})`] }, options));
  } else if (surface && scrim) {
    // Nothing to grow from or return to (out of view, gone, opened from elsewhere): a short fade with a slight scale.
    duration = opening ? motion.long : motion.exit;
    const options = opening ? { duration, easing: bezier(motion.enter), fill: both } : { duration, easing: bezier(motion.exitEasing), fill: both };
    animations.push(surface.animate({ opacity: opening ? [0, 1] : [from?.opacity ?? 1, 0], transform: opening ? ['scale(0.97)', 'scale(1)'] : ['scale(1)', 'scale(0.97)'] }, options));
    if (rest > 0) animations.push(scrim.animate({ opacity: opening ? [0, rest] : [from?.scrim ?? rest, 0] }, options));
  }
  for (const node of [surface, content]) node?.style.setProperty('will-change', 'clip-path, transform, opacity');
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    animations.forEach((animation) => animation.cancel());
    ghost?.remove();
    for (const node of [surface, content]) node?.style.removeProperty('will-change');
    if (content) content.style.transformOrigin = '';
  };
  const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => !cancelled, () => false);
  return { finished, cancel, duration };
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

// Open sheet: round top corners, square bottom (it sits on the bottom edge).
const sheetClip = `inset(0px 0px 0px 0px round ${radius.dialog}px ${radius.dialog}px 0px 0px)`;

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

const styles = StyleSheet.create({
  root: { position: 'absolute' },
  surface: { overflow: 'hidden' },
  content: { flex: 1 },
  grow: { flex: 1, minHeight: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  back: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, minWidth: 0 },
  scroll: { flexGrow: 1, gap: spacing.xl, paddingTop: spacing.sm },
  sheetScrim: { cursor: 'auto' } as object,
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
