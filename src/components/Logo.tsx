import { Image } from 'react-native';

// Nummo mark (an «n» made of two volumes), drawn with the given colour so it follows the theme.
export function Logo({ size, color }: { size: number; color: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="${color}"><rect x="8" y="8" width="14" height="48" rx="7"/><path d="M30 8C45 8 56 19 56 34V49A7 7 0 0 1 42 49V34C42 27 37 22 30 22Z"/></svg>`;
  return <Image accessible={false} source={{ uri: `data:image/svg+xml,${encodeURIComponent(svg)}` }} style={{ width: size, height: size }} />;
}
