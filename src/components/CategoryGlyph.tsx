import { useTheme } from 'react-native-paper';
import type { CategoryIcon } from '../domain/category';
import { categoryGlyphs } from './categoryGlyphs';
import { SvgIcon } from './SvgIcon';

// Category icon as a themed outline glyph; `color` defaults to the neutral content color.
export function CategoryGlyph({ icon, size = 24, color }: { icon: CategoryIcon; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <SvgIcon shape={categoryGlyphs[icon]} size={size} color={color ?? colors.onSurfaceVariant} />;
}
