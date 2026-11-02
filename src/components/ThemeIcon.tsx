import { SvgIcon, iconShapes } from './SvgIcon';

export function ThemeIcon({ dark, size, color }: { dark: boolean; size: number; color: string }) {
  return <SvgIcon shape={dark ? iconShapes.sun : iconShapes.moon} size={size} color={color} />;
}
