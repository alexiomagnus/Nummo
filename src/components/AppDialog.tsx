import { useI18n } from '../i18n/I18nProvider';
import { Children, cloneElement, isValidElement, useMemo, useRef, type ComponentProps, type ComponentRef, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Dialog, Surface, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { transitions } from '../theme/motion';
import { dialogColor } from '../theme/theme';
import { layout, motion, radius, spacing } from '../theme/tokens';
import { Scrim, useEscape, useFocusHandoff, useOverlayMotion, usePresence } from './Overlay';

type Props = Pick<ComponentProps<typeof Dialog>, 'visible' | 'onDismiss' | 'dismissable' | 'testID'> & {
  style?: StyleProp<ViewStyle>;
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
function AppDialogRoot({ visible = false, onDismiss, dismissable = true, testID, style, children }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const background = dialogColor(theme.colors);
  const modalTheme = useMemo(() => ({ ...theme, colors: { ...theme.colors, background } }), [theme, background]);
  const animate = useOverlayMotion();
  const { mounted, shown } = usePresence(visible, motion.short, animate);
  const container = useRef<ComponentRef<typeof View>>(null);
  useEscape(visible, () => { if (dismissable) onDismiss?.(); });
  useFocusHandoff(visible, shown, container);
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

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
});

export const AppDialog = Object.assign(AppDialogRoot, {
  Title: Dialog.Title, Content: Dialog.Content, ScrollArea: Dialog.ScrollArea,
  Actions: Dialog.Actions, Icon: Dialog.Icon,
});
