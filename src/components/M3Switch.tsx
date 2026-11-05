import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { radius, shape } from '../theme/tokens';
import { useReducedMotion } from '../theme/useSizeClass';
import { SvgIcon, iconShapes } from './SvgIcon';

// Material 3 switch (visual only: the parent row owns press handling and accessibility).
// Squared like the fields (track radius = input radius, handle 4). Spec: 52×32 track; handle 16 px off / 24 px on with a check icon; outlined track when off.
export function M3Switch({ value, disabled }: { value: boolean; disabled?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0, duration: reduceMotion ? 0 : 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false,
    }).start();
  }, [value, progress, reduceMotion]);

  const handleSize = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 24] });
  // Handle centre moves from 16 px to 36 px inside the 52 px track.
  const left = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 24] });
  const top = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 4] });
  const trackOff = theme.colors.surfaceVariant;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.track, {
        backgroundColor: value ? theme.colors.primary : trackOff,
        borderColor: value ? theme.colors.primary : theme.colors.outline,
        opacity: disabled ? 0.38 : 1,
      }]}>
      <Animated.View style={[styles.handle, {
        width: handleSize, height: handleSize, left, top,
        backgroundColor: value ? theme.colors.onPrimary : theme.colors.outline,
      }]}>
        {value && <SvgIcon shape={iconShapes.check} size={16} color={theme.colors.primary} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: radius.input, borderWidth: 2 },
  handle: { position: 'absolute', borderRadius: shape.xs, alignItems: 'center', justifyContent: 'center', marginLeft: -2, marginTop: -2 },
});
