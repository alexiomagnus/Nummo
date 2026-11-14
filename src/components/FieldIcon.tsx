import type { ReactNode } from 'react';
import { TextInput } from 'react-native-paper';
import { SvgIcon } from './SvgIcon';

type IconRender = (props: { size: number; color: string }) => ReactNode;

// Decorative icon (leading or trailing) for a text field. Paper renders TextInput.Icon as an IconButton (a <button> on
// web), so it is taken out of the tab order and the accessibility tree (it does nothing when pressed), and
// `role="presentation"` makes React Native Web render a <div>: inside the button of DateField/SelectField a nested
// <button> is invalid HTML. `forceTextInputFocus={false}`: a click on it must not focus a read-only field.
export function decorativeIcon(icon: IconRender, focusField = true) {
  return <TextInput.Icon icon={icon} forceTextInputFocus={focusField} tabIndex={-1} aria-hidden importantForAccessibility="no" role="presentation" />;
}

export function leadingIcon(shape: string) {
  return decorativeIcon(({ size, color }) => <SvgIcon shape={shape} size={size} color={color} />);
}
