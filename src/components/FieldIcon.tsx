import { TextInput } from 'react-native-paper';
import { SvgIcon } from './SvgIcon';

// Decorative leading icon for a text field. Paper renders TextInput.Icon as an IconButton (a <button> on web), so it is
// taken out of the tab order and the accessibility tree (it does nothing when pressed), and `role="presentation"` makes
// React Native Web render a <div>: inside the button of DateField/SelectField a nested <button> is invalid HTML.
export function leadingIcon(shape: string) {
  return <TextInput.Icon icon={({ size, color }) => <SvgIcon shape={shape} size={size} color={color} />}
    tabIndex={-1} aria-hidden importantForAccessibility="no" role="presentation" />;
}
