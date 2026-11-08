import { createContext, useContext, type ReactNode } from 'react';
import { useTheme } from 'react-native-paper';
import type { CategoryIcon } from '../domain/category';
import { defaultIconStyle, glyphSize, resolveCategoryGlyph, type IconStyle } from './categoryIconSets';
import { SvgIcon, iconShapes } from './SvgIcon';

// Display style of category icons, chosen in the settings. A context (like the language) so that every screen and
// dialog shows the same style without passing it down; it is placed above PaperProvider in App.tsx so that portal
// content (dialogs, menus) sees it too.
const IconStyleContext = createContext<IconStyle>(defaultIconStyle);
export function IconStyleProvider({ style, children }: { style: IconStyle; children: ReactNode }) {
  return <IconStyleContext.Provider value={style}>{children}</IconStyleContext.Provider>;
}
export const useIconStyle = (): IconStyle => useContext(IconStyleContext);

type Props = {
  icon: CategoryIcon;
  size?: number;
  // Content colour of the minimal outline. The colourful and pixel sets carry their own colours and ignore it.
  color?: string;
  // Draws this style instead of the chosen one (previews in the settings).
  style?: IconStyle;
};

// Category icon (decorative: the category name is always shown or labelled next to it). Which drawing is used for
// the chosen style, and the fallbacks, live in categoryIconSets.ts; an ID without any drawing gets the neutral tag.
export function CategoryGlyph({ icon, size = 24, color, style }: Props) {
  const { colors, dark } = useTheme();
  const chosen = useIconStyle();
  const shown = style ?? chosen;
  const glyph = resolveCategoryGlyph(shown, icon, dark);
  return <SvgIcon shape={glyph?.shape ?? iconShapes.tag} size={glyphSize(shown, size)}
    color={glyph?.color ?? color ?? colors.onSurfaceVariant} />;
}
