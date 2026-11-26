import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../theme/tokens';

// The background of the app (27 November, on request, after Morphe's «Cerchi»): a few large soft circles, a little lighter (dark)
// or more tinted (light) than the background, drifting very slowly (GlobalStyle, `data-orb`; still with reduced motion). Behind
// everything, never a target.
const orbLayout = [
  { size: 0.95, top: -0.18, left: -0.42 },
  { size: 0.8, top: 0.12, left: 0.55 },
  { size: 0.7, top: 0.55, left: -0.3 },
  { size: 0.9, top: 0.78, left: 0.45 },
] as const;
export function Orbs({ color }: { color: string }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const side = box ? Math.max(Math.min(box.width, 900), 360) : 0;
  return (
    <View pointerEvents="none" aria-hidden style={styles.orbs} onLayout={(event) => setBox(event.nativeEvent.layout)}>
      {box && orbLayout.map((orb, index) => (
        <View key={index} {...{ dataSet: { orb: String(index) } }} style={[styles.orb, {
          backgroundColor: color, width: side * orb.size, height: side * orb.size,
          top: box.height * orb.top, left: box.width * orb.left,
        }]} />
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  orbs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: radius.pill },
});
