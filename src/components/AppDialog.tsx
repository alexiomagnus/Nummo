import { useI18n } from '../i18n/I18nProvider';
import { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Dialog, Surface, ThemeProvider, useTheme } from 'react-native-paper';
import { useInsets } from '../theme/insets';
import { transitions } from '../theme/motion';
import { dialogColor } from '../theme/theme';
import { layout, motion, radius, spacing } from '../theme/tokens';
import { Scrim, useEscape, useFocusHandoff, useOverlayMotion, usePresence } from './Overlay';
import { ScreenLayer, type ScreenTone } from './ScreenLayer';
import { useSizeClass } from '../theme/useSizeClass';
import { CancelButton, dialogActionPair } from './Button';
import { ScreenActionsContext } from './screenActions';
import { noScrollEdges, scrollEdges, type ScrollEdges } from './scrollEdges';

type Props = Pick<ComponentProps<typeof Dialog>, 'visible' | 'onDismiss' | 'dismissable' | 'testID'> & {
  style?: StyleProp<ViewStyle>;
  // Focus the first text field on opening also on touch-first devices, bringing up the keyboard. Only for creation
  // dialogs that start from typing a name (Nuova lista, Nuovo fondo): every other dialog keeps the keyboard closed.
  focusTextEntry?: boolean | 'touch';
  // `screen` (default since 23 November, on request): a full screen of the app on the shared screen layer (ScreenLayer),
  // with the container transform from the element that opened it. `alert`: the small centred dialog, kept only for short
  // confirmations and warnings (delete, change of mode, the lock's PIN).
  // `sheet`: the same, as a bottom sheet as tall as its content with a drag handle (short forms; ScreenLayer `sheet`).
  variant?: 'screen' | 'sheet' | 'alert';
  // Accessible name of a screen without Title (the date picker, whose headline is the date).
  label?: string;
  // Colours of a screen opened from a coloured element (the payment history, from its accent row): see ScreenLayer.
  tone?: ScreenTone;
  // On phones: a panel with three positions (whole, peek, closed), dragged from anywhere, no Back button (ScreenLayer `detents`
  // `panel`; user's requests, 24 November: Template, Scansiona scontrino, the date picker, the fund movements, then the read-only
  // screens: the transactions of Analisi, Prodotti acquistati, Storico dei pagamenti). Opens whole unless `opensHalf`.
  detents?: boolean;
  // With `detents`: always open in peek (Template), or a peek that shows all the content (the date picker). See ScreenLayer.
  opensHalf?: boolean;
  fitPeek?: boolean | 'shrink';
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
  if ((props.variant ?? 'screen') !== 'alert') return props.visible ? <ScreenDialog {...props} /> : null;
  return <AlertDialog {...props} />;
}

