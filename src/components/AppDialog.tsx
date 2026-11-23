import { useI18n } from '../i18n/I18nProvider';
import { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Dialog, Surface, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transitions } from '../theme/motion';
import { dialogColor } from '../theme/theme';
import { layout, motion, radius, spacing } from '../theme/tokens';
import { Scrim, useEscape, useFocusHandoff, useOverlayMotion, usePresence } from './Overlay';
import { ScreenLayer } from './ScreenLayer';
import { noScrollEdges, scrollEdges, type ScrollEdges } from './scrollEdges';

type Props = Pick<ComponentProps<typeof Dialog>, 'visible' | 'onDismiss' | 'dismissable' | 'testID'> & {
  style?: StyleProp<ViewStyle>;
  // Focus the first text field on opening also on touch-first devices, bringing up the keyboard. Only for creation
  // dialogs that start from typing a name (Nuova lista, Nuovo fondo): every other dialog keeps the keyboard closed.
  focusTextEntry?: boolean;
  // `screen` (default since 23 November, on request): a full screen of the app on the shared screen layer (ScreenLayer),
  // with the container transform from the element that opened it. `alert`: the small centred dialog, kept only for short
  // confirmations and warnings (delete, change of mode, the lock's PIN).
  variant?: 'screen' | 'alert';
  // Accessible name of a screen without Title (the date picker, whose headline is the date).
  label?: string;
  children: ReactNode;
};

// Entering, the surface is opaque within `motion.fade` while it settles from 92% scale; leaving, it stays solid and then
// vanishes within `motion.fade` on the accelerating curve, before the scrim. Paper's Modal instead faded both for 220 ms
// on a decelerating curve: the surface stayed half transparent over the page, and its content outlived the scrim.
const surfaceEnter = transitions([['opacity', motion.fade], ['transform', motion.long, motion.enter]]);
const surfaceExit = transitions([['opacity', motion.fade, motion.exitEasing], ['transform', motion.fade, motion.exitEasing]]);

// Shared surface and viewport bounds for settings, editors, dates and confirmations.
// Matching `background` also makes outlined-field label notches blend with the modal.
// Layout of Paper's Dialog (Title/Content/ScrollArea/Actions keep working), animated by the shared overlay layer.
function AppDialogRoot(props: Props) {
  if ((props.variant ?? 'screen') === 'screen') return props.visible ? <ScreenDialog {...props} /> : null;
  return <AlertDialog {...props} />;
}

// Editors and content panels as screens: Title goes into the top bar beside Back, the other blocks (Content, ScrollArea)
// fill the screen and Actions sit at its bottom, above the safe area (and above the keyboard: the screen shrinks with it).
// Back, Escape and the system Back dismiss it, unless `dismissable` is false (an operation running).
function ScreenDialog({ onDismiss, dismissable = true, testID, focusTextEntry = false, label, children }: Props) {
  const { t } = useI18n();
  let title: ReactNode;
  const blocks: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (child == null || typeof child === 'boolean') return;
    if (isValidElement<{ children?: ReactNode; style?: StyleProp<ViewStyle> }>(child) && child.type === Dialog.Title) { title = child.props.children; return; }
    if (isValidElement<{ style?: StyleProp<ViewStyle> }>(child) && child.type === Dialog.Actions) {
      blocks.push(cloneElement(child as ReactElement<{ style?: StyleProp<ViewStyle> }>, { style: [child.props.style, screenStyles.actions] }));
      return;
    }
    blocks.push(child);
  });
  const dismiss = () => { if (dismissable && onDismiss) onDismiss(); };
  return <ScreenLayer label={label ?? (typeof title === 'string' ? title : t("Indietro"))} title={title} backLabel={t("Indietro")} onBack={dismiss} backDisabled={!dismissable}
    onEscape={() => { if (!dismissable || !onDismiss) return false; onDismiss(); }} scroll={false} textEntry={focusTextEntry}>
    <View testID={testID} style={screenStyles.body}>{blocks}</View>
  </ScreenLayer>;
}

