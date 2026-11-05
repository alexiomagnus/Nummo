// Single source of design tokens. Components read colors through `useTheme()` and
// everything else from here: changing a palette or scale never requires touching a component.

export type Scheme = {
  primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string;
  secondary: string; onSecondary: string; secondaryContainer: string; onSecondaryContainer: string;
  tertiary: string; onTertiary: string; tertiaryContainer: string; onTertiaryContainer: string;
  error: string; onError: string; errorContainer: string; onErrorContainer: string;
  background: string; onBackground: string;
  surface: string; onSurface: string; surfaceVariant: string; onSurfaceVariant: string;
  outline: string; outlineVariant: string;
  inverseSurface: string; inverseOnSurface: string; inversePrimary: string;
  surfaceContainerLowest: string; surfaceContainerLow: string; surfaceContainer: string;
  surfaceContainerHigh: string; surfaceContainerHighest: string;
};

// Mint identity: primary hue ≈ 150°. Text/background pairs are ≥ 4.5:1, outlines ≥ 3:1.
export const schemes: { light: Scheme; dark: Scheme } = {
  light: {
    primary: '#2D6A4F', onPrimary: '#FFFFFF', primaryContainer: '#B7F0CF', onPrimaryContainer: '#002113',
    secondary: '#4D6357', onSecondary: '#FFFFFF', secondaryContainer: '#CFE9D8', onSecondaryContainer: '#0A1F14',
    tertiary: '#3A6573', onTertiary: '#FFFFFF', tertiaryContainer: '#BEEAF9', onTertiaryContainer: '#001F28',
    error: '#BA1A1A', onError: '#FFFFFF', errorContainer: '#FFDAD6', onErrorContainer: '#410002',
    background: '#F5FBF5', onBackground: '#171D19',
    surface: '#F5FBF5', onSurface: '#171D19', surfaceVariant: '#DBE5DD', onSurfaceVariant: '#404943',
    outline: '#6F7972', outlineVariant: '#BFC9C1',
    inverseSurface: '#2C322E', inverseOnSurface: '#ECF2EC', inversePrimary: '#9BD4B3',
    surfaceContainerLowest: '#FFFFFF', surfaceContainerLow: '#EFF5EF', surfaceContainer: '#E9F0E9',
    surfaceContainerHigh: '#E3EAE3', surfaceContainerHighest: '#DEE4DD',
  },
  dark: {
    primary: '#9BD4B3', onPrimary: '#003826', primaryContainer: '#145239', onPrimaryContainer: '#B7F0CF',
    secondary: '#B3CCBC', onSecondary: '#1F352A', secondaryContainer: '#354B3F', onSecondaryContainer: '#CFE9D8',
    tertiary: '#A3CDDB', onTertiary: '#043542', tertiaryContainer: '#214C59', onTertiaryContainer: '#BEEAF9',
    error: '#FFB4AB', onError: '#690005', errorContainer: '#93000A', onErrorContainer: '#FFDAD6',
    background: '#0F1511', onBackground: '#DEE4DD',
    surface: '#0F1511', onSurface: '#DEE4DD', surfaceVariant: '#404943', onSurfaceVariant: '#BFC9C1',
    outline: '#89938B', outlineVariant: '#404943',
    inverseSurface: '#DEE4DD', inverseOnSurface: '#2C322E', inversePrimary: '#2D6A4F',
    surfaceContainerLowest: '#0A0F0C', surfaceContainerLow: '#171D19', surfaceContainer: '#1B211D',
    surfaceContainerHigh: '#252B27', surfaceContainerHighest: '#303632',
  },
};

// 4 px grid. Pages use `lg` (16) between related blocks and `xxl` (32) between sections.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

// Material 3 shape scale (dp).
export const shape = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 999 } as const;

// Window size classes (dp): compact < 600 ≤ medium < 1024 ≤ expanded.
export const breakpoints = { medium: 600, expanded: 1024 } as const;
export type SizeClass = 'compact' | 'medium' | 'expanded';
export const sizeClassOf = (width: number): SizeClass =>
  width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';

// Swiss geometry: one small radius per role, never a pill unless the shape is functionally
// round (avatar, charts, dots). Components read these instead of `shape` literals.
export const radius = {
  control: 8, // buttons, selects, chips, menus, snackbar, FAB
  input: 8, // outlined text fields
  card: 8, // panels and inline editors
  dialog: 12, // dialogs
  nav: 8, // selected navigation item (drawer, rail, bar)
  tile: 8, // icon tiles
} as const;
// Spread on every outlined TextInput (Paper takes the field radius from `outlineStyle`).
export const inputOutline = { borderRadius: radius.input } as const;
// Paper derives its radii from one `roundness` number: Button = 5×, Dialog = 7×.
export const paperRoundness = radius.control / 5;

export const layout = {
  navBarHeight: 80,
  railWidth: 80,
  drawerWidth: 248,
  topBarHeight: 64,
  // Pages fill the viewport up to this width and are centred beyond it (very wide monitors).
  maxContent: 1440,
  // Dialogs.
  maxForm: 560,
  // Gap between the blocks of a page (toolbar, cards, panels).
  sectionGap: spacing.xxl,
  controlHeight: 56,
  // Visible box of an outlined TextInput (Paper's 56 dp container reserves 6 dp on top for the floating label).
  fieldBoxHeight: 50,
  minTouch: 48,
} as const;

// State layer opacities from the Material 3 spec.
export const stateOpacity = { hover: 0.08, focus: 0.1, pressed: 0.1, disabled: 0.38 } as const;

export const typefaces = {
  system: 'Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, "Segoe UI", sans-serif',
  // Google Sans (SIL OFL, variable 400–700), self-hosted in public/fonts; system sans until it loads.
  google: '"Google Sans", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif',
} as const;

// Line weight of every UI icon and category glyph (24 dp grid). Thin = minimal and refined.
export const iconStroke = 1.5;

// Material 3 emphasized-decelerate / standard easings and durations (ms).
export const motion = { short: 150, medium: 250, easing: [0.2, 0, 0, 1] as const };
