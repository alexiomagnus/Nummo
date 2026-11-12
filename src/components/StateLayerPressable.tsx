import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { fillTransition, layerTransition } from '../theme/motion';
import { stateOpacity } from '../theme/tokens';

type State = PressableStateCallbackType & { hovered?: boolean };
type Props = Omit<PressableProps, 'style' | 'children'> & {
  // Color of the Material 3 state layer (normally the content color on that surface).
  layerColor: string;
  radius?: number;
  // Bottom corners when they differ from `radius` (e.g. 0 when an expanded panel continues below the target).
  bottomRadius?: number;
  // Borderless targets: the hover/pressed layer extends this many dp beyond the element, so the highlight reads as a
  // comfortable hit area instead of hugging the content. Controls that already draw a border keep 0.
  bleed?: number;
  // A parent drag owns the gesture: suppress its original pressed feedback even if Pressable releases one frame later.
  suppressPressed?: boolean;
  style?: StyleProp<ViewStyle> | ((state: State) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: State) => ReactNode);
};

// Pressable with hover/pressed state layers; keyboard focus is drawn by the global :focus-visible ring.
export function StateLayerPressable({ layerColor, radius = 0, bottomRadius, bleed = 0, suppressPressed = false, style, children, disabled, ...rest }: Props) {
  const corners: ViewStyle = { borderRadius: radius, ...(bottomRadius === undefined ? null : { borderBottomLeftRadius: bottomRadius, borderBottomRightRadius: bottomRadius }) };
  return (
    <Pressable {...rest} {...{ dataSet: { focusRing: 'control' } }} disabled={disabled}
      style={(state) => [{ overflow: bleed ? 'visible' : 'hidden', ...corners, opacity: disabled ? 0.38 : 1 }, fillTransition, typeof style === 'function' ? style(state as State) : style]}>
      {(raw) => {
        const state = raw as State;
        const suppressed = suppressPressed && state.pressed;
        const opacity = disabled || suppressed ? 0 : state.pressed ? stateOpacity.pressed : state.hovered ? stateOpacity.hover : 0;
        return <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, corners, bleed ? { top: -bleed, left: -bleed, right: -bleed, bottom: -bleed, borderRadius: radius + bleed } : null, { backgroundColor: layerColor, opacity }, layerTransition, suppressed && ({ transitionDuration: '0ms' } as ViewStyle)]} />
          {typeof children === 'function' ? children(state) : children}
        </>;
      }}
    </Pressable>
  );
}
