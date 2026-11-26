import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { fillTransition } from '../theme/motion';
import { motion, radius } from '../theme/tokens';
import { useReducedMotion } from '../theme/useSizeClass';
import { SvgIcon, iconShapes } from './SvgIcon';

// Material 3 switch with icons (visual only: the parent row owns press handling and accessibility), as in Morphe (26 November,
// on request): 52×32 track, a 24 px handle in both states, a check when on and a cross when off, so the state reads from the
// shape too. Off: outlined, nearly transparent track, handle in the outline colour; on: filled track, light handle.
// The handle only moves (transform), the colours cross-fade with a CSS transition.
export function M3Switch({ value, disabled }: { value: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0, duration: reduceMotion ? 0 : motion.short + 50, easing: Easing.bezier(...motion.easing), useNativeDriver: false,
    }).start();
  }, [value, progress, reduceMotion]);

  // Handle box (24 px) at x = 0 / 20 inside the 48 px content area (track 52 minus the 2 px borders).
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.track, fillTransition, {
        backgroundColor: value ? colors.primary : 'transparent',
        borderColor: value ? colors.primary : colors.outline,
        opacity: disabled ? 0.38 : 1,
      }]}>
      <Animated.View style={[styles.handle, fillTransition, {
        backgroundColor: value ? colors.onPrimary : colors.outline,
        transform: [{ translateX }],
      }]}>
        <SvgIcon shape={value ? iconShapes.check : iconShapes.close} size={16} color={value ? colors.primary : colors.surfaceVariant} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: radius.pill, borderWidth: 2 },
  handle: { position: 'absolute', left: 2, top: 2, width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
