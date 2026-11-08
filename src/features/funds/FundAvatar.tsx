import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Fund } from '../../domain/funds';
import { paletteColor } from '../../theme/chartPalette';

// Fund identity: its palette colour as a ring and a soft fill, its icon (or a wallet) inside. Decorative: the name is
// always written next to it.
export function FundAvatar({ fund, size = 40 }: { fund: Pick<Fund, 'icon' | 'color'>; size?: number }) {
  const { colors, dark } = useTheme();
  const color = paletteColor(fund.color, dark);
  const glyph = Math.round(size * 0.55);
  return (
    <View aria-hidden style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}26` }]}>
      {fund.icon ? <CategoryGlyph icon={fund.icon} size={glyph} color={colors.onSurface} /> : <SvgIcon shape={iconShapes.wallet} size={glyph} color={colors.onSurface} />}
    </View>
  );
}

export function FundColorDot({ color, size = 12 }: { color: number; size?: number }) {
  const { dark } = useTheme();
  return <View aria-hidden style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: paletteColor(color, dark) }} />;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
});