// Editors and content panels as screens: Title goes into the top bar beside Back, the other blocks (Content, ScrollArea)
// fill the screen and Actions sit at its bottom, above the safe area (and above the keyboard: the screen shrinks with it).
// Back, Escape and the system Back dismiss it, unless `dismissable` is false (an operation running).
function ScreenDialog({ onDismiss, dismissable = true, testID, focusTextEntry = false, label, tone, variant, detents = false, opensHalf = false, fitPeek = false, children }: Props) {
  const { t } = useI18n();
  // A sheet only on phones; from medium every screen fills the content panel (user's request, 24 November: Nuova lista and the
  // «from when?» of a subscription as a sheet in the middle of a desktop page did not please).
  const compact = useSizeClass() === 'compact';
  const sheet = variant === 'sheet' && compact;
  let title: ReactNode;
  const blocks: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (child == null || typeof child === 'boolean') return;
    if (isValidElement<{ children?: ReactNode; style?: StyleProp<ViewStyle> }>(child) && child.type === Dialog.Title) { title = child.props.children; return; }
    if (isValidElement<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>(child) && child.type === Dialog.Actions) {
      // From medium, two or more actions share one row in equal parts, Elimina first and the confirmation last (user's request,
      // 24 November: «per risparmiare spazio, almeno su desktop, bottone elimina e salva sulla stessa riga»); on phones, two actions too (27 November), more a column.
      // On phones too, but only for two (27 November, on request: a column of two pills left the fields of «Modifica fondo» a few
      // lines tall on a 411×914 screen); three or more stay a column.
      const count = screenActions(child.props.children, dismissable, false).length;
      const inRow = !compact || count === 2;
      const actions = screenActions(child.props.children, dismissable, inRow);
      if (actions.length === 0) return;
      blocks.push(cloneElement(child as ReactElement<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>,
        { style: [child.props.style, screenStyles.actions, inRow && actions.length > 1 && screenStyles.actionsRow], children: <ScreenActionsContext.Provider value>{actions}</ScreenActionsContext.Provider> }));
      return;
    }
    blocks.push(child);
  });
  const dismiss = () => { if (dismissable && onDismiss) onDismiss(); };
  return <ScreenLayer label={label ?? (typeof title === 'string' ? title : t("Indietro"))} title={title} backLabel={t("Indietro")} onBack={dismiss} backDisabled={!dismissable}
    onEscape={() => { if (!dismissable || !onDismiss) return false; onDismiss(); }} scroll={false} textEntry={focusTextEntry} tone={tone} sheet={sheet} detents={detents && !sheet ? 'panel' : false} opensHalf={opensHalf} fitPeek={fitPeek}>
    <View testID={testID} style={sheet ? screenStyles.sheetBody : screenStyles.body}>{blocks}</View>
  </ScreenLayer>;
}

// On a screen or sheet the actions are a column of full-width pills (user's requests, 23 November): Elimina above, the
// confirmation (Salva, Crea, OK…) below. «Annulla» (CancelButton) is left out when the screen can be dismissed: Back, the
// handle, a tap outside or the system Back do the same (user's choice, same day). It stays only while dismissing is refused
// (a receipt being read: then it is the only way to stop it).
type Styled = ReactElement<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>;
const isPair = (element: Styled): boolean => {
  const has = (style: unknown): boolean => style === dialogActionPair || (Array.isArray(style) && style.some(has));
  return has(element.props.style);
};
function screenActions(children: ReactNode, dropCancel: boolean, inRow = false): Styled[] {
  const items: Styled[] = [];
  const visit = (node: ReactNode) => Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    if (dropCancel && child.type === CancelButton) return;
    if (isPair(child as Styled)) { visit((child as Styled).props.children); return; }
    items.push(child as Styled);
  });
  visit(children);
  const place = inRow && items.length > 1 ? screenStyles.share : screenStyles.full;
  return items.map((item, index) => cloneElement(item, { key: item.key ?? index, style: [item.props.style, place] }));
}

function AlertDialog({ visible = false, onDismiss, dismissable = true, testID, style, focusTextEntry = false, children }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useInsets();
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
  sheetBody: { flexShrink: 1, minHeight: 0, paddingTop: spacing.sm },
  // Always at the bottom of the screen, whatever the height of the content above (Paper's Actions grow by default, which
  // would take the free space before the auto margin and leave the buttons under the fields).
  // A column: each action as wide as the screen, Elimina above the confirmation.
  actions: { marginTop: 'auto', flexGrow: 0, flexWrap: 'nowrap', flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  // Natural height whatever the dialog passed for its row layout: a `flex: 1` (equal halves in a row) in this column would mean
  // basis 0 and shrinkable, a zero-height box with the button spilling below the screen («Scansiona», 24 November).
  full: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignSelf: 'stretch', alignItems: 'stretch', marginRight: 0, marginLeft: 0 },
  // From medium: the actions in one row, equal parts.
  actionsRow: { flexDirection: 'row', alignItems: 'stretch' },
  share: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, alignSelf: 'auto', alignItems: 'stretch', marginRight: 0, marginLeft: 0 },
});

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
});

export const AppDialog = Object.assign(AppDialogRoot, {
  Title: Dialog.Title, Content: Dialog.Content, ScrollArea,
  Actions: Dialog.Actions, Icon: Dialog.Icon,
});
