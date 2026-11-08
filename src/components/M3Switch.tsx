import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { fillTransition } from '../theme/motion';
import { motion, radius } from '../theme/tokens';
import { useReducedMotion } from '../theme/useSizeClass';
import { SvgIcon, iconShapes } from './SvgIcon';

// Material 3 switch (visual only: the parent row owns press handling and accessibility).
// Fully rounded track and circular handle. Spec: 52×32 track; handle 16 px off / 24 px on with a check icon; outlined track when off.
// The handle is always 24 px: it is scaled (16/24 off) and translated, so the animation uses transform only (no layout);
// the track colours cross-fade with a CSS transition.
const OFF_SCALE = 16 / 24;
export function M3Switch({ value, disabled }: { value: boolean; disabled?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0, duration: reduceMotion ? 0 : motion.short + 50, easing: Easing.bezier(...motion.easing), useNativeDriver: false,
    }).start();
  }, [value, progress, reduceMotion]);

  // Handle box (24 px) sits at x = 0 / 20 inside the 48 px content area (track 52 minus the 2 px borders); centres 16 and 36 from the track edge.
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [OFF_SCALE, 1] });
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.track, fillTransition, {
        backgroundColor: value ? theme.colors.primary : theme.colors.surfaceVariant,
        borderColor: value ? theme.colors.primary : theme.colors.outline,
        opacity: disabled ? 0.38 : 1,
      }]}>
      <Animated.View style={[styles.handle, {
        backgroundColor: value ? theme.colors.onPrimary : theme.colors.outline,
        transform: [{ translateX }, { scale }],
      }]}>
        {value && <SvgIcon shape={iconShapes.check} size={16} color={theme.colors.primary} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: radius.pill, borderWidth: 2 },
  handle: { position: 'absolute', left: 2, top: 2, width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
