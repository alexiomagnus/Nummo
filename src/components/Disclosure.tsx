import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { motion, spacing } from '../theme/tokens';
import { transitions } from '../theme/motion';
import { useReducedMotion } from '../theme/useSizeClass';
import { usePresence } from './Overlay';

// In-flow content shown on demand (options under a switch). Opening fades in with a 4 dp slide, closing fades out
// quickly and then unmounts; only opacity/transform animate, so nothing is laid out frame by frame. While closing the
// content is inert. With reduced motion it mounts and unmounts immediately.
const enter = transitions([['opacity', motion.short], ['transform', motion.medium, motion.enter]]);
const exit = transitions([['opacity', motion.fade, motion.exitEasing], ['transform', motion.fade, motion.exitEasing]]);

export function Disclosure({ open, children, style }: { open: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const animate = !useReducedMotion();
  const { mounted, shown } = usePresence(open, motion.fade, animate);
  if (!mounted) return null;
  return (
    <View {...{ inert: open ? undefined : true }} aria-hidden={open ? undefined : true}
      style={[style, { opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : -spacing.xs }] }, animate && (shown ? enter : exit)]}>
      {children}
    </View>
  );
}
