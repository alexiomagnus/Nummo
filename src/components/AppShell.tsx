import { useI18n } from '../i18n/I18nProvider';
import { Logo } from './Logo';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { FAB, Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layerTransition } from '../theme/motion';
import { layout, motion, radius, shape, spacing, stateOpacity } from '../theme/tokens';
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
export const useKeyboardOpen = () => useContext(KeyboardContext);

function useVirtualKeyboard(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => (typeof window === 'undefined' ? undefined : observeVirtualKeyboard(window, setOpen)), []);
  return open;
}

// Adaptive Material 3 shell: top app bar + navigation bar (compact), rail (medium) or
// standing drawer (expanded). The content scrolls inside the shell, nothing is position: fixed.
export function AppShell<T extends string>({ destinations, selected, onSelect, actions, fab, brand, children }: Props<T>) {
  const theme = useTheme();
  const { colors } = theme;
  const size = useSizeClass();
  const reduceMotion = useReducedMotion();
  const keyboard = useVirtualKeyboard();
  // The layout above the keyboard changes (navigation hidden, save bar back in the flow): bring the focused field back
  // into view once it has settled. `nearest` honours the scroll padding reserved by sticky bars.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (keyboard && active instanceof HTMLElement && active !== document.body) active.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboard]);
  const pageProgress = useRef(new Animated.Value(1)).current;
  const previousSection = useRef(selected);
  // Animate the existing content container: changing its key would discard the expense draft.
  useLayoutEffect(() => {
    const changed = previousSection.current !== selected;
    previousSection.current = selected;
    pageProgress.stopAnimation();
    if (!changed || reduceMotion) { pageProgress.setValue(1); return; }
    pageProgress.setValue(0);
    const animation = Animated.timing(pageProgress, {
      toValue: 1, duration: motion.long, easing: Easing.bezier(...motion.enter), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, reduceMotion, pageProgress]);
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const select = useCallback((value: T) => {
    onSelect?.(value);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [onSelect]);
  const hasNav = Boolean(destinations?.length);
  // While typing, the navigation bar would take room from the fields above the keyboard: it is hidden (still mounted,
  // so its state and the round action survive) and comes back when the keyboard closes.
  const navMounted = hasNav && size === 'compact';
  const bottomBar = navMounted && !keyboard;
  // Compact: floating toolbar (destinations pill + round primary action) in the layout flow, above the bottom inset.
  const barHeight = layout.floatingBar + spacing.md * 2 + insets.bottom;
  const showFab = bottomBar && fab && selected !== fab.target;
  const padding = size === 'compact' ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const compact = size === 'compact';
  const expanded = size === 'expanded';
  const showPanel = expanded && hasNav; // no panel on the sign-in and guide screens
  // Inside the panel, `background` is the panel colour so outlined-field label notches and sticky bars blend in.
  // On phones and tablets there is no lighter panel (desktop only): the page sits on the plain background.
  const panelBg = !showPanel ? colors.background : panelColor(colors);
  const panelTheme = { ...theme, colors: { ...colors, background: panelBg } };
  const panel = !showPanel ? { borderRadius: 0 } : { borderRadius: radius.dialog, marginTop: spacing.md, marginRight: padding, marginBottom: padding };

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
          <ScrollView ref={scroller} style={[styles.scroll, panel, { backgroundColor: panelBg }]} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, padding, paddingBottom: padding + (bottomBar ? 0 : insets.bottom) }}>
            <ThemeProvider theme={panelTheme}>
              <KeyboardContext.Provider value={keyboard}>
              <Animated.View role="main" style={[styles.content, size === 'compact' && { gap: spacing.lg }, compact && fab && selected === fab.target && { justifyContent: 'center' }, {
                opacity: pageProgress,
                transform: [{ translateY: pageProgress.interpolate({ inputRange: [0, 1], outputRange: [spacing.sm, 0] }) }],
              }]}>{children}</Animated.View>
              </KeyboardContext.Provider>
            </ThemeProvider>
          </ScrollView>
        </View>
        {navMounted && <NavigationBar destinations={destinations!} selected={selected} onSelect={select} bottomInset={insets.bottom} fab={showFab ? fab : undefined} hidden={!bottomBar} />}
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

function NavigationBar<T extends string>({ destinations, selected, onSelect, bottomInset, fab, hidden }: NavProps<T> & { bottomInset: number; hidden: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
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
  return (
    <View style={[styles.floating, { paddingBottom: spacing.md + bottomInset }, hidden && styles.hidden]}>
      <View role="navigation" aria-label={t("Sezioni")} style={[styles.pill, { backgroundColor: colors.elevation.level3 }]}>
        {destinations.map((item) => {
          const active = item.value === selected;
          const color = active ? colors.onPrimaryContainer : colors.onSurfaceVariant;
          return (
            <StateLayerPressable key={item.value} layerColor={color} radius={radius.pill} accessibilityRole="button"
              aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)}
              style={[styles.pillItem, active && { backgroundColor: colors.primaryContainer }]}>
              <SvgIcon shape={item.icon} size={24} color={color} />
              <Text variant="labelMedium" numberOfLines={1} style={{ color, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
            </StateLayerPressable>
          );
        })}
      </View>
      {mounted && action && (
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} aria-hidden={!visible}
          style={[styles.actionSlot, {
            width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, layout.floatingBar] }),
            marginLeft: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spacing.sm] }),
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

function Rail<T extends string>({ destinations, selected, onSelect, fab }: NavProps<T>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View role="navigation" aria-label={t("Sezioni")} style={[styles.rail, { backgroundColor: colors.background }]}>
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
    </View>
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
  content: { width: '100%', maxWidth: layout.maxContent, alignSelf: 'center', flexGrow: 1, gap: spacing.xl },
  floating: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.md },
  // display: none also removes it from the accessibility tree and the Tab order while the keyboard is open.
  hidden: { display: 'none' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', height: layout.floatingBar, borderRadius: radius.pill, padding: spacing.xs, gap: spacing.xs },
  pillItem: { flex: 1, minWidth: 0, height: layout.floatingBar - spacing.xs * 2, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  actionSlot: { height: layout.floatingBar, overflow: 'hidden' },
  roundAction: { width: layout.floatingBar, height: layout.floatingBar, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  rail: { width: layout.railWidth, paddingTop: spacing.lg, alignItems: 'center', gap: spacing.lg + 4 },
  railFab: { marginTop: spacing.lg, marginBottom: spacing.md, borderRadius: radius.button },
  railItem: { width: layout.railWidth - spacing.sm, alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  railIndicator: { overflow: 'hidden', width: 56, height: 32, borderRadius: radius.nav, alignItems: 'center', justifyContent: 'center' },
  drawer: { width: layout.drawerWidth, padding: spacing.md, paddingTop: spacing.lg, gap: spacing.lg + 4 },
  drawerFab: { alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.md, marginLeft: spacing.xs, borderRadius: radius.button },
  drawerItem: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
});
