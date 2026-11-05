import { Logo } from './Logo';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { FAB, Text, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, radius, shape, spacing, stateOpacity } from '../theme/tokens';
import { panelColor } from '../theme/theme';
import { useSizeClass } from '../theme/useSizeClass';
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
  children: ReactNode;
};

// Adaptive Material 3 shell: top app bar + navigation bar (compact), rail (medium) or
// standing drawer (expanded). The content scrolls inside the shell, nothing is position: fixed.
export function AppShell<T extends string>({ destinations, selected, onSelect, actions, fab, children }: Props<T>) {
  const theme = useTheme();
  const { colors } = theme;
  const size = useSizeClass();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const select = useCallback((value: T) => {
    onSelect?.(value);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [onSelect]);
  const hasNav = Boolean(destinations?.length);
  const bottomBar = hasNav && size === 'compact';
  const barHeight = layout.navBarHeight + insets.bottom;
  const showFab = bottomBar && fab && selected !== fab.target;
  const padding = size === 'compact' ? spacing.md : size === 'medium' ? spacing.xl : spacing.xxl;
  const compact = size === 'compact';
  // Inside the panel, `background` is the panel colour so outlined-field label notches and sticky bars blend in.
  // On phones there is no lighter panel: the page sits on the plain background.
  const panelBg = compact ? colors.background : panelColor(colors);
  const panelTheme = { ...theme, colors: { ...colors, background: panelBg } };
  const panel = compact ? { borderRadius: 0 } : { borderRadius: shape.md, marginTop: spacing.md, marginRight: padding, marginBottom: padding };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SnackbarProvider bottomOffset={bottomBar ? barHeight : insets.bottom} onVisibleChange={setSnackbarOpen}>
      <View role="banner" style={[styles.topBar, { backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: padding, height: layout.topBarHeight + insets.top }]}>
        {fab && hasNav ? (
          // The brand leads to the primary screen (new expense); on it, it does nothing.
          <StateLayerPressable layerColor="transparent" accessibilityRole="button" accessibilityLabel={`Nummo, ${fab.label}`}
            onPress={() => { if (selected !== fab.target) select(fab.target); }} style={[styles.brand, styles.noRing]}>
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
            contentContainerStyle={{ flexGrow: 1, padding, paddingBottom: showFab ? padding + 72 : padding }}>
            <ThemeProvider theme={panelTheme}>
              <View role="main" style={[styles.content, size === 'compact' && { gap: spacing.lg }]}>{children}</View>
            </ThemeProvider>
          </ScrollView>
        </View>
        {bottomBar && <NavigationBar destinations={destinations!} selected={selected} onSelect={select} bottomInset={insets.bottom} />}
        {showFab && fab && (
          <FAB mode="flat" label={width >= 360 ? fab.label : undefined} icon={({ size: s, color }) => <SvgIcon shape={fab.icon} size={s} color={color} />}
            onPress={() => select(fab.target)} accessibilityLabel={fab.label}
            style={[styles.fab, { backgroundColor: colors.primaryContainer, bottom: barHeight + spacing.lg + (snackbarOpen ? 64 : 0) }]}
            color={colors.onPrimaryContainer} />
        )}
      </SnackbarProvider>
    </View>
  );
}

// Hover/pressed layer drawn on the coloured pill itself, so the highlight is exactly the pill's size.
function HoverLayer({ state, color }: { state: { pressed: boolean; hovered?: boolean }; color: string }) {
  const opacity = state.pressed ? stateOpacity.pressed : state.hovered ? stateOpacity.hover : 0;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]} />;
}

type Fab<T extends string> = { label: string; icon: string; target: T };
type NavProps<T extends string> = { destinations: readonly Destination<T>[]; selected?: T; onSelect: (value: T) => void; fab?: Fab<T> };

function NavigationBar<T extends string>({ destinations, selected, onSelect, bottomInset }: NavProps<T> & { bottomInset: number }) {
  const { colors } = useTheme();
  return (
    <View role="navigation" aria-label="Sezioni" style={[styles.bar, { borderColor: colors.outlineVariant, backgroundColor: colors.background, height: layout.navBarHeight + bottomInset, paddingBottom: bottomInset }]}>
      {destinations.map((item) => {
        const active = item.value === selected;
        return (
          <StateLayerPressable key={item.value} layerColor="transparent" accessibilityRole="button"
            aria-current={active ? 'page' : undefined} accessibilityLabel={item.label} onPress={() => onSelect(item.value)} style={styles.barItem}>
            {(state) => <>
            <View style={[styles.indicator, active && { backgroundColor: colors.secondaryContainer }]}>
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

function Rail<T extends string>({ destinations, selected, onSelect, fab }: NavProps<T>) {
  const { colors } = useTheme();
  return (
    <View role="navigation" aria-label="Sezioni" style={[styles.rail, { backgroundColor: colors.background }]}>
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
  const { colors } = useTheme();
  return (
    <View role="navigation" aria-label="Sezioni" style={[styles.drawer, { backgroundColor: colors.background }]}>
      {fab && (
        <FAB mode="flat" label={fab.label} icon={({ size, color }) => <SvgIcon shape={fab.icon} size={size} color={color} />}
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
            <Text variant="labelLarge" style={{ color, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
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
  bar: { flexDirection: 'row', paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  barItem: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: 56, paddingTop: 4 },
  indicator: { overflow: 'hidden', width: 64, height: 32, borderRadius: radius.nav, alignItems: 'center', justifyContent: 'center' },
  rail: { width: layout.railWidth, paddingTop: spacing.lg, alignItems: 'center', gap: spacing.lg + 4 },
  railFab: { marginTop: spacing.lg, marginBottom: spacing.md, borderRadius: radius.control },
  railItem: { width: layout.railWidth - spacing.sm, alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  railIndicator: { overflow: 'hidden', width: 56, height: 32, borderRadius: radius.nav, alignItems: 'center', justifyContent: 'center' },
  drawer: { width: layout.drawerWidth, padding: spacing.md, paddingTop: spacing.lg, gap: spacing.lg + 4 },
  drawerFab: { alignSelf: 'flex-start', marginTop: spacing.md, marginBottom: spacing.md, marginLeft: spacing.xs, borderRadius: radius.control },
  drawerItem: { height: layout.minTouch, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, borderRadius: radius.control },
});
