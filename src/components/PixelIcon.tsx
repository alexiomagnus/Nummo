import { Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { CategoryIcon } from '../domain/category';
import { pixelSprites, pixelSvg } from './pixelIcons';

// Light ring only on dark themes: the sprites' near-black outline vanishes on dark surfaces.
const darkHalo = '#E6E1E9';
const uris = new Map<string, string>();
function uriOf(icon: CategoryIcon, dark: boolean): string {
  const key = `${icon}:${dark}`;
  let uri = uris.get(key);
  if (!uri) {
    uri = `data:image/svg+xml,${encodeURIComponent(pixelSvg(pixelSprites[icon], dark ? { halo: darkHalo } : {}))}`;
    uris.set(key, uri);
  }
  return uri;
}

// The 14-px canvas includes a 1-px margin, so draw slightly larger to keep the sprite's size.
export function PixelIcon({ icon, size = 24 }: { icon: CategoryIcon; size?: number }) {
  const { dark } = useTheme();
  const box = Math.round((size * 14) / 12);
  return <Image accessible={false} source={{ uri: uriOf(icon, dark) }} style={{ width: box, height: box, margin: (size - box) / 2 }} />;
}
