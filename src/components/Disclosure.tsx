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

// `grow` (28 November, on request: «più smooth»): the height opens and closes too, with the same curves, so what is below slides instead of
// jumping when the content unmounts. A grid row going from 0fr to 1fr (CSS only, no measuring); the content is clipped while it moves.
const growEnter = transitions([['grid-template-rows', motion.medium, motion.enter], ['opacity', motion.short], ['transform', motion.medium, motion.enter]]);
const growExit = transitions([['grid-template-rows', motion.fade, motion.exitEasing], ['opacity', motion.fade, motion.exitEasing], ['transform', motion.fade, motion.exitEasing]]);

export function Disclosure({ open, children, style, grow = false, appear = true }: { open: boolean; children: ReactNode; style?: StyleProp<ViewStyle>; grow?: boolean; appear?: boolean }) {
  const animate = !useReducedMotion();
  const presence = usePresence(open, motion.fade, animate);
  // `appear` false: what is open from the start is simply there (the navigation entries), only later changes move.
  const { mounted } = presence;
  const shown = presence.shown || (!appear && open);
  if (!mounted) return null;
  if (grow) {
    return (
      <View {...{ inert: open ? undefined : true }} aria-hidden={open ? undefined : true}
        style={[style, { display: 'grid', gridTemplateRows: shown ? '1fr' : '0fr', opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : -spacing.xs }] } as unknown as ViewStyle, animate && (shown ? growEnter : growExit)]}>
        <View style={{ minHeight: 0, overflow: 'hidden' }}>{children}</View>
      </View>
    );
  }
  return (
    <View {...{ inert: open ? undefined : true }} aria-hidden={open ? undefined : true}
      style={[style, { opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : -spacing.xs }] }, animate && (shown ? enter : exit)]}>
      {children}
    </View>
  );
}