function AlertDialog({ visible = false, onDismiss, dismissable = true, testID, style, focusTextEntry = false, children }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const background = dialogColor(theme.colors);
  const modalTheme = useMemo(() => ({ ...theme, colors: { ...theme.colors, background } }), [theme, background]);
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(visible, motion.short, animate);
  const container = useRef<ComponentRef<typeof View>>(null);
  useEscape(visible, () => {
    if (!dismissable || !onDismiss) return false;
    onDismiss();
  });
  useFocusHandoff(visible, shown, container, focusTextEntry);
  if (!mounted) return null;
  const maxHeight = `calc(var(--nummo-viewport-height, 100dvh) - ${insets.top + insets.bottom + spacing.lg * 2}px)` as DimensionValue;
  // As in Paper's Material 3 dialog, the first block (title or content) keeps 24 dp from the top edge.
  const items = Children.toArray(children).filter((child) => child != null && typeof child !== 'boolean').map((child, index) =>
    index === 0 && isValidElement<{ style?: StyleProp<ViewStyle> }>(child)
      ? cloneElement(child as ReactElement<{ style?: StyleProp<ViewStyle> }>, { style: [{ marginTop: 24 }, child.props.style] })
      : child);
  return <ThemeProvider theme={modalTheme}>
    <View role="dialog" aria-modal accessibilityLiveRegion="polite" pointerEvents={visible ? 'auto' : 'none'} style={StyleSheet.absoluteFill} testID={testID}>
      <Scrim visible={visible} shown={shown} color={theme.colors.backdrop} label={t('Chiudi')} onPress={dismissable ? onDismiss : undefined} />
      <View ref={container} pointerEvents="box-none" style={[styles.wrapper, { marginTop: insets.top, marginBottom: insets.bottom }]}>
        <Surface style={[{
          maxWidth: layout.maxForm, borderRadius: radius.dialog,
          backgroundColor: background, borderWidth: 1, borderColor: theme.colors.outline,
        }, style, {
          width: Math.max(0, width - insets.left - insets.right - spacing.lg * 2),
          alignSelf: 'center', marginHorizontal: 0, marginVertical: spacing.lg, maxHeight, justifyContent: 'flex-start',
          opacity: shown ? 1 : 0, transform: [{ scale: shown ? 1 : 0.92 }],
        }, shown ? surfaceEnter : surfaceExit]}>{items}</Surface>
      </View>
    </View>
  </ThemeProvider>;
}

// Scroll area of every dialog (replaces Paper's Dialog.ScrollArea, same layout: 24 dp sides, grows and shrinks, 24 dp
// below). As in Material 3 scrollable dialogs, a divider marks only the edges that hide content, so a field cut by the
// edge reads as «more below» (the scrollbar only shows while scrolling). Borders are always 1 dp, transparent when
// nothing is hidden: a divider never shifts the layout. Web target: the scroller is the first descendant of the area
// that scrolls (the ScrollView inside), watched for scrolling and for size changes of itself and of its content.
function ScrollArea({ style, children, ...rest }: ComponentProps<typeof View>) {
  const { colors } = useTheme();
  const [edges, setEdges] = useState<ScrollEdges>(noScrollEdges);
  // A callback ref: Paper's Portal attaches the dialog's nodes after the first effects have run.
  const [area, setArea] = useState<HTMLElement | null>(null);
  const attach = useCallback((view: ComponentRef<typeof View> | null) => setArea(view as unknown as HTMLElement | null), []);
  useEffect(() => {
    if (!area) return;
    const scroller = [...area.querySelectorAll<HTMLElement>('*')].find((node) => /^(auto|scroll)$/.test(getComputedStyle(node).overflowY));
    if (!scroller) return;
    const update = () => {
      const found = scrollEdges(scroller.scrollTop, scroller.clientHeight, scroller.scrollHeight);
      setEdges((now) => now.above === found.above && now.below === found.below ? now : found);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(scroller);
    if (scroller.firstElementChild) resize?.observe(scroller.firstElementChild);
    return () => { scroller.removeEventListener('scroll', update); resize?.disconnect(); };
  }, [area]);
  return <View {...rest} ref={attach} style={[scrollAreaStyles.container, style, {
    borderTopWidth: 1, borderBottomWidth: 1,
    borderTopColor: edges.above ? colors.outlineVariant : 'transparent', borderBottomColor: edges.below ? colors.outlineVariant : 'transparent',
  }]}>{children}</View>;
}

const scrollAreaStyles = StyleSheet.create({
  container: { paddingHorizontal: 24, flexGrow: 1, flexShrink: 1, marginBottom: 24 },
});

const screenStyles = StyleSheet.create({
  body: { flex: 1, minHeight: 0, paddingTop: spacing.sm },
  // Always at the bottom of the screen, whatever the height of the content above (Paper's Actions grow by default, which
  // would take the free space before the auto margin and leave the buttons under the fields).
  actions: { marginTop: 'auto', flexGrow: 0 },
});

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
});

export const AppDialog = Object.assign(AppDialogRoot, {
  Title: Dialog.Title, Content: Dialog.Content, ScrollArea,
  Actions: Dialog.Actions, Icon: Dialog.Icon,
});
